/**
 * Страница управления резервным копированием (администратор)
 * 
 * Функциональность:
 * - Создание бэкапов (JSON, CSV)
 * - Импорт данных из бэкапа
 * - Скачивание бэкапов
 * - Удаление бэкапов
 * - Настройки автоматического резервного копирования
 */

import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Space,
  message,
  Modal,
  Form,
  Select,
  Input,
  Switch,
  TimePicker,
  Tag,
  Popconfirm,
  Upload,
} from 'antd';
import {
  DownloadOutlined,
  DeleteOutlined,
  ExportOutlined,
  ImportOutlined,
  SettingOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import dayjs, { Dayjs } from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

interface Backup {
  id: string;
  filename: string;
  filePath: string;
  fileSize: number;
  format: 'json' | 'csv';
  type: 'manual' | 'scheduled';
  createdAt: string;
  description?: string | null;
}

interface BackupSettings {
  enabled: boolean;
  interval?: 'daily' | 'weekly' | 'monthly';
  time?: string;
  maxBackups?: number;
}

export const BackupsManagement = () => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [settings, setSettings] = useState<BackupSettings>({
    enabled: false,
    interval: 'daily',
    time: '02:00',
    maxBackups: 30,
  });
  const [exportForm] = Form.useForm();
  const [importForm] = Form.useForm();
  const [settingsForm] = Form.useForm();

  useEffect(() => {
    loadBackups();
    loadSettings();
  }, []);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/backups');
      setBackups(response.data.data || []);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка загрузки бэкапов');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await apiClient.get('/backups/settings');
      const loadedSettings = response.data.data || {
        enabled: false,
        interval: 'daily',
        time: '02:00',
        maxBackups: 30,
      };
      setSettings(loadedSettings);
      settingsForm.setFieldsValue({
        enabled: loadedSettings.enabled,
        interval: loadedSettings.interval || 'daily',
        time: loadedSettings.time ? dayjs(loadedSettings.time, 'HH:mm') : dayjs('02:00', 'HH:mm'),
        maxBackups: loadedSettings.maxBackups || 30,
      });
    } catch (error: any) {
      console.error('Ошибка загрузки настроек', error);
    }
  };

  const handleExport = async (values: any) => {
    try {
      setLoading(true);
      const response = await apiClient.post(
        '/backups/export',
        {
          format: values.format,
          description: values.description || null,
        },
        {
          responseType: 'blob',
        }
      );

      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup-${Date.now()}.${values.format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success('Бэкап успешно экспортирован');
      setExportModalVisible(false);
      exportForm.resetFields();
      loadBackups();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при экспорте');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (values: any) => {
    try {
      setLoading(true);
      const file = values.file?.fileList?.[0]?.originFileObj;
      if (!file) {
        message.error('Выберите файл для импорта');
        return;
      }

      const fileContent = await file.text();
      let data;
      
      if (values.format === 'json') {
        data = JSON.parse(fileContent);
      } else {
        message.error('Импорт из CSV пока не поддерживается');
        return;
      }

      await apiClient.post('/backups/import', {
        format: values.format,
        data: data,
        clearBeforeImport: values.clearBeforeImport || false,
      });

      message.success('Данные успешно импортированы');
      setImportModalVisible(false);
      importForm.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при импорте');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (backup: Backup) => {
    try {
      const response = await apiClient.get(`/backups/${backup.id}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', backup.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success('Бэкап скачан');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при скачивании');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/backups/${id}`);
      message.success('Бэкап удален');
      loadBackups();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при удалении');
    }
  };

  const handleSaveSettings = async (values: any) => {
    try {
      const settingsData = {
        enabled: values.enabled,
        interval: values.interval,
        time: values.time ? values.time.format('HH:mm') : '02:00',
        maxBackups: values.maxBackups,
      };

      await apiClient.put('/backups/settings', settingsData);
      message.success('Настройки сохранены');
      setSettingsModalVisible(false);
      loadSettings();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при сохранении настроек');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const columns = [
    {
      title: 'Имя файла',
      dataIndex: 'filename',
      key: 'filename',
      render: (text: string) => (
        <Space>
          <FileTextOutlined />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: 'Формат',
      dataIndex: 'format',
      key: 'format',
      render: (format: string) => (
        <Tag color={format === 'json' ? 'blue' : 'green'}>{format.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'manual' ? 'orange' : 'purple'}>
          {type === 'manual' ? 'Ручной' : 'Автоматический'}
        </Tag>
      ),
    },
    {
      title: 'Размер',
      dataIndex: 'fileSize',
      key: 'fileSize',
      render: (size: number) => formatFileSize(size),
    },
    {
      title: 'Дата создания',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string | null) => desc || '-',
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Backup) => (
        <Space>
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record)}
          >
            Скачать
          </Button>
          <Popconfirm
            title="Удалить бэкап?"
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Нет"
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
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#262626' }}>Управление резервными копиями</h1>
      </div>
      <Card
        extra={
          <Space>
            <Button
              type="primary"
              icon={<ExportOutlined />}
              onClick={() => setExportModalVisible(true)}
            >
              Экспорт БД
            </Button>
            <Button
              icon={<ImportOutlined />}
              onClick={() => setImportModalVisible(true)}
            >
              Импорт БД
            </Button>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setSettingsModalVisible(true)}
            >
              Настройки
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={backups}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Модальное окно экспорта */}
      <Modal
        title="Экспорт базы данных"
        open={exportModalVisible}
        onCancel={() => {
          setExportModalVisible(false);
          exportForm.resetFields();
        }}
        onOk={() => exportForm.submit()}
        confirmLoading={loading}
      >
        <Form form={exportForm} onFinish={handleExport} layout="vertical">
          <Form.Item
            name="format"
            label="Формат экспорта"
            rules={[{ required: true, message: 'Выберите формат' }]}
            initialValue="json"
          >
            <Select>
              <Option value="json">JSON</Option>
              <Option value="csv">CSV</Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Описание (необязательно)">
            <TextArea rows={3} placeholder="Введите описание бэкапа" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно импорта */}
      <Modal
        title="Импорт базы данных"
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          importForm.resetFields();
        }}
        onOk={() => importForm.submit()}
        confirmLoading={loading}
        okText="Импортировать"
      >
        <Form form={importForm} onFinish={handleImport} layout="vertical">
          <Form.Item
            name="format"
            label="Формат файла"
            rules={[{ required: true, message: 'Выберите формат' }]}
            initialValue="json"
          >
            <Select>
              <Option value="json">JSON</Option>
              <Option value="csv" disabled>CSV (скоро)</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="file"
            label="Файл для импорта"
            rules={[{ required: true, message: 'Выберите файл' }]}
          >
            <Upload
              beforeUpload={() => false}
              maxCount={1}
              accept=".json,.csv"
            >
              <Button>Выбрать файл</Button>
            </Upload>
          </Form.Item>
          <Form.Item
            name="clearBeforeImport"
            valuePropName="checked"
            initialValue={false}
          >
            <Space>
              <Switch />
              <span>Очистить базу данных перед импортом</span>
            </Space>
          </Form.Item>
          <div style={{ color: 'red', fontSize: '12px', marginTop: '-16px', marginBottom: '16px' }}>
            ⚠️ Внимание: Импорт данных может привести к потере существующих данных!
          </div>
        </Form>
      </Modal>

      {/* Модальное окно настроек */}
      <Modal
        title="Настройки автоматического резервного копирования"
        open={settingsModalVisible}
        onCancel={() => {
          setSettingsModalVisible(false);
          settingsForm.resetFields();
        }}
        onOk={() => settingsForm.submit()}
        width={600}
      >
        <Form form={settingsForm} onFinish={handleSaveSettings} layout="vertical">
          <Form.Item
            name="enabled"
            valuePropName="checked"
            label="Включить автоматическое резервное копирование"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="interval"
            label="Периодичность"
            rules={[{ required: true, message: 'Выберите периодичность' }]}
          >
            <Select>
              <Option value="daily">Ежедневно</Option>
              <Option value="weekly">Еженедельно</Option>
              <Option value="monthly">Ежемесячно</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="time"
            label="Время создания бэкапа"
            rules={[{ required: true, message: 'Выберите время' }]}
          >
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="maxBackups"
            label="Максимальное количество хранимых бэкапов"
            rules={[{ required: true, message: 'Введите количество' }]}
          >
            <Input type="number" min={1} max={100} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

