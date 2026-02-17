/**
 * Страница управления документами (администратор)
 * 
 * Функциональность:
 * - Управление категориями документов
 * - Создание/редактирование/удаление документов
 * - Загрузка файлов документов
 * - Управление публичностью документов
 * - Сортировка документов
 */

import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, Select, message, Popconfirm, Upload, Tabs, InputNumber, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, FolderOutlined, FileOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import apiClient from '../../../../services/api-client';

interface DocumentCategory {
  id: string;
  name: string;
  description?: string;
  order: number;
  documents: Document[];
  _count?: {
    documents: number;
  };
}

interface Document {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType?: string;
  categoryId: string;
  order: number;
  isPublic: boolean;
  category?: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export const DocumentsManagement = () => {
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [documentModalVisible, setDocumentModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DocumentCategory | null>(null);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [categoryForm] = Form.useForm();
  const [documentForm] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [activeTab, setActiveTab] = useState('categories');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [categoriesResponse, documentsResponse] = await Promise.all([
        apiClient.get('/documents/categories'),
        apiClient.get('/documents'),
      ]);
      setCategories(categoriesResponse.data.data || []);
      setDocuments(documentsResponse.data.data || []);
    } catch (error: any) {
      message.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    categoryForm.resetFields();
    setCategoryModalVisible(true);
  };

  const handleEditCategory = (category: DocumentCategory) => {
    setEditingCategory(category);
    categoryForm.setFieldsValue({
      name: category.name,
      description: category.description,
      order: category.order,
    });
    setCategoryModalVisible(true);
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await apiClient.delete(`/documents/categories/${id}`);
      message.success('Категория удалена');
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при удалении категории');
    }
  };

  const handleCategorySubmit = async (values: any) => {
    try {
      if (editingCategory) {
        await apiClient.put(`/documents/categories/${editingCategory.id}`, values);
        message.success('Категория обновлена');
      } else {
        await apiClient.post('/documents/categories', values);
        message.success('Категория создана');
      }
      setCategoryModalVisible(false);
      categoryForm.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при сохранении категории');
    }
  };

  const handleCreateDocument = () => {
    setEditingDocument(null);
    documentForm.resetFields();
    setFileList([]);
    setDocumentModalVisible(true);
  };

