/**
 * Страница статистики соревнований (спортсмен)
 * 
 * Функциональность:
 * - Статистика соревнований где участвовал спортсмен
 * - Результаты выступлений
 * - Показатели по весовым категориям
 */

import { useState, useEffect } from 'react';
import { Card, Select, Statistic, Row, Col, message } from 'antd';
import { TrophyOutlined, UserOutlined, BarChartOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store/store';

interface Competition {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  competitionType?: 'INDIVIDUAL' | 'TEAM';
  sport: {
    name: string;
  };
}

interface CompetitionStats {
  competitionType?: 'INDIVIDUAL' | 'TEAM';
  myPosition: number | null;
  teamPosition?: number | null;
  totalMatches: number;
  wins: number;
  losses: number;
  currentRound: number | null;
  nextMatch: {
    opponent: string;
    scheduledTime: string;
  } | null;
  team?: {
    id: string;
    name: string;
  };
}

export const CompetitionStatistics = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<string | null>(null);
  const [stats, setStats] = useState<CompetitionStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCompetitions();
  }, []);

  useEffect(() => {
    if (selectedCompetition) {
      loadStatistics();
    }
  }, [selectedCompetition]);

  const loadCompetitions = async () => {
    try {
      // Загружаем только соревнования, в которых участвует спортсмен
      const response = await apiClient.get('/auth/me/competitions');
      if (response.data?.success) {
        const comps = response.data.data || [];
        setCompetitions(comps.map((c: any) => c.competition));
      }
    } catch (error) {
      message.error('Ошибка загрузки соревнований');
    }
  };

  const loadStatistics = async () => {
    if (!selectedCompetition) return;
    setLoading(true);
    try {
      // Получаем информацию о соревновании
      const competitionResponse = await apiClient.get(`/competitions/${selectedCompetition}`);
      const competition = competitionResponse.data.data;
      const competitionType = competition?.competitionType || 'INDIVIDUAL';
      
      // Получаем информацию о спортсмене
      const athleteResponse = await apiClient.get('/auth/me');
      const athlete = athleteResponse.data?.data?.user?.athlete || athleteResponse.data?.data?.athlete;
      const athleteId = athlete?.id;
      const athleteTeamId = athlete?.teamId || athlete?.team?.id;
      
      // Получаем статистику соревнования
      const statsResponse = await apiClient.get(`/competitions/${selectedCompetition}/statistics`);
      const allStats = statsResponse.data.data;
      
      let myPosition: number | null = null;
      let teamPosition: number | null = null;
      let totalMatches = 0;
      let wins = 0;
      let losses = 0;
      let currentRound: number | null = null;
      let nextMatch: { opponent: string; scheduledTime: string } | null = null;
      
      if (competitionType === 'TEAM') {
        // Для командных соревнований
        // Получаем результаты команды
        try {
          const resultsResponse = await apiClient.get(`/competitions/${selectedCompetition}/results`);
          const results = resultsResponse.data?.data || [];
          const teamResult = results.find((r: any) => r.team?.id === athleteTeamId || r.teamId === athleteTeamId);
          if (teamResult) {
            teamPosition = teamResult.position || null;
          }
        } catch (error) {
          // Игнорируем ошибки, если результатов еще нет
        }
        
        // Получаем матчи команды
        const bracketsResponse = await apiClient.get(`/brackets/competition/${selectedCompetition}`);
        const brackets = bracketsResponse.data.data || [];
        
        for (const bracket of brackets) {
          const matches = bracket.matches || [];
          for (const match of matches) {
            if (match.team1Id === athleteTeamId || match.team2Id === athleteTeamId) {
              totalMatches++;
              if (match.status === 'COMPLETED') {
                if (match.winnerTeamId === athleteTeamId) {
                  wins++;
                } else if (match.winnerTeamId && match.winnerTeamId !== athleteTeamId) {
                  losses++;
                }
              } else if (match.status === 'SCHEDULED' || match.status === 'IN_PROGRESS') {
                if (!nextMatch) {
                  const opponent = match.team1Id === athleteTeamId ? match.team2 : match.team1;
                  nextMatch = {
                    opponent: opponent?.name || 'Соперник не определен',
                    scheduledTime: match.scheduledTime || '',
                  };
                  currentRound = match.round;
                }
              }
            }
          }
        }
      } else {
        // Для индивидуальных соревнований
        // Получаем результаты спортсмена
        try {
          const resultsResponse = await apiClient.get(`/competitions/${selectedCompetition}/results`);
          const results = resultsResponse.data?.data || [];
          const athleteResult = results.find((r: any) => r.athleteId === athleteId || r.athlete?.id === athleteId);
          if (athleteResult) {
            myPosition = athleteResult.position || null;
          }
        } catch (error) {
          // Игнорируем ошибки, если результатов еще нет
        }
        
        // Получаем матчи спортсмена
        const bracketsResponse = await apiClient.get(`/brackets/competition/${selectedCompetition}`);
        const brackets = bracketsResponse.data.data || [];
        
        for (const bracket of brackets) {
          const matches = bracket.matches || [];
          for (const match of matches) {
            if (match.athlete1Id === athleteId || match.athlete2Id === athleteId) {
              totalMatches++;
              if (match.status === 'COMPLETED') {
                if (match.winnerId === athleteId) {
                  wins++;
                } else if (match.winnerId && match.winnerId !== athleteId) {
                  losses++;
                }
              } else if (match.status === 'SCHEDULED' || match.status === 'IN_PROGRESS') {
                if (!nextMatch) {
                  const opponent = match.athlete1Id === athleteId ? match.athlete2 : match.athlete1;
                  nextMatch = {
                    opponent: opponent 
                      ? `${opponent.user?.profile?.lastName || ''} ${opponent.user?.profile?.firstName || ''}`.trim() || 'Соперник не определен'
                      : 'Соперник не определен',
                    scheduledTime: match.scheduledTime || '',
                  };
                  currentRound = match.round;
                }
              }
            }
          }
        }
      }
      
      setStats({
        competitionType,
        myPosition: competitionType === 'TEAM' ? null : myPosition,
        teamPosition: competitionType === 'TEAM' ? teamPosition : null,
        totalMatches,
        wins,
        losses,
        currentRound,
        nextMatch,
        team: competitionType === 'TEAM' && athlete?.team ? {
          id: athlete.team.id,
          name: athlete.team.name,
        } : undefined,
      });
    } catch (error: any) {
      console.error('Ошибка загрузки статистики:', error);
      message.error(error.response?.data?.message || 'Ошибка загрузки статистики');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#262626' }}>Статистика соревнования</h1>
        <Select
          style={{ width: 300, marginTop: 16 }}
          placeholder="Выберите соревнование"
          value={selectedCompetition}
          onChange={setSelectedCompetition}
          showSearch
          filterOption={(input, option) =>
            (option?.children as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
          }
        >
          {competitions.map((competition) => (
            <Select.Option key={competition.id} value={competition.id}>
              {competition.name}
            </Select.Option>
          ))}
        </Select>
      </div>

      {selectedCompetition && stats && (
        <>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title={stats.competitionType === 'TEAM' ? 'Место команды' : 'Мое место'}
                  value={stats.competitionType === 'TEAM' ? (stats.teamPosition || '-') : (stats.myPosition || '-')}
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: (stats.competitionType === 'TEAM' ? stats.teamPosition : stats.myPosition) === 1 ? '#faad14' : '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title={stats.competitionType === 'TEAM' ? 'Побед команды' : 'Побед'}
                  value={stats.wins}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title={stats.competitionType === 'TEAM' ? 'Поражений команды' : 'Поражений'}
                  value={stats.losses}
                  prefix={<BarChartOutlined />}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title={stats.competitionType === 'TEAM' ? 'Матчей команды' : 'Всего матчей'}
                  value={stats.totalMatches}
                  prefix={<BarChartOutlined />}
                />
              </Card>
            </Col>
          </Row>
          
          {stats.competitionType === 'TEAM' && stats.team && (
            <Card style={{ marginBottom: 24 }}>
              <Statistic
                title="Ваша команда"
                value={stats.team.name}
                prefix={<TrophyOutlined />}
              />
            </Card>
          )}
          
          {stats.nextMatch && (
            <Card>
              <h3>Следующий матч</h3>
              <p><strong>Соперник:</strong> {stats.nextMatch.opponent}</p>
              {stats.nextMatch.scheduledTime && (
                <p><strong>Время:</strong> {new Date(stats.nextMatch.scheduledTime).toLocaleString('ru-RU')}</p>
              )}
              {stats.currentRound && (
                <p><strong>Раунд:</strong> {stats.currentRound}</p>
              )}
            </Card>
          )}
        </>
      )}

      {selectedCompetition && !stats && !loading && (
        <Card>
          <div style={{ textAlign: 'center', padding: '48px', color: '#8c8c8c' }}>
            <BarChartOutlined style={{ fontSize: '48px', marginBottom: 16 }} />
            <p>Статистика для этого соревнования пока недоступна</p>
          </div>
        </Card>
      )}

      {!selectedCompetition && (
        <Card>
          <div style={{ textAlign: 'center', padding: '48px', color: '#8c8c8c' }}>
            <TrophyOutlined style={{ fontSize: '48px', marginBottom: 16 }} />
            <p>Выберите соревнование для просмотра статистики</p>
          </div>
        </Card>
      )}
    </div>
  );
};

