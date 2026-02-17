/**
 * Страница управления обращениями (администратор)
 * 
 * Функциональность:
 * - Просмотр всех обращений
 * - Изменение статуса обращений
 * - Ответы на обращения
 * - Фильтрация по статусу
 */

import { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, Modal, Descriptions, message, Select, Input, Form } from 'antd';
import { EyeOutlined, SendOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';

const { TextArea } = Input;

interface Ticket {
  id: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  createdAt: string;
  user: {
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      middleName?: string;
    } | null;
  };
}

export const TicketsManagement = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [replyForm] = Form.useForm();
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    loadTickets();
  }, [statusFilter]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) {
        params.status = statusFilter;
      }
      const response = await apiClient.get('/tickets', { params });
      setTickets(response.data.data.tickets || []);
    } catch (error: any) {
      message.error('Ошибка загрузки обращений');
    } finally {
      setLoading(false);
    }
  };

  const handleView = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setModalVisible(true);
    replyForm.resetFields();
  };

  const handleReply = async (values: { reply: string }) => {
    if (!selectedTicket) return;

    setReplying(true);
    try {
      await apiClient.post(`/tickets/${selectedTicket.id}/reply`, {
        reply: values.reply,
        status: 'CLOSED',
      });
      message.success('Ответ отправлен пользователю');
      replyForm.resetFields();
      loadTickets();
      setModalVisible(false);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при отправке ответа');
    } finally {
      setReplying(false);
    }
  };

  const getFullName = (ticket: Ticket) => {
    // Проверяем, есть ли profile (может быть null для гостевых пользователей)
    if (!ticket.user.profile) {
      // Для гостевых пользователей возвращаем email или "Гость"
      return ticket.user.email === 'guest@system.local' ? 'Гость' : ticket.user.email;
    }
    const { firstName, lastName, middleName } = ticket.user.profile;
    return `${lastName} ${firstName} ${middleName || ''}`.trim();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      OPEN: 'blue',
      CLOSED: 'green',
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      OPEN: 'Открыто',
      CLOSED: 'Закрыто',
    };
    return texts[status] || status;
  };

  const getCategoryText = (category: string | null | undefined) => {
    if (!category) {
      return 'Не указана';
    }
    // Приводим к нижнему регистру для унификации
    const categoryLower = category.toLowerCase();
    const texts: Record<string, string> = {
      technical: 'Техническая поддержка',
      question: 'Вопрос',
      suggestion: 'Предложение',
      complaint: 'Жалоба',
      other: 'Другое',
    };
    return texts[categoryLower] || category;
  };

  const columns = [
    {
      title: 'Тема',
      dataIndex: 'subject',
      key: 'subject',
    },
    {
      title: 'Категория',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => getCategoryText(category),
    },
    {
      title: 'Пользователь',
      key: 'user',
      render: (_: any, record: Ticket) => getFullName(record),
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
      title: 'Дата создания',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Ticket) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleView(record)}
        >
          Просмотреть
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#262626' }}>Управление обращениями</h1>
        <Select
          placeholder="Фильтр по статусу"
          allowClear
          style={{ width: 200 }}
          onChange={(value) => setStatusFilter(value)}
        >
          <Select.Option value="OPEN">Открыто</Select.Option>
          <Select.Option value="CLOSED">Закрыто</Select.Option>
        </Select>
      </div>

      <Table
        columns={columns}
        dataSource={tickets}
        loading={loading}
        rowKey="id"
        pagination={{
          showSizeChanger: true,
          showTotal: (total) => `Всего: ${total}`,
        }}
      />

      <Modal
        title="Детали обращения"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          replyForm.resetFields();
        }}
        footer={null}
        width={700}
      >
        {selectedTicket && (
          <>
            <Descriptions bordered column={1} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="Тема">{selectedTicket.subject}</Descriptions.Item>
              <Descriptions.Item label="Категория">
                {getCategoryText(selectedTicket.category)}
              </Descriptions.Item>
              <Descriptions.Item label="Пользователь">
                {getFullName(selectedTicket)}
              </Descriptions.Item>
              <Descriptions.Item label="Статус">
                <Tag color={getStatusColor(selectedTicket.status)}>
                  {getStatusText(selectedTicket.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Дата создания">
                {new Date(selectedTicket.createdAt).toLocaleString('ru-RU')}
              </Descriptions.Item>
              <Descriptions.Item label="Сообщение">
                <div style={{ whiteSpace: 'pre-wrap' }}>{selectedTicket.message}</div>
              </Descriptions.Item>
            </Descriptions>

            {selectedTicket.status !== 'CLOSED' && (
              <Form
                form={replyForm}
                onFinish={handleReply}
                layout="vertical"
              >
                <Form.Item
                  name="reply"
                  label="Ответ на обращение"
                  rules={[{ required: true, message: 'Введите ответ' }]}
                >
                  <TextArea
                    rows={6}
                    placeholder="Введите ответ пользователю..."
                  />
                </Form.Item>
                <Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SendOutlined />}
                      loading={replying}
                    >
                      Отправить ответ
                    </Button>
                    <Button onClick={() => setModalVisible(false)}>
                      Закрыть
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            )}

            {selectedTicket.status === 'CLOSED' && (
              <div style={{ textAlign: 'right', marginTop: 16 }}>
                <Button onClick={() => setModalVisible(false)}>
                  Закрыть
                </Button>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

