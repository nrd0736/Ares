/**
 * Страница управления командами (администратор)
 * 
 * Функциональность:
 * - Просмотр списка всех команд
 * - Модерация команд (одобрение/отклонение)
 * - Создание команд
 * - Редактирование команд
 * - Удаление команд
 * - Просмотр спортсменов команды
 * - Загрузка логотипов команд
 * 
 * Особенности:
 * - Фильтрация по статусу (PENDING, APPROVED, REJECTED)
 * - Фильтрация по региону
 * - Поиск по названию команды
 * - Просмотр статистики команды
 */

import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, Select, message, Popconfirm, Upload, Avatar, Tabs, List } from 'antd';
import { useNavigate } from 'react-router-dom';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined, UploadOutlined, TeamOutlined, TrophyOutlined, SearchOutlined, UserOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import { getTeamLogoUrl } from '../../../../utils/image-utils';

interface Team {
  id: string;
  name: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  logoUrl?: string;
  region?: {
    name: string;
    federalDistrict?: {
      name: string;
    };
  };
  address?: string;
  contactInfo?: string;
  description?: string;
  createdAt: string;
}

interface Region {
  id: string;
  name: string;
  federalDistrict?: {
    name: string;
  };
}

export const TeamsManagement = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [moderationModalVisible, setModerationModalVisible] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [uploadingLogo, setUploadingLogo] = useState<string | null>(null);
  const [teamApplications, setTeamApplications] = useState<any[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [applicationModalVisible, setApplicationModalVisible] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [applicationForm] = Form.useForm();
  const [athletesModalVisible, setAthletesModalVisible] = useState(false);
  const [coachesModalVisible, setCoachesModalVisible] = useState(false);
  const [teamAthletes, setTeamAthletes] = useState<any[]>([]);
  const [teamCoaches, setTeamCoaches] = useState<any[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(false);
  const [loadingCoaches, setLoadingCoaches] = useState(false);

  useEffect(() => {
    loadTeams();
    loadRegions();
    loadCompetitions();
  }, [pagination.current, pagination.pageSize, statusFilter, searchQuery]);

  const loadRegions = async () => {
    try {
      const response = await apiClient.get('/references/regions');
      setRegions(response.data.data);
    } catch (error) {
      console.error('Ошибка загрузки регионов', error);
    }
  };

  const loadTeams = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.current,
        limit: pagination.pageSize,
      };
      if (statusFilter) {
        params.status = statusFilter;
      } else {
        // По умолчанию исключаем команды на модерации (PENDING)
        // Они отображаются в отдельной вкладке TeamModeration
        params.excludeStatus = 'PENDING';
      }
      
      // Добавляем поиск, если есть запрос
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      
      const response = await apiClient.get('/teams', { params });
      // Фильтруем PENDING на клиенте, если excludeStatus не поддерживается бэкендом
      let teams = response.data.data.teams;
      if (!statusFilter && !params.excludeStatus) {
        teams = teams.filter((team: Team) => team.status !== 'PENDING');
      }
      
      setTeams(teams);
      setPagination({
        ...pagination,
        total: response.data.data.pagination.total,
      });
    } catch (error: any) {
      message.error('Ошибка загрузки команд');
    } finally {
      setLoading(false);
    }
  };

  const handleModerate = (team: Team) => {
    setSelectedTeam(team);
    setModerationModalVisible(true);
  };

  const handleModerationSubmit = async (values: { status: string }) => {
    if (!selectedTeam) return;
    try {
      await apiClient.post(`/teams/${selectedTeam.id}/moderate`, values);
      message.success('Статус команды успешно изменен');
      setModerationModalVisible(false);
      loadTeams();
    } catch (error: any) {
      message.error('Ошибка при модерации команды');
    }
  };

  const handleCreate = () => {
    setSelectedTeam(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      if (selectedTeam) {
        // Редактирование
        await apiClient.put(`/teams/${selectedTeam.id}`, values);
        message.success('Команда успешно обновлена');
      } else {
        // Создание
        await apiClient.post('/teams', {
          ...values,
          status: 'APPROVED', // Администратор создает команду сразу одобренной
        });
        message.success('Команда успешно создана');
      }
      setModalVisible(false);
      setSelectedTeam(null);
      loadTeams();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при сохранении команды');
    }
  };

  const handleEdit = (team: Team) => {
    setSelectedTeam(team);
    form.setFieldsValue({
      name: team.name,
      regionId: team.region?.id,
      address: team.address,
      contactInfo: team.contactInfo,
      description: team.description,
    });
    setModalVisible(true);
    loadTeamApplications(team.id);
  };

  const loadTeamApplications = async (teamId: string) => {
    setLoadingApplications(true);
    try {
      const response = await apiClient.get(`/applications/team/${teamId}`);
      setTeamApplications(response.data.data.applications || []);
    } catch (error: any) {
      console.error('Ошибка загрузки заявок команды', error);
      setTeamApplications([]);
    } finally {
      setLoadingApplications(false);
    }
  };

  const loadCompetitions = async () => {
    try {
      const response = await apiClient.get('/competitions');
      setCompetitions(response.data.data.competitions || []);
    } catch (error) {
      console.error('Ошибка загрузки соревнований', error);
    }
  };

  const handleApplicationSubmit = async (values: any) => {
    if (!selectedTeam) return;
    
    try {
      if (selectedApplication) {
        // Обновление существующей заявки
        await apiClient.put(`/applications/${selectedApplication.id}/status`, {
          status: values.status,
        });
        message.success('Статус заявки обновлен');
      } else {
        // Создание новой заявки
        await apiClient.post('/applications/admin', {
          teamId: selectedTeam.id,
          competitionId: values.competitionId,
          status: values.status || 'APPROVED',
        });
        message.success('Заявка успешно создана');
      }
      setApplicationModalVisible(false);
      setSelectedApplication(null);
      applicationForm.resetFields();
      loadTeamApplications(selectedTeam.id);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при сохранении заявки');
    }
  };

  const getApplicationStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'orange',
      APPROVED: 'green',
      REJECTED: 'red',
    };
    return colors[status] || 'default';
  };

  const getApplicationStatusText = (status: string) => {
    const texts: Record<string, string> = {
      PENDING: 'На модерации',
      APPROVED: 'Одобрена',
      REJECTED: 'Отклонена',
    };
    return texts[status] || status;
  };

  const handleLogoUpload = async (file: File, teamId: string) => {
    setUploadingLogo(teamId);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await apiClient.post(`/upload/team-logo/${teamId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        message.success('Логотип успешно загружен');
        loadTeams(); // Перезагружаем список команд
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при загрузке логотипа');
    } finally {
      setUploadingLogo(null);
    }
    return false;
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/teams/${id}`);
      message.success('Команда успешно удалена');
      loadTeams();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при удалении команды');
    }
  };

  const handleViewAthletes = async (teamId: string) => {
    setLoadingAthletes(true);
    try {
      const response = await apiClient.get(`/teams/${teamId}`);
      setTeamAthletes(response.data.data.athletes || []);
      setAthletesModalVisible(true);
    } catch (error: any) {
      message.error('Ошибка загрузки спортсменов команды');
    } finally {
      setLoadingAthletes(false);
    }
  };

  const handleViewCoaches = async (teamId: string) => {
    setLoadingCoaches(true);
    try {
      const response = await apiClient.get(`/teams/${teamId}`);
      setTeamCoaches(response.data.data.coaches || []);
      setCoachesModalVisible(true);
    } catch (error: any) {
      message.error('Ошибка загрузки тренеров команды');
    } finally {
      setLoadingCoaches(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'orange',
      APPROVED: 'green',
      REJECTED: 'red',
      SUSPENDED: 'gray',
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      PENDING: 'На модерации',
      APPROVED: 'Одобрена',
      REJECTED: 'Отклонена',
      SUSPENDED: 'Приостановлена',
    };
    return texts[status] || status;
  };

  const columns = [
    {
      title: 'Логотип',
      key: 'logo',
      width: 100,
      render: (_: any, record: Team) => (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <Avatar
            size={40}
            icon={<TeamOutlined />}
            src={getTeamLogoUrl(record.logoUrl)}
          />
          <Upload
            beforeUpload={(file) => handleLogoUpload(file, record.id)}
            showUploadList={false}
            accept="image/*"
          >
            <Button
              type="link"
              icon={<UploadOutlined />}
              size="small"
              loading={uploadingLogo === record.id}
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
      title: 'Регион',
      key: 'region',
      render: (_: any, record: Team) =>
        record.region
          ? `${record.region.name} (${record.region.federalDistrict?.name || ''})`
          : '-',
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
      title: 'Контактная информация',
      dataIndex: 'contactInfo',
      key: 'contactInfo',
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
      render: (_: any, record: Team) => (
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
            onClick={() => handleViewAthletes(record.id)}
          >
            Спортсмены
          </Button>
          <Button
            type="link"
            icon={<UsergroupAddOutlined />}
            onClick={() => handleViewCoaches(record.id)}
          >
            Тренеры
          </Button>
          <Popconfirm
            title="Вы уверены, что хотите приостановить эту команду?"
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
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#262626' }}>Управление командами</h1>
        <Space>
          <Select
            placeholder="Фильтр по статусу"
            allowClear
            style={{ width: 200 }}
            onChange={(value) => {
              setStatusFilter(value);
              setPagination({ ...pagination, current: 1 });
            }}
          >
            <Select.Option value="APPROVED">Одобрена</Select.Option>
            <Select.Option value="REJECTED">Отклонена</Select.Option>
            <Select.Option value="SUSPENDED">Приостановлена</Select.Option>
          </Select>
          <Button
            type="default"
            onClick={() => navigate('/admin/team-moderation')}
          >
            Заявки на модерацию
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            Создать команду
          </Button>
        </Space>
      </div>

      {/* Поиск команд */}
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="Поиск команды по названию..."
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPagination({ ...pagination, current: 1 }); // Сбрасываем на первую страницу при поиске
          }}
          allowClear
          size="large"
          style={{ maxWidth: 600 }}
        />
      </div>

      <Table
        columns={columns}
        dataSource={teams}
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
        title={selectedTeam ? 'Редактировать команду' : 'Создать команду'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setSelectedTeam(null);
          form.resetFields();
          setTeamApplications([]);
        }}
        onOk={() => form.submit()}
        width={800}
      >
        {selectedTeam ? (
          <Tabs
            defaultActiveKey="info"
            items={[
              {
                key: 'info',
                label: 'Информация о команде',
                children: (
                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                  >
                    <Form.Item
                      name="name"
                      label="Название команды"
                      rules={[{ required: true, message: 'Введите название команды' }]}
                    >
                      <Input placeholder="Название команды" />
                    </Form.Item>

                    <Form.Item
                      name="regionId"
                      label="Регион"
                      rules={[{ required: true, message: 'Выберите регион' }]}
                    >
                      <Select
                        placeholder="Выберите регион"
                        showSearch
                        filterOption={(input, option) =>
                          (option?.children as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                        }
                      >
                        {regions.map((region) => (
                          <Select.Option key={region.id} value={region.id}>
                            {region.name} {region.federalDistrict ? `(${region.federalDistrict.name})` : ''}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item
                      name="address"
                      label="Адрес"
                    >
                      <Input placeholder="Адрес команды" />
                    </Form.Item>

                    <Form.Item
                      name="contactInfo"
                      label="Контактная информация"
                    >
                      <Input.TextArea
                        rows={3}
                        placeholder="Телефон, email и другая контактная информация"
                      />
                    </Form.Item>

                    <Form.Item
                      name="description"
                      label="Описание"
                    >
                      <Input.TextArea
                        rows={4}
                        placeholder="Краткое описание команды, история, достижения"
                      />
                    </Form.Item>

                    <Form.Item label="Логотип команды">
                      <Space>
                        <Avatar
                          size={64}
                          icon={<TeamOutlined />}
                          src={getTeamLogoUrl(selectedTeam.logoUrl)}
                        />
                        <Upload
                          beforeUpload={(file) => {
                            handleLogoUpload(file, selectedTeam.id);
                            return false;
                          }}
                          showUploadList={false}
                          accept="image/*"
                        >
                          <Button icon={<UploadOutlined />} loading={uploadingLogo === selectedTeam.id}>
                            Загрузить логотип
                          </Button>
                        </Upload>
                      </Space>
                    </Form.Item>
                  </Form>
                ),
              },
              {
                key: 'competitions',
                label: (
                  <span>
                    <TrophyOutlined /> Соревнования ({teamApplications.length})
                  </span>
                ),
                children: (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                          setApplicationModalVisible(true);
                          setSelectedApplication(null);
                          applicationForm.resetFields();
                        }}
                      >
                        Добавить заявку на соревнование
                      </Button>
                    </div>
                    {loadingApplications ? (
                      <div style={{ textAlign: 'center', padding: '20px' }}>Загрузка...</div>
                    ) : teamApplications.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#8c8c8c' }}>
                        Команда еще не подавала заявки на соревнования
                      </div>
                    ) : (
                      <List
                        dataSource={teamApplications}
                        renderItem={(application: any) => (
                          <List.Item
                            actions={[
                              <Button
                                type="link"
                                size="small"
                                onClick={() => {
                                  setSelectedApplication(application);
                                  applicationForm.setFieldsValue({
                                    competitionId: application.competitionId,
                                    status: application.status,
                                  });
                                  setApplicationModalVisible(true);
                                }}
                              >
                                Редактировать
                              </Button>,
                            ]}
                          >
                            <List.Item.Meta
                              title={
                                <Space>
                                  <span>{application.competition?.name || 'Неизвестное соревнование'}</span>
                                  <Tag color={getApplicationStatusColor(application.status)}>
                                    {getApplicationStatusText(application.status)}
                                  </Tag>
                                </Space>
                              }
                              description={
                                <div>
                                  <div>Вид спорта: {application.competition?.sport?.name || '-'}</div>
                                  <div>
                                    Дата подачи: {new Date(application.submittedAt).toLocaleDateString('ru-RU')}
                                  </div>
                                </div>
                              }
                            />
                          </List.Item>
                        )}
                      />
                    )}
                  </div>
                ),
              },
            ]}
          />
        ) : (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              name="name"
              label="Название команды"
              rules={[{ required: true, message: 'Введите название команды' }]}
            >
              <Input placeholder="Название команды" />
            </Form.Item>

            <Form.Item
              name="regionId"
              label="Регион"
              rules={[{ required: true, message: 'Выберите регион' }]}
            >
              <Select
                placeholder="Выберите регион"
                showSearch
                filterOption={(input, option) =>
                  (option?.children as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {regions.map((region) => (
                  <Select.Option key={region.id} value={region.id}>
                    {region.name} {region.federalDistrict ? `(${region.federalDistrict.name})` : ''}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="address"
              label="Адрес"
            >
              <Input placeholder="Адрес команды" />
            </Form.Item>

            <Form.Item
              name="contactInfo"
              label="Контактная информация"
            >
              <Input.TextArea
                rows={3}
                placeholder="Телефон, email и другая контактная информация"
              />
            </Form.Item>

            <Form.Item
              name="description"
              label="Описание"
            >
              <Input.TextArea
                rows={4}
                placeholder="Краткое описание команды, история, достижения"
              />
            </Form.Item>
          </Form>
        )}
      </Modal>

      <Modal
        title="Модерация команды"
        open={moderationModalVisible}
        onCancel={() => setModerationModalVisible(false)}
        onOk={() => {
          const form = document.querySelector('.ant-form') as any;
          if (form) {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        }}
      >
        <Form
          layout="vertical"
          onFinish={handleModerationSubmit}
          initialValues={{ status: 'APPROVED' }}
        >
          <Form.Item
            name="status"
            label="Статус"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="APPROVED">Одобрить</Select.Option>
              <Select.Option value="REJECTED">Отклонить</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно для создания/редактирования заявки */}
      <Modal
        title={selectedApplication ? 'Редактировать заявку' : 'Создать заявку на соревнование'}
        open={applicationModalVisible}
        onCancel={() => {
          setApplicationModalVisible(false);
          setSelectedApplication(null);
          applicationForm.resetFields();
        }}
        onOk={() => applicationForm.submit()}
        width={600}
      >
        <Form
          form={applicationForm}
          layout="vertical"
          onFinish={handleApplicationSubmit}
        >
          <Form.Item
            name="competitionId"
            label="Соревнование"
            rules={[{ required: true, message: 'Выберите соревнование' }]}
          >
            <Select
              placeholder="Выберите соревнование"
              disabled={!!selectedApplication}
              showSearch
              filterOption={(input, option) =>
                (option?.children as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {competitions
                .filter((comp) => !teamApplications.some((app) => app.competitionId === comp.id && app.id !== selectedApplication?.id))
                .map((competition) => (
                  <Select.Option key={competition.id} value={competition.id}>
                    {competition.name} ({competition.sport?.name || 'Неизвестный вид спорта'})
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label="Статус заявки"
            rules={[{ required: true, message: 'Выберите статус' }]}
            initialValue="APPROVED"
          >
            <Select placeholder="Выберите статус">
              <Select.Option value="PENDING">На модерации</Select.Option>
              <Select.Option value="APPROVED">Одобрена</Select.Option>
              <Select.Option value="REJECTED">Отклонена</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно для просмотра спортсменов команды */}
      <Modal
        title="Спортсмены команды"
        open={athletesModalVisible}
        onCancel={() => {
          setAthletesModalVisible(false);
          setTeamAthletes([]);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setAthletesModalVisible(false);
            setTeamAthletes([]);
          }}>
            Закрыть
          </Button>
        ]}
        width={800}
      >
        <List
          loading={loadingAthletes}
          dataSource={teamAthletes}
          renderItem={(athlete: any) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <Avatar 
                    icon={<UserOutlined />}
                    src={athlete.user?.profile?.avatarUrl}
                  />
                }
                title={
                  <Space>
                    <span>
                      {athlete.user?.profile?.lastName} {athlete.user?.profile?.firstName} {athlete.user?.profile?.middleName}
                    </span>
                    {athlete.weightCategory && (
                      <Tag color="blue">{athlete.weightCategory.name}</Tag>
                    )}
                  </Space>
                }
                description={
                  <Space direction="vertical" size="small">
                    <div>
                      <strong>Email:</strong> {athlete.user?.email}
                    </div>
                    {athlete.user?.profile?.phone && (
                      <div>
                        <strong>Телефон:</strong> {athlete.user.profile.phone}
                      </div>
                    )}
                    {athlete.birthDate && (
                      <div>
                        <strong>Дата рождения:</strong> {new Date(athlete.birthDate).toLocaleDateString('ru-RU')}
                      </div>
                    )}
                    {athlete.gender && (
                      <div>
                        <strong>Пол:</strong> {athlete.gender === 'MALE' ? 'Мужской' : 'Женский'}
                      </div>
                    )}
                    {athlete.weight && (
                      <div>
                        <strong>Вес:</strong> {athlete.weight} кг
                      </div>
                    )}
                    {athlete.coach && (
                      <div>
                        <strong>Тренер:</strong> {athlete.coach.user?.profile?.lastName} {athlete.coach.user?.profile?.firstName}
                      </div>
                    )}
                  </Space>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: 'В команде нет спортсменов' }}
        />
      </Modal>

      {/* Модальное окно для просмотра тренеров команды */}
      <Modal
        title="Тренеры команды"
        open={coachesModalVisible}
        onCancel={() => {
          setCoachesModalVisible(false);
          setTeamCoaches([]);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setCoachesModalVisible(false);
            setTeamCoaches([]);
          }}>
            Закрыть
          </Button>
        ]}
        width={800}
      >
        <List
          loading={loadingCoaches}
          dataSource={teamCoaches}
          renderItem={(coach: any) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <Avatar 
                    icon={<UsergroupAddOutlined />}
                    src={coach.user?.profile?.avatarUrl}
                  />
                }
                title={
                  <span>
                    {coach.user?.profile?.lastName} {coach.user?.profile?.firstName} {coach.user?.profile?.middleName}
                  </span>
                }
                description={
                  <Space direction="vertical" size="small">
                    <div>
                      <strong>Email:</strong> {coach.user?.email}
                    </div>
                    {coach.user?.profile?.phone && (
                      <div>
                        <strong>Телефон:</strong> {coach.user.profile.phone}
                      </div>
                    )}
                  </Space>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: 'В команде нет тренеров' }}
        />
      </Modal>
    </div>
  );
};

