/**
 * Страница отправки уведомлений (тренер)
 * 
 * Функциональность:
 * - Отправка уведомлений спортсменам команды
 * - Выбор получателей (все спортсмены, конкретные спортсмены)
 * - Создание уведомлений о соревнованиях, тренировках и т.д.
 */

import { useState, useEffect } from 'react';
import { Card, Form, Input, Select, Button, message, Space, Radio } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store/store';

interface Athlete {
  id: string;
  user: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}

export const SendNotification = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { user } = useSelector((state: RootState) => state.auth);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [recipientType, setRecipientType] = useState<'TEAM' | 'ATHLETE'>('TEAM');

  useEffect(() => {
    loadTeamInfo();
  }, []);

  const loadTeamInfo = async () => {
    try {
      const response = await apiClient.get('/teams/my');
      const team = response.data.data;
      setTeamId(team.id);
      setAthletes(team.athletes || []);
    } catch (error) {
      console.error('Ошибка загрузки информации о команде', error);
    }
  };

  const handleSubmit = async (values: any) => {
    if (!teamId) {
      message.warning('Команда не найдена');
      return;
    }

    setLoading(true);
    try {
      if (recipientType === 'TEAM') {
        // Отправка всей команде
        await apiClient.post('/notifications', {
          title: values.title,
          message: values.message,
          recipientType: 'TEAM',
          recipientId: teamId,
        });
        message.success('Уведомление успешно отправлено команде');
      } else {
        // Отправка конкретным спортсменам
        if (!values.athleteIds || values.athleteIds.length === 0) {
          message.warning('Выберите хотя бы одного спортсмена');
          setLoading(false);
          return;
        }
        
        // Отправляем уведомление каждому выбранному спортсмену
        const promises = values.athleteIds.map((athleteId: string) =>
          apiClient.post('/notifications', {
            title: values.title,
            message: values.message,
            recipientType: 'ATHLETE',
            recipientId: athleteId,
          })
        );
        
        await Promise.all(promises);
        message.success(`Уведомление успешно отправлено ${values.athleteIds.length} спортсменам`);
      }
      
      form.resetFields();
      setRecipientType('TEAM');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при отправке уведомления');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 600,
          margin: 0,
          color: '#262626'
        }}>
          Отправка уведомлений
          </h1>
        <p style={{ color: '#6c757d', fontSize: '14px' }}>
          Отправьте уведомление всей команде или конкретным спортсменам
        </p>
      </div>
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="recipientType"
            label="Получатель"
            initialValue="TEAM"
          >
            <Radio.Group
              value={recipientType}
              onChange={(e) => {
                setRecipientType(e.target.value);
                form.setFieldsValue({ athleteIds: undefined });
              }}
            >
              <Radio value="TEAM">Вся команда</Radio>
              <Radio value="ATHLETE">Конкретные спортсмены</Radio>
            </Radio.Group>
          </Form.Item>

          {recipientType === 'ATHLETE' && (
            <Form.Item
              name="athleteIds"
              label="Выберите спортсменов"
              rules={[{ required: true, message: 'Выберите хотя бы одного спортсмена' }]}
            >
              <Select
                mode="multiple"
                placeholder="Выберите спортсменов"
                showSearch
                filterOption={(input, option) =>
                  (option?.children as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {athletes.map((athlete) => (
                  <Select.Option key={athlete.user.id} value={athlete.user.id}>
                    {athlete.user.profile.firstName} {athlete.user.profile.lastName}
                  </Select.Option>
                ))}
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
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SendOutlined />}
                loading={loading}
              >
                Отправить уведомление
              </Button>
              <Button onClick={() => {
                form.resetFields();
                setRecipientType('TEAM');
              }}>
                Очистить
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

