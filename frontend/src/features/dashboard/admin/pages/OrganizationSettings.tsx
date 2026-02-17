/**
 * Страница настроек организации (администратор)
 * 
 * Функциональность:
 * - Редактирование названия организации
 * - Редактирование описания
 * - Загрузка логотипа
 * - Загрузка изображений для галереи
 * - Настройки отображаются в гостевом интерфейсе
 */

import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Upload, Image, Space, Typography, Divider } from 'antd';
import { SettingOutlined, UploadOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import type { UploadFile } from 'antd/es/upload/interface';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface OrganizationSettings {
  id: string;
  name: string;
  description?: string | null;
  content?: string | null;
  logoUrl?: string | null;
  images: string[];
}

export const OrganizationSettings = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [logoFileList, setLogoFileList] = useState<UploadFile[]>([]);
  const [imageFileList, setImageFileList] = useState<UploadFile[]>([]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await apiClient.get('/organization');
      const data = response.data.data;
      setSettings(data);
      form.setFieldsValue({
        name: data.name,
        description: data.description || '',
        content: data.content || '',
      });

      // Загружаем логотип
      if (data.logoUrl) {
        const getLogoUrl = (url: string) => {
          if (url.startsWith('http')) return url;
          // Если путь уже начинается с /uploads/, используем его как есть (Vite proxy обработает)
          if (url.startsWith('/uploads/')) return url;
          // Иначе добавляем /uploads/
          return `/uploads/${url}`;
        };
        setLogoFileList([
          {
            uid: '-1',
            name: 'logo',
            status: 'done',
            url: getLogoUrl(data.logoUrl),
          },
        ]);
      }

      // Загружаем изображения
      if (data.images && data.images.length > 0) {
        const getImageUrl = (url: string) => {
          if (url.startsWith('http')) return url;
          // Если путь уже начинается с /uploads/, используем его как есть (Vite proxy обработает)
          if (url.startsWith('/uploads/')) return url;
          // Иначе добавляем /uploads/
          return `/uploads/${url}`;
        };
        setImageFileList(
          data.images.map((url: string, index: number) => ({
            uid: `-${index}`,
            name: `image-${index}`,
            status: 'done',
            url: getImageUrl(url),
          }))
        );
      }
    } catch (error: any) {
      message.error('Ошибка загрузки настроек организации');
    }
  };

  const handleLogoUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Передаем folder как query параметр, так как multer обрабатывает multipart до парсинга body
      const response = await apiClient.post('/upload?folder=organization', formData);
      return response.data.data.url;
    } catch (error) {
      message.error('Ошибка загрузки логотипа');
      throw error;
    }
  };

  const handleImageUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Передаем folder как query параметр, так как multer обрабатывает multipart до парсинга body
      const response = await apiClient.post('/upload?folder=organization', formData);
      return response.data.data.url;
    } catch (error) {
      message.error('Ошибка загрузки изображения');
      throw error;
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      // Загружаем логотип, если есть новый
      let logoUrl = settings?.logoUrl || null;
      if (logoFileList.length > 0 && logoFileList[0].originFileObj) {
        logoUrl = await handleLogoUpload(logoFileList[0].originFileObj);
      } else if (logoFileList.length === 0) {
        logoUrl = null;
      } else if (logoFileList[0].url) {
        // Используем существующий URL - извлекаем относительный путь
        const url = logoFileList[0].url;
        if (url.startsWith('http')) {
          // Полный URL - извлекаем путь после домена
          try {
            const urlObj = new URL(url);
            logoUrl = urlObj.pathname;
          } catch {
            logoUrl = url;
          }
        } else {
          // Уже относительный путь
          logoUrl = url;
        }
      }

      // Загружаем новые изображения
      const existingImages = imageFileList
        .filter((file) => !file.originFileObj && file.url)
        .map((file) => {
          const url = file.url || '';
          if (url.startsWith('http')) {
            // Полный URL - извлекаем путь после домена
            try {
              const urlObj = new URL(url);
              return urlObj.pathname;
            } catch {
              return url;
            }
          } else {
            // Уже относительный путь
            return url;
          }
        });

      const newImages = await Promise.all(
        imageFileList
          .filter((file) => file.originFileObj)
          .map((file) => handleImageUpload(file.originFileObj!))
      );

      const allImages = [...existingImages, ...newImages];

      const data = {
        name: values.name,
        description: values.description && values.description.trim() !== '' ? values.description : null,
        content: values.content && values.content.trim() !== '' ? values.content : null,
        logoUrl: logoUrl || null,
        images: allImages || [],
      };

      await apiClient.put('/organization', data);
      message.success('Настройки организации обновлены');
      loadSettings();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.errors?.[0]?.message || 'Ошибка при сохранении настроек';
      message.error(errorMessage);
      console.error('Ошибка при сохранении настроек организации:', error.response?.data || error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#262626' }}>
              Настройки кастомизации
            </h1>
            <Text type="secondary">
              Настройте информацию о вашей организации для отображения на сайте
            </Text>
          </div>

          <Divider />

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            style={{ maxWidth: 800 }}
          >
            <Form.Item
              label="Название организации"
              name="name"
              rules={[{ required: true, message: 'Введите название организации' }]}
            >
              <Input placeholder="Например: Спортивная федерация" size="large" />
            </Form.Item>

            <Form.Item
              label="Краткое описание"
              name="description"
            >
              <TextArea
                rows={3}
                placeholder="Краткое описание организации (отображается в карточке)"
                showCount
                maxLength={500}
              />
            </Form.Item>

            <Form.Item
              label="Основной текст о организации"
              name="content"
            >
              <TextArea
                rows={10}
                placeholder="Подробная информация об организации (HTML или обычный текст)"
                showCount
              />
            </Form.Item>

            <Form.Item label="Логотип организации">
              <Upload
                listType="picture-card"
                fileList={logoFileList}
                onChange={({ fileList }) => setLogoFileList(fileList)}
                beforeUpload={() => false}
                maxCount={1}
                onRemove={() => {
                  setLogoFileList([]);
                  return true;
                }}
              >
                {logoFileList.length < 1 && (
                  <div>
                    <PlusOutlined />
                    <div style={{ marginTop: 8 }}>Загрузить логотип</div>
                  </div>
                )}
              </Upload>
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: 8 }}>
                Рекомендуемый размер: 200x200px, формат: PNG, JPG
              </Text>
            </Form.Item>

            <Form.Item label="Фотографии организации">
              <Upload
                listType="picture-card"
                fileList={imageFileList}
                onChange={({ fileList }) => setImageFileList(fileList)}
                beforeUpload={() => false}
                multiple
                onRemove={(file) => {
                  const newList = imageFileList.filter((item) => item.uid !== file.uid);
                  setImageFileList(newList);
                  return true;
                }}
              >
                {imageFileList.length < 10 && (
                  <div>
                    <PlusOutlined />
                    <div style={{ marginTop: 8 }}>Загрузить фото</div>
                  </div>
                )}
              </Upload>
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: 8 }}>
                Можно загрузить до 10 фотографий
              </Text>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} size="large">
                Сохранить настройки
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
};

