/**
 * Страница управления пользователями (администратор)
 * 
 * Функциональность:
 * - Просмотр списка всех пользователей с фильтрацией и поиском
 * - Создание новых пользователей
 * - Редактирование пользователей
 * - Деактивация/активация пользователей
 * - Удаление пользователей
 * - Экспорт пользователей
 * - Загрузка аватаров
 * 
 * Особенности:
 * - Поддержка всех ролей (ADMIN, MODERATOR, JUDGE, COACH, ATHLETE)
 * - Расширенные поля для разных ролей (судья, тренер, спортсмен)
 * - Фильтрация по ролям и статусу
 * - Поиск по ФИО и email
 */

import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, Select, message, Popconfirm, DatePicker, Radio, InputNumber, Switch, Checkbox, Upload, Avatar } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, StopOutlined, DownloadOutlined, SearchOutlined, UserOutlined, UploadOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import { UserRole } from '../../../../types/user';
import dayjs from 'dayjs';

interface User {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  profile?: {
    firstName: string;
    lastName: string;
    middleName?: string;
    phone?: string;
    avatarUrl?: string;
  };
  judgeProfile?: {
    city?: string;
    category?: string;
    position?: string;
    regionId?: string;
    region?: {
      id: string;
      name: string;
      federalDistrict?: {
        name: string;
      };
    };
  };
  createdAt: string;
}

interface Team {
  id: string;
  name: string;
}

interface Coach {
  id: string;
  user: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  team: {
    name: string;
  };
}

interface WeightCategory {
  id: string;
  name: string;
  sport: {
    name: string;
  };
}

interface SportsRank {
  id: string;
  name: string;
  description?: string;
  order: number;
}

interface Region {
  id: string;
  name: string;
  federalDistrict?: {
    name: string;
  };
}

