/**
 * Страница просмотра турнирных сеток (тренер)
 * 
 * Функциональность:
 * - Просмотр сеток соревнований
 * - Фильтрация по соревнованиям и весовым категориям
 * - Отслеживание выступлений спортсменов команды
 */

import { useState, useEffect } from 'react';
import { Card, Select, message, Space, Tabs, Table, Tag, Badge } from 'antd';
import { TrophyOutlined, UserOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import { BracketVisualization } from '../../../../components/brackets/BracketVisualization';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store/store';

interface Bracket {
  id: string;
  type: string;
  competition: {
    id: string;
    name: string;
    competitionType?: 'INDIVIDUAL' | 'TEAM';
  };
  weightCategory: {
    name: string;
  } | null;
  matches: any[];
}

export const BracketsView = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<string | null>(null);
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [selectedBracket, setSelectedBracket] = useState<Bracket | null>(null);
  const [loading, setLoading] = useState(false);
  const [teamAthletes, setTeamAthletes] = useState<any[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [competitionType, setCompetitionType] = useState<'INDIVIDUAL' | 'TEAM' | null>(null);

  useEffect(() => {
    loadCompetitions();
  }, []);

  useEffect(() => {
    if (selectedCompetition) {
      loadBrackets();
      loadTeamAthletes();
    }
  }, [selectedCompetition]);

  useEffect(() => {
    loadTeamAthletes();
  }, []);

  const loadCompetitions = async () => {
    try {
      // Загружаем только соревнования, где участвуют спортсмены команды тренера
      const response = await apiClient.get('/competitions/coach/my');
      setCompetitions(response.data.data.competitions);
    } catch (error) {
      message.error('Ошибка загрузки соревнований');
    }
  };

  const loadBrackets = async () => {
    if (!selectedCompetition) return;
    setLoading(true);
    try {
      const response = await apiClient.get(`/brackets/competition/${selectedCompetition}`);
      const allBrackets = response.data.data || [];
      
      // Получаем информацию о соревновании для определения типа
      const competitionResponse = await apiClient.get(`/competitions/${selectedCompetition}`);
      const competition = competitionResponse.data.data;
      const compType = competition?.competitionType || null;
      setCompetitionType(compType);
      
      // Фильтруем сетки в зависимости от типа соревнования
      let filteredBrackets = allBrackets;
      
      if (compType === 'TEAM') {
        // Для командных соревнований: показываем сетку, если команда участвует
        if (teamId) {
          filteredBrackets = allBrackets.filter((bracket: Bracket) => {
            // Проверяем, есть ли матчи с участием команды
            return bracket.matches?.some((match: any) => 
              match.team1Id === teamId || match.team2Id === teamId
            ) || false;
          });
        }
      } else {
        // Для индивидуальных соревнований: показываем только те сетки, где участвуют спортсмены команды
        if (teamAthletes.length > 0) {
          const athleteIds = teamAthletes.map((a: any) => a.id);
          filteredBrackets = allBrackets.filter((bracket: Bracket) => {
            return bracket.matches?.some((match: any) => 
              (match.athlete1Id && athleteIds.includes(match.athlete1Id)) ||
              (match.athlete2Id && athleteIds.includes(match.athlete2Id))
            ) || false;
          });
        }
      }
      
      setBrackets(filteredBrackets);
      if (filteredBrackets.length > 0) {
        setSelectedBracket(filteredBrackets[0]);
      }
    } catch (error) {
      message.error('Ошибка загрузки турнирных сеток');
    } finally {
      setLoading(false);
    }
  };

  const loadTeamAthletes = async () => {
    try {
      // Получаем информацию о команде тренера
      const response = await apiClient.get('/teams/my');
      const team = response.data.data;
      setTeamAthletes(team.athletes || []);
      setTeamId(team.id || null);
    } catch (error) {
      console.error('Ошибка загрузки спортсменов команды', error);
      setTeamAthletes([]);
      setTeamId(null);
    }
  };

  const getBracketTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      SINGLE_ELIMINATION: 'Олимпийская система',
      DOUBLE_ELIMINATION: 'Двойная олимпийская система',
      ROUND_ROBIN: 'Круговая система',
    };
    return labels[type] || type;
  };

  // Находим матчи, где участвуют спортсмены команды
  const findTeamAthletesMatches = (bracket: Bracket) => {
    if (!bracket.matches || teamAthletes.length === 0) return [];
    const athleteIds = teamAthletes.map((a: any) => a.id);
    return bracket.matches?.filter((match: any) => 
      (match.athlete1?.id && athleteIds.includes(match.athlete1.id)) ||
      (match.athlete2?.id && athleteIds.includes(match.athlete2.id))
    ) || [];
  };

  // Получаем текущие места спортсменов команды
  const getAthletesPositions = (bracket: Bracket) => {
    const teamMatches = findTeamAthletesMatches(bracket);
    const positions: Array<{
      athlete: string;
      round: number;
      status: string;
      opponent?: string;
      position?: number;
    }> = [];

    teamMatches.forEach((match: any) => {
      const athlete = match.athlete1?.id && teamAthletes.find((a: any) => a.id === match.athlete1.id)
        ? match.athlete1
        : match.athlete2?.id && teamAthletes.find((a: any) => a.id === match.athlete2.id)
        ? match.athlete2
        : null;

      if (athlete) {
        const opponent = match.athlete1?.id === athlete.id ? match.athlete2 : match.athlete1;
        positions.push({
          athlete: `${athlete.user.profile.firstName} ${athlete.user.profile.lastName}`,
          round: match.round,
          status: match.status,
          opponent: opponent ? `${opponent.user.profile.firstName} ${opponent.user.profile.lastName}` : undefined,
        });
      }
    });

    return positions;
  };

  const tabItems = brackets.map((bracket) => {
    const athletesPositions = getAthletesPositions(bracket);
    const bracketLabel = bracket.weightCategory 
      ? `${bracket.weightCategory.name} - ${getBracketTypeLabel(bracket.type)}`
      : `Командное соревнование - ${getBracketTypeLabel(bracket.type)}`;
    
    const isIndividualCompetition = bracket.competition?.competitionType === 'INDIVIDUAL' || 
                                     (competitionType === 'INDIVIDUAL' && !bracket.competition?.competitionType);
    
    return {
      key: bracket.id,
      label: (
        <span>
          {bracketLabel}
          {isIndividualCompetition && athletesPositions.length > 0 && (
            <Badge count={athletesPositions.length} style={{ marginLeft: 8 }} />
          )}
        </span>
      ),
      children: (
        <div>
          {isIndividualCompetition && athletesPositions.length > 0 && (
            <Card 
              title="Места спортсменов команды в сетке" 
              style={{ marginBottom: 16 }}
              extra={<Tag color="blue">{athletesPositions.length} спортсменов</Tag>}
            >
              <Table
                columns={[
                  {
                    title: 'Спортсмен',
                    dataIndex: 'athlete',
                    key: 'athlete',
                  },
                  {
                    title: 'Раунд',
                    dataIndex: 'round',
                    key: 'round',
                    render: (round: number) => `Раунд ${round}`,
                  },
                  {
                    title: 'Соперник',
                    dataIndex: 'opponent',
                    key: 'opponent',
                    render: (opponent: string) => opponent || '-',
                  },
                  {
                    title: 'Статус',
                    dataIndex: 'status',
                    key: 'status',
                    render: (status: string) => {
                      const statusLabels: Record<string, { text: string; color: string }> = {
                        SCHEDULED: { text: 'Запланирован', color: 'blue' },
                        IN_PROGRESS: { text: 'В процессе', color: 'orange' },
                        COMPLETED: { text: 'Завершен', color: 'green' },
                        CANCELLED: { text: 'Отменен', color: 'red' },
                      };
                      const statusInfo = statusLabels[status] || { text: status, color: 'default' };
                      return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
                    },
                  },
                ]}
                dataSource={athletesPositions}
                rowKey={(record, index) => `${record.athlete}-${index}`}
                pagination={false}
                size="small"
              />
            </Card>
          )}
          <BracketVisualization
            competitionId={selectedCompetition!}
            bracketId={bracket.id}
          />
        </div>
      ),
    };
  });

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#262626' }}>Турнирные сетки</h1>
        <Space style={{ marginTop: 16 }}>
          <span>Выберите соревнование:</span>
          <Select
            style={{ width: 300 }}
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
        </Space>
      </div>

      {selectedCompetition && brackets.length > 0 && (
        <Card>
          <Tabs
            activeKey={selectedBracket?.id}
            onChange={(key) => {
              const bracket = brackets.find((b) => b.id === key);
              setSelectedBracket(bracket || null);
            }}
            items={tabItems}
          />
        </Card>
      )}

      {selectedCompetition && brackets.length === 0 && !loading && (
        <Card>
          <div style={{ textAlign: 'center', padding: '48px', color: '#8c8c8c' }}>
            <TrophyOutlined style={{ fontSize: '48px', marginBottom: 16 }} />
            <p>Турнирные сетки для этого соревнования еще не созданы</p>
          </div>
        </Card>
      )}

      {!selectedCompetition && (
        <Card>
          <div style={{ textAlign: 'center', padding: '48px', color: '#8c8c8c' }}>
            <TrophyOutlined style={{ fontSize: '48px', marginBottom: 16 }} />
            <p>Выберите соревнование для просмотра турнирных сеток</p>
          </div>
        </Card>
      )}
    </div>
  );
};

