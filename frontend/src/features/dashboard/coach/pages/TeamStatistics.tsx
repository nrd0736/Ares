/**
 * Страница статистики команды (тренер)
 * 
 * Функциональность:
 * - Статистика команды
 * - Статистика спортсменов
 * - Графики динамики результатов
 * - История выступлений команды
 */

import { useState, useEffect } from 'react';
import { Card, Table, Tag, Statistic, Row, Col, message } from 'antd';
import { TrophyOutlined, RiseOutlined, FallOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface AthleteStats {
  id: string;
  user: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  competitionsCount: number;
  wins: number;
  losses: number;
  bestPosition: number | null;
}

export const TeamStatistics = () => {
  const [athletes, setAthletes] = useState<AthleteStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [teamStats, setTeamStats] = useState({
    totalCompetitions: 0,
    totalWins: 0,
    totalLosses: 0,
  });
  const [chartData, setChartData] = useState({
    labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'],
    datasets: [
      {
        label: 'Побед',
        data: [0, 0, 0, 0, 0, 0],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
      },
      {
        label: 'Поражений',
        data: [0, 0, 0, 0, 0, 0],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1,
      },
    ],
  });

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      // Получаем команду тренера
      const teamResponse = await apiClient.get('/teams/my');
      const team = teamResponse.data.data;
      const athleteIds = team.athletes.map((a: any) => a.id);
      const teamId = team.id;

      // Получаем все соревнования, где участвуют спортсмены команды или сама команда
      const competitionsResponse = await apiClient.get('/competitions/coach/my');
      const competitions = competitionsResponse.data.data.competitions;

      // Собираем статистику по каждому спортсмену
      const athleteStatsMap: Record<string, AthleteStats> = {};
      
      // Инициализируем статистику для всех спортсменов
      team.athletes.forEach((athlete: any) => {
        athleteStatsMap[athlete.id] = {
          id: athlete.id,
          user: {
            profile: {
              firstName: athlete.user.profile.firstName,
              lastName: athlete.user.profile.lastName,
            },
          },
          competitionsCount: 0,
          wins: 0,
          losses: 0,
          bestPosition: null,
        };
      });

      let totalCompetitions = 0;
      let totalWins = 0;
      let totalLosses = 0;
      const monthlyStats: Record<string, { wins: number; losses: number }> = {};

      // Обрабатываем каждое соревнование
      for (const competition of competitions) {
        totalCompetitions++;
        const competitionType = competition.competitionType || 'INDIVIDUAL';
        const competitionMonth = new Date(competition.startDate).toLocaleDateString('ru-RU', { month: 'short' });
        
        if (!monthlyStats[competitionMonth]) {
          monthlyStats[competitionMonth] = { wins: 0, losses: 0 };
        }

        // Получаем турнирные сетки
        const bracketsResponse = await apiClient.get(`/brackets/competition/${competition.id}`);
        const brackets = bracketsResponse.data.data || [];

        if (competitionType === 'TEAM') {
          // Для командных соревнований считаем матчи команды
          for (const bracket of brackets) {
            const matches = bracket.matches || [];
            
            for (const match of matches) {
              const team1Id = match.team1Id;
              const team2Id = match.team2Id;
              const winnerTeamId = match.winnerTeamId;
              
              // Проверяем, участвует ли команда в матче
              if (team1Id === teamId || team2Id === teamId) {
                if (match.status === 'COMPLETED') {
                  if (winnerTeamId === teamId) {
                    totalWins++;
                    monthlyStats[competitionMonth].wins++;
                  } else if (winnerTeamId && winnerTeamId !== teamId) {
                    totalLosses++;
                    monthlyStats[competitionMonth].losses++;
                  }
                }
              }
            }
          }
        } else {
          // Для индивидуальных соревнований считаем матчи спортсменов
          for (const bracket of brackets) {
            const matches = bracket.matches || [];
            
            for (const match of matches) {
              const athlete1Id = match.athlete1Id;
              const athlete2Id = match.athlete2Id;
              const winnerId = match.winnerId;

              if (athlete1Id && athleteIds.includes(athlete1Id)) {
                athleteStatsMap[athlete1Id].competitionsCount++;
                if (match.status === 'COMPLETED') {
                  if (winnerId === athlete1Id) {
                    athleteStatsMap[athlete1Id].wins++;
                    totalWins++;
                    monthlyStats[competitionMonth].wins++;
                  } else if (winnerId && winnerId !== athlete1Id) {
                    athleteStatsMap[athlete1Id].losses++;
                    totalLosses++;
                    monthlyStats[competitionMonth].losses++;
                  }
                }
              }

              if (athlete2Id && athleteIds.includes(athlete2Id)) {
                athleteStatsMap[athlete2Id].competitionsCount++;
                if (match.status === 'COMPLETED') {
                  if (winnerId === athlete2Id) {
                    athleteStatsMap[athlete2Id].wins++;
                    totalWins++;
                    monthlyStats[competitionMonth].wins++;
                  } else if (winnerId && winnerId !== athlete2Id) {
                    athleteStatsMap[athlete2Id].losses++;
                    totalLosses++;
                    monthlyStats[competitionMonth].losses++;
                  }
                }
              }
            }
          }
        }
      }

      // Получаем лучшие позиции спортсменов из результатов соревнований
      for (const competition of competitions) {
        if (competition.competitionType === 'INDIVIDUAL') {
          try {
            const resultsResponse = await apiClient.get(`/competitions/${competition.id}/results`);
            const results = resultsResponse.data?.data || [];
            
            results.forEach((result: any) => {
              const athleteId = result.athleteId || result.athlete?.id;
              if (athleteId && athleteStatsMap[athleteId]) {
                const position = result.position;
                if (position !== null && position !== undefined) {
                  const currentBest = athleteStatsMap[athleteId].bestPosition;
                  if (currentBest === null || position < currentBest) {
                    athleteStatsMap[athleteId].bestPosition = position;
                  }
                }
              }
            });
          } catch (error) {
            // Игнорируем ошибки, если результатов еще нет
          }
        }
      }

      // Преобразуем в массив
      const athletesStats = Object.values(athleteStatsMap);

      setAthletes(athletesStats);
      setTeamStats({
        totalCompetitions,
        totalWins,
        totalLosses,
      });

      // Обновляем данные графика
      const sortedMonths = Object.keys(monthlyStats).sort((a, b) => {
        const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
        return months.indexOf(a.toLowerCase()) - months.indexOf(b.toLowerCase());
      });
      
      setChartData({
        labels: sortedMonths.length > 0 ? sortedMonths : ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'],
        datasets: [
          {
            label: 'Побед',
            data: sortedMonths.map(month => monthlyStats[month]?.wins || 0),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1,
          },
          {
            label: 'Поражений',
            data: sortedMonths.map(month => monthlyStats[month]?.losses || 0),
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            tension: 0.1,
          },
        ],
      });
    } catch (error) {
      console.error('Ошибка загрузки статистики', error);
      message.error('Ошибка загрузки статистики');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Спортсмен',
      key: 'athlete',
      render: (_: any, record: AthleteStats) =>
        `${record.user.profile.firstName} ${record.user.profile.lastName}`,
    },
    {
      title: 'Количество схваток',
      dataIndex: 'competitionsCount',
      key: 'competitionsCount',
    },
    {
      title: 'Побед',
      dataIndex: 'wins',
      key: 'wins',
      render: (wins: number) => (
        <Tag color="green">{wins}</Tag>
      ),
    },
    {
      title: 'Поражений',
      dataIndex: 'losses',
      key: 'losses',
      render: (losses: number) => (
        <Tag color="red">{losses}</Tag>
      ),
    },
    {
      title: 'Лучшее место',
      dataIndex: 'bestPosition',
      key: 'bestPosition',
      render: (position: number | null) =>
        position ? (
          <Tag color={position === 1 ? 'gold' : position === 2 ? 'default' : 'blue'}>
            {position} место
          </Tag>
        ) : (
          '-'
        ),
    },
  ];

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Динамика побед и поражений по месяцам',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  return (
    <div>
      <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#262626' }}>Статистика команды</h1>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Всего соревнований"
              value={teamStats.totalCompetitions}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Побед"
              value={teamStats.totalWins}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Поражений"
              value={teamStats.totalLosses}
              prefix={<FallOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {athletes.length > 0 && (
        <Card title="Статистика по спортсменам" style={{ marginBottom: 24 }}>
          <Table
            columns={columns}
            dataSource={athletes}
            loading={loading}
            rowKey="id"
            pagination={false}
          />
        </Card>
      )}

      <Card title="Динамика результатов">
        <Line data={chartData} options={chartOptions} />
      </Card>
    </div>
  );
};

