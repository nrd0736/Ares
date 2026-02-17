/**
 * Страница управления уведомлениями (администратор)
 * 
 * Функциональность:
 * - Создание уведомлений
 * - Отправка уведомлений различным группам получателей
 * - Типы получателей: все пользователи, роль, команда, соревнование, конкретный пользователь
 */

import { useState, useEffect } from 'react';
import { Card, Form, Input, Select, Button, message, Radio, Space } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';

interface Team {
  id: string;
  name: string;
}

interface Competition {
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

export const NotificationsManagement = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [recipientType, setRecipientType] = useState<'ALL' | 'TEAM' | 'COMPETITION' | 'USER'>('ALL');
  const [teams, setTeams] = useState<Team[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    if (recipientType === 'TEAM') {
      loadTeams();
    } else if (recipientType === 'COMPETITION') {
      loadCompetitions();
    } else if (recipientType === 'USER') {
      loadUsers();
    }
  }, [recipientType]);

  const loadTeams = async () => {
    setLoadingOptions(true);
    try {
      const response = await apiClient.get('/teams');
      setTeams(response.data.data.teams || []);
    } catch (error) {
      message.error('Ошибка загрузки команд');
    } finally {
      setLoadingOptions(false);
    }
  };

  const loadCompetitions = async () => {
    setLoadingOptions(true);
    try {
      const response = await apiClient.get('/competitions');
      setCompetitions(response.data.data.competitions || []);
    } catch (error) {
      message.error('Ошибка загрузки соревнований');
    } finally {
      setLoadingOptions(false);
    }
  };

  const loadUsers = async () => {
    setLoadingOptions(true);
    try {
      // Загружаем всех пользователей без пагинации
      const response = await apiClient.get('/users', {
        params: {
          page: 1,
          limit: 10000, // Большое число для загрузки всех
        },
      });
      setUsers(response.data.data.users || []);
    } catch (error) {
      message.error('Ошибка загрузки пользователей');
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const notificationData = {
        title: values.title,
        message: values.message,
        recipientType: recipientType,
        recipientId: recipientType !== 'ALL' ? values.recipientId : undefined,
      };

      const response = await apiClient.post('/notifications', notificationData);
      message.success(response.data.message || 'Уведомление успешно отправлено');
      form.resetFields();
      setRecipientType('ALL');
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
            name="recipientType"
            label="Тип получателя"
            rules={[{ required: true }]}
            initialValue="ALL"
          >
            <Radio.Group
              onChange={(e) => {
                setRecipientType(e.target.value);
                form.setFieldsValue({ recipientId: undefined });
              }}
            >
              <Radio value="ALL">Всем пользователям</Radio>
              <Radio value="TEAM">Команде</Radio>
              <Radio value="COMPETITION">Участникам соревнования</Radio>
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

          {recipientType === 'COMPETITION' && (
            <Form.Item
              name="recipientId"
              label="Выберите соревнование"
              rules={[{ required: true, message: 'Выберите соревнование' }]}
            >
              <Select
                placeholder="Выберите соревнование"
                loading={loadingOptions}
                showSearch
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
        </Form>
      </Card>
    </div>
  );
};

