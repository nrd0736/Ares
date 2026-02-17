/**
 * Страница управления приглашениями (администратор)
 * 
 * Функциональность:
 * - Создание приглашений для регистрации пользователей
 * - Генерация QR-кодов для приглашений
 * - Просмотр списка приглашений
 * - Удаление приглашений
 * - Отслеживание использованных приглашений
 */

import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, Select, message, QRCode, Card, Popconfirm } from 'antd';
import { PlusOutlined, QrcodeOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import { UserRole } from '../../../../types/user';
import QRCodeReact from 'qrcode.react';

interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  token: string;
  used: boolean;
  expiresAt: string;
  createdAt: string;
  createdBy: {
    email: string;
  };
}

interface Team {
  id: string;
  name: string;
}

export const InvitationsManagement = () => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [form] = Form.useForm();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedRole, setSelectedRole] = useState<UserRole | undefined>();

  useEffect(() => {
    loadInvitations();
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      const response = await apiClient.get('/teams');
      setTeams(response.data.data.teams || []);
    } catch (error) {
      console.error('Ошибка загрузки команд', error);
    }
  };

  const loadInvitations = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/auth/invitations');
      setInvitations(response.data.data.invitations);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка загрузки приглашений');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedRole(undefined);
    form.resetFields();
    setModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      const response = await apiClient.post('/auth/invite', values);
      message.success('Приглашение успешно создано');
      setModalVisible(false);
      
      // Показываем QR код для нового приглашения
      if (response.data.data?.invitation) {
        const invitation = response.data.data.invitation;
        setSelectedInvitation({
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          token: invitation.token || response.data.data.qrCode,
          used: false,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt,
          createdBy: {
            email: '',
          },
        });
        setQrModalVisible(true);
      }
      
      loadInvitations();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при создании приглашения');
    }
  };

  const handleShowQR = (invitation: Invitation) => {
    setSelectedInvitation(invitation);
    setQrModalVisible(true);
  };

  const handleCopyLink = (invitation: Invitation) => {
    const registrationUrl = `${window.location.origin}/register?token=${invitation.token}`;
    navigator.clipboard.writeText(registrationUrl);
    message.success('Ссылка скопирована в буфер обмена');
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/auth/invitations/${id}`);
      message.success('Приглашение удалено');
      loadInvitations();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при удалении приглашения');
    }
  };

  const getRoleColor = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      ADMIN: 'red',
      JUDGE: 'blue',
      COACH: 'green',
      ATHLETE: 'purple',
      GUEST: 'orange',
    };
    return colors[role] || 'default';
  };

  const columns = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
      render: (role: UserRole) => (
        <Tag color={getRoleColor(role)}>{role}</Tag>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'used',
      key: 'used',
      render: (used: boolean) => (
        <Tag color={used ? 'green' : 'orange'}>
          {used ? 'Использовано' : 'Активно'}
        </Tag>
      ),
    },
    {
      title: 'Создано',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
    },
    {
      title: 'Истекает',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Invitation) => (
        <Space>
          {!record.used && (
            <>
              <Button
                type="link"
                icon={<QrcodeOutlined />}
                onClick={() => handleShowQR(record)}
              >
                QR код
              </Button>
              <Button
                type="link"
                icon={<CopyOutlined />}
                onClick={() => handleCopyLink(record)}
              >
                Копировать ссылку
              </Button>
            </>
          )}
          <Popconfirm
            title="Вы уверены, что хотите удалить это приглашение?"
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
        <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#262626' }}>Управление приглашениями</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Создать приглашение
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={invitations}
        loading={loading}
        rowKey="id"
        pagination={false}
      />

      <Modal
        title="Создать приглашение"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: 'email' }]}
          >
            <Input placeholder="email@example.com" />
          </Form.Item>

          <Form.Item
            name="role"
            label="Роль"
            rules={[{ required: true }]}
          >
            <Select
              placeholder="Выберите роль"
              onChange={(value) => {
                setSelectedRole(value);
                // Очищаем поле команды при смене роли
                if (value !== 'COACH') {
                  form.setFieldsValue({ teamId: undefined });
                }
              }}
            >
              <Select.Option value="ADMIN">Администратор</Select.Option>
              <Select.Option value="JUDGE">Судья</Select.Option>
              <Select.Option value="COACH">Тренер</Select.Option>
              <Select.Option value="ATHLETE">Спортсмен</Select.Option>
            </Select>
          </Form.Item>

          {/* Поле команды для тренера */}
          {(selectedRole === 'COACH' || form.getFieldValue('role') === 'COACH') && (
            <Form.Item
              name="teamId"
              label="Команда"
              rules={[{ required: true, message: 'Выберите команду для тренера' }]}
            >
              <Select placeholder="Выберите команду" showSearch>
                {teams.map((team) => (
                  <Select.Option key={team.id} value={team.id}>
                    {team.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title="QR код приглашения"
        open={qrModalVisible}
        onCancel={() => setQrModalVisible(false)}
        footer={[
          <Button key="copy" icon={<CopyOutlined />} onClick={() => selectedInvitation && handleCopyLink(selectedInvitation)}>
            Копировать ссылку
          </Button>,
          <Button key="close" onClick={() => setQrModalVisible(false)}>
            Закрыть
          </Button>,
        ]}
        width={400}
      >
        {selectedInvitation && (
          <div style={{ textAlign: 'center' }}>
            <Card>
              <QRCodeReact
                value={`${window.location.origin}/register?token=${selectedInvitation.token}`}
                size={256}
                level="H"
                includeMargin={true}
              />
            </Card>
            <div style={{ marginTop: 16 }}>
              <p><strong>Email:</strong> {selectedInvitation.email}</p>
              <p><strong>Роль:</strong> {selectedInvitation.role}</p>
              <p style={{ fontSize: '12px', color: '#999', marginTop: 8 }}>
                Отсканируйте QR код или отправьте ссылку пользователю
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

