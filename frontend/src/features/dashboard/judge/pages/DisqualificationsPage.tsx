/**
 * Страница управления дисквалификациями (судья)
 * 
 * Функциональность:
 * - Создание дисквалификаций
 * - Просмотр дисквалификаций
 * - Указание причины дисквалификации
 * - Привязка к соревнованию и спортсмену
 */

import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, Select, DatePicker, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import dayjs from 'dayjs';

interface Disqualification {
  id: string;
  athlete: {
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
  competition: {
    name: string;
  };
  reason: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export const DisqualificationsPage = () => {
  const [disqualifications, setDisqualifications] = useState<Disqualification[]>([]);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadDisqualifications();
    loadCompetitions();
  }, []);

  const loadDisqualifications = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/disqualifications');
      setDisqualifications(response.data.data);
    } catch (error) {
      message.error('Ошибка загрузки дисквалификаций');
    } finally {
      setLoading(false);
    }
  };

  const loadCompetitions = async () => {
    try {
      // Загружаем только соревнования, к которым прикреплен судья
      const response = await apiClient.get('/competitions/judge/my');
      setCompetitions(response.data.data.competitions);
    } catch (error) {
      console.error('Ошибка загрузки соревнований', error);
    }
  };

  const loadAthletes = async (competitionId: string) => {
    try {
      const response = await apiClient.get(`/competitions/${competitionId}/participants`);
      setAthletes(response.data.data.participants);
    } catch (error) {
      console.error('Ошибка загрузки спортсменов', error);
      message.error('Ошибка загрузки спортсменов');
    }
  };

  const handleCreate = () => {
    form.resetFields();
    setSelectedCompetitionId(null);
    setAthletes([]);
    setModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      const data = {
        ...values,
        startDate: values.startDate.toISOString(),
        endDate: values.endDate.toISOString(),
      };

      await apiClient.post('/disqualifications', data);
      message.success('Дисквалификация успешно создана');
      setModalVisible(false);
      form.resetFields();
      setSelectedCompetitionId(null);
      setAthletes([]);
      loadDisqualifications();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при создании дисквалификации');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await apiClient.delete(`/disqualifications/${id}`);
      message.success('Дисквалификация снята');
      loadDisqualifications();
    } catch (error: any) {
      message.error('Ошибка при снятии дисквалификации');
    }
  };

  const columns = [
    {
      title: 'Спортсмен',
      key: 'athlete',
      render: (_: any, record: Disqualification) =>
        `${record.athlete.user.profile.firstName} ${record.athlete.user.profile.lastName}`,
    },
    {
      title: 'Соревнование',
      key: 'competition',
      render: (_: any, record: Disqualification) => record.competition.name,
    },
    {
      title: 'Причина',
      dataIndex: 'reason',
      key: 'reason',
    },
    {
      title: 'Период',
      key: 'period',
      render: (_: any, record: Disqualification) =>
        `${new Date(record.startDate).toLocaleDateString('ru-RU')} - ${new Date(record.endDate).toLocaleDateString('ru-RU')}`,
    },
    {
      title: 'Статус',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'red' : 'green'}>
          {isActive ? 'Активна' : 'Завершена'}
        </Tag>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Disqualification) => (
        <Space>
          {record.isActive && (
            <Popconfirm
              title="Вы уверены, что хотите снять дисквалификацию?"
              onConfirm={() => handleRemove(record.id)}
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                Снять
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#262626' }}>Дисквалификации</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Создать дисквалификацию
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={disqualifications}
        loading={loading}
        rowKey="id"
        pagination={false}
      />

      <Modal
        title="Создать дисквалификацию"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setSelectedCompetitionId(null);
          setAthletes([]);
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="competitionId"
            label="Соревнование"
            rules={[{ required: true }]}
          >
            <Select 
              placeholder="Выберите соревнование"
              onChange={(value) => {
                setSelectedCompetitionId(value);
                loadAthletes(value);
                form.setFieldsValue({ athleteId: undefined });
              }}
            >
              {competitions.map((comp) => (
                <Select.Option key={comp.id} value={comp.id}>
                  {comp.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="athleteId"
            label="Спортсмен"
            rules={[{ required: true }]}
          >
            <Select
              placeholder={selectedCompetitionId ? "Выберите спортсмена" : "Сначала выберите соревнование"}
              showSearch
              disabled={!selectedCompetitionId}
              filterOption={(input, option) =>
                (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {athletes.map((participant) => (
                <Select.Option key={participant.athlete.id} value={participant.athlete.id}>
                  {participant.athlete.user.profile.firstName} {participant.athlete.user.profile.lastName}
                  {participant.athlete.team && ` (${participant.athlete.team.name})`}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="reason"
            label="Причина дисквалификации"
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={4} placeholder="Опишите причину дисквалификации" />
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
        </Form>
      </Modal>
    </div>
  );
};

