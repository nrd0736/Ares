/**
 * Страница управления новостями (администратор)
 * 
 * Функциональность:
 * - Создание новостей
 * - Редактирование новостей
 * - Удаление новостей
 * - Загрузка изображений для новостей
 * - Управление категориями новостей
 */

import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, Select, message, Popconfirm, Upload } from 'antd';
import type { FormInstance, UploadFile } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import apiClient from '../../../../services/api-client';

interface News {
  id: string;
  title: string;
  content: string;
  category?: string;
  createdAt: string;
  author: {
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}

export const NewsManagement = () => {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  useEffect(() => {
    loadNews();
  }, [pagination.current, pagination.pageSize]);

  const loadNews = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(
        `/news?page=${pagination.current}&limit=${pagination.pageSize}`
      );
      setNews(response.data.data.news);
      setPagination({
        ...pagination,
        total: response.data.data.pagination.total,
      });
    } catch (error: any) {
      message.error('Ошибка загрузки новостей');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingNews(null);
    form.resetFields();
    setFileList([]);
    setModalVisible(true);
  };

  const handleEdit = (newsItem: News) => {
    setEditingNews(newsItem);
    form.setFieldsValue({
      title: newsItem.title,
      content: newsItem.content,
      category: newsItem.category,
    });
    
    // Загружаем существующие изображения в fileList
    if (newsItem.images && Array.isArray(newsItem.images) && newsItem.images.length > 0) {
      const existingFiles: UploadFile[] = newsItem.images.map((url, index) => ({
        uid: `-${index}`,
        name: `image-${index}.jpg`,
        status: 'done' as const,
        url: url,
      }));
      setFileList(existingFiles);
    } else {
      setFileList([]);
    }
    
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/news/${id}`);
      message.success('Новость успешно удалена');
      loadNews();
    } catch (error: any) {
      message.error('Ошибка при удалении новости');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      // Получаем URL загруженных изображений
      const imageUrls = fileList
        .filter(file => file.status === 'done' && file.url)
        .map(file => file.url as string);

      const newsData = {
        ...values,
        images: imageUrls.length > 0 ? imageUrls : undefined,
      };

      if (editingNews) {
        await apiClient.put(`/news/${editingNews.id}`, newsData);
        message.success('Новость успешно обновлена');
      } else {
        await apiClient.post('/news', newsData);
        message.success('Новость успешно создана');
      }
      setModalVisible(false);
      setFileList([]);
      loadNews();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при сохранении');
    }
  };

  const uploadProps: UploadProps = {
    name: 'image',
    action: '/api/upload/news-image',
    listType: 'picture',
    fileList,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    onChange: ({ fileList: newFileList }) => {
      // Обновляем fileList с правильными URL после загрузки
      const updatedFileList = newFileList.map((file) => {
        if (file.status === 'done' && file.response) {
          const url = file.response.data?.url || file.url;
          console.log('File uploaded:', { file: file.name, url, response: file.response });
          return {
            ...file,
            url: url,
          };
        }
        return file;
      });
      setFileList(updatedFileList);
    },
    onPreview: async (file) => {
      if (file.url) {
        window.open(file.url);
      }
    },
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('Можно загружать только изображения!');
        return false;
      }
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('Изображение должно быть меньше 10MB!');
        return false;
      }
      return true; // Разрешаем автоматическую загрузку
    },
  };

  const columns = [
    {
      title: 'Заголовок',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Категория',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => {
        return category ? <Tag>{category}</Tag> : '-';
      },
    },
    {
      title: 'Автор',
      key: 'author',
      render: (_: any, record: News) =>
        `${record.author.profile.firstName} ${record.author.profile.lastName}`,
    },
    {
      title: 'Дата создания',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: News) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Редактировать
          </Button>
          <Popconfirm
            title="Вы уверены, что хотите удалить эту новость?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Удалить
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#262626' }}>Управление новостями</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Создать новость
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={news}
        loading={loading}
        rowKey="id"
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `Всего: ${total}`,
        }}
        onChange={(pagination) => {
          setPagination({
            current: pagination.current || 1,
            pageSize: pagination.pageSize || 10,
            total: pagination.total || 0,
          });
        }}
      />

      <Modal
        title={editingNews ? 'Редактировать новость' : 'Создать новость'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="title"
            label="Заголовок"
            rules={[{ required: true }]}
          >
            <Input placeholder="Введите заголовок новости" />
          </Form.Item>

          <Form.Item
            name="category"
            label="Категория"
          >
            <Select placeholder="Выберите категорию" allowClear>
              <Select.Option value="Общие">Общие</Select.Option>
              <Select.Option value="Соревнования">Соревнования</Select.Option>
              <Select.Option value="Результаты">Результаты</Select.Option>
              <Select.Option value="Объявления">Объявления</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="content"
            label="Содержание"
            rules={[{ required: true }]}
          >
            <Input.TextArea
              rows={8}
              placeholder="Введите содержание новости"
            />
          </Form.Item>

          <Form.Item
            label="Изображения"
            name="images"
          >
            <div>
              <Upload {...uploadProps}>
                <Button icon={<UploadOutlined />}>Загрузить изображение</Button>
              </Upload>
              <div style={{ marginTop: 8, fontSize: '12px', color: '#8c8c8c' }}>
                Можно загрузить несколько изображений. Максимальный размер файла: 10MB
              </div>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

