/**
 * Страница портфолио спортсмена
 * 
 * Функциональность:
 * - Личная информация спортсмена
 * - История выступлений
 * - Статистика побед/поражений
 * - Достижения и награды
 * 
 * Особенности:
 * - Отображает только данные текущего спортсмена
 * - Визуализация результатов выступлений
 */

import { useState, useEffect } from 'react';
import { Card, Descriptions, Table, Tag, Avatar, Space, Empty } from 'antd';
import { TrophyOutlined, UserOutlined, CalendarOutlined, FireOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store/store';
import { getAvatarUrl } from '../../../../utils/image-utils';

interface Match {
  id: string;
  round: number;
  position: number;
  status: string;
  scheduledTime?: string;
  winnerId?: string;
  bracket: {
    competition: {
      id: string;
      name: string;
      startDate: string;
      sport: {
        name: string;
      };
    };
    weightCategory: {
      name: string;
    };
  };
  athlete1?: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
        middleName?: string;
      };
    };
  };
  athlete2?: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
        middleName?: string;
      };
    };
  };
  results: Array<{
    points?: number;
    position?: number;
  }>;
}

export const Portfolio = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [athleteInfo, setAthleteInfo] = useState<any>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAthleteInfo();
    loadMatches();
  }, []);

  const loadAthleteInfo = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      if (response.data?.success && response.data?.data?.user?.athlete) {
        setAthleteInfo(response.data.data.user.athlete);
      }
    } catch (error) {
      console.error('Ошибка загрузки информации о спортсмене', error);
    }
  };

  const loadMatches = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/auth/me/matches');
      if (response.data?.success) {
        setMatches(response.data.data || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки истории схваток', error);
    } finally {
      setLoading(false);
    }
  };

  const getOpponentName = (match: Match, athleteId: string) => {
    if (match.athlete1?.id === athleteId) {
      return match.athlete2 
        ? `${match.athlete2.user.profile.lastName} ${match.athlete2.user.profile.firstName} ${match.athlete2.user.profile.middleName || ''}`.trim()
        : 'Соперник не определён';
    } else {
      return match.athlete1 
        ? `${match.athlete1.user.profile.lastName} ${match.athlete1.user.profile.firstName} ${match.athlete1.user.profile.middleName || ''}`.trim()
        : 'Соперник не определён';
    }
  };

  const getMatchResult = (match: Match, athleteId: string) => {
    const isWinner = match.winnerId === athleteId;
    const result = match.results[0];
    
    if (isWinner) {
      return <Tag color="green">Победа</Tag>;
    } else if (match.winnerId) {
      return <Tag color="red">Поражение</Tag>;
    } else {
      return <Tag>Не завершён</Tag>;
    }
  };

  const columns = [
    {
      title: 'Соревнование',
      key: 'competition',
      render: (_: any, record: Match) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.bracket.competition.name}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>
            {record.bracket.competition.sport.name} • {record.bracket.weightCategory.name}
          </div>
        </div>
      ),
    },
    {
      title: 'Дата',
      key: 'date',
      render: (_: any, record: Match) => (
        record.scheduledTime 
          ? new Date(record.scheduledTime).toLocaleDateString('ru-RU')
          : new Date(record.bracket.competition.startDate).toLocaleDateString('ru-RU')
      ),
    },
    {
      title: 'Раунд',
      dataIndex: 'round',
      key: 'round',
      render: (round: number) => `Раунд ${round}`,
    },
    {
      title: 'Соперник',
      key: 'opponent',
      render: (_: any, record: Match) => {
        const athleteId = athleteInfo?.id;
        if (!athleteId) return '-';
        return getOpponentName(record, athleteId);
      },
    },
    {
      title: 'Результат',
      key: 'result',
      render: (_: any, record: Match) => {
        const athleteId = athleteInfo?.id;
        if (!athleteId) return '-';
        return getMatchResult(record, athleteId);
      },
    },
    {
      title: 'Очки',
      key: 'points',
      render: (_: any, record: Match) => {
        const result = record.results[0];
        return result?.points !== undefined ? result.points : '-';
      },
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Avatar
            size={64}
            src={getAvatarUrl(user?.profile?.avatarUrl)}
            icon={<UserOutlined />}
          />
          <div>
            <h2>
              {user?.profile
                ? `${user.profile.firstName} ${user.profile.lastName}`
                : user?.email}
            </h2>
            <p>{user?.email}</p>
          </div>
        </Space>
      </Card>

      <Card title="Информация" style={{ marginBottom: 16 }}>
        <Descriptions bordered>
          <Descriptions.Item label="Команда">
            {athleteInfo?.team?.name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Тренер">
            {athleteInfo?.coach
              ? `${athleteInfo.coach.user.profile.firstName} ${athleteInfo.coach.user.profile.lastName}`
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Спортивный разряд">
            {athleteInfo?.sportsRank?.name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Весовая категория">
            {athleteInfo?.weightCategory?.name || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card 
        title={
          <Space>
            <FireOutlined />
            <span>История схваток</span>
          </Space>
        }
      >
        {matches.length === 0 && !loading ? (
          <Empty 
            description="История схваток пуста"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={matches}
            loading={loading}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Всего схваток: ${total}`,
            }}
          />
        )}
      </Card>
    </div>
  );
};
