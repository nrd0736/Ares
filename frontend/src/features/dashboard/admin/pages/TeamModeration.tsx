/**
 * Страница модерации команд (администратор)
 * 
 * Функциональность:
 * - Просмотр команд на модерации
 * - Одобрение/отклонение команд
 * - Просмотр детальной информации о команде
 * - Просмотр спортсменов команды
 */

import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Modal, Descriptions, message, Popconfirm, Tabs } from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';

interface Team {
  id: string;
  name: string;
  status: string;
  address?: string;
  contactInfo?: string;
  description?: string;
  createdAt: string;
  region?: {
    name: string;
    federalDistrict?: {
      name: string;
    };
  };
}

interface Application {
  id: string;
  teamId: string;
  competitionId: string;
  status: string;
  submittedAt: string;
  team: {
    id: string;
    name: string;
    address?: string;
    contactInfo?: string;
    description?: string;
    region?: {
      name: string;
      federalDistrict?: {
        name: string;
      };
    };
  };
  competition: {
    id: string;
    name: string;
    sport?: {
      name: string;
    };
    startDate: string;
    endDate: string;
  };
}

export const TeamModeration = () => {
  const [activeTab, setActiveTab] = useState('teams');
  
  // Состояния для команд на модерации
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamModalVisible, setTeamModalVisible] = useState(false);
  const [teamsPagination, setTeamsPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // Состояния для заявок на соревнования
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [applicationModalVisible, setApplicationModalVisible] = useState(false);
  const [applicationsPagination, setApplicationsPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  useEffect(() => {
    if (activeTab === 'teams') {
      loadPendingTeams();
    } else {
      loadPendingApplications();
    }
  }, [activeTab, teamsPagination.current, teamsPagination.pageSize, applicationsPagination.current, applicationsPagination.pageSize]);

  const loadPendingTeams = async () => {
    setLoadingTeams(true);
    try {
      const response = await apiClient.get(
        `/teams/moderation/pending?page=${teamsPagination.current}&limit=${teamsPagination.pageSize}`
      );
      setTeams(response.data.data.teams || []);
      setTeamsPagination({
        ...teamsPagination,
        total: response.data.data.pagination?.total || 0,
      });
    } catch (error: any) {
      message.error('Ошибка загрузки команд на модерации');
      console.error('Ошибка загрузки команд:', error);
    } finally {
      setLoadingTeams(false);
    }
  };

  const loadPendingApplications = async () => {
    setLoadingApplications(true);
    try {
      const response = await apiClient.get(
        `/applications/moderation/pending?page=${applicationsPagination.current}&limit=${applicationsPagination.pageSize}`
      );
      setApplications(response.data.data.applications || []);
      setApplicationsPagination({
        ...applicationsPagination,
        total: response.data.data.pagination?.total || 0,
      });
    } catch (error: any) {
      message.error('Ошибка загрузки заявок на модерацию');
      console.error('Ошибка загрузки заявок:', error);
    } finally {
      setLoadingApplications(false);
    }
  };

  const handleTeamApprove = async (id: string) => {
    try {
      await apiClient.post(`/teams/${id}/moderate`, { status: 'APPROVED' });
      message.success('Команда одобрена');
      loadPendingTeams();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при одобрении команды');
    }
  };

  const handleTeamReject = async (id: string) => {
    try {
      await apiClient.post(`/teams/${id}/moderate`, { status: 'REJECTED' });
      message.success('Команда отклонена');
      loadPendingTeams();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при отклонении команды');
    }
  };

  const handleApplicationApprove = async (id: string) => {
    try {
      await apiClient.put(`/applications/${id}/status`, { status: 'APPROVED' });
      message.success('Заявка одобрена');
      loadPendingApplications();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при одобрении заявки');
    }
  };

  const handleApplicationReject = async (id: string) => {
    try {
      await apiClient.put(`/applications/${id}/status`, { status: 'REJECTED' });
      message.success('Заявка отклонена');
      loadPendingApplications();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при отклонении заявки');
    }
  };

  const handleTeamView = (team: Team) => {
    setSelectedTeam(team);
    setTeamModalVisible(true);
  };

  const handleApplicationView = (application: Application) => {
    setSelectedApplication(application);
    setApplicationModalVisible(true);
  };

  const teamsColumns = [
    {
      title: 'Название команды',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Регион',
      key: 'region',
      render: (_: any, record: Team) => record.region?.name || '-',
    },
    {
      title: 'Федеральный округ',
      key: 'federalDistrict',
      render: (_: any, record: Team) => record.region?.federalDistrict?.name || '-',
    },
    {
      title: 'Дата подачи заявки',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Team) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleTeamView(record)}
          >
            Просмотреть
          </Button>
          <Popconfirm
            title="Одобрить эту команду?"
            onConfirm={() => handleTeamApprove(record.id)}
          >
            <Button type="link" icon={<CheckOutlined />} style={{ color: 'green' }}>
              Одобрить
            </Button>
          </Popconfirm>
          <Popconfirm
            title="Отклонить эту команду?"
            onConfirm={() => handleTeamReject(record.id)}
          >
            <Button type="link" icon={<CloseOutlined />} danger>
              Отклонить
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const applicationsColumns = [
    {
      title: 'Команда',
      key: 'team',
      render: (_: any, record: Application) => record.team?.name || '-',
    },
    {
      title: 'Соревнование',
      key: 'competition',
      render: (_: any, record: Application) => record.competition?.name || '-',
    },
    {
      title: 'Вид спорта',
      key: 'sport',
      render: (_: any, record: Application) => record.competition?.sport?.name || '-',
    },
    {
      title: 'Регион команды',
      key: 'region',
      render: (_: any, record: Application) => record.team?.region?.name || '-',
    },
    {
      title: 'Дата подачи заявки',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Application) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleApplicationView(record)}
          >
            Просмотреть
          </Button>
          <Popconfirm
            title="Одобрить эту заявку?"
            onConfirm={() => handleApplicationApprove(record.id)}
          >
            <Button type="link" icon={<CheckOutlined />} style={{ color: 'green' }}>
              Одобрить
            </Button>
          </Popconfirm>
          <Popconfirm
            title="Отклонить эту заявку?"
            onConfirm={() => handleApplicationReject(record.id)}
          >
            <Button type="link" icon={<CloseOutlined />} danger>
              Отклонить
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#262626' }}>Модерация команд</h1>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.TabPane 
          tab={`Команды на модерации (${teamsPagination.total})`} 
          key="teams"
        >
          {teams.length === 0 && !loadingTeams ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#8c8c8c' }}>
              <p>Нет команд на модерации</p>
              <p style={{ fontSize: '12px' }}>Команды, ожидающие одобрения, появятся здесь</p>
            </div>
          ) : (
            <Table
              columns={teamsColumns}
              dataSource={teams}
              loading={loadingTeams}
              rowKey="id"
              pagination={{
                ...teamsPagination,
                showSizeChanger: true,
                showTotal: (total) => `Всего: ${total}`,
              }}
              onChange={(pagination) => {
                setTeamsPagination({
                  current: pagination.current || 1,
                  pageSize: pagination.pageSize || 10,
                  total: pagination.total || 0,
                });
              }}
            />
          )}
        </Tabs.TabPane>

        <Tabs.TabPane 
          tab={`Заявки на соревнования (${applicationsPagination.total})`} 
          key="applications"
        >
          {applications.length === 0 && !loadingApplications ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#8c8c8c' }}>
              <p>Нет заявок на модерацию</p>
              <p style={{ fontSize: '12px' }}>Заявки команд на соревнования появятся здесь после их подачи</p>
            </div>
          ) : (
            <Table
              columns={applicationsColumns}
              dataSource={applications}
              loading={loadingApplications}
              rowKey="id"
              pagination={{
                ...applicationsPagination,
                showSizeChanger: true,
                showTotal: (total) => `Всего: ${total}`,
              }}
              onChange={(pagination) => {
                setApplicationsPagination({
                  current: pagination.current || 1,
                  pageSize: pagination.pageSize || 10,
                  total: pagination.total || 0,
                });
              }}
            />
          )}
        </Tabs.TabPane>
      </Tabs>

      {/* Модальное окно для команды */}
      <Modal
        title="Детали команды"
        open={teamModalVisible}
        onCancel={() => setTeamModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setTeamModalVisible(false)}>
            Закрыть
          </Button>,
          <Popconfirm
            key="reject"
            title="Отклонить эту команду?"
            onConfirm={() => {
              if (selectedTeam) {
                handleTeamReject(selectedTeam.id);
                setTeamModalVisible(false);
              }
            }}
          >
            <Button danger icon={<CloseOutlined />}>
              Отклонить
            </Button>
          </Popconfirm>,
          <Popconfirm
            key="approve"
            title="Одобрить эту команду?"
            onConfirm={() => {
              if (selectedTeam) {
                handleTeamApprove(selectedTeam.id);
                setTeamModalVisible(false);
              }
            }}
          >
            <Button type="primary" icon={<CheckOutlined />} style={{ background: 'green', borderColor: 'green' }}>
              Одобрить
            </Button>
          </Popconfirm>,
        ]}
        width={700}
      >
        {selectedTeam && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Название команды">{selectedTeam.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Регион">{selectedTeam.region?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Федеральный округ">
              {selectedTeam.region?.federalDistrict?.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Адрес команды">{selectedTeam.address || '-'}</Descriptions.Item>
            <Descriptions.Item label="Контактная информация">{selectedTeam.contactInfo || '-'}</Descriptions.Item>
            <Descriptions.Item label="Описание команды">{selectedTeam.description || '-'}</Descriptions.Item>
            <Descriptions.Item label="Дата подачи заявки">
              {new Date(selectedTeam.createdAt).toLocaleString('ru-RU')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Модальное окно для заявки на соревнование */}
      <Modal
        title="Детали заявки команды на соревнование"
        open={applicationModalVisible}
        onCancel={() => setApplicationModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setApplicationModalVisible(false)}>
            Закрыть
          </Button>,
          <Popconfirm
            key="reject"
            title="Отклонить эту заявку?"
            onConfirm={() => {
              if (selectedApplication) {
                handleApplicationReject(selectedApplication.id);
                setApplicationModalVisible(false);
              }
            }}
          >
            <Button danger icon={<CloseOutlined />}>
              Отклонить
            </Button>
          </Popconfirm>,
          <Popconfirm
            key="approve"
            title="Одобрить эту заявку?"
            onConfirm={() => {
              if (selectedApplication) {
                handleApplicationApprove(selectedApplication.id);
                setApplicationModalVisible(false);
              }
            }}
          >
            <Button type="primary" icon={<CheckOutlined />} style={{ background: 'green', borderColor: 'green' }}>
              Одобрить
            </Button>
          </Popconfirm>,
        ]}
        width={700}
      >
        {selectedApplication && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Команда">{selectedApplication.team?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Соревнование">
              {selectedApplication.competition?.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Вид спорта">
              {selectedApplication.competition?.sport?.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Регион команды">
              {selectedApplication.team?.region?.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Федеральный округ">
              {selectedApplication.team?.region?.federalDistrict?.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Адрес команды">
              {selectedApplication.team?.address || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Контактная информация">
              {selectedApplication.team?.contactInfo || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Описание команды">
              {selectedApplication.team?.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Дата подачи заявки">
              {new Date(selectedApplication.submittedAt).toLocaleString('ru-RU')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};
