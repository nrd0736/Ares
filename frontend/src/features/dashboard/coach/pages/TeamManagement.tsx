/**
 * Страница управления командой (тренер)
 * 
 * Функциональность:
 * - Просмотр спортсменов команды
 * - Одобрение/отклонение заявок спортсменов на регистрацию
 * - Просмотр информации о спортсменах
 * - Управление весовыми категориями спортсменов
 * 
 * Особенности:
 * - Тренер видит только своих спортсменов
 * - Управление заявками на регистрацию
 * - Просмотр статистики команды
 */

import { useState, useEffect } from 'react';
import { Card, Table, Tag, Descriptions, Avatar, Space, message, Tabs, Button, Popconfirm, Modal, Form, InputNumber, Select } from 'antd';
import { UserOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store/store';
import { getAvatarUrl } from '../../../../utils/image-utils';

interface Athlete {
  id: string;
  user: {
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      avatarUrl?: string;
    };
  };
  birthDate: string;
  gender: 'MALE' | 'FEMALE';
  rank?: string;
  sportsRank?: {
    id: string;
    name: string;
  };
  weightCategory?: {
    name: string;
  };
}

interface Coach {
  id: string;
  user: {
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      middleName?: string;
      avatarUrl?: string;
    };
  };
  qualification?: string;
  experience?: string;
}

interface RegistrationRequest {
  id: string;
  userId: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  weight?: number;
  weightCategory?: {
    id: string;
    name: string;
  };
  sportsRank?: {
    id: string;
    name: string;
  };
  user: {
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      middleName?: string;
    };
  };
}

interface Team {
  id: string;
  name: string;
  region: {
    name: string;
  };
  athletes: Athlete[];
  coaches: Coach[];
}

