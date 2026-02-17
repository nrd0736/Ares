/**
 * Страница управления системными логами (администратор)
 * 
 * Функциональность:
 * - Просмотр логов действий пользователей
 * - Фильтрация по различным критериям
 * - Настройки логирования
 * - Очистка старых логов
 */

import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Space,
  message,
  Modal,
  Form,
  Select,
  Tag,
  Input,
  DatePicker,
  Button,
  Tooltip,
} from 'antd';
import {
  FileTextOutlined,
  SettingOutlined,
  ReloadOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import dayjs, { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface SystemLog {
  id: string;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: string;
  entityId?: string | null;
  entityName?: string | null;
  changes?: any;
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

interface LoggingSettings {
  retentionPeriod: 'week' | 'month' | '3months' | '6months' | 'year';
}

export const LoggingManagement = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50 });
  const [filters, setFilters] = useState({
    entityType: undefined as string | undefined,
    action: undefined as string | undefined,
    userId: undefined as string | undefined,
    dateRange: undefined as [Dayjs, Dayjs] | undefined,
  });
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [settings, setSettings] = useState<LoggingSettings>({
    retentionPeriod: 'month',
  });
  const [settingsForm] = Form.useForm();
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

  useEffect(() => {
    loadLogs();
    loadSettings();
  }, [pagination.current, pagination.pageSize, filters]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params: any = {
        limit: pagination.pageSize,
        offset: (pagination.current - 1) * pagination.pageSize,
      };

      if (filters.entityType) {
        params.entityType = filters.entityType;
      }

      if (filters.action) {
        params.action = filters.action;
      }

      if (filters.userId) {
        params.userId = filters.userId;
      }

      if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
        params.startDate = filters.dateRange[0].startOf('day').toISOString();
        params.endDate = filters.dateRange[1].endOf('day').toISOString();
      }

      const response = await apiClient.get('/logging', { params });
      const data = response.data.data;
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка загрузки логов');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await apiClient.get('/logging/settings');
      const loadedSettings = response.data.data || { retentionPeriod: 'month' };
      setSettings(loadedSettings);
      settingsForm.setFieldsValue(loadedSettings);
    } catch (error: any) {
      console.error('Ошибка загрузки настроек', error);
    }
  };

  const handleSaveSettings = async (values: any) => {
    try {
      await apiClient.put('/logging/settings', values);
      message.success('Настройки сохранены');
      setSettingsModalVisible(false);
      loadSettings();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при сохранении настроек');
    }
  };

  const handleViewDetails = (log: SystemLog) => {
    setSelectedLog(log);
    setDetailsModalVisible(true);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'green';
      case 'UPDATE':
        return 'blue';
      case 'DELETE':
        return 'red';
      default:
        return 'default';
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'Создание';
      case 'UPDATE':
        return 'Изменение';
      case 'DELETE':
        return 'Удаление';
      default:
        return action;
    }
  };

  const formatChanges = (changes: any) => {
    if (!changes) return 'Нет данных';
    
    try {
      if (typeof changes === 'string') {
        changes = JSON.parse(changes);
      }
      
      if (changes.old && changes.new) {
        return `Изменено: ${JSON.stringify(changes.old)} → ${JSON.stringify(changes.new)}`;
      } else if (changes.new) {
        return `Создано: ${JSON.stringify(changes.new)}`;
      } else if (changes.old) {
        return `Удалено: ${JSON.stringify(changes.old)}`;
      }
      
      return JSON.stringify(changes, null, 2);
    } catch {
      return String(changes);
    }
  };

  const parseUserAgent = (userAgent: string): string => {
    if (!userAgent) return 'Неизвестно';
    
    // Парсим User Agent для получения читаемой информации
    let browser = 'Неизвестный браузер';
    let os = '';
    let version = '';

    // Определяем браузер
    if (userAgent.includes('OPR/')) {
      const match = userAgent.match(/OPR\/(\d+\.\d+\.\d+\.\d+)/);
      browser = 'Opera';
      version = match ? match[1] : '';
    } else if (userAgent.includes('Edg/')) {
      const match = userAgent.match(/Edg\/(\d+\.\d+\.\d+\.\d+)/);
      browser = 'Microsoft Edge';
      version = match ? match[1] : '';
    } else if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) {
      const match = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
      browser = 'Chrome';
      version = match ? match[1] : '';
    } else if (userAgent.includes('Firefox/')) {
      const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
      browser = 'Firefox';
      version = match ? match[1] : '';
    } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) {
      const match = userAgent.match(/Version\/(\d+\.\d+)/);
      browser = 'Safari';
      version = match ? match[1] : '';
    }

    // Определяем ОС
    if (userAgent.includes('Windows NT 10.0')) {
      os = 'Windows 10/11';
    } else if (userAgent.includes('Windows NT 6.3')) {
      os = 'Windows 8.1';
    } else if (userAgent.includes('Windows NT 6.2')) {
      os = 'Windows 8';
    } else if (userAgent.includes('Windows NT 6.1')) {
      os = 'Windows 7';
    } else if (userAgent.includes('Mac OS X')) {
      const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
      os = match ? `macOS ${match[1].replace('_', '.')}` : 'macOS';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    } else if (userAgent.includes('Android')) {
      const match = userAgent.match(/Android (\d+\.\d+)/);
      os = match ? `Android ${match[1]}` : 'Android';
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      const match = userAgent.match(/OS (\d+[._]\d+)/);
      os = match ? `iOS ${match[1].replace('_', '.')}` : 'iOS';
    }

    // Формируем результат
    const parts: string[] = [];
    if (browser !== 'Неизвестный браузер') {
      parts.push(version ? `${browser} ${version.split('.')[0]}` : browser);
    }
    if (os) {
      parts.push(`на ${os}`);
    }

    return parts.length > 0 ? parts.join(' ') : userAgent.substring(0, 50) + '...';
  };

  const columns = [
    {
      title: 'Дата и время',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm:ss'),
      sorter: true,
    },
    {
      title: 'Пользователь',
      key: 'user',
      width: 200,
      render: (_: any, record: SystemLog) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {record.userName || record.userEmail || 'Система'}
          </div>
          {record.userEmail && record.userName && (
            <div style={{ fontSize: '12px', color: '#999' }}>
              {record.userEmail}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Действие',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (action: string) => (
        <Tag color={getActionColor(action)}>{getActionText(action)}</Tag>
      ),
      filters: [
        { text: 'Создание', value: 'CREATE' },
        { text: 'Изменение', value: 'UPDATE' },
        { text: 'Удаление', value: 'DELETE' },
      ],
    },
    {
      title: 'Тип сущности',
      dataIndex: 'entityType',
      key: 'entityType',
      width: 150,
    },
    {
      title: 'Сущность',
      key: 'entity',
      render: (_: any, record: SystemLog) => (
        <div>
          {record.entityName ? (
            <Tooltip title={record.entityId}>
              <span>{record.entityName}</span>
            </Tooltip>
          ) : (
            <span style={{ color: '#999' }}>{record.entityId || '-'}</span>
          )}
        </div>
      ),
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_: any, record: SystemLog) => (
        <Button
          type="link"
          size="small"
          icon={<FileTextOutlined />}
          onClick={() => handleViewDetails(record)}
        >
          Детали
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#262626' }}>Логирование системы</h1>
      </div>
      <Card
        extra={
          <Space>
            <Button
              icon={<FilterOutlined />}
              onClick={() => {
                // Сброс фильтров
                setFilters({
                  entityType: undefined,
                  action: undefined,
                  userId: undefined,
                  dateRange: undefined,
                });
                setPagination({ ...pagination, current: 1 });
              }}
            >
              Сбросить фильтры
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadLogs}
              loading={loading}
            >
              Обновить
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
        <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
          <Space wrap>
            <Select
              placeholder="Тип сущности"
              allowClear
              style={{ width: 200 }}
              value={filters.entityType}
              onChange={(value) => setFilters({ ...filters, entityType: value })}
            >
              <Option value="User">Пользователь</Option>
              <Option value="Team">Команда</Option>
              <Option value="Competition">Соревнование</Option>
              <Option value="Bracket">Турнирная сетка</Option>
              <Option value="Match">Матч</Option>
              <Option value="News">Новость</Option>
              <Option value="Application">Заявка</Option>
            </Select>
            <Select
              placeholder="Действие"
              allowClear
              style={{ width: 150 }}
              value={filters.action}
              onChange={(value) => setFilters({ ...filters, action: value })}
            >
              <Option value="CREATE">Создание</Option>
              <Option value="UPDATE">Изменение</Option>
              <Option value="DELETE">Удаление</Option>
            </Select>
            <RangePicker
              placeholder={['Дата начала', 'Дата окончания']}
              value={filters.dateRange}
              onChange={(dates) =>
                setFilters({ ...filters, dateRange: dates as [Dayjs, Dayjs] | undefined })
              }
            />
          </Space>
        </Space>

        <Table
          columns={columns}
          dataSource={logs}
          loading={loading}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (total) => `Всего: ${total}`,
            onChange: (page, pageSize) => {
              setPagination({ current: page, pageSize });
            },
          }}
        />
      </Card>

      {/* Модальное окно настроек */}
      <Modal
        title="Настройки логирования"
        open={settingsModalVisible}
        onCancel={() => {
          setSettingsModalVisible(false);
          settingsForm.resetFields();
        }}
        onOk={() => settingsForm.submit()}
        width={500}
      >
        <Form form={settingsForm} onFinish={handleSaveSettings} layout="vertical">
          <Form.Item
            name="retentionPeriod"
            label="Период хранения логов"
            rules={[{ required: true, message: 'Выберите период хранения' }]}
          >
            <Select>
              <Option value="week">Неделя</Option>
              <Option value="month">Месяц</Option>
              <Option value="3months">3 месяца</Option>
              <Option value="6months">6 месяцев</Option>
              <Option value="year">Год</Option>
            </Select>
          </Form.Item>
          <div style={{ color: '#999', fontSize: '12px', marginTop: -16 }}>
            Логи старше выбранного периода будут автоматически удалены
          </div>
        </Form>
      </Modal>

      {/* Модальное окно деталей лога */}
      <Modal
        title="Детали лога"
        open={detailsModalVisible}
        onCancel={() => {
          setDetailsModalVisible(false);
          setSelectedLog(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setDetailsModalVisible(false);
            setSelectedLog(null);
          }}>
            Закрыть
          </Button>,
        ]}
        width={800}
      >
        {selectedLog && (
          <div>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <strong>Дата и время:</strong>{' '}
                {dayjs(selectedLog.createdAt).format('DD.MM.YYYY HH:mm:ss')}
              </div>
              <div>
                <strong>Пользователь:</strong>{' '}
                {selectedLog.userName || selectedLog.userEmail || 'Система'}
                {selectedLog.userEmail && (
                  <span style={{ color: '#999' }}> ({selectedLog.userEmail})</span>
                )}
              </div>
              <div>
                <strong>Действие:</strong>{' '}
                <Tag color={getActionColor(selectedLog.action)}>
                  {getActionText(selectedLog.action)}
                </Tag>
              </div>
              <div>
                <strong>Тип сущности:</strong> {selectedLog.entityType}
              </div>
              {selectedLog.entityName && (
                <div>
                  <strong>Сущность:</strong> {selectedLog.entityName}
                </div>
              )}
              {selectedLog.entityId && (
                <div>
                  <strong>ID сущности:</strong> {selectedLog.entityId}
                </div>
              )}
              {selectedLog.description && (
                <div>
                  <strong>Описание:</strong> {selectedLog.description}
                </div>
              )}
              {selectedLog.changes && (
                <div>
                  <strong>Изменения:</strong>
                  <pre
                    style={{
                      background: '#f5f5f5',
                      padding: '12px',
                      borderRadius: '4px',
                      maxHeight: '300px',
                      overflow: 'auto',
                      fontSize: '12px',
                    }}
                  >
                    {formatChanges(selectedLog.changes)}
                  </pre>
                </div>
              )}
              {selectedLog.ipAddress && (
                <div>
                  <strong>IP адрес:</strong> {selectedLog.ipAddress}
                </div>
              )}
              {selectedLog.userAgent && (
                <div>
                  <strong>Браузер:</strong>{' '}
                  <span style={{ fontSize: '12px', color: '#999' }}>
                    {parseUserAgent(selectedLog.userAgent)}
                  </span>
                </div>
              )}
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

