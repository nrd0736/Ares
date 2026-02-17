/**
 * Страница истории соревнований спортсмена
 * 
 * Функциональность:
 * - История всех соревнований где участвовал спортсмен
 * - Результаты выступлений
 * - Детальная информация о каждом соревновании
 */

import { useState, useEffect } from 'react';
import { Card, Table, Tag, Descriptions, Modal, Button, Space, Empty } from 'antd';
import { TrophyOutlined, EyeOutlined, CalendarOutlined, EnvironmentOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store/store';

interface CompetitionResult {
  id: string;
  competition: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
    location?: string;
    competitionType?: 'INDIVIDUAL' | 'TEAM';
    sport: {
      name: string;
    };
  };
  position?: number;
  points?: number;
  weightCategory?: {
    name: string;
  } | null;
  status: string;
  // Для командных соревнований
  team?: {
    id: string;
    name: string;
  };
  teamPosition?: number;
}

export const CompetitionsHistory = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<CompetitionResult | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/auth/me/competitions');
      if (response.data?.success) {
        setResults(response.data.data || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки результатов', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (result: CompetitionResult) => {
    setSelectedResult(result);
    setModalVisible(true);
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

  const columns = [
    {
      title: 'Соревнование',
      key: 'competition',
      render: (_: any, record: CompetitionResult) => (
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{record.competition.name}</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: 4 }}>
            {record.competition.sport.name}
          </div>
        </div>
      ),
    },
    {
      title: 'Дата начала',
      key: 'startDate',
      render: (_: any, record: CompetitionResult) => (
        <Space>
          <CalendarOutlined />
          <span>{new Date(record.competition.startDate).toLocaleDateString('ru-RU')}</span>
        </Space>
      ),
    },
    {
      title: 'Статус',
      key: 'status',
      render: (_: any, record: CompetitionResult) => (
        <Tag color={getStatusColor(record.competition.status)}>
          {getStatusText(record.competition.status)}
        </Tag>
      ),
    },
    {
      title: 'Весовая категория / Тип',
      key: 'weightCategory',
      render: (_: any, record: CompetitionResult) => {
        if (record.competition.competitionType === 'TEAM') {
          return <Tag color="blue">Командное</Tag>;
        }
        return record.weightCategory?.name || '-';
      },
    },
    {
      title: 'Место',
      dataIndex: 'position',
      key: 'position',
      render: (position: number | undefined, record: CompetitionResult) => {
        // Для командных соревнований используем teamPosition, если есть
        const finalPosition = record.competition.competitionType === 'TEAM' 
          ? (record.teamPosition || position)
          : position;
        
        return finalPosition ? (
          <Tag color={finalPosition === 1 ? 'gold' : finalPosition === 2 ? 'default' : finalPosition === 3 ? 'orange' : 'blue'}>
            {finalPosition} место
          </Tag>
        ) : (
          <Tag>Не определено</Tag>
        );
      },
    },
    {
      title: 'Очки',
      dataIndex: 'points',
      key: 'points',
      render: (points: number | undefined) => points || '-',
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: CompetitionResult) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record)}
        >
          Детали
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 600,
          margin: 0,
          color: '#262626'
        }}>
          Мои соревнования
        </h1>
        <p style={{ color: '#6c757d', fontSize: '14px' }}>
          Список всех соревнований, в которых вы участвуете
        </p>
      </div>

      <Card>
        {results.length === 0 && !loading ? (
          <Empty 
            description="Вы пока не участвуете ни в одном соревновании"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={results}
            loading={loading}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Всего соревнований: ${total}`,
            }}
          />
        )}
      </Card>

      <Modal
        title={
          <Space>
            <TrophyOutlined />
            <span>Детали выступления</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            Закрыть
          </Button>,
        ]}
        width={700}
      >
        {selectedResult && (
          <Descriptions bordered column={1} size="middle">
            <Descriptions.Item label="Соревнование">
              <strong>{selectedResult.competition.name}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="Вид спорта">
              {selectedResult.competition.sport.name}
            </Descriptions.Item>
            <Descriptions.Item label="Статус соревнования">
              <Tag color={getStatusColor(selectedResult.competition.status)}>
                {getStatusText(selectedResult.competition.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Дата начала">
              <Space>
                <CalendarOutlined />
                <span>{new Date(selectedResult.competition.startDate).toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}</span>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Дата окончания">
              <Space>
                <CalendarOutlined />
                <span>{new Date(selectedResult.competition.endDate).toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}</span>
              </Space>
            </Descriptions.Item>
            {selectedResult.competition.location && (
              <Descriptions.Item label="Место проведения">
                <Space>
                  <EnvironmentOutlined />
                  <span>{selectedResult.competition.location}</span>
                </Space>
              </Descriptions.Item>
            )}
            {selectedResult.competition.competitionType === 'TEAM' ? (
              <>
                <Descriptions.Item label="Тип соревнования">
                  <Tag color="blue">Командное</Tag>
                </Descriptions.Item>
                {selectedResult.team && (
                  <Descriptions.Item label="Ваша команда">
                    {selectedResult.team.name}
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Место команды">
                  {(selectedResult.teamPosition || selectedResult.position) ? (
                    <Tag color={(selectedResult.teamPosition || selectedResult.position) === 1 ? 'gold' : (selectedResult.teamPosition || selectedResult.position) === 2 ? 'default' : (selectedResult.teamPosition || selectedResult.position) === 3 ? 'orange' : 'blue'}>
                      {(selectedResult.teamPosition || selectedResult.position)} место
                    </Tag>
                  ) : (
                    <Tag>Место не определено</Tag>
                  )}
                </Descriptions.Item>
              </>
            ) : (
              <>
                <Descriptions.Item label="Весовая категория">
                  {selectedResult.weightCategory?.name || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Ваше место">
                  {selectedResult.position ? (
                    <Tag color={selectedResult.position === 1 ? 'gold' : selectedResult.position === 2 ? 'default' : selectedResult.position === 3 ? 'orange' : 'blue'}>
                      {selectedResult.position} место
                    </Tag>
                  ) : (
                    <Tag>Место не определено</Tag>
                  )}
                </Descriptions.Item>
              </>
            )}
            <Descriptions.Item label="Набранные очки">
              {selectedResult.points !== undefined ? (
                <strong style={{ fontSize: '16px', color: '#1890ff' }}>
                  {selectedResult.points}
                </strong>
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Статус участия">
              <Tag color={selectedResult.status === 'CONFIRMED' ? 'green' : 'orange'}>
                {selectedResult.status === 'CONFIRMED' ? 'Подтверждён' : selectedResult.status}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};
