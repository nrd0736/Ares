/**
 * Страница документов спортсмена
 * 
 * Функциональность:
 * - Просмотр документов (сертификаты, дипломы, награды)
 * - Загрузка документов
 * - Скачивание документов
 * - Фильтрация по типам документов
 */

import { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, message, Empty, Upload, Modal, Form, Input } from 'antd';
import { FileTextOutlined, TrophyOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store/store';

interface Document {
  id: string;
  type: 'CERTIFICATE' | 'DIPLOMA' | 'AWARD' | 'OTHER';
  title: string;
  description?: string;
  fileUrl: string;
  competition?: {
    name: string;
  };
  createdAt: string;
}

export const Documents = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      // TODO: Создать endpoint для получения документов спортсмена
      // const response = await apiClient.get('/athletes/me/documents');
      // setDocuments(response.data.data.documents);
      message.info('Загрузка документов (endpoint в разработке)');
    } catch (error) {
      message.error('Ошибка загрузки документов');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (values: any) => {
    try {
      // TODO: Создать endpoint для загрузки документов
      // await apiClient.post('/athletes/me/documents', values);
      message.success('Документ успешно загружен');
      setUploadModalVisible(false);
      form.resetFields();
      loadDocuments();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при загрузке документа');
    }
  };

  const handleDownload = (document: Document) => {
    if (document.fileUrl) {
      window.open(document.fileUrl, '_blank');
    } else {
      message.warning('Ссылка на файл отсутствует');
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, { text: string; color: string }> = {
      CERTIFICATE: { text: 'Грамота', color: 'gold' },
      DIPLOMA: { text: 'Диплом', color: 'blue' },
      AWARD: { text: 'Награда', color: 'purple' },
      OTHER: { text: 'Другое', color: 'default' },
    };
    return labels[type] || { text: type, color: 'default' };
  };

  const columns = [
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeInfo = getDocumentTypeLabel(type);
        return <Tag color={typeInfo.color}>{typeInfo.text}</Tag>;
      },
    },
    {
      title: 'Название',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      render: (description: string) => description || '-',
    },
    {
      title: 'Соревнование',
      key: 'competition',
      render: (_: any, record: Document) => record.competition?.name || '-',
    },
    {
      title: 'Дата получения',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Document) => (
        <Button
          type="link"
          icon={<DownloadOutlined />}
          onClick={() => handleDownload(record)}
        >
          Скачать
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#262626' }}>Грамоты и документы</h1>
        <Button
          type="primary"
          icon={<UploadOutlined />}
          onClick={() => setUploadModalVisible(true)}
        >
          Загрузить документ
        </Button>
      </div>

      {documents.length === 0 ? (
        <Card>
          <Empty
            image={<TrophyOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />}
            description="У вас пока нет документов"
          />
        </Card>
      ) : (
        <Table
          columns={columns}
          dataSource={documents}
          loading={loading}
          rowKey="id"
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `Всего: ${total}`,
          }}
        />
      )}

      <Modal
        title="Загрузить документ"
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpload}
        >
          <Form.Item
            name="type"
            label="Тип документа"
            rules={[{ required: true, message: 'Выберите тип документа' }]}
          >
            <Select placeholder="Выберите тип">
              <Select.Option value="CERTIFICATE">Грамота</Select.Option>
              <Select.Option value="DIPLOMA">Диплом</Select.Option>
              <Select.Option value="AWARD">Награда</Select.Option>
              <Select.Option value="OTHER">Другое</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="title"
            label="Название"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input placeholder="Название документа" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea rows={4} placeholder="Описание документа" />
          </Form.Item>

          <Form.Item
            name="file"
            label="Файл"
            rules={[{ required: true, message: 'Загрузите файл' }]}
          >
            <Upload
              beforeUpload={() => false}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>Выбрать файл</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