export const TeamManagement = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(false);
  const [registrationRequests, setRegistrationRequests] = useState<RegistrationRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [approveForm] = Form.useForm();
  const [weightCategories, setWeightCategories] = useState<any[]>([]);

  useEffect(() => {
    loadTeam();
    loadRegistrationRequests();
    loadWeightCategories();
  }, []);

  const loadTeam = async () => {
    setLoading(true);
    try {
      // Получаем команду тренера
      const response = await apiClient.get('/teams/my');
      setTeam(response.data.data);
    } catch (error) {
      console.error('Ошибка загрузки команды', error);
      message.error('Ошибка загрузки информации о команде');
    } finally {
      setLoading(false);
    }
  };

  const loadRegistrationRequests = async () => {
    setLoadingRequests(true);
    try {
      const response = await apiClient.get('/auth/athlete-requests');
      const requests = response.data?.data?.requests || response.data?.requests || [];
      setRegistrationRequests(requests);
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Если заявок нет, это нормально
        setRegistrationRequests([]);
      } else {
        message.error('Ошибка загрузки заявок спортсменов');
      }
    } finally {
      setLoadingRequests(false);
    }
  };

  const loadWeightCategories = async () => {
    try {
      const response = await apiClient.get('/references/sports');
      const allCategories: any[] = [];
      for (const sport of response.data.data) {
        if (sport.weightCategories) {
          allCategories.push(...sport.weightCategories);
        }
      }
      setWeightCategories(allCategories);
    } catch (error) {
      console.error('Ошибка загрузки весовых категорий', error);
    }
  };

  const handleApprove = async (request: RegistrationRequest) => {
    setSelectedRequest(request);
    approveForm.setFieldsValue({
      weightCategoryId: request.weightCategory?.id,
      weight: request.weight,
    });
    setApproveModalVisible(true);
  };

  const handleApproveSubmit = async (values: any) => {
    if (!selectedRequest) return;
    
    try {
      await apiClient.post(`/auth/athlete-requests/${selectedRequest.id}/approve`, {
        weightCategoryId: values.weightCategoryId,
        weight: values.weight,
      });
      message.success('Заявка подтверждена');
      setApproveModalVisible(false);
      setSelectedRequest(null);
      approveForm.resetFields();
      loadRegistrationRequests();
      loadTeam(); // Обновляем список спортсменов
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при подтверждении заявки');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await apiClient.post(`/auth/athlete-requests/${requestId}/reject`);
      message.success('Заявка отклонена');
      loadRegistrationRequests();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при отклонении заявки');
    }
  };

  const columns = [
    {
      title: 'Спортсмен',
      key: 'athlete',
      render: (_: any, record: Athlete) => (
        <Space>
          <Avatar
            src={getAvatarUrl(record.user.profile.avatarUrl)}
            icon={<UserOutlined />}
          />
          <span>
            {record.user.profile.firstName} {record.user.profile.lastName}
          </span>
        </Space>
      ),
    },
    {
      title: 'Email',
      key: 'email',
      render: (_: any, record: Athlete) => record.user.email,
    },
    {
      title: 'Дата рождения',
      dataIndex: 'birthDate',
      key: 'birthDate',
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
    },
    {
      title: 'Пол',
      dataIndex: 'gender',
      key: 'gender',
      render: (gender: string) => (
        <Tag>{gender === 'MALE' ? 'Мужской' : 'Женский'}</Tag>
      ),
    },
    {
      title: 'Разряд',
      key: 'sportsRank',
      render: (_: any, record: Athlete) => record.sportsRank?.name || record.rank || '-',
    },
    {
      title: 'Весовая категория',
      key: 'weightCategory',
      render: (_: any, record: Athlete) => record.weightCategory?.name || '-',
    },
  ];


  const coachColumns = [
    {
      title: 'Тренер',
      key: 'coach',
      render: (_: any, record: Coach) => (
        <Space>
          <Avatar
            src={getAvatarUrl(record.user.profile.avatarUrl)}
            icon={<UserOutlined />}
          />
          <span>
            {record.user.profile.firstName} {record.user.profile.lastName} {record.user.profile.middleName || ''}
          </span>
        </Space>
      ),
    },
    {
      title: 'Email',
      key: 'email',
      render: (_: any, record: Coach) => record.user.email,
    },
    {
      title: 'Квалификация',
      dataIndex: 'qualification',
      key: 'qualification',
      render: (qualification: string) => qualification || '-',
    },
    {
      title: 'Опыт',
      dataIndex: 'experience',
      key: 'experience',
      render: (experience: string) => experience || '-',
    },
  ];

  const requestColumns = [
    {
      title: 'Спортсмен',
      key: 'athlete',
      render: (_: any, record: RegistrationRequest) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <span>
            {record.user.profile.firstName} {record.user.profile.lastName} {record.user.profile.middleName || ''}
          </span>
        </Space>
      ),
    },
    {
      title: 'Email',
      key: 'email',
      render: (_: any, record: RegistrationRequest) => record.user.email,
    },
    {
      title: 'Дата рождения',
      dataIndex: 'birthDate',
      key: 'birthDate',
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
    },
    {
      title: 'Пол',
      dataIndex: 'gender',
      key: 'gender',
      render: (gender: string) => (
        <Tag>{gender === 'MALE' ? 'Мужской' : 'Женский'}</Tag>
      ),
    },
    {
      title: 'Вес',
      dataIndex: 'weight',
      key: 'weight',
      render: (weight: number) => weight ? `${weight} кг` : '-',
    },
    {
      title: 'Весовая категория',
      key: 'weightCategory',
      render: (_: any, record: RegistrationRequest) => record.weightCategory?.name || '-',
    },
    {
      title: 'Разряд',
      key: 'sportsRank',
      render: (_: any, record: RegistrationRequest) => record.sportsRank?.name || '-',
    },
    {
      title: 'Дата заявки',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: RegistrationRequest) => (
        <Space>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => handleApprove(record)}
          >
            Подтвердить
          </Button>
          <Popconfirm
            title="Отклонить заявку?"
            description="Аккаунт спортсмена будет удален из системы"
            onConfirm={() => handleReject(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button danger icon={<CloseOutlined />}>
              Отклонить
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'athletes',
      label: 'Спортсмены команды',
      children: team ? (
        <Table
          columns={columns}
          dataSource={team.athletes}
          rowKey="id"
          loading={loading}
        />
      ) : (
        <div>Загрузка информации о команде...</div>
      ),
    },
    {
      key: 'coaches',
      label: 'Тренеры команды',
      children: team ? (
        <Table
          columns={coachColumns}
          dataSource={team.coaches}
          rowKey="id"
          loading={loading}
        />
      ) : (
        <div>Загрузка информации о команде...</div>
      ),
    },
    {
      key: 'requests',
      label: 'Заявки спортсменов',
      children: (
        <>
          {registrationRequests.length === 0 && !loadingRequests ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#8c8c8c' }}>
              <p>Нет заявок на регистрацию</p>
            </div>
          ) : (
            <Table
              columns={requestColumns}
              dataSource={registrationRequests}
              rowKey="id"
              loading={loadingRequests}
              pagination={false}
            />
          )}
        </>
      ),
    },
  ];

  return (
    <div>
      {team && (
        <Card style={{ marginBottom: 16 }}>
          <Descriptions title="Информация о команде" bordered>
            <Descriptions.Item label="Название">{team.name}</Descriptions.Item>
            <Descriptions.Item label="Регион">{team.region.name}</Descriptions.Item>
            <Descriptions.Item label="Количество спортсменов">
              {team.athletes.length}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <Card>
        <Tabs items={tabItems} />
      </Card>

      <Modal
        title="Подтвердить регистрацию спортсмена"
        open={approveModalVisible}
        onCancel={() => {
          setApproveModalVisible(false);
          setSelectedRequest(null);
          approveForm.resetFields();
        }}
        onOk={() => approveForm.submit()}
        width={500}
      >
        {selectedRequest && (
          <div style={{ marginBottom: 16 }}>
            <p><strong>Спортсмен:</strong> {selectedRequest.user.profile.firstName} {selectedRequest.user.profile.lastName}</p>
            <p><strong>Email:</strong> {selectedRequest.user.email}</p>
            <p><strong>Дата рождения:</strong> {new Date(selectedRequest.birthDate).toLocaleDateString('ru-RU')}</p>
            <p><strong>Пол:</strong> {selectedRequest.gender === 'MALE' ? 'Мужской' : 'Женский'}</p>
          </div>
        )}
        <Form
          form={approveForm}
          layout="vertical"
          onFinish={handleApproveSubmit}
        >
          <Form.Item
            name="weightCategoryId"
            label="Весовая категория"
          >
            <Select placeholder="Выберите весовую категорию" allowClear>
              {weightCategories.map((cat) => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="weight"
            label="Вес (кг)"
          >
            <InputNumber
              placeholder="Введите вес"
              min={0}
              max={200}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