export const UsersManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [teams, setTeams] = useState<Team[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [weightCategories, setWeightCategories] = useState<WeightCategory[]>([]);
  const [sportsRanks, setSportsRanks] = useState<SportsRank[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRole, setSelectedRole] = useState<UserRole | undefined>();
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportRole, setExportRole] = useState<UserRole | '' | undefined>(undefined);
  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [exportMode, setExportMode] = useState<'role' | 'selected'>('role');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();

  // Функция генерации пароля
  const generatePassword = () => {
    const length = 12;
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    const allChars = lowercase + uppercase + numbers + symbols;
    
    let password = '';
    // Гарантируем наличие хотя бы одного символа каждого типа
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Заполняем остальные символы
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Перемешиваем символы
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  useEffect(() => {
    loadUsers();
    loadTeams();
    loadCoaches();
    loadWeightCategories();
    loadSportsRanks();
    loadRegions();
  }, [pagination.current, pagination.pageSize, searchQuery]);

  const loadTeams = async () => {
    try {
      // Загружаем все команды для выбора (загружаем все страницы, включая все статусы)
      let allTeams: Team[] = [];
      let page = 1;
      const limit = 100;
      let hasMore = true;
      let total = 0;

      while (hasMore) {
        try {
          // Загружаем команды без фильтрации по статусу (все команды)
          const response = await apiClient.get(`/teams?page=${page}&limit=${limit}`);
          const teams = response.data.data.teams || [];
          allTeams = [...allTeams, ...teams];
          
          total = response.data.data.pagination?.total || 0;
          hasMore = allTeams.length < total && teams.length === limit;
          page++;
          
          // Защита от бесконечного цикла
          if (page > 100) {
            console.warn('Превышен лимит страниц при загрузке команд');
            break;
          }
        } catch (error: any) {
          console.error(`Ошибка загрузки страницы ${page} команд:`, error);
          message.error(`Ошибка загрузки команд: ${error.response?.data?.message || error.message}`);
          break;
        }
      }

      // Сортируем команды по названию для удобства поиска
      allTeams.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      
      console.log(`Загружено команд: ${allTeams.length} из ${total}`);
      if (allTeams.length === 0) {
        console.warn('Не загружено ни одной команды! Проверьте API endpoint /teams');
        message.warning('Не удалось загрузить команды. Проверьте консоль браузера.');
      }
      setTeams(allTeams);
    } catch (error: any) {
      console.error('Ошибка загрузки команд', error);
      message.error(`Ошибка загрузки списка команд: ${error.response?.data?.message || error.message}`);
    }
  };

  const loadCoaches = async () => {
    try {
      const response = await apiClient.get('/auth/coaches');
      setCoaches(response.data.data.coaches || []);
    } catch (error) {
      console.error('Ошибка загрузки тренеров', error);
    }
  };

  const loadWeightCategories = async () => {
    try {
      const response = await apiClient.get('/references/sports');
      const allCategories: WeightCategory[] = [];
      for (const sport of response.data.data) {
        if (sport.weightCategories) {
          allCategories.push(...sport.weightCategories.map((cat: any) => ({
            ...cat,
            sport: { name: sport.name },
          })));
        }
      }
      setWeightCategories(allCategories);
    } catch (error) {
      console.error('Ошибка загрузки весовых категорий', error);
    }
  };

  const loadSportsRanks = async () => {
    try {
      const response = await apiClient.get('/references/sports-ranks');
      setSportsRanks(response.data.data || []);
    } catch (error) {
      console.error('Ошибка загрузки спортивных разрядов', error);
    }
  };

  const loadRegions = async () => {
    try {
      const response = await apiClient.get('/references/regions');
      setRegions(response.data.data || []);
    } catch (error) {
      console.error('Ошибка загрузки регионов', error);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      let url = `/users?page=${pagination.current}&limit=${pagination.pageSize}`;
      
      // Добавляем поиск если есть запрос
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      
      const response = await apiClient.get(url);
      const loadedUsers = response.data.data?.users || response.data.data || [];
      
      setUsers(loadedUsers);
      setPagination({
        ...pagination,
        total: response.data.data?.pagination?.total || 0,
      });
    } catch (error: any) {
      message.error('Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setEditingUser(null);
    setSelectedRole(undefined);
    setGeneratedPassword('');
    setAvatarUrl(undefined);
    form.resetFields();
    
    // Загружаем команды, тренеров и другие данные если еще не загружены
    if (teams.length === 0) {
      await loadTeams();
    }
    if (coaches.length === 0) {
      await loadCoaches();
    }
    if (weightCategories.length === 0) {
      await loadWeightCategories();
    }
    if (sportsRanks.length === 0) {
      await loadSportsRanks();
    }
    if (regions.length === 0) {
      await loadRegions();
    }
    
    setModalVisible(true);
  };

  const handleEdit = async (user: User) => {
    try {
      setEditingUser(user);
      setSelectedRole(user.role);
      setGeneratedPassword('');
      setAvatarUrl(user.profile?.avatarUrl);
      
      // Загружаем дополнительные данные для тренера/спортсмена/модератора/судьи
      let teamId, coachId, weightCategoryId, weight, birthDate, gender, sportsRankId;
      let description, allowedTabs;
      let judgeCity, judgeCategory, judgePosition, judgeRegionId;
      
      if (user.role === 'COACH') {
        try {
          const coachResponse = await apiClient.get(`/users/${user.id}`);
          teamId = coachResponse.data.data.coach?.teamId;
        } catch (error) {
          console.error('Ошибка загрузки данных тренера', error);
        }
      } else if (user.role === 'ATHLETE') {
        try {
          const athleteResponse = await apiClient.get(`/users/${user.id}`);
          const athlete = athleteResponse.data.data.athlete;
          if (athlete) {
            teamId = athlete.teamId;
            // Получаем coachId из объекта athlete
            // Prisma возвращает coachId напрямую в объекте athlete, даже при использовании include
            // Проверяем наличие coachId (может быть null, undefined или строкой)
            if (athlete.coachId !== null && athlete.coachId !== undefined && athlete.coachId !== '') {
              coachId = athlete.coachId;
            } else if (athlete.coach && athlete.coach.id) {
              // Если coachId не указан напрямую, но есть связь coach, берем id из связи
              coachId = athlete.coach.id;
            } else {
              coachId = null;
            }
            weightCategoryId = athlete.weightCategoryId;
            weight = athlete.weight;
            birthDate = athlete.birthDate ? dayjs(athlete.birthDate) : undefined;
            gender = athlete.gender;
            sportsRankId = athlete.sportsRankId;
          }
        } catch (error) {
          console.error('Ошибка загрузки данных спортсмена', error);
        }
      } else if (user.role === 'MODERATOR') {
        try {
          const moderatorResponse = await apiClient.get(`/users/${user.id}`);
          const moderator = moderatorResponse.data.data.moderator;
          if (moderator) {
            description = moderator.description || '';
            allowedTabs = moderator.allowedTabs || [];
          }
        } catch (error) {
          console.error('Ошибка загрузки данных модератора', error);
        }
      } else if (user.role === 'JUDGE') {
        // Сначала проверяем, есть ли данные в объекте user
        if (user.judgeProfile) {
          judgeCity = user.judgeProfile.city;
          judgeCategory = user.judgeProfile.category;
          judgePosition = user.judgeProfile.position;
          judgeRegionId = user.judgeProfile.regionId;
        } else {
          // Если нет, загружаем через API
          try {
            const judgeResponse = await apiClient.get(`/users/${user.id}`);
            const judgeProfile = judgeResponse.data.data.judgeProfile;
            if (judgeProfile) {
              judgeCity = judgeProfile.city;
              judgeCategory = judgeProfile.category;
              judgePosition = judgeProfile.position;
              judgeRegionId = judgeProfile.regionId;
            }
          } catch (error) {
            console.error('Ошибка загрузки данных судьи', error);
          }
        }
      }
      
      // Убеждаемся, что все необходимые данные загружены перед открытием модального окна
      if (user.role === 'COACH' || user.role === 'ATHLETE') {
        // Загружаем команды, тренеров и весовые категории если еще не загружены
        if (teams.length === 0) {
          await loadTeams();
        }
        if (user.role === 'ATHLETE') {
          if (coaches.length === 0) {
            await loadCoaches();
          }
          if (weightCategories.length === 0) {
            await loadWeightCategories();
          }
          if (sportsRanks.length === 0) {
            await loadSportsRanks();
          }
        }
      } else if (user.role === 'MODERATOR') {
        // Данные модератора уже загружены выше
      } else if (user.role === 'JUDGE') {
        // Загружаем регионы если еще не загружены
        if (regions.length === 0) {
          await loadRegions();
        }
      }
      
      setModalVisible(true);
      // Используем setTimeout, чтобы форма успела смонтироваться и все данные загрузились
      setTimeout(() => {
        const formValues = {
          email: user.email || '',
          role: user.role,
          isActive: user.isActive ?? true,
          firstName: user.profile?.firstName || '',
          lastName: user.profile?.lastName || '',
          middleName: user.profile?.middleName || '',
          phone: user.profile?.phone || '',
          teamId: teamId || undefined,
          weightCategoryId: weightCategoryId || undefined,
          weight: weight || undefined,
          birthDate: birthDate || undefined,
          gender: gender || undefined,
          sportsRankId: sportsRankId || undefined,
          description: description || undefined,
          allowedTabs: allowedTabs || undefined,
          judgeCity: judgeCity !== null && judgeCity !== undefined ? judgeCity : undefined,
          judgeCategory: judgeCategory !== null && judgeCategory !== undefined ? judgeCategory : undefined,
          judgePosition: judgePosition !== null && judgePosition !== undefined ? judgePosition : undefined,
          judgeRegionId: judgeRegionId !== null && judgeRegionId !== undefined ? judgeRegionId : undefined,
        };
        
        // Сначала устанавливаем все поля, кроме coachId
        form.setFieldsValue(formValues);
        
        // Затем устанавливаем coachId отдельно, чтобы Select успел обновиться после установки teamId
        if (coachId !== null && coachId !== undefined && coachId !== '') {
          setTimeout(() => {
            form.setFieldValue('coachId', coachId);
          }, 50);
        }
      }, 100);
    } catch (error: any) {
      console.error('Ошибка при открытии формы редактирования', error);
      message.error('Ошибка при загрузке данных пользователя');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/users/${id}`);
      message.success('Пользователь успешно удален');
      loadUsers();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при удалении пользователя');
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await apiClient.patch(`/users/${id}/deactivate`);
      message.success('Пользователь успешно деактивирован');
      loadUsers();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при деактивации пользователя');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      // Преобразуем дату рождения в ISO строку
      if (values.birthDate) {
        values.birthDate = values.birthDate.toISOString();
      }
      
      // Если пароль пустой при редактировании, удаляем его из запроса
      if (editingUser && !values.password) {
        delete values.password;
      }
      
      // Очищаем поля судьи, если они пустые или undefined
      // Преобразуем пустые строки и undefined в null
      if (values.judgeCity === undefined || values.judgeCity === '' || values.judgeCity === 'undefined') {
        values.judgeCity = null;
      }
      if (values.judgeCategory === undefined || values.judgeCategory === '' || values.judgeCategory === 'undefined') {
        values.judgeCategory = null;
      }
      if (values.judgePosition === undefined || values.judgePosition === '' || values.judgePosition === 'undefined') {
        values.judgePosition = null;
      }
      if (values.judgeRegionId === undefined || values.judgeRegionId === '' || values.judgeRegionId === 'undefined') {
        values.judgeRegionId = null;
      }
      
      if (editingUser) {
        await apiClient.put(`/users/${editingUser.id}`, values);
        message.success('Пользователь успешно обновлен');
      } else {
        await apiClient.post('/users', values);
        message.success('Пользователь успешно создан');
      }
      setModalVisible(false);
      setSelectedRole(undefined);
      setGeneratedPassword('');
      setAvatarUrl(undefined);
      form.resetFields();
      await loadUsers();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при сохранении');
    }
  };

  const handleExportPasswords = async () => {
    setExportLoading(true);
    try {
      let params: any = {};
      
      if (exportMode === 'selected' && selectedUserIds.length > 0) {
        // Экспорт выбранных пользователей
        params.userIds = selectedUserIds.join(',');
      } else if (exportMode === 'role') {
        // Экспорт по роли
        if (exportRole) {
          params.role = exportRole;
        }
      } else {
        message.warning('Выберите пользователей для экспорта или категорию');
        setExportLoading(false);
        return;
      }
      
      const response = await apiClient.get('/users/export', { params });

      const users = response.data.data?.users || response.data.data || [];
      
      // Формируем CSV содержимое
      const csvHeader = 'ФИО;Роль;Логин (Email);Пароль\n';
      const csvRows = users.map((user: any) => 
        `"${user.fullName}";"${user.role}";"${user.email}";"${user.password}"`
      ).join('\n');
      
      const csvContent = csvHeader + csvRows;
      
      // Формируем имя файла
      let fileName = 'users_passwords_';
      if (exportMode === 'selected') {
        fileName += `selected_${selectedUserIds.length}_`;
      } else {
        const role = exportRole || 'all';
        fileName += `${role}_`;
      }
      fileName += `${new Date().toISOString().split('T')[0]}.csv`;
      
      // Создаем blob и скачиваем файл
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      message.success(`Экспортировано ${users.length} пользователей`);
      setExportModalVisible(false);
      setExportRole(undefined);
      setSelectedUserIds([]);
      setExportMode('role');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при экспорте');
    } finally {
      setExportLoading(false);
    }
  };

  const getRoleColor = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      ADMIN: 'red',
      JUDGE: 'blue',
      COACH: 'green',
      ATHLETE: 'purple',
      MODERATOR: 'cyan',
      GUEST: 'orange',
    };
    return colors[role] || 'default';
  };

  const handleAvatarUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;

    if (!editingUser) {
      message.error('Не указан ID пользователя');
      onError(new Error('Не указан ID пользователя'));
      return;
    }

    const targetUserId = editingUser.id;
    if (!targetUserId) {
      message.error('Не указан ID пользователя');
      onError(new Error('Не указан ID пользователя'));
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setUploadingAvatar(true);
    try {
      const response = await apiClient.post(`/upload/avatar/${targetUserId}`, formData);
      
      const newAvatarUrl = response.data.data.avatarUrl;
      setAvatarUrl(newAvatarUrl);
      message.success('Аватар успешно загружен');
      loadUsers(); // Обновляем список пользователей
      onSuccess(response.data);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Ошибка при загрузке аватара';
      message.error(errorMessage);
      onError(error);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const columns = [
    {
      title: 'Аватар',
      key: 'avatar',
      width: 80,
      render: (_: any, record: User) => (
        <Avatar 
          size={48} 
          src={record.profile?.avatarUrl} 
          icon={<UserOutlined />}
        />
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Имя',
      key: 'name',
      render: (_: any, record: User) => {
        if (!record.profile) return '-';
        const parts = [
          record.profile.lastName,
          record.profile.firstName,
          record.profile.middleName
        ].filter(Boolean);
        return parts.join(' ');
      },
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
      render: (role: UserRole) => {
        const roleLabels: Record<UserRole, string> = {
          ADMIN: 'Администратор',
          JUDGE: 'Судья',
          COACH: 'Тренер',
          ATHLETE: 'Спортсмен',
          MODERATOR: 'Модератор',
          GUEST: 'Гость',
        };
        return (
          <Tag color={getRoleColor(role)}>{roleLabels[role] || role}</Tag>
        );
      },
    },
    {
      title: 'Статус',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Активен' : 'Неактивен'}
        </Tag>
      ),
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
      render: (_: any, record: User) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Редактировать
          </Button>
          {record.isActive && (
            <Popconfirm
              title="Вы уверены, что хотите деактивировать этого пользователя?"
              onConfirm={() => handleDeactivate(record.id)}
            >
              <Button type="link" icon={<StopOutlined />}>
                Деактивировать
              </Button>
            </Popconfirm>
          )}
          <Popconfirm
            title="Вы уверены, что хотите удалить этого пользователя? Это действие необратимо!"
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
        <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#262626' }}>Управление пользователями</h1>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={() => setExportModalVisible(true)}>
            Экспорт паролей
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Создать пользователя
          </Button>
        </Space>
      </div>

      {/* Поиск пользователей */}
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="Поиск пользователя по ФИО или email..."
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
        dataSource={users}
        loading={loading}
        rowKey="id"
        rowSelection={{
          selectedRowKeys: selectedUserIds,
          onChange: (selectedRowKeys) => {
            setSelectedUserIds(selectedRowKeys as string[]);
          },
        }}
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
        title={editingUser ? 'Редактировать пользователя' : 'Создать пользователя'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setGeneratedPassword('');
          setSelectedRole(undefined);
          setAvatarUrl(undefined);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {/* Аватар */}
          <Form.Item label="Аватар">
            <Space direction="vertical" align="center" style={{ width: '100%' }}>
              <Avatar 
                size={100} 
                src={avatarUrl} 
                icon={<UserOutlined />}
              />
              {editingUser && (
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  customRequest={handleAvatarUpload}
                  disabled={uploadingAvatar}
                >
                  <Button 
                    icon={<UploadOutlined />} 
                    loading={uploadingAvatar}
                  >
                    {uploadingAvatar ? 'Загрузка...' : 'Загрузить аватар'}
                  </Button>
                </Upload>
              )}
              {!editingUser && (
                <p style={{ color: '#999', fontSize: '12px' }}>
                  Аватар можно загрузить после создания пользователя
                </p>
              )}
            </Space>
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: 'email' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="role"
            label="Роль"
            rules={[{ required: true }]}
          >
            <Select
              onChange={(value) => {
                setSelectedRole(value);
                // Очищаем поля при смене роли
                form.setFieldsValue({
                  teamId: undefined,
                  coachId: undefined,
                  weightCategoryId: undefined,
                  weight: undefined,
                  birthDate: undefined,
                  gender: undefined,
                  description: undefined,
                  allowedTabs: undefined,
                });
              }}
            >
              <Select.Option value="ADMIN">Администратор</Select.Option>
              <Select.Option value="JUDGE">Судья</Select.Option>
              <Select.Option value="COACH">Тренер</Select.Option>
              <Select.Option value="ATHLETE">Спортсмен</Select.Option>
              <Select.Option value="MODERATOR">Модератор</Select.Option>
            </Select>
          </Form.Item>

          {/* Поля для тренера */}
          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.role !== currentValues.role}>
            {() => {
              const currentRole = form.getFieldValue('role') || selectedRole;
              return currentRole === 'COACH' ? (
                <Form.Item
                  name="teamId"
                  label="Команда"
                  rules={[{ required: true, message: 'Выберите команду' }]}
                >
              <Select 
                placeholder={teams.length === 0 ? "Загрузка команд..." : "Выберите команду"} 
                showSearch
                filterOption={(input, option) =>
                  (option?.children as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
                optionFilterProp="children"
                notFoundContent={teams.length === 0 ? "Команды не найдены. Проверьте, что команды созданы в системе." : "Команда не найдена"}
              >
                {teams.map((team) => (
                  <Select.Option key={team.id} value={team.id}>
                    {team.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
              ) : null;
            }}
          </Form.Item>

          {/* Поля для судьи */}
          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.role !== currentValues.role}>
            {() => {
              const currentRole = form.getFieldValue('role') || selectedRole;
              return currentRole === 'JUDGE' ? (
                <>
                  <Form.Item
                    name="judgeCategory"
                    label="Категория судьи"
                  >
                    <Input placeholder="Например: ВК, IК, ЗК" />
                  </Form.Item>

                  <Form.Item
                    name="judgePosition"
                    label="Должность"
                  >
                    <Input placeholder="Введите должность" />
                  </Form.Item>

                  <Form.Item
                    name="judgeRegionId"
                    label="Регион (Субъект РФ)"
                  >
                    <Select
                      placeholder="Выберите регион"
                      showSearch
                      filterOption={(input, option) =>
                        (option?.children as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                      }
                      allowClear
                    >
                      {regions.map((region) => (
                        <Select.Option key={region.id} value={region.id}>
                          {region.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="judgeCity"
                    label="Город"
                  >
                    <Input placeholder="Введите город" />
                  </Form.Item>
                </>
              ) : null;
            }}
          </Form.Item>

          {/* Поля для спортсмена */}
          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.role !== currentValues.role}>
            {() => {
              const currentRole = form.getFieldValue('role') || selectedRole;
              return currentRole === 'ATHLETE' ? (
                <>
                  <Form.Item
                    name="teamId"
                    label="Команда"
                    rules={[{ required: true, message: 'Выберите команду' }]}
                  >
                <Select 
                  placeholder={teams.length === 0 ? "Загрузка команд..." : "Выберите команду"} 
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                  optionFilterProp="children"
                  notFoundContent={teams.length === 0 ? "Команды не найдены. Проверьте, что команды созданы в системе." : "Команда не найдена"}
                >
                  {teams.map((team) => (
                    <Select.Option key={team.id} value={team.id}>
                      {team.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="coachId"
                label="Тренер"
                dependencies={['teamId']}
              >
                <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.teamId !== currentValues.teamId}>
                  {({ getFieldValue, setFieldValue }) => {
                    const selectedTeamId = getFieldValue('teamId');
                    const selectedCoachId = getFieldValue('coachId');
                    
                    // Если команда изменилась, проверяем, что выбранный тренер из этой команды
                    // Но только если это изменение команды пользователем, а не первоначальная загрузка
                    if (selectedTeamId && selectedCoachId && editingUser) {
                      const selectedCoach = coaches.find(c => c.id === selectedCoachId);
                      if (selectedCoach && selectedCoach.team?.id !== selectedTeamId) {
                        // Тренер не из выбранной команды - очищаем выбор
                        setFieldValue('coachId', undefined);
                      }
                    }
                    
                    // Фильтруем тренеров по выбранной команде
                    const filteredCoaches = selectedTeamId
                      ? coaches.filter((coach) => 
                          coach?.user?.profile && 
                          coach?.team?.id === selectedTeamId
                        )
                      : coaches.filter((coach) => coach?.user?.profile && coach?.team);
                    
                    return (
                      <Select 
                        placeholder={selectedTeamId ? "Выберите тренера из выбранной команды" : "Сначала выберите команду"} 
                        showSearch 
                        allowClear
                        disabled={!selectedTeamId}
                        value={selectedCoachId || undefined}
                        filterOption={(input, option) =>
                          (option?.children as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                        }
                      >
                        {filteredCoaches.map((coach) => (
                          <Select.Option key={coach.id} value={coach.id}>
                            {coach.user?.profile?.firstName || ''} {coach.user?.profile?.lastName || ''} 
                            {coach.team?.name ? ` (${coach.team.name})` : ''}
                          </Select.Option>
                        ))}
                      </Select>
                    );
                  }}
                </Form.Item>
              </Form.Item>

              <Form.Item
                name="birthDate"
                label="Дата рождения"
                rules={[{ required: true, message: 'Укажите дату рождения' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>

              <Form.Item
                name="gender"
                label="Пол"
                rules={[{ required: true, message: 'Выберите пол' }]}
              >
                <Radio.Group>
                  <Radio value="MALE">Мужской</Radio>
                  <Radio value="FEMALE">Женский</Radio>
                </Radio.Group>
              </Form.Item>

              <Form.Item
                name="weightCategoryId"
                label="Весовая категория"
              >
                <Select placeholder="Выберите весовую категорию" showSearch allowClear>
                  {weightCategories.map((cat) => (
                    <Select.Option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.sport.name})
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="weight"
                label="Вес (кг)"
              >
                <InputNumber
                  min={0}
                  max={200}
                  step={0.1}
                  style={{ width: '100%' }}
                  placeholder="Введите вес"
                />
              </Form.Item>

              <Form.Item
                name="sportsRankId"
                label="Спортивный разряд"
              >
                <Select
                  placeholder="Выберите спортивный разряд (необязательно)"
                  allowClear
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {sportsRanks.map((rank) => (
                    <Select.Option key={rank.id} value={rank.id}>
                      {rank.name} {rank.description ? `(${rank.description})` : ''}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
                </>
              ) : null;
            }}
          </Form.Item>

          {/* Поля для модератора */}
          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.role !== currentValues.role}>
            {() => {
              const currentRole = form.getFieldValue('role') || selectedRole;
              return currentRole === 'MODERATOR' ? (
                <>
                  <Form.Item
                    name="description"
                    label="Краткое описание"
                    rules={[{ required: true, message: 'Введите описание' }]}
                  >
                <Input.TextArea
                  rows={3}
                  placeholder="Опишите, за что отвечает данный модератор"
                />
              </Form.Item>

              <Form.Item
                name="allowedTabs"
                label="Разрешенные вкладки"
                rules={[{ required: true, message: 'Выберите хотя бы одну вкладку' }]}
              >
                <Checkbox.Group style={{ width: '100%' }}>
                  <Space direction="vertical">
                    <Checkbox value="users">Пользователи</Checkbox>
                    <Checkbox value="teams">Команды</Checkbox>
                    <Checkbox value="competitions">Соревнования</Checkbox>
                    <Checkbox value="invitations">Приглашения</Checkbox>
                    <Checkbox value="brackets">Турнирные сетки</Checkbox>
                    <Checkbox value="calendar">Календарь соревнований</Checkbox>
                    <Checkbox value="news">Новости</Checkbox>
                    <Checkbox value="statistics">Статистика</Checkbox>
                    <Checkbox value="references">Справочники</Checkbox>
                    <Checkbox value="notifications">Уведомления</Checkbox>
                    <Checkbox value="tickets">Обращения</Checkbox>
                    <Checkbox value="team-moderation">Модерация команд</Checkbox>
                    <Checkbox value="reports">Отчёты</Checkbox>
                    <Checkbox value="live-streams">Прямые трансляции</Checkbox>
                    <Checkbox value="organization-settings">Настройки кастомизации</Checkbox>
                    <Checkbox value="backups">Управление бэкапами</Checkbox>
                    <Checkbox value="logging">Логирование</Checkbox>
                    <Checkbox value="documents">Документы</Checkbox>
                  </Space>
                </Checkbox.Group>
              </Form.Item>
                </>
              ) : null;
            }}
          </Form.Item>

          {!editingUser && (
            <Form.Item
              label="Пароль"
              rules={[{ required: true, min: 6, message: 'Пароль должен содержать минимум 6 символов' }]}
              shouldUpdate={(prevValues, currentValues) => prevValues.password !== currentValues.password}
            >
              {({ getFieldValue, setFieldValue }) => (
                <Form.Item
                  name="password"
                  noStyle
                  rules={[{ required: true, min: 6, message: 'Пароль должен содержать минимум 6 символов' }]}
                >
                  <Space.Compact style={{ width: '100%' }}>
                    <Input.Password 
                      style={{ flex: 1 }}
                      placeholder="Введите пароль"
                      value={generatedPassword || getFieldValue('password') || ''}
                      onChange={(e) => {
                        setFieldValue('password', e.target.value);
                        setGeneratedPassword('');
                      }}
                    />
                    <Button 
                      type="button"
                      onClick={() => {
                        const newPassword = generatePassword();
                        setGeneratedPassword(newPassword);
                        setFieldValue('password', newPassword);
                      }}
                    >
                      Сгенерировать
                    </Button>
                  </Space.Compact>
                </Form.Item>
              )}
            </Form.Item>
          )}

          {editingUser && (
            <Form.Item
              label="Новый пароль (оставьте пустым, чтобы не менять)"
              rules={[{ min: 6, message: 'Пароль должен содержать минимум 6 символов' }]}
              shouldUpdate={(prevValues, currentValues) => prevValues.password !== currentValues.password}
            >
              {({ getFieldValue, setFieldValue }) => (
                <Form.Item
                  name="password"
                  noStyle
                  rules={[{ min: 6, message: 'Пароль должен содержать минимум 6 символов' }]}
                >
                  <Space.Compact style={{ width: '100%' }}>
                    <Input.Password 
                      style={{ flex: 1 }}
                      placeholder="Введите новый пароль (необязательно)"
                      value={generatedPassword || getFieldValue('password') || ''}
                      onChange={(e) => {
                        setFieldValue('password', e.target.value);
                        setGeneratedPassword('');
                      }}
                    />
                    <Button 
                      type="button"
                      onClick={() => {
                        const newPassword = generatePassword();
                        setGeneratedPassword(newPassword);
                        setFieldValue('password', newPassword);
                      }}
                    >
                      Сгенерировать
                    </Button>
                  </Space.Compact>
                </Form.Item>
              )}
            </Form.Item>
          )}

          <Form.Item
            name="firstName"
            label="Имя"
            rules={[{ required: true }]}
          >
            <Input placeholder="Введите имя" />
          </Form.Item>

          <Form.Item
            name="lastName"
            label="Фамилия"
            rules={[{ required: true }]}
          >
            <Input placeholder="Введите фамилию" />
          </Form.Item>

          <Form.Item
            name="middleName"
            label="Отчество"
          >
            <Input placeholder="Введите отчество (необязательно)" />
          </Form.Item>

          <Form.Item name="phone" label="Телефон">
            <Input />
          </Form.Item>

          {editingUser && (
            <Form.Item name="isActive" label="Статус" valuePropName="checked">
              <Switch checkedChildren="Активен" unCheckedChildren="Неактивен" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title="Экспорт паролей пользователей"
        open={exportModalVisible}
        onCancel={() => {
          setExportModalVisible(false);
          setExportRole(undefined);
          setExportMode('role');
        }}
        onOk={handleExportPasswords}
        confirmLoading={exportLoading}
        okText="Экспортировать"
        cancelText="Отмена"
      >
        <Radio.Group 
          value={exportMode} 
          onChange={(e) => {
            setExportMode(e.target.value);
            setExportRole(undefined);
          }}
          style={{ width: '100%', marginBottom: 16 }}
        >
          <Radio value="selected">Экспорт выбранных пользователей ({selectedUserIds.length})</Radio>
          <Radio value="role">Экспорт по категории</Radio>
        </Radio.Group>
        
        {exportMode === 'selected' && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ color: selectedUserIds.length === 0 ? '#ff4d4f' : '#52c41a' }}>
              Выбрано пользователей: {selectedUserIds.length}
            </p>
            {selectedUserIds.length === 0 && (
              <p style={{ color: '#ff4d4f', fontSize: '12px' }}>
                Выберите пользователей в таблице для экспорта
              </p>
            )}
          </div>
        )}
        
        {exportMode === 'role' && (
          <>
            <p>Выберите категорию пользователей для экспорта:</p>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              placeholder="Выберите категорию"
              onChange={(value) => setExportRole(value)}
              allowClear
              value={exportRole}
            >
              <Select.Option value="">Все пользователи</Select.Option>
              <Select.Option value="ADMIN">Администраторы</Select.Option>
              <Select.Option value="MODERATOR">Модераторы</Select.Option>
              <Select.Option value="JUDGE">Судьи</Select.Option>
              <Select.Option value="COACH">Тренеры</Select.Option>
              <Select.Option value="ATHLETE">Спортсмены</Select.Option>
              <Select.Option value="GUEST">Гости</Select.Option>
            </Select>
          </>
        )}
        
        <p style={{ marginTop: 16, color: '#ff4d4f', fontSize: '12px' }}>
          ⚠️ Внимание: При экспорте будут сгенерированы новые временные пароли для всех выбранных пользователей. 
          Старые пароли будут заменены!
        </p>
      </Modal>
    </div>
  );
};

