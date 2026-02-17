/**
 * Страница статистики соревнований (тренер)
 * 
 * Функциональность:
 * - Статистика соревнований где участвуют спортсмены команды
 * - Результаты выступлений
 * - Распределение по весовым категориям
 */

import { useState, useEffect } from 'react';
import { Card, Select, Statistic, Row, Col, Table, Tag, message } from 'antd';
import { TrophyOutlined, UserOutlined, TeamOutlined, BarChartOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';

interface Competition {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  sport: {
    name: string;
  };
  _count?: {
    participants: number;
    brackets: number;
  };
}

interface CompetitionStats {
  competitionType?: 'INDIVIDUAL' | 'TEAM';
  totalParticipants: number;
  totalTeams?: number;
  totalAthletes?: number;
  totalMatches: number;
  completedMatches: number;
  byWeightCategory: Array<{
    category: string;
    participants: number;
    matches: number;
  }>;
  teamStats: {
    participants: number;
    wins: number;
    currentPositions: Array<{
      athlete?: string;
      team?: string;
      position: number;
    }>;
  };
}

export const CompetitionStatistics = () => {
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
      // Загружаем только соревнования, где участвуют спортсмены команды тренера
      const response = await apiClient.get('/competitions/coach/my');
      setCompetitions(response.data.data.competitions);
    } catch (error) {
      message.error('Ошибка загрузки соревнований');
    }
  };

  const loadStatistics = async () => {
    if (!selectedCompetition) return;
    setLoading(true);
    try {
      // Получаем информацию о соревновании для определения типа
      const competitionResponse = await apiClient.get(`/competitions/${selectedCompetition}`);
      const competition = competitionResponse.data.data;
      const competitionType = competition?.competitionType || 'INDIVIDUAL';
      
      const response = await apiClient.get(`/competitions/${selectedCompetition}/statistics`);
      const statistics = response.data.data;
      
      // Получаем команду тренера
      const teamResponse = await apiClient.get('/teams/my');
      const team = teamResponse.data.data;
      const teamId = team.id;
      const teamAthleteIds = team.athletes.map((a: any) => a.id);
      
      let teamWins = 0;
      let teamMatches = 0;
      let teamCompletedMatches = 0;
      const positions: Array<{ athlete?: string; team?: string; position: number }> = [];
      
      if (competitionType === 'TEAM') {
        // Для командных соревнований
        // Получаем участников командных соревнований
        try {
          const teamParticipantsResponse = await apiClient.get(`/competitions/${selectedCompetition}/participants`);
          const teamParticipants = teamParticipantsResponse.data.data.teamParticipants || [];
          
          // Проверяем, участвует ли команда
          const teamParticipant = teamParticipants.find((tp: any) => tp.teamId === teamId);
          
          // Получаем результаты соревнования для определения позиции команды
          try {
            const resultsResponse = await apiClient.get(`/competitions/${selectedCompetition}/results`);
            const allResults = resultsResponse.data?.data || [];
            
            // Ищем результат команды
            const teamResult = allResults.find((result: any) => result.team?.id === teamId || result.teamId === teamId);
            
            if (teamResult && teamResult.position !== null && teamResult.position !== undefined) {
              positions.push({
                team: teamResult.team?.name || team.name,
                position: teamResult.position,
              });
            }
          } catch (resultsError: any) {
            if (resultsError.response?.status !== 404) {
              console.error('Ошибка загрузки результатов:', resultsError);
            }
          }
          
          // Получаем матчи для расчета побед и подсчета матчей команды
          const bracketsResponse = await apiClient.get(`/brackets/competition/${selectedCompetition}`);
          const brackets = bracketsResponse.data.data || [];
          
          for (const bracket of brackets) {
            const matches = bracket.matches || [];
            
            for (const match of matches) {
              const team1Id = match.team1Id;
              const team2Id = match.team2Id;
              
              // Подсчитываем только матчи, где участвует команда
              if (team1Id === teamId || team2Id === teamId) {
                teamMatches++;
                
                if (match.status === 'COMPLETED') {
                  teamCompletedMatches++;
                  
                  if (match.winnerTeamId === teamId) {
                    teamWins++;
                  }
                }
              }
            }
          }
          
          // Формируем статистику команды
          setStats({
            competitionType: 'TEAM',
            totalParticipants: statistics.totalTeams || statistics.totalParticipants || 0,
            totalTeams: statistics.totalTeams,
            totalAthletes: statistics.totalAthletes,
            totalMatches: teamMatches,
            completedMatches: teamCompletedMatches,
            byWeightCategory: statistics.byWeightCategory || [],
            teamStats: {
              participants: teamParticipant ? 1 : 0,
              wins: teamWins,
              currentPositions: positions,
            },
          });
        } catch (error: any) {
          console.error('Ошибка загрузки данных командного соревнования:', error);
          message.error('Ошибка загрузки статистики');
        }
      } else {
        // Для индивидуальных соревнований
        // Получаем участников соревнования
        const participantsResponse = await apiClient.get(`/competitions/${selectedCompetition}/participants`);
        const participants = participantsResponse.data.data.participants || [];
        
        // Фильтруем участников команды
        const teamParticipants = participants.filter((p: any) => 
          teamAthleteIds.includes(p.athleteId)
        );
        
        // Получаем результаты соревнования для определения позиций спортсменов
        try {
          const resultsResponse = await apiClient.get(`/competitions/${selectedCompetition}/results`);
          const allResults = resultsResponse.data?.data || [];
          
          // Фильтруем результаты по спортсменам команды
          const teamResults = allResults.filter((result: any) => 
            teamAthleteIds.includes(result.athleteId || result.athlete?.id)
          );
          
          // Формируем список позиций спортсменов команды
          teamResults.forEach((result: any) => {
            if (result.position !== null && result.position !== undefined) {
              const athleteName = result.athlete?.user?.profile 
                ? `${result.athlete.user.profile.lastName} ${result.athlete.user.profile.firstName}`
                : 'Неизвестный спортсмен';
              
              // Проверяем, нет ли уже этого спортсмена в списке (берем лучшее место)
              const existingIndex = positions.findIndex(p => p.athlete === athleteName);
              if (existingIndex === -1) {
                positions.push({
                  athlete: athleteName,
                  position: result.position,
                });
              } else {
                // Если уже есть, берем лучшее место (меньшее число)
                if (result.position < positions[existingIndex].position) {
                  positions[existingIndex].position = result.position;
                }
              }
            }
          });
          
          // Сортируем по месту (от лучшего к худшему)
          positions.sort((a, b) => a.position - b.position);
        } catch (resultsError: any) {
          // Если результатов еще нет (404), это нормально
          if (resultsError.response?.status !== 404) {
            console.error('Ошибка загрузки результатов:', resultsError);
          }
        }
        
        // Получаем матчи для расчета побед и подсчета матчей команды
        const bracketsResponse = await apiClient.get(`/brackets/competition/${selectedCompetition}`);
        const brackets = bracketsResponse.data.data || [];
        
        for (const bracket of brackets) {
          const matches = bracket.matches || [];
          
          for (const match of matches) {
            const athlete1Id = match.athlete1Id;
            const athlete2Id = match.athlete2Id;
            
            // Подсчитываем только матчи, где участвуют спортсмены команды
            if ((athlete1Id && teamAthleteIds.includes(athlete1Id)) || 
                (athlete2Id && teamAthleteIds.includes(athlete2Id))) {
              teamMatches++;
              
              if (match.status === 'COMPLETED') {
                teamCompletedMatches++;
                
                if (match.winnerId && teamAthleteIds.includes(match.winnerId)) {
                  teamWins++;
                }
              }
            }
          }
        }
        
        // Формируем статистику команды
        setStats({
          competitionType: 'INDIVIDUAL',
          totalParticipants: statistics.totalAthletes || statistics.totalParticipants || 0,
          totalTeams: statistics.totalTeams,
          totalAthletes: statistics.totalAthletes,
          totalMatches: teamMatches,
          completedMatches: teamCompletedMatches,
          byWeightCategory: statistics.byWeightCategory || [],
          teamStats: {
            participants: teamParticipants.length,
            wins: teamWins,
            currentPositions: positions,
          },
        });
      }
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
            <Col span={8}>
              <Card>
                <Statistic
                  title={stats.competitionType === 'TEAM' ? 'Участие команды' : 'Участников от команды'}
                  value={stats.teamStats.participants}
                  prefix={stats.competitionType === 'TEAM' ? <TeamOutlined /> : <UserOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title={stats.competitionType === 'TEAM' ? 'Побед команды' : 'Побед команды'}
                  value={stats.teamStats.wins}
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Матчей команды"
                  value={stats.totalMatches}
                  prefix={<BarChartOutlined />}
                />
              </Card>
            </Col>
          </Row>

          {stats.competitionType === 'TEAM' ? (
            <Card title="Место команды в соревновании">
              <Table
                columns={[
                  { 
                    title: 'Команда', 
                    dataIndex: 'team', 
                    key: 'team',
                    render: (team: string) => team || 'Команда',
                  },
                  {
                    title: 'Место',
                    dataIndex: 'position',
                    key: 'position',
                    render: (position: number) => (
                      <Tag color={position === 1 ? 'gold' : position === 2 ? 'default' : position === 3 ? 'orange' : 'blue'}>
                        {position}
                      </Tag>
                    ),
                  },
                ]}
                dataSource={stats.teamStats.currentPositions}
                rowKey={(record, index) => `team-${index}`}
                pagination={false}
              />
            </Card>
          ) : (
            <Card title="Текущие места спортсменов команды">
              <Table
                columns={[
                  { title: 'Спортсмен', dataIndex: 'athlete', key: 'athlete' },
                  {
                    title: 'Место',
                    dataIndex: 'position',
                    key: 'position',
                    render: (position: number) => (
                      <Tag color={position === 1 ? 'gold' : position === 2 ? 'default' : position === 3 ? 'orange' : 'blue'}>
                        {position}
                      </Tag>
                    ),
                  },
                ]}
                dataSource={stats.teamStats.currentPositions}
                rowKey={(record, index) => `athlete-${index}`}
                pagination={false}
              />
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

