/**
 * Страница детальной информации о соревновании (гостевой доступ)
 * 
 * Функциональность:
 * - Полная информация о соревновании
 * - Список участников
 * - Результаты соревнования
 * - Турнирные сетки
 * - Публичный доступ без авторизации
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tag, Button, Tabs, Space, Spin, message } from 'antd';
import { ArrowLeftOutlined, TrophyOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';

interface Competition {
  id: string;
  name: string;
  description?: string;
  status: string;
  startDate: string;
  endDate: string;
  location?: string;
  sport: {
    name: string;
  };
  _count?: {
    participants: number;
    brackets: number;
  };
}

interface Participant {
  id: string;
  athlete: {
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
  weightCategory?: {
    name: string;
  };
  status: string;
}

export const CompetitionDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [brackets, setBrackets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    if (id) {
      loadCompetition();
      loadParticipants();
      loadBrackets();
    }
  }, [id]);

  const loadCompetition = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/competitions/${id}`);
      setCompetition(response.data.data);
    } catch (error) {
      message.error('Ошибка загрузки соревнования');
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async () => {
    try {
      // TODO: Добавить endpoint для получения участников соревнования
      // const response = await apiClient.get(`/competitions/${id}/participants`);
      // setParticipants(response.data.data);
    } catch (error) {
      console.error('Ошибка загрузки участников', error);
    }
  };

  const loadBrackets = async () => {
    try {
      const response = await apiClient.get(`/brackets/competition/${id}`);
      setBrackets(response.data.data);
    } catch (error) {
      console.error('Ошибка загрузки турнирных сеток', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      UPCOMING: 'blue',
      REGISTRATION: 'orange',
      IN_PROGRESS: 'green',
      COMPLETED: 'purple',
      CANCELLED: 'red',
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      UPCOMING: 'Предстоящее',
      REGISTRATION: 'Регистрация',
      IN_PROGRESS: 'В процессе',
      COMPLETED: 'Завершено',
      CANCELLED: 'Отменено',
    };
    return texts[status] || status;
  };

  const participantColumns = [
    {
      title: 'Спортсмен',
      key: 'athlete',
      render: (_: any, record: Participant) =>
        `${record.athlete.user.profile.firstName} ${record.athlete.user.profile.lastName}`,
    },
    {
      title: 'Весовая категория',
      key: 'weightCategory',
      render: (_: any, record: Participant) => record.weightCategory?.name || '-',
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'CONFIRMED' ? 'green' : 'orange'}>
          {status}
        </Tag>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!competition) {
    return <div>Соревнование не найдено</div>;
  }

  const tabItems = [
    {
      key: 'info',
      label: 'Информация',
      children: (
        <Card>
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Название">{competition.name}</Descriptions.Item>
            <Descriptions.Item label="Вид спорта">{competition.sport.name}</Descriptions.Item>
            <Descriptions.Item label="Статус">
              <Tag color={getStatusColor(competition.status)}>
                {getStatusText(competition.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Дата начала">
              {new Date(competition.startDate).toLocaleDateString('ru-RU')}
            </Descriptions.Item>
            <Descriptions.Item label="Дата окончания">
              {new Date(competition.endDate).toLocaleDateString('ru-RU')}
            </Descriptions.Item>
            {competition.location && (
              <Descriptions.Item label="Место проведения">
                {competition.location}
              </Descriptions.Item>
            )}
            {competition._count && (
              <>
                <Descriptions.Item label="Участников">
                  {competition._count.participants}
                </Descriptions.Item>
                <Descriptions.Item label="Турнирных сеток">
                  {competition._count.brackets}
                </Descriptions.Item>
              </>
            )}
          </Descriptions>
          {competition.description && (() => {
            // Убираем лишние подписи из описания
            let cleanDescription = competition.description;
            const unwantedTexts = [
              'Соревнование только началось. Участники зарегистрированы, но схватки еще не проводились.',
              'Соревнование только началось',
              'Участники зарегистрированы, но схватки еще не проводились',
              'Завершенное соревнование со всеми данными',
              'завершенное соревнование со всеми данными',
              'турнирные сетки, матчи, результаты',
              'турнирные сетки, матчи, результаты.',
              'Турнирные сетки, матчи, результаты',
              'Турнирные сетки, матчи, результаты.',
            ];
            
            unwantedTexts.forEach(text => {
              // Удаляем текст и возможные знаки препинания вокруг него
              cleanDescription = cleanDescription.replace(new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
            });
            
            // Убираем лишние точки, запятые, пробелы и другие знаки препинания
            cleanDescription = cleanDescription
              .replace(/^[.,;:\s\-]+/g, '') // Убираем знаки препинания в начале
              .replace(/[.,;:\s\-]+$/g, '') // Убираем знаки препинания в конце
              .replace(/\.{2,}/g, '') // Убираем множественные точки
              .replace(/[,;:]{2,}/g, '') // Убираем множественные запятые, точки с запятой, двоеточия
              .replace(/\s{2,}/g, ' ') // Убираем множественные пробелы
              .replace(/\s+[.,;:]/g, '') // Убираем пробелы перед знаками препинания
              .replace(/[.,;:]\s+/g, '') // Убираем пробелы после знаков препинания
              .replace(/\s+\.\s+/g, ' ') // Убираем одиночные точки между пробелами
              .replace(/\s+[.,;:]\s+/g, ' ') // Убираем одиночные знаки препинания между пробелами
              .replace(/^\.+$/, '') // Если осталась только точка(и), убираем полностью
              .replace(/^[,;:]+$/, '') // Если остались только знаки препинания, убираем
              .trim();
            
            if (!cleanDescription) return null;
            
            return (
              <div style={{ marginTop: 16 }}>
                <h4>Описание</h4>
                <p>{cleanDescription}</p>
              </div>
            );
          })()}
        </Card>
      ),
    },
    {
      key: 'participants',
      label: 'Участники',
      children: (
        <Card>
          <Table
            columns={participantColumns}
            dataSource={participants}
            rowKey="id"
            pagination={false}
          />
        </Card>
      ),
    },
    {
      key: 'brackets',
      label: 'Турнирные сетки',
      children: (
        <Card>
          {brackets.length > 0 ? (
            <Table
              dataSource={brackets}
              columns={[
                {
                  title: 'Тип',
                  dataIndex: 'type',
                  key: 'type',
                },
                {
                  title: 'Весовая категория',
                  key: 'weightCategory',
                  render: (_: any, record: any) => record.weightCategory?.name || '-',
                },
                {
                  title: 'Матчей',
                  key: 'matches',
                  render: (_: any, record: any) => record.matches?.length || 0,
                },
                {
                  title: 'Действия',
                  key: 'actions',
                  render: (_: any, record: any) => (
                    <Button
                      type="link"
                      onClick={() => {
                        // TODO: Переход на просмотр сетки
                        message.info('Просмотр сетки (в разработке)');
                      }}
                    >
                      Просмотр
                    </Button>
                  ),
                },
              ]}
              rowKey="id"
              pagination={false}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 20 }}>
              Турнирные сетки еще не созданы
            </div>
          )}
        </Card>
      ),
    },
  ];

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/')}
        style={{ marginBottom: 16 }}
      >
        Назад к списку
      </Button>

      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <h1>{competition.name}</h1>
            <Space>
              <Tag color={getStatusColor(competition.status)}>
                {getStatusText(competition.status)}
              </Tag>
              <Tag>{competition.sport.name}</Tag>
            </Space>
          </div>

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
          />
        </Space>
      </Card>
    </div>
  );
};

