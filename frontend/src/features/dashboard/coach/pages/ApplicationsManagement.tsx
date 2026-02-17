/**
 * Страница управления заявками на соревнования (тренер)
 * 
 * Функциональность:
 * - Просмотр заявок команды
 * - Создание заявок на соревнования
 * - Выбор спортсменов для участия
 * - Отслеживание статуса заявок
 */

import { useState, useEffect } from 'react';
import { Table, Button, Tag, Modal, Form, Select, message, Space, Card } from 'antd';
import { PlusOutlined, TrophyOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';

interface Application {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  competition: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    sport: {
      name: string;
    };
  };
  submittedAt: string;
  processedAt?: string;
}

export const ApplicationsManagement = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  useEffect(() => {
    loadApplications();
    loadCompetitions();
  }, [pagination.current, pagination.pageSize]);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(
        `/applications/team/my?page=${pagination.current}&limit=${pagination.pageSize}`
      );
      setApplications(response.data.data.applications);
      setPagination({
        ...pagination,
        total: response.data.data.pagination.total,
      });
    } catch (error: any) {
      message.error('Ошибка загрузки заявок');
    } finally {
      setLoading(false);
    }
  };

  const loadCompetitions = async () => {
    try {
      const response = await apiClient.get('/competitions?status=UPCOMING,REGISTRATION');
      setCompetitions(response.data.data.competitions);
    } catch (error) {
      console.error('Ошибка загрузки соревнований', error);
    }
  };

  const handleCreate = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      await apiClient.post('/applications', {
        competitionId: values.competitionId,
        athleteIds: values.athleteIds || [],
      });
      message.success('Заявка успешно подана');
      setModalVisible(false);
      loadApplications();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при подаче заявки');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'orange',
      APPROVED: 'green',
      REJECTED: 'red',
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      PENDING: 'На модерации',
      APPROVED: 'Одобрена',
      REJECTED: 'Отклонена',
    };
    return texts[status] || status;
  };

  const columns = [
    {
      title: 'Соревнование',
      key: 'competition',
      render: (_: any, record: Application) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.competition.name}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>
            {record.competition.sport.name}
          </div>
        </div>
      ),
    },
    {
      title: 'Даты проведения',
      key: 'dates',
      render: (_: any, record: Application) => (
        <div>
          <div>{new Date(record.competition.startDate).toLocaleDateString('ru-RU')}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>
            до {new Date(record.competition.endDate).toLocaleDateString('ru-RU')}
          </div>
        </div>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: 'Дата подачи',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
    },
    {
      title: 'Дата обработки',
      dataIndex: 'processedAt',
      key: 'processedAt',
      render: (date: string | undefined) =>
        date ? new Date(date).toLocaleDateString('ru-RU') : '-',
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#262626' }}>Заявки на соревнования</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Подать заявку
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={applications}
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
      </Card>

      <Modal
        title="Подать заявку на соревнование"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="competitionId"
            label="Соревнование"
            rules={[{ required: true, message: 'Выберите соревнование' }]}
          >
            <Select placeholder="Выберите соревнование">
              {competitions.map((comp) => (
                <Select.Option key={comp.id} value={comp.id}>
                  {comp.name} ({comp.sport?.name}) -{' '}
                  {new Date(comp.startDate).toLocaleDateString('ru-RU')}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="athleteIds"
            label="Спортсмены (оставьте пустым для всех)"
            help="Если не указать, будут зарегистрированы все спортсмены команды"
          >
            <Select
              mode="multiple"
              placeholder="Выберите спортсменов (опционально)"
            >
              {/* TODO: Загрузить список спортсменов команды */}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

