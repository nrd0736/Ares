/**
 * Страница управления соревнованиями (администратор)
 * 
 * Функциональность:
 * - Просмотр списка всех соревнований
 * - Создание соревнований
 * - Редактирование соревнований
 * - Удаление соревнований
 * - Управление статусами соревнований
 * - Добавление/удаление судей и тренеров
 * - Загрузка иконок соревнований
 * 
 * Особенности:
 * - Фильтрация по статусу и виду спорта
 * - Поддержка индивидуальных и командных соревнований
 * - Управление участниками
 */

import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, DatePicker, Select, message, Popconfirm, Upload, Avatar, List } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, TrophyOutlined, UserOutlined, TeamOutlined, CloseOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import dayjs from 'dayjs';
import { getCompetitionIconUrl } from '../../../../utils/image-utils';

interface Competition {
  id: string;
  name: string;
  competitionType?: 'INDIVIDUAL' | 'TEAM';
  status: 'UPCOMING' | 'REGISTRATION' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  iconUrl?: string;
  sport?: {
    id?: string;
    name: string;
  };
  startDate: string;
  endDate: string;
  location?: string;
  description?: string;
  judges?: Array<{
    id: string;
    userId: string;
    user: {
      id: string;
      email: string;
      profile: {
        firstName: string;
        lastName: string;
        middleName?: string;
      };
    };
  }>;
  coaches?: Array<{
    id: string;
    coachId: string;
    coach: {
      id: string;
      user: {
        id: string;
        email: string;
        profile: {
          firstName: string;
          lastName: string;
          middleName?: string;
        };
      };
      team: {
        id: string;
        name: string;
      };
    };
  }>;
  _count?: {
    participants: number;
    teamParticipants?: number; // Добавляем счетчик командных участников
    brackets: number;
    judges: number;
    coaches: number;
  };
}

interface Judge {
  id: string;
  email: string;
  profile: {
    firstName: string;
    lastName: string;
    middleName?: string;
  };
}

interface Coach {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      middleName?: string;
    };
  };
  team: {
    id: string;
    name: string;
  };
}

