/**
 * Страница профиля пользователя
 * 
 * Функциональность:
 * - Просмотр данных профиля
 * - Редактирование профиля
 * - Загрузка аватара
 * - Смена пароля
 * - Настройки для судей (город, категория, должность)
 * 
 * Доступна для всех ролей
 */

import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Descriptions, Avatar, Space, Upload, Select } from 'antd';
import { UserOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import apiClient from '../../../../services/api-client';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../../store/store';
import { setUser } from '../../../../store/slices/auth-slice';
import { getAvatarUrl } from '../../../../utils/image-utils';

interface Region {
  id: string;
  name: string;
  federalDistrict?: {
    name: string;
  };
}

export const ProfilePage = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [form] = Form.useForm();
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user?.profile?.avatarUrl);
  const [moderatorData, setModeratorData] = useState<{ description?: string; allowedTabs?: string[] } | null>(null);
  const [athleteData, setAthleteData] = useState<any>(null);
  const [judgeData, setJudgeData] = useState<{ city?: string; category?: string; position?: string; regionId?: string; region?: any } | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);

  useEffect(() => {
    if (user?.profile) {
      form.setFieldsValue({
        firstName: user.profile.firstName || '',
        lastName: user.profile.lastName || '',
        middleName: user.profile.middleName || '',
        phone: user.profile.phone || '',
        email: user.email || '',
      });
      setAvatarUrl(user.profile.avatarUrl);
    }
    
    // Загружаем данные модератора, если пользователь - модератор
    if (user?.role === 'MODERATOR' && user?.id) {
      loadModeratorData();
    }
    
    // Загружаем данные спортсмена, если пользователь - спортсмен
    if (user?.role === 'ATHLETE' && user?.id) {
      loadAthleteData();
    }
    
    // Загружаем данные судьи, если пользователь - судья
    if (user?.role === 'JUDGE' && user?.id) {
      loadJudgeData();
      loadRegions();
    }
  }, [user, form]);

  const loadModeratorData = async () => {
    if (!user?.id) return;
    try {
      const response = await apiClient.get(`/users/${user.id}`);
      if (response.data.success && response.data.data.moderator) {
        setModeratorData({
          description: response.data.data.moderator.description,
          allowedTabs: Array.isArray(response.data.data.moderator.allowedTabs)
            ? response.data.data.moderator.allowedTabs
            : (typeof response.data.data.moderator.allowedTabs === 'string'
              ? JSON.parse(response.data.data.moderator.allowedTabs)
              : []),
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки данных модератора', error);
    }
  };

  const loadAthleteData = async () => {
    if (!user?.id) return;
    try {
      // Используем данные из user, если они уже есть
      if (user?.athlete) {
        setAthleteData(user.athlete);
        return;
      }
      
      // Иначе загружаем через API
      const response = await apiClient.get(`/users/${user.id}`);
      if (response.data.success && response.data.data.athlete) {
        setAthleteData(response.data.data.athlete);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных спортсмена', error);
    }
  };

  const loadJudgeData = async () => {
    if (!user?.id) return;
    try {
      const response = await apiClient.get(`/users/${user.id}`);
      if (response.data.success && response.data.data.judgeProfile) {
        const judgeProfile = response.data.data.judgeProfile;
        setJudgeData({
          city: judgeProfile.city,
          category: judgeProfile.category,
          position: judgeProfile.position,
          regionId: judgeProfile.regionId,
          region: judgeProfile.region,
        });
        
        // Устанавливаем значения в форму
        form.setFieldsValue({
          judgeCity: judgeProfile.city || '',
          judgeCategory: judgeProfile.category || '',
          judgePosition: judgeProfile.position || '',
          judgeRegionId: judgeProfile.regionId || undefined,
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки данных судьи', error);
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

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await apiClient.post('/upload/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const newAvatarUrl = response.data.data.avatarUrl;
        setAvatarUrl(newAvatarUrl);
        
        // Обновляем данные пользователя
        const userResponse = await apiClient.get('/auth/me');
        if (userResponse.data.success && userResponse.data.data.user) {
          dispatch(setUser(userResponse.data.data.user));
        }
        
        message.success('Аватар успешно загружен');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при загрузке аватара');
    } finally {
      setUploadingAvatar(false);
    }
    return false; // Предотвращаем автоматическую загрузку
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
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
      
      await apiClient.put('/users/profile/me', values);
      message.success('Профиль успешно обновлен');
      
      // Обновляем данные пользователя через /auth/me
      const response = await apiClient.get('/auth/me');
      if (response.data.success && response.data.data.user) {
        dispatch(setUser(response.data.data.user));
        // Обновляем форму с новыми данными
        form.setFieldsValue({
          firstName: response.data.data.user.profile?.firstName || '',
          lastName: response.data.data.user.profile?.lastName || '',
          middleName: response.data.data.user.profile?.middleName || '',
          phone: response.data.data.user.profile?.phone || '',
          email: response.data.data.user.email || '',
        });
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при обновлении профиля');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Card
        title={
          <Space>
            <div style={{ position: 'relative' }}>
              <Avatar 
                size={64} 
                icon={<UserOutlined />} 
                src={getAvatarUrl(avatarUrl)}
              />
              <Upload
                beforeUpload={handleAvatarUpload}
                showUploadList={false}
                accept="image/*"
              >
                <Button
                  type="primary"
                  shape="circle"
                  icon={<UploadOutlined />}
                  size="small"
                  loading={uploadingAvatar}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                  }}
                />
              </Upload>
            </div>
            <div>
              <h2 style={{ margin: 0 }}>
                {user?.profile?.lastName} {user?.profile?.firstName} {user?.profile?.middleName || ''}
              </h2>
              <p style={{ margin: 0, color: '#8c8c8c' }}>{user?.email}</p>
            </div>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Роль">
            {user?.role === 'ADMIN' ? 'Администратор' : 
             user?.role === 'MODERATOR' ? 'Модератор' : 
             user?.role === 'JUDGE' ? 'Судья' :
             user?.role === 'COACH' ? 'Тренер' :
             user?.role === 'ATHLETE' ? 'Спортсмен' :
             user?.role}
          </Descriptions.Item>
          <Descriptions.Item label="Статус">
            {user?.isActive ? 'Активен' : 'Неактивен'}
          </Descriptions.Item>
          <Descriptions.Item label="Email">{user?.email}</Descriptions.Item>
          <Descriptions.Item label="Телефон">
            {user?.profile?.phone || '-'}
          </Descriptions.Item>
          {user?.role === 'ATHLETE' && athleteData && (
            <>
              <Descriptions.Item label="Дата рождения">
                {athleteData.birthDate 
                  ? new Date(athleteData.birthDate).toLocaleDateString('ru-RU')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Пол">
                {athleteData.gender === 'MALE' ? 'Мужской' : 
                 athleteData.gender === 'FEMALE' ? 'Женский' : 
                 athleteData.gender || '-'}
              </Descriptions.Item>
              {athleteData.team && (
                <Descriptions.Item label="Команда">
                  {athleteData.team.name || '-'}
                </Descriptions.Item>
              )}
              {athleteData.coach && athleteData.coach.user && (
                <Descriptions.Item label="Тренер">
                  {athleteData.coach.user.profile 
                    ? `${athleteData.coach.user.profile.lastName || ''} ${athleteData.coach.user.profile.firstName || ''} ${athleteData.coach.user.profile.middleName || ''}`.trim()
                    : athleteData.coach.user.email || '-'}
                </Descriptions.Item>
              )}
              {athleteData.weight && (
                <Descriptions.Item label="Вес">
                  {athleteData.weight} кг
                </Descriptions.Item>
              )}
              {athleteData.weightCategory && (
                <Descriptions.Item label="Весовая категория">
                  {athleteData.weightCategory.name || '-'}
                </Descriptions.Item>
              )}
              {athleteData.sportsRank && (
                <Descriptions.Item label="Спортивный разряд">
                  {athleteData.sportsRank.name || '-'}
                </Descriptions.Item>
              )}
              {athleteData.rank && (
                <Descriptions.Item label="Разряд">
                  {athleteData.rank}
                </Descriptions.Item>
              )}
              {athleteData.educationalOrganization && (
                <Descriptions.Item label="Образовательная организация" span={2}>
                  {athleteData.educationalOrganization.name || '-'}
                </Descriptions.Item>
              )}
              {athleteData.bestResults && (
                <Descriptions.Item label="Лучшие результаты" span={2}>
                  {athleteData.bestResults}
                </Descriptions.Item>
              )}
            </>
          )}
          {user?.role === 'MODERATOR' && moderatorData?.description && (
            <Descriptions.Item label="Описание" span={2}>
              {moderatorData.description}
            </Descriptions.Item>
          )}
          {user?.role === 'MODERATOR' && moderatorData?.allowedTabs && moderatorData.allowedTabs.length > 0 && (
            <Descriptions.Item label="Разрешенные вкладки" span={2}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {moderatorData.allowedTabs.map((tab: string) => {
                  const tabLabels: Record<string, string> = {
                    'users': 'Пользователи',
                    'teams': 'Команды',
                    'competitions': 'Соревнования',
                    'invitations': 'Приглашения',
                    'brackets': 'Турнирные сетки',
                    'calendar': 'Календарь',
                    'news': 'Новости',
                    'statistics': 'Статистика',
                    'references': 'Справочники',
                    'notifications': 'Уведомления',
                    'tickets': 'Обращения',
                    'team-moderation': 'Модерация команд',
                    'reports': 'Отчёты',
                  };
                  return (
                    <span
                      key={tab}
                      style={{
                        padding: '4px 12px',
                        background: '#f0f0f0',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    >
                      {tabLabels[tab] || tab}
                    </span>
                  );
                })}
              </div>
            </Descriptions.Item>
          )}
          {user?.role === 'JUDGE' && (
            <>
              {judgeData?.category && (
                <Descriptions.Item label="Категория судьи">
                  {judgeData.category}
                </Descriptions.Item>
              )}
              {judgeData?.position && (
                <Descriptions.Item label="Должность">
                  {judgeData.position}
                </Descriptions.Item>
              )}
              {judgeData?.region && (
                <Descriptions.Item label="Регион">
                  {judgeData.region.name}
                  {judgeData.region.federalDistrict && ` (${judgeData.region.federalDistrict.name})`}
                </Descriptions.Item>
              )}
              {judgeData?.city && (
                <Descriptions.Item label="Город">
                  {judgeData.city}
                </Descriptions.Item>
              )}
            </>
          )}
        </Descriptions>
      </Card>

      <Card title="Редактировать профиль">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="firstName"
            label="Имя"
            rules={[{ required: true, message: 'Введите имя' }]}
          >
            <Input placeholder={user?.profile?.firstName || 'Введите имя'} />
          </Form.Item>

          <Form.Item
            name="lastName"
            label="Фамилия"
            rules={[{ required: true, message: 'Введите фамилию' }]}
          >
            <Input placeholder={user?.profile?.lastName || 'Введите фамилию'} />
          </Form.Item>

          <Form.Item
            name="middleName"
            label="Отчество"
          >
            <Input placeholder={user?.profile?.middleName || 'Введите отчество (необязательно)'} />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Телефон"
          >
            <Input placeholder={user?.profile?.phone || 'Введите телефон'} />
          </Form.Item>

          {/* Поля для судьи */}
          {user?.role === 'JUDGE' && (
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
          )}

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
              Сохранить изменения
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

