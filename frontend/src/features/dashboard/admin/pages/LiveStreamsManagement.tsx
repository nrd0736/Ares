/**
 * Страница управления трансляциями (администратор)
 * 
 * Функциональность:
 * - Создание трансляций
 * - Редактирование трансляций
 * - Удаление трансляций
 * - Привязка к соревнованиям
 * - Управление активными трансляциями
 */

import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Switch,
  message,
  Space,
  Tag,
  Popconfirm,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import dayjs, { Dayjs } from 'dayjs';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface LiveStream {
  id: string;
  title: string;
  description?: string;
  rutubeUrl: string;
  competitionId?: string;
  competition?: {
    id: string;
    name: string;
  };
  isActive: boolean;
  scheduledTime?: string;
  createdAt: string;
}

interface Competition {
  id: string;
  name: string;
}

export const LiveStreamsManagement = () => {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStream, setEditingStream] = useState<LiveStream | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadStreams();
    loadCompetitions();
  }, []);

  const loadStreams = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/live-streams');
      setStreams(response.data.data || []);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        message.error('Ошибка загрузки трансляций');
      }
      setStreams([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCompetitions = async () => {
    try {
      const response = await apiClient.get('/competitions');
      setCompetitions(response.data.data?.competitions || []);
    } catch (error) {
      console.error('Ошибка загрузки соревнований', error);
    }
  };

  const handleCreate = () => {
    setEditingStream(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (stream: LiveStream) => {
    setEditingStream(stream);
    form.setFieldsValue({
      title: stream.title,
      description: stream.description,
      rutubeUrl: stream.rutubeUrl,
      competitionId: stream.competitionId,
      isActive: stream.isActive,
      scheduledTime: stream.scheduledTime ? dayjs(stream.scheduledTime) : undefined,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/live-streams/${id}`);
      message.success('Трансляция удалена');
      loadStreams();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при удалении трансляции');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const data: any = {
        title: values.title,
        description: values.description || null,
        rutubeUrl: values.rutubeUrl,
        isActive: values.isActive !== undefined ? values.isActive : false,
      };

      // Обрабатываем competitionId: если пустая строка или undefined, отправляем null
      if (values.competitionId && values.competitionId.trim() !== '') {
        data.competitionId = values.competitionId;
      } else {
        data.competitionId = null;
      }

      // Обрабатываем scheduledTime: если есть dayjs объект, конвертируем в ISO строку
      if (values.scheduledTime && dayjs.isDayjs(values.scheduledTime)) {
        data.scheduledTime = values.scheduledTime.toISOString();
      } else if (values.scheduledTime) {
        data.scheduledTime = values.scheduledTime;
      } else {
        data.scheduledTime = null;
      }

      if (editingStream) {
        await apiClient.put(`/live-streams/${editingStream.id}`, data);
        message.success('Трансляция обновлена');
      } else {
        await apiClient.post('/live-streams', data);
        message.success('Трансляция создана');
      }

      setModalVisible(false);
      form.resetFields();
      loadStreams();
    } catch (error: any) {
      console.error('Ошибка при сохранении трансляции:', error.response?.data);
      message.error(error.response?.data?.message || 'Ошибка при сохранении трансляции');
    }
  };

  const validateRutubeUrl = (_: any, value: string) => {
    if (!value) {
      return Promise.resolve();
    }

    // Поддерживаемые форматы Rutube:
    // https://rutube.ru/video/c58f502c7bb34a8fcdd976b221fca292/
    // https://rutube.ru/live/video/c58f502c7bb34a8fcdd976b221fca292/?r=wd (трансляции)
    // https://rutube.ru/play/embed/c58f502c7bb34a8fcdd976b221fca292/
    // https://rutube.ru/embed/c58f502c7bb34a8fcdd976b221fca292/
    const patterns = [
      /^https?:\/\/(www\.)?rutube\.ru\/live\/video\/[a-f0-9]+(\/.*)?/i,  // Трансляции
      /^https?:\/\/(www\.)?rutube\.ru\/video\/[a-f0-9]+\/?/i,            // Обычные видео
      /^https?:\/\/(www\.)?rutube\.ru\/embed\/[a-f0-9]+\/?/i,            // Embed
      /^https?:\/\/(www\.)?rutube\.ru\/play\/embed\/[a-f0-9]+\/?/i,      // Play embed
    ];

    const isValid = patterns.some(pattern => pattern.test(value));

    if (!isValid) {
      return Promise.reject(new Error('Введите корректную ссылку на Rutube (например: https://rutube.ru/live/video/c58f502c7bb34a8fcdd976b221fca292/)'));
    }

    return Promise.resolve();
  };

  const columns = [
    {
      title: 'Название',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: LiveStream) => (
        <Space>
          <PlayCircleOutlined />
          <span style={{ fontWeight: 500 }}>{text}</span>
          {record.isActive && (
            <Tag color="red">LIVE</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Соревнование',
      key: 'competition',
      render: (_: any, record: LiveStream) =>
        record.competition ? (
          <Space>
            <TrophyOutlined />
            {record.competition.name}
          </Space>
        ) : (
          <Text type="secondary">Не привязано</Text>
        ),
    },
    {
      title: 'Rutube URL',
      dataIndex: 'rutubeUrl',
      key: 'rutubeUrl',
      render: (url: string) => (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#1890ff' }}>
          {url.length > 50 ? `${url.substring(0, 50)}...` : url}
        </a>
      ),
    },
    {
      title: 'Запланировано',
      dataIndex: 'scheduledTime',
      key: 'scheduledTime',
      render: (time: string | undefined) =>
        time ? dayjs(time).format('DD.MM.YYYY HH:mm') : '-',
    },
    {
      title: 'Статус',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>
          {isActive ? 'Активна' : 'Неактивна'}
        </Tag>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: LiveStream) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Редактировать
          </Button>
          <Popconfirm
            title="Удалить трансляцию?"
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Нет"
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
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, marginBottom: 8, color: '#262626' }}>
            Управление прямыми трансляциями
          </h1>
          <Text type="secondary">
            Добавляйте и управляйте прямыми трансляциями с Rutube
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
          size="large"
        >
          Добавить трансляцию
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={streams}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Всего трансляций: ${total}`,
          }}
        />
      </Card>

      <Modal
        title={editingStream ? 'Редактировать трансляцию' : 'Добавить трансляцию'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
        okText={editingStream ? 'Сохранить' : 'Создать'}
        cancelText="Отмена"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="title"
            label="Название трансляции"
            rules={[{ required: true, message: 'Введите название трансляции' }]}
          >
            <Input placeholder="Например: Финал чемпионата России по баскетболу" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <TextArea
              rows={3}
              placeholder="Описание трансляции (необязательно)"
            />
          </Form.Item>

          <Form.Item
            name="rutubeUrl"
            label="Ссылка на Rutube"
            rules={[
              { required: true, message: 'Введите ссылку на Rutube' },
              { validator: validateRutubeUrl },
            ]}
            help="Поддерживаются ссылки: rutube.ru/live/video/{id}/ (трансляции), rutube.ru/video/{id}/, rutube.ru/embed/{id}/, rutube.ru/play/embed/{id}/"
          >
            <Input
              placeholder="https://rutube.ru/live/video/c58f502c7bb34a8fcdd976b221fca292/"
            />
          </Form.Item>

          <Form.Item
            name="competitionId"
            label="Соревнование (необязательно)"
          >
            <Select
              placeholder="Выберите соревнование"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.children as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {competitions.map((comp) => (
                <Select.Option key={comp.id} value={comp.id}>
                  {comp.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="scheduledTime"
            label="Запланированное время (необязательно)"
          >
            <DatePicker
              showTime
              format="DD.MM.YYYY HH:mm"
              style={{ width: '100%' }}
              placeholder="Выберите дату и время"
            />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Активна"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