  const handleEditDocument = (document: Document) => {
    setEditingDocument(document);
    documentForm.setFieldsValue({
      title: document.title,
      description: document.description,
      categoryId: document.categoryId,
      order: document.order,
      isPublic: document.isPublic,
    });
    setFileList([]);
    setDocumentModalVisible(true);
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      await apiClient.delete(`/documents/${id}`);
      message.success('Документ удален');
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при удалении документа');
    }
  };

  const handleDocumentSubmit = async (values: any) => {
    try {
      const formData = new FormData();
      formData.append('title', values.title);
      if (values.description) {
        formData.append('description', values.description);
      }
      formData.append('categoryId', values.categoryId);
      formData.append('order', values.order?.toString() || '0');
      formData.append('isPublic', values.isPublic ? 'true' : 'false');

      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append('file', fileList[0].originFileObj);
      }

      if (editingDocument) {
        await apiClient.put(`/documents/${editingDocument.id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        message.success('Документ обновлен');
      } else {
        if (fileList.length === 0) {
          message.error('Выберите файл для загрузки');
          return;
        }
        await apiClient.post('/documents', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        message.success('Документ создан');
      }
      setDocumentModalVisible(false);
      documentForm.resetFields();
      setFileList([]);
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при сохранении документа');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const categoryColumns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => text || '-',
    },
    {
      title: 'Порядок',
      dataIndex: 'order',
      key: 'order',
      width: 100,
    },
    {
      title: 'Документов',
      key: 'count',
      width: 120,
      render: (_: any, record: DocumentCategory) => (
        <Tag>{record._count?.documents || record.documents?.length || 0}</Tag>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_: any, record: DocumentCategory) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditCategory(record)}
          >
            Редактировать
          </Button>
          <Popconfirm
            title="Вы уверены, что хотите удалить эту категорию?"
            onConfirm={() => handleDeleteCategory(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
            >
              Удалить
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const documentColumns = [
    {
      title: 'Название',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Категория',
      key: 'category',
      render: (_: any, record: Document) => (
        <Tag>{record.category?.name || '-'}</Tag>
      ),
    },
    {
      title: 'Файл',
      key: 'file',
      render: (_: any, record: Document) => (
        <Space>
          <FileOutlined />
          <span>{record.fileName}</span>
          <span style={{ color: '#999', fontSize: '12px' }}>
            ({formatFileSize(record.fileSize)})
          </span>
        </Space>
      ),
    },
    {
      title: 'Порядок',
      dataIndex: 'order',
      key: 'order',
      width: 100,
    },
    {
      title: 'Публичный',
      dataIndex: 'isPublic',
      key: 'isPublic',
      width: 100,
      render: (isPublic: boolean) => (
        <Tag color={isPublic ? 'green' : 'red'}>
          {isPublic ? 'Да' : 'Нет'}
        </Tag>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 200,
      render: (_: any, record: Document) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditDocument(record)}
          >
            Редактировать
          </Button>
          <Popconfirm
            title="Вы уверены, что хотите удалить этот документ?"
            onConfirm={() => handleDeleteDocument(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
            >
              Удалить
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'categories',
      label: (
        <span>
          <FolderOutlined /> Категории
        </span>
      ),
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#262626' }}>Категории документов</h1>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateCategory}>
              Создать категорию
            </Button>
          </div>
          <Table
            columns={categoryColumns}
            dataSource={categories}
            loading={loading}
            rowKey="id"
            pagination={false}
          />
        </div>
      ),
    },
    {
      key: 'documents',
      label: (
        <span>
          <FileOutlined /> Документы
        </span>
      ),
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#262626' }}>Документы</h1>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateDocument}>
              Добавить документ
            </Button>
          </div>
          <Table
            columns={documentColumns}
            dataSource={documents}
            loading={loading}
            rowKey="id"
            pagination={false}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      {/* Модальное окно для категории */}
      <Modal
        title={editingCategory ? 'Редактировать категорию' : 'Создать категорию'}
        open={categoryModalVisible}
        onCancel={() => {
          setCategoryModalVisible(false);
          categoryForm.resetFields();
        }}
        onOk={() => categoryForm.submit()}
        width={600}
      >
        <Form
          form={categoryForm}
          layout="vertical"
          onFinish={handleCategorySubmit}
        >
          <Form.Item
            name="name"
            label="Название категории"
            rules={[{ required: true, message: 'Введите название категории' }]}
          >
            <Input placeholder="Например: Правила соревнований" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea rows={3} placeholder="Краткое описание категории" />
          </Form.Item>
          <Form.Item
            name="order"
            label="Порядок сортировки"
            initialValue={0}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно для документа */}
      <Modal
        title={editingDocument ? 'Редактировать документ' : 'Добавить документ'}
        open={documentModalVisible}
        onCancel={() => {
          setDocumentModalVisible(false);
          documentForm.resetFields();
          setFileList([]);
        }}
        onOk={() => documentForm.submit()}
        width={600}
      >
        <Form
          form={documentForm}
          layout="vertical"
          onFinish={handleDocumentSubmit}
        >
          <Form.Item
            name="title"
            label="Название документа"
            rules={[{ required: true, message: 'Введите название документа' }]}
          >
            <Input placeholder="Например: Правила соревнований по боксу" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea rows={3} placeholder="Краткое описание документа" />
          </Form.Item>
          <Form.Item
            name="categoryId"
            label="Категория"
            rules={[{ required: true, message: 'Выберите категорию' }]}
          >
            <Select placeholder="Выберите категорию">
              {categories.map((cat) => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="order"
            label="Порядок сортировки"
            initialValue={0}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="isPublic"
            label="Публичный доступ"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
          <Form.Item
            label={editingDocument ? 'Новый файл (оставьте пустым, чтобы не менять)' : 'Файл'}
            required={!editingDocument}
          >
            <Upload
              fileList={fileList}
              beforeUpload={() => false}
              onChange={({ fileList }) => setFileList(fileList)}
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

