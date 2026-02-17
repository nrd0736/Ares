/**
 * Страница обращений (судья)
 * 
 * Функциональность:
 * - Создание обращения в службу поддержки
 * - Просмотр своих обращений
 * - Отслеживание статуса обращений
 */

import { Form, Input, Button, Select, Card, message } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import { useState } from 'react';

export const TicketsPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await apiClient.post('/tickets', values);
      message.success('Обращение успешно отправлено администратору');
      form.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при отправке обращения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, marginBottom: 24, color: '#262626' }}>Создать обращение</h1>
      <Card style={{ maxWidth: 800, margin: '0 auto' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="category"
            label="Категория"
          >
            <Select placeholder="Выберите категорию">
              <Select.Option value="technical">Техническая поддержка</Select.Option>
              <Select.Option value="question">Вопрос</Select.Option>
              <Select.Option value="suggestion">Предложение</Select.Option>
              <Select.Option value="complaint">Жалоба</Select.Option>
              <Select.Option value="other">Другое</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="subject"
            label="Тема"
            rules={[{ required: true, message: 'Введите тему обращения' }]}
          >
            <Input placeholder="Тема обращения" />
          </Form.Item>

          <Form.Item
            name="message"
            label="Сообщение"
            rules={[{ required: true, message: 'Введите сообщение' }]}
          >
            <Input.TextArea
              rows={6}
              placeholder="Опишите ваш вопрос или проблему"
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
            >
              Отправить обращение
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