export const CompetitionsManagement = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [uploadingIcon, setUploadingIcon] = useState<string | null>(null);
  const [judgesModalVisible, setJudgesModalVisible] = useState(false);
  const [teamsModalVisible, setTeamsModalVisible] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [allJudges, setAllJudges] = useState<Judge[]>([]);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [competitionJudges, setCompetitionJudges] = useState<any[]>([]);
  const [competitionTeams, setCompetitionTeams] = useState<any[]>([]);
  const [loadingJudges, setLoadingJudges] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [judgesSelectKey, setJudgesSelectKey] = useState(0);
  const [teamsSelectKey, setTeamsSelectKey] = useState(0);

  useEffect(() => {
    loadCompetitions();
    loadSports();
    loadAllJudges();
    loadAllTeams();
  }, [pagination.current, pagination.pageSize]);

  const loadCompetitions = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(
        `/competitions?page=${pagination.current}&limit=${pagination.pageSize}`
      );
      setCompetitions(response.data.data.competitions);
      setPagination({
        ...pagination,
        total: response.data.data.pagination.total,
      });
    } catch (error: any) {
      message.error('Ошибка загрузки соревнований');
    } finally {
      setLoading(false);
    }
  };

  const loadSports = async () => {
    try {
      const response = await apiClient.get('/references/sports');
      setSports(response.data.data);
    } catch (error) {
      console.error('Ошибка загрузки видов спорта', error);
    }
  };

  const loadAllJudges = async () => {
    try {
      const response = await apiClient.get('/users?role=JUDGE&limit=1000');
      setAllJudges(response.data.data.users || []);
    } catch (error) {
      console.error('Ошибка загрузки судей', error);
    }
  };

  const loadAllTeams = async () => {
    try {
      // Загружаем все команды (без пагинации для выбора)
      let allTeamsList: any[] = [];
      let page = 1;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        try {
          const response = await apiClient.get(`/teams?page=${page}&limit=${limit}`);
          const teams = response.data.data.teams || [];
          allTeamsList = [...allTeamsList, ...teams];
          
          const total = response.data.data.pagination?.total || 0;
          hasMore = allTeamsList.length < total && teams.length === limit;
          page++;
          
          if (page > 100) break; // Защита от бесконечного цикла
        } catch (error) {
          console.error(`Ошибка загрузки страницы ${page} команд:`, error);
          break;
        }
      }
      
      setAllTeams(allTeamsList);
    } catch (error) {
      console.error('Ошибка загрузки команд', error);
    }
  };

  const loadCompetitionJudges = async (competitionId: string) => {
    setLoadingJudges(true);
    try {
      const response = await apiClient.get(`/competitions/${competitionId}/judges`);
      setCompetitionJudges(response.data.data.judges || []);
    } catch (error) {
      message.error('Ошибка загрузки судей соревнования');
    } finally {
      setLoadingJudges(false);
    }
  };

  const loadCompetitionTeams = async (competitionId: string) => {
    setLoadingTeams(true);
    try {
      // Получаем заявки соревнования со статусом APPROVED (одобренные команды)
      const response = await apiClient.get(`/applications?competitionId=${competitionId}&status=APPROVED&limit=1000`);
      const applications = response.data.data.applications || [];
      // Извлекаем команды из заявок
      const teams = applications.map((app: any) => ({
        id: app.team.id,
        name: app.team.name,
        applicationId: app.id,
        status: app.status,
        region: app.team.region,
      }));
      setCompetitionTeams(teams);
    } catch (error) {
      message.error('Ошибка загрузки команд соревнования');
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleManageJudges = (competition: Competition) => {
    setSelectedCompetition(competition);
    setJudgesModalVisible(true);
    loadCompetitionJudges(competition.id);
  };

  const handleManageTeams = (competition: Competition) => {
    setSelectedCompetition(competition);
    setTeamsModalVisible(true);
    loadCompetitionTeams(competition.id);
  };

  const handleAddJudge = async (userId: string) => {
    if (!selectedCompetition) return;
    try {
      await apiClient.post(`/competitions/${selectedCompetition.id}/judges`, { userId });
      message.success('Судья успешно добавлен');
      await loadCompetitionJudges(selectedCompetition.id);
      loadCompetitions();
      // Обновляем ключ Select для очистки значения
      setJudgesSelectKey(prev => prev + 1);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при добавлении судьи');
      throw error;
    }
  };

  const handleRemoveJudge = async (userId: string) => {
    if (!selectedCompetition) return;
    try {
      await apiClient.delete(`/competitions/${selectedCompetition.id}/judges/${userId}`);
      message.success('Судья успешно удален');
      loadCompetitionJudges(selectedCompetition.id);
      loadCompetitions();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при удалении судьи');
    }
  };

  const handleAddTeam = async (teamId: string) => {
    if (!selectedCompetition) return;
    try {
      // Создаем заявку от имени администратора со статусом APPROVED
      await apiClient.post('/applications/admin', {
        teamId,
        competitionId: selectedCompetition.id,
        status: 'APPROVED',
      });
      message.success('Команда успешно добавлена к соревнованию');
      await loadCompetitionTeams(selectedCompetition.id);
      loadCompetitions();
      // Обновляем ключ Select для очистки значения
      setTeamsSelectKey(prev => prev + 1);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при добавлении команды');
      throw error;
    }
  };

  const handleRemoveTeam = async (applicationId: string) => {
    if (!selectedCompetition) return;
    try {
      // Изменяем статус заявки на REJECTED (это отвяжет команду от соревнования)
      await apiClient.put(`/applications/${applicationId}/status`, {
        status: 'REJECTED',
      });
      message.success('Команда успешно удалена из соревнования');
      loadCompetitionTeams(selectedCompetition.id);
      loadCompetitions();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при удалении команды');
    }
  };

  const handleCreate = () => {
    setEditingCompetition(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (competition: Competition) => {
    setEditingCompetition(competition);
    // Нужно получить sportId из списка sports
    const sport = sports.find(s => s.name === competition.sport?.name || s.id === competition.sport?.id);
    form.setFieldsValue({
      name: competition.name,
      sportId: sport?.id || competition.sport?.id,
      competitionType: competition.competitionType || 'INDIVIDUAL',
      startDate: dayjs(competition.startDate),
      endDate: dayjs(competition.endDate),
      location: competition.location || '',
      description: (competition as any).description || '',
      status: competition.status,
    });
    setModalVisible(true);
  };

  const handleIconUpload = async (file: File, competitionId: string) => {
    setUploadingIcon(competitionId);
    try {
      const formData = new FormData();
      formData.append('icon', file);

      const response = await apiClient.post(`/upload/competition-icon/${competitionId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        message.success('Иконка успешно загружена');
        loadCompetitions(); // Перезагружаем список соревнований
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при загрузке иконки');
    } finally {
      setUploadingIcon(null);
    }
    return false;
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/competitions/${id}`);
      message.success('Соревнование успешно отменено');
      loadCompetitions();
    } catch (error: any) {
      message.error('Ошибка при удалении соревнования');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const data: any = {
        name: values.name,
        sportId: values.sportId,
        competitionType: values.competitionType || 'INDIVIDUAL',
        startDate: values.startDate.toISOString(),
        endDate: values.endDate.toISOString(),
      };

      // Добавляем опциональные поля только если они заполнены
      if (values.location !== undefined && values.location !== null && values.location !== '') {
        data.location = values.location;
      }
      if (values.description !== undefined && values.description !== null && values.description !== '') {
        data.description = values.description;
      }
      
      // Добавляем статус только при редактировании
      if (editingCompetition && values.status) {
        data.status = values.status;
      }
      
      // При редактировании можно изменить тип соревнования
      if (editingCompetition && values.competitionType) {
        data.competitionType = values.competitionType;
      }

      if (editingCompetition) {
        await apiClient.put(`/competitions/${editingCompetition.id}`, data);
        message.success('Соревнование успешно обновлено');
      } else {
        await apiClient.post('/competitions', data);
        message.success('Соревнование успешно создано');
      }
      setModalVisible(false);
      setEditingCompetition(null);
      form.resetFields();
      loadCompetitions();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при сохранении');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      UPCOMING: 'blue',
      REGISTRATION: 'orange',
      IN_PROGRESS: 'green',
      COMPLETED: 'purple',
      CANCELLED: 'red',
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      UPCOMING: 'Предстоящее',
      REGISTRATION: 'Регистрация',
      IN_PROGRESS: 'В процессе',
      COMPLETED: 'Завершено',
      CANCELLED: 'Отменено',
    };
    return texts[status] || status;
  };

  const columns = [
    {
      title: 'Иконка',
      key: 'icon',
      width: 100,
      render: (_: any, record: Competition) => (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <Avatar
            size={40}
            icon={<TrophyOutlined />}
            src={getCompetitionIconUrl(record.iconUrl)}
          />
          <Upload
            beforeUpload={(file) => handleIconUpload(file, record.id)}
            showUploadList={false}
            accept="image/*"
          >
            <Button
              type="link"
              icon={<UploadOutlined />}
              size="small"
              loading={uploadingIcon === record.id}
              style={{
                position: 'absolute',
                bottom: -8,
                right: -8,
                padding: 0,
                width: 20,
                height: 20,
                minWidth: 20,
              }}
            />
          </Upload>
        </div>
      ),
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Вид спорта',
      key: 'sport',
      render: (_: any, record: Competition) => record.sport?.name || '-',
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
      title: 'Дата начала',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
    },
    {
      title: 'Дата окончания',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
    },
    {
      title: 'Участники',
      key: 'participants',
      render: (_: any, record: Competition) => record._count?.participants || 0,
    },
    {
      title: 'Судьи',
      key: 'judges',
      render: (_: any, record: Competition) => record._count?.judges || 0,
    },
    {
      title: 'Тренеры',
      key: 'coaches',
      render: (_: any, record: Competition) => record._count?.coaches || 0,
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Competition) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Редактировать
          </Button>
          <Button
            type="link"
            icon={<UserOutlined />}
            onClick={() => handleManageJudges(record)}
          >
            Судьи
          </Button>
          <Button
            type="link"
            icon={<TeamOutlined />}
            onClick={() => handleManageTeams(record)}
          >
            Команды
          </Button>
          <Popconfirm
            title="Вы уверены, что хотите отменить это соревнование?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Отменить
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#262626' }}>Управление соревнованиями</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Создать соревнование
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={competitions}
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
        title={editingCompetition ? 'Редактировать соревнование' : 'Создать соревнование'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="sportId"
            label="Вид спорта"
            rules={[{ required: true }]}
          >
            <Select placeholder="Выберите вид спорта">
              {sports.map((sport) => (
                <Select.Option key={sport.id} value={sport.id}>
                  {sport.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="competitionType"
            label="Тип соревнования"
            rules={[{ required: true }]}
            initialValue="INDIVIDUAL"
          >
            <Select placeholder="Выберите тип соревнования">
              <Select.Option value="INDIVIDUAL">По спортсменам</Select.Option>
              <Select.Option value="TEAM">По командам</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="startDate"
            label="Дата начала"
            rules={[{ required: true }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="endDate"
            label="Дата окончания"
            rules={[{ required: true }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="location" label="Место проведения">
            <Input />
          </Form.Item>

          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={4} />
          </Form.Item>

          {editingCompetition && (
            <Form.Item
              name="status"
              label="Статус"
              rules={[{ required: true }]}
            >
              <Select placeholder="Выберите статус">
                <Select.Option value="UPCOMING">Предстоящее</Select.Option>
                <Select.Option value="REGISTRATION">Регистрация</Select.Option>
                <Select.Option value="IN_PROGRESS">В процессе</Select.Option>
                <Select.Option value="COMPLETED">Завершено</Select.Option>
                <Select.Option value="CANCELLED">Отменено</Select.Option>
              </Select>
            </Form.Item>
          )}

          {editingCompetition && (
            <Form.Item label="Иконка соревнования">
              <Space>
                <Avatar
                  size={64}
                  icon={<TrophyOutlined />}
                  src={getCompetitionIconUrl(editingCompetition.iconUrl)}
                />
                <Upload
                  beforeUpload={(file) => {
                    handleIconUpload(file, editingCompetition.id);
                    return false;
                  }}
                  showUploadList={false}
                  accept="image/*"
                >
                  <Button icon={<UploadOutlined />} loading={uploadingIcon === editingCompetition.id}>
                    Загрузить иконку
                  </Button>
                </Upload>
              </Space>
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Модальное окно для управления судьями */}
      <Modal
        title={`Управление судьями: ${selectedCompetition?.name}`}
        open={judgesModalVisible}
        onCancel={() => {
          setJudgesModalVisible(false);
          setSelectedCompetition(null);
          setCompetitionJudges([]);
        }}
        footer={null}
        width={700}
      >
        <div style={{ marginBottom: 16 }}>
          <Select
            key={judgesSelectKey}
            style={{ width: '100%' }}
            placeholder="Выберите судью для добавления"
            showSearch
            filterOption={(input, option) =>
              (option?.label as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
            onChange={async (userId) => {
              if (userId && selectedCompetition) {
                try {
                  await handleAddJudge(userId);
                } catch (error) {
                  // Ошибка уже обработана в handleAddJudge
                }
              }
            }}
            allowClear
          >
            {allJudges
              .filter(judge => !competitionJudges.some(cj => cj.userId === judge.id))
              .map((judge) => (
                <Select.Option
                  key={judge.id}
                  value={judge.id}
                  label={`${judge.profile.firstName} ${judge.profile.lastName} (${judge.email})`}
                >
                  {judge.profile.firstName} {judge.profile.lastName} ({judge.email})
                </Select.Option>
              ))}
          </Select>
        </div>
        <List
          loading={loadingJudges}
          dataSource={competitionJudges}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  type="link"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => handleRemoveJudge(item.userId)}
                >
                  Удалить
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={`${item.user.profile.firstName} ${item.user.profile.lastName}`}
                description={item.user.email}
              />
            </List.Item>
          )}
        />
      </Modal>

      {/* Модальное окно для управления командами */}
      <Modal
        title={`Управление командами: ${selectedCompetition?.name}`}
        open={teamsModalVisible}
        onCancel={() => {
          setTeamsModalVisible(false);
          setSelectedCompetition(null);
          setCompetitionTeams([]);
        }}
        footer={null}
        width={700}
      >
        <div style={{ marginBottom: 16 }}>
          <Select
            key={teamsSelectKey}
            style={{ width: '100%' }}
            placeholder="Выберите команду для добавления"
            showSearch
            filterOption={(input, option) =>
              (option?.label as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
            onChange={async (teamId) => {
              if (teamId && selectedCompetition) {
                try {
                  await handleAddTeam(teamId);
                } catch (error) {
                  // Ошибка уже обработана в handleAddTeam
                }
              }
            }}
            allowClear
          >
            {allTeams
              .filter(team => !competitionTeams.some(ct => ct.id === team.id))
              .map((team) => (
                <Select.Option
                  key={team.id}
                  value={team.id}
                  label={team.name}
                >
                  {team.name} {team.region ? `(${team.region.name})` : ''}
                </Select.Option>
              ))}
          </Select>
        </div>
        <List
          loading={loadingTeams}
          dataSource={competitionTeams}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  type="link"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => handleRemoveTeam(item.applicationId)}
                >
                  Удалить
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar icon={<TeamOutlined />} />}
                title={item.name}
                description={item.region ? `Регион: ${item.region.name}` : ''}
              />
            </List.Item>
          )}
          locale={{ emptyText: 'В соревновании нет команд' }}
        />
      </Modal>
    </div>
  );
};

