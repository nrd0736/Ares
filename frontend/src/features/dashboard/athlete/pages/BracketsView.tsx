/**
 * Страница просмотра турнирных сеток (спортсмен)
 * 
 * Функциональность:
 * - Просмотр сеток соревнований где участвует спортсмен
 * - Отслеживание своих матчей
 * - Просмотр результатов
 */

import { useState, useEffect } from 'react';
import { Card, Select, message, Space, Empty } from 'antd';
import { TrophyOutlined } from '@ant-design/icons';
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
  weightCategory?: {
    id: string;
    name: string;
  } | null;
  weightCategoryId?: string; // Альтернативный вариант
  matches: any[];
}

export const BracketsView = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<string | null>(null);
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [myBracket, setMyBracket] = useState<Bracket | null>(null);
  const [loading, setLoading] = useState(false);
  const [athleteWeightCategoryId, setAthleteWeightCategoryId] = useState<string | null>(null);
  const [athleteTeamId, setAthleteTeamId] = useState<string | null>(null);
  const [competitionType, setCompetitionType] = useState<'INDIVIDUAL' | 'TEAM' | null>(null);

  useEffect(() => {
    loadAthleteInfo();
    loadCompetitions();
  }, []);

  useEffect(() => {
    if (selectedCompetition) {
      loadBrackets();
    }
  }, [selectedCompetition]);

  useEffect(() => {
    // Фильтруем сетки в зависимости от типа соревнования
    if (brackets.length === 0) {
      setMyBracket(null);
      return;
    }
    
    if (competitionType === 'TEAM') {
      // Для командных соревнований: находим сетку, где участвует команда спортсмена
      if (athleteTeamId) {
        const teamBracket = brackets.find((b) => {
          // Проверяем, есть ли матчи с участием команды
          const matches = b.matches || [];
          return matches.some((match: any) => 
            match.team1Id === athleteTeamId || match.team2Id === athleteTeamId
          );
        });
        setMyBracket(teamBracket || null);
      } else {
        // Если команда не загружена, показываем первую сетку (обычно для командных соревнований одна сетка)
        setMyBracket(brackets[0] || null);
      }
    } else {
      // Для индивидуальных соревнований: фильтруем по весовой категории спортсмена
      if (athleteWeightCategoryId) {
        const bracket = brackets.find((b) => {
          const bracketWeightCategoryId = b.weightCategory?.id || (b as any).weightCategoryId;
          return bracketWeightCategoryId === athleteWeightCategoryId;
        });
        setMyBracket(bracket || null);
      } else {
        setMyBracket(null);
      }
    }
  }, [brackets, athleteWeightCategoryId, athleteTeamId, competitionType]);

  const loadAthleteInfo = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      const user = response.data?.data?.user || response.data?.data;
      const athlete = user?.athlete;
      
      if (athlete) {
        const weightCategoryId = athlete.weightCategory?.id || athlete.weightCategoryId;
        const teamId = athlete.teamId || athlete.team?.id;
        
        if (weightCategoryId) {
          setAthleteWeightCategoryId(weightCategoryId);
        }
        if (teamId) {
          setAthleteTeamId(teamId);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки информации о спортсмене', error);
    }
  };

  const loadCompetitions = async () => {
    try {
      // Загружаем только соревнования, в которых участвует спортсмен
      const response = await apiClient.get('/auth/me/competitions');
      if (response.data?.success) {
        const comps = response.data.data || [];
        setCompetitions(comps.map((c: any) => c.competition));
        if (comps.length > 0 && !selectedCompetition) {
          setSelectedCompetition(comps[0].competition.id);
        }
      }
    } catch (error) {
      message.error('Ошибка загрузки соревнований');
    }
  };

  const loadBrackets = async () => {
    if (!selectedCompetition) return;
    setLoading(true);
    try {
      // Получаем информацию о соревновании для определения типа
      const competitionResponse = await apiClient.get(`/competitions/${selectedCompetition}`);
      const competition = competitionResponse.data.data;
      const compType = competition?.competitionType || 'INDIVIDUAL';
      setCompetitionType(compType);
      
      const response = await apiClient.get(`/brackets/competition/${selectedCompetition}`);
      const bracketsData = response.data.data || [];
      setBrackets(bracketsData);
    } catch (error) {
      message.error('Ошибка загрузки турнирных сеток');
    } finally {
      setLoading(false);
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

      {selectedCompetition && myBracket && (
        <Card>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 8 }}>
              {competitionType === 'TEAM' 
                ? `Командное соревнование - ${getBracketTypeLabel(myBracket.type)}`
                : `${myBracket.weightCategory?.name || 'Весовая категория'} - ${getBracketTypeLabel(myBracket.type)}`
              }
            </h3>
          </div>
          <BracketVisualization
            competitionId={selectedCompetition}
            bracketId={myBracket.id}
          />
        </Card>
      )}

      {selectedCompetition && !myBracket && !loading && brackets.length > 0 && (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <p style={{ fontSize: '16px', marginBottom: 8 }}>
                  {competitionType === 'TEAM' 
                    ? 'Сетка для вашей команды еще не создана'
                    : 'Сетка для вашей весовой категории еще не создана'
                  }
                </p>
                <p style={{ color: '#8c8c8c', fontSize: '14px' }}>
                  {competitionType === 'TEAM'
                    ? 'Турнирная сетка появится здесь, когда она будет сформирована для вашей команды'
                    : 'Турнирная сетка появится здесь, когда она будет сформирована для вашей весовой категории'
                  }
                </p>
              </div>
            }
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

