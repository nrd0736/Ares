/**
 * Страница уведомлений судьи
 * 
 * Функциональность:
 * - Просмотр уведомлений
 * - Создание уведомлений для участников соревнований
 * - Отправка уведомлений командам или всем участникам соревнования
 */

import { useState, useEffect } from 'react';
import { Card, Form, Input, Select, Button, message, Radio, Space } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';

interface Competition {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  profile: {
    firstName: string;
    lastName: string;
  } | null;
}

export const JudgeNotificationsPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [recipientType, setRecipientType] = useState<'TEAM' | 'COMPETITION' | 'USER'>('COMPETITION');
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState<string | null>(null);

  useEffect(() => {
    loadCompetitions();
  }, []);

  useEffect(() => {
    if (recipientType === 'TEAM' && selectedCompetition) {
      loadTeamsForCompetition();
    } else if (recipientType === 'USER' && selectedCompetition) {
      loadUsersForCompetition();
    }
  }, [recipientType, selectedCompetition]);

  const loadCompetitions = async () => {
    setLoadingOptions(true);
    try {
      // Загружаем только соревнования, к которым прикреплен судья
      const response = await apiClient.get('/competitions/judge/my');
      setCompetitions(response.data.data.competitions || []);
    } catch (error) {
      message.error('Ошибка загрузки соревнований');
    } finally {
      setLoadingOptions(false);
    }
  };

  const loadTeamsForCompetition = async () => {
    if (!selectedCompetition) return;
    setLoadingOptions(true);
    try {
      // Загружаем участников соревнования
      const response = await apiClient.get(`/competitions/${selectedCompetition}/participants`);
      const participants = response.data.data.participants || [];
      
      // Извлекаем уникальные команды из участников
      const uniqueTeams = new Map<string, Team>();
      participants.forEach((p: any) => {
        if (p.athlete?.team) {
          uniqueTeams.set(p.athlete.team.id, {
            id: p.athlete.team.id,
            name: p.athlete.team.name,
          });
        }
      });
      
      setTeams(Array.from(uniqueTeams.values()));
    } catch (error) {
      message.error('Ошибка загрузки команд');
    } finally {
      setLoadingOptions(false);
    }
  };

  const loadUsersForCompetition = async () => {
    if (!selectedCompetition) return;
    setLoadingOptions(true);
    try {
      // Загружаем участников соревнования
      const response = await apiClient.get(`/competitions/${selectedCompetition}/participants`);
      const participants = response.data.data.participants || [];
      
      // Извлекаем пользователей (спортсмены и тренеры)
      const uniqueUsers = new Map<string, User>();
      participants.forEach((p: any) => {
        if (p.athlete?.user) {
          uniqueUsers.set(p.athlete.user.id, {
            id: p.athlete.user.id,
            email: p.athlete.user.email,
            profile: p.athlete.user.profile,
          });
        }
        // Также добавляем тренеров
        if (p.athlete?.coach?.user) {
          uniqueUsers.set(p.athlete.coach.user.id, {
            id: p.athlete.coach.user.id,
            email: p.athlete.coach.user.email,
            profile: p.athlete.coach.user.profile,
          });
        }
      });
      
      setUsers(Array.from(uniqueUsers.values()));
    } catch (error) {
      message.error('Ошибка загрузки пользователей');
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleCompetitionChange = (competitionId: string) => {
    setSelectedCompetition(competitionId);
    form.setFieldsValue({ recipientId: undefined });
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const notificationData = {
        title: values.title,
        message: values.message,
        recipientType: recipientType,
        // Если выбран тип COMPETITION, используем selectedCompetition, иначе values.recipientId
        recipientId: recipientType === 'COMPETITION' ? selectedCompetition : values.recipientId,
      };

      const response = await apiClient.post('/notifications', notificationData);
      message.success(response.data.message || 'Уведомление успешно отправлено');
      form.resetFields();
      setSelectedCompetition(null);
      setRecipientType('COMPETITION');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при отправке уведомления');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, marginBottom: 24, color: '#262626' }}>Отправка уведомлений</h1>
      <Card style={{ maxWidth: 800, margin: '0 auto' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="Выберите соревнование"
            rules={[{ required: true, message: 'Выберите соревнование' }]}
          >
            <Select
              placeholder="Выберите соревнование"
              loading={loadingOptions}
              showSearch
              value={selectedCompetition}
              onChange={handleCompetitionChange}
              filterOption={(input, option) =>
                (option?.children as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {competitions.map((competition) => (
                <Select.Option key={competition.id} value={competition.id}>
                  {competition.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {selectedCompetition && (
            <>
              <Form.Item
                name="recipientType"
                label="Тип получателя"
                rules={[{ required: true }]}
                initialValue="COMPETITION"
              >
                <Radio.Group
                  onChange={(e) => {
                    setRecipientType(e.target.value);
                    form.setFieldsValue({ recipientId: undefined });
                  }}
                >
                  <Radio value="COMPETITION">Всем участникам соревнования</Radio>
                  <Radio value="TEAM">Команде</Radio>
                  <Radio value="USER">Конкретному пользователю</Radio>
                </Radio.Group>
              </Form.Item>

              {recipientType === 'TEAM' && (
                <Form.Item
                  name="recipientId"
                  label="Выберите команду"
                  rules={[{ required: true, message: 'Выберите команду' }]}
                >
                  <Select
                    placeholder="Выберите команду"
                    loading={loadingOptions}
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                  >
                    {teams.map((team) => (
                      <Select.Option key={team.id} value={team.id}>
                        {team.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              )}

              {recipientType === 'USER' && (
                <Form.Item
                  name="recipientId"
                  label="Выберите пользователя"
                  rules={[{ required: true, message: 'Выберите пользователя' }]}
                >
                  <Select
                    placeholder="Выберите пользователя"
                    loading={loadingOptions}
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                  >
                    {users.map((user) => {
                      const displayName = user.profile
                        ? `${user.profile.firstName} ${user.profile.lastName}`
                        : user.email;
                      return (
                        <Select.Option key={user.id} value={user.id}>
                          {displayName} ({user.email})
                        </Select.Option>
                      );
                    })}
                  </Select>
                </Form.Item>
              )}

              <Form.Item
                name="title"
                label="Заголовок"
                rules={[{ required: true, message: 'Введите заголовок' }]}
              >
                <Input placeholder="Заголовок уведомления" />
              </Form.Item>

              <Form.Item
                name="message"
                label="Сообщение"
                rules={[{ required: true, message: 'Введите сообщение' }]}
              >
                <Input.TextArea
                  rows={6}
                  placeholder="Текст уведомления"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SendOutlined />}
                  loading={loading}
                  block
                  size="large"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                  }}
                >
                  Отправить уведомление
                </Button>
              </Form.Item>
            </>
          )}

          {!selectedCompetition && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#8c8c8c' }}>
              <p>Выберите соревнование для отправки уведомлений</p>
            </div>
          )}
        </Form>
      </Card>
    </div>
  );
};

