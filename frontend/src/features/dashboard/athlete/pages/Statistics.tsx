/**
 * Страница статистики спортсмена
 * 
 * Функциональность:
 * - Личная статистика выступлений
 * - Графики динамики результатов
 * - История матчей
 * - Показатели побед/поражений
 * 
 * Использует Chart.js для визуализации данных
 */

import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Empty, Spin } from 'antd';
import { TrophyOutlined, RiseOutlined, FallOutlined, FireOutlined, CalendarOutlined } from '@ant-design/icons';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import apiClient from '../../../../services/api-client';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store/store';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Match {
  id: string;
  round: number;
  status: string;
  winnerId?: string;
  scheduledTime?: string;
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
      };
    };
  };
  athlete2?: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
  results: Array<{
    points?: number;
    position?: number;
  }>;
}

interface CompetitionResult {
  competitionId: string;
  competitionName: string;
  date: string;
  position?: number;
  points?: number;
  sport: string;
}

export const Statistics = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalCompetitions: 0,
    totalMatches: 0,
    wins: 0,
    losses: 0,
    bestPosition: null as number | null,
    totalPoints: 0,
  });
  const [matches, setMatches] = useState<Match[]>([]);
  const [competitionResults, setCompetitionResults] = useState<CompetitionResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAthleteId();
  }, []);

  useEffect(() => {
    if (athleteId) {
      loadStatistics();
    }
  }, [athleteId]);

  const loadAthleteId = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      if (response.data?.success && response.data?.data?.user?.athlete?.id) {
        setAthleteId(response.data.data.user.athlete.id);
      }
    } catch (error) {
      console.error('Ошибка загрузки ID спортсмена', error);
    }
  };

  const loadStatistics = async () => {
    if (!athleteId) return;
    
    setLoading(true);
    try {
      // Загружаем матчи спортсмена
      const matchesResponse = await apiClient.get('/auth/me/matches');
      const allMatches: Match[] = matchesResponse.data?.data || [];
      setMatches(allMatches);

      // Подсчитываем статистику
      const uniqueCompetitions = new Set<string>();
      let wins = 0;
      let losses = 0;
      let totalPoints = 0;
      const positions: number[] = [];

      allMatches.forEach((match) => {
        // Добавляем соревнование в список уникальных
        uniqueCompetitions.add(match.bracket.competition.id);

        // Подсчитываем победы и поражения
        if (match.winnerId === athleteId) {
          wins++;
        } else if (match.winnerId && match.winnerId !== athleteId) {
          losses++;
        }

        // Собираем очки
        const result = match.results.find(r => r.points !== undefined);
        if (result?.points !== undefined) {
          totalPoints += result.points;
        }

        // Собираем места
        const positionResult = match.results.find(r => r.position !== undefined);
        if (positionResult?.position !== undefined) {
          positions.push(positionResult.position);
        }
      });

      // Формируем список результатов по соревнованиям
      const resultsMap = new Map<string, CompetitionResult>();
      
      allMatches.forEach((match) => {
        const compId = match.bracket.competition.id;
        if (!resultsMap.has(compId)) {
          resultsMap.set(compId, {
            competitionId: compId,
            competitionName: match.bracket.competition.name,
            date: match.scheduledTime || match.bracket.competition.startDate,
            sport: match.bracket.competition.sport.name,
            position: undefined,
            points: 0,
          });
        }

        const result = resultsMap.get(compId)!;
        const matchResult = match.results[0];
        
        // Берем лучшее место (меньшее число)
        if (matchResult?.position !== undefined) {
          if (result.position === undefined || matchResult.position < result.position) {
            result.position = matchResult.position;
          }
        }

        // Суммируем очки
        if (matchResult?.points !== undefined) {
          result.points = (result.points || 0) + matchResult.points;
        }
      });

      setCompetitionResults(Array.from(resultsMap.values()).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));

      // Лучшее место
      const bestPosition = positions.length > 0 ? Math.min(...positions) : null;

      setStats({
        totalCompetitions: uniqueCompetitions.size,
        totalMatches: allMatches.length,
        wins,
        losses,
        bestPosition,
        totalPoints,
      });
    } catch (error) {
      console.error('Ошибка загрузки статистики', error);
    } finally {
      setLoading(false);
    }
  };

  // Формируем данные для графика прогресса (по месяцам)
  const getProgressData = () => {
    if (matches.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    // Группируем матчи по месяцам
    const monthlyData = new Map<string, number>();
    
    matches
      .filter(m => m.scheduledTime)
      .sort((a, b) => new Date(a.scheduledTime!).getTime() - new Date(b.scheduledTime!).getTime())
      .forEach((match) => {
        const date = new Date(match.scheduledTime!);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = date.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' });
        
        if (!monthlyData.has(monthLabel)) {
          monthlyData.set(monthLabel, 0);
        }
        
        const result = match.results[0];
        if (result?.points !== undefined) {
          monthlyData.set(monthLabel, (monthlyData.get(monthLabel) || 0) + result.points);
        }
      });

    const labels = Array.from(monthlyData.keys());
    const data = Array.from(monthlyData.values());

    return {
      labels,
      datasets: [
        {
          label: 'Очки',
          data,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
        },
      ],
    };
  };

  const winRate = stats.totalMatches > 0 
    ? ((stats.wins / stats.totalMatches) * 100).toFixed(1)
    : 0;

  const chartData = getProgressData();

  const columns = [
    {
      title: 'Соревнование',
      key: 'competition',
      render: (_: any, record: CompetitionResult) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.competitionName}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>{record.sport}</div>
        </div>
      ),
    },
    {
      title: 'Дата',
      key: 'date',
      render: (_: any, record: CompetitionResult) =>
        new Date(record.date).toLocaleDateString('ru-RU'),
    },
    {
      title: 'Место',
      dataIndex: 'position',
      key: 'position',
      render: (position: number | undefined) =>
        position ? (
          <Tag color={position === 1 ? 'gold' : position === 2 ? 'default' : position === 3 ? 'orange' : 'blue'}>
            {position} место
          </Tag>
        ) : (
          '-'
        ),
    },
    {
      title: 'Очки',
      dataIndex: 'points',
      key: 'points',
      render: (points: number | undefined) => points || 0,
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 600,
          margin: 0,
          color: '#262626'
        }}>
          Личная статистика
        </h1>
        <p style={{ color: '#6c757d', fontSize: '14px' }}>
          Ваши результаты и достижения
        </p>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Всего соревнований"
              value={stats.totalCompetitions}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Всего схваток"
              value={stats.totalMatches}
              prefix={<FireOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Побед"
              value={stats.wins}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Поражений"
              value={stats.losses}
              prefix={<FallOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Процент побед"
              value={winRate}
              suffix="%"
              valueStyle={{ color: winRate > 50 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Лучшее место"
              value={stats.bestPosition || '-'}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#ffc53d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Всего очков"
              value={stats.totalPoints}
              prefix={<RiseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Средние очки за схватку"
              value={stats.totalMatches > 0 ? (stats.totalPoints / stats.totalMatches).toFixed(1) : 0}
            />
          </Card>
        </Col>
      </Row>

      {chartData.labels.length > 0 && (
        <Card title="Прогресс по очкам" style={{ marginBottom: 24 }}>
          <Line 
            data={chartData} 
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top' as const,
                },
                title: {
                  display: false,
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                },
              },
            }}
          />
        </Card>
      )}

      <Card title="Результаты по соревнованиям">
        {competitionResults.length === 0 ? (
          <Empty 
            description="Нет данных о результатах"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            dataSource={competitionResults}
            columns={columns}
            rowKey="competitionId"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Всего соревнований: ${total}`,
            }}
          />
        )}
      </Card>
    </div>
  );
};
