/**
 * Страница управления турнирными сетками (администратор)
 * 
 * Функциональность:
 * - Просмотр всех сеток соревнований
 * - Создание сеток для весовых категорий
 * - Автоматическое создание сеток для всех категорий
 * - Редактирование сеток
 * - Визуализация сеток
 */

import { useState, useEffect } from 'react';
import { Card, Select, Table, Tag, Button, message, Space, Modal, Form, InputNumber, Input } from 'antd';
import { TrophyOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import { BracketVisualization } from '../../../../components/brackets/BracketVisualization';

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
  matches: any[];
}

interface Participant {
  id: string;
  athlete?: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
        middleName?: string;
      };
    };
  };
  team?: {
    id: string;
    name: string;
    region?: {
      name: string;
    };
  };
  position?: number;
  points?: number;
}

interface WeightCategory {
  id: string;
  name: string;
}

export const BracketsManagement = () => {
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<string | null>(null);
  const [selectedCompetitionData, setSelectedCompetitionData] = useState<any>(null);
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [selectedBracket, setSelectedBracket] = useState<Bracket | null>(null);
  const [loading, setLoading] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [categoryResults, setCategoryResults] = useState<any[]>([]);
  const [weightCategories, setWeightCategories] = useState<WeightCategory[]>([]);
  const [addResultModalVisible, setAddResultModalVisible] = useState(false);
  const [editPositionModalVisible, setEditPositionModalVisible] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<any | null>(null);
  const [matchesForResult, setMatchesForResult] = useState<any[]>([]);
  const [resultForm] = Form.useForm();
  const [positionForm] = Form.useForm();

  useEffect(() => {
    loadCompetitions();
  }, []);

  useEffect(() => {
    if (selectedCompetition) {
      loadCompetitionData();
      loadBrackets();
      loadParticipants();
    }
  }, [selectedCompetition]);

  useEffect(() => {
    if (selectedCompetitionData?.sport?.id) {
      loadWeightCategories(selectedCompetitionData.sport.id);
    }
  }, [selectedCompetitionData]);

  useEffect(() => {
    if (selectedBracket && selectedCompetition) {
      loadCategoryResults();
    }
  }, [selectedBracket, selectedCompetition]);

  useEffect(() => {
    // Слушаем обновления матчей из BracketVisualization
    const handleMatchUpdate = (event: any) => {
      if (selectedBracket && event.detail?.bracketId === selectedBracket.id) {
        // Обновляем без показа ошибок - это не критично
        try {
          loadCategoryResults();
        } catch (error) {
          console.warn('Ошибка при обновлении результатов категории после события (не критично):', error);
        }
        try {
          loadBrackets(); // Обновляем также список сеток
        } catch (error) {
          console.warn('Ошибка при обновлении сеток после события (не критично):', error);
        }
      }
    };

    window.addEventListener('bracket-match-updated', handleMatchUpdate);
    return () => {
      window.removeEventListener('bracket-match-updated', handleMatchUpdate);
    };
  }, [selectedBracket, selectedCompetition]);

  const loadCompetitions = async () => {
    try {
      const response = await apiClient.get('/competitions');
      setCompetitions(response.data.data.competitions);
    } catch (error) {
      message.error('Ошибка загрузки соревнований');
    }
  };

  const loadCompetitionData = async () => {
    if (!selectedCompetition) return;
    try {
      const response = await apiClient.get(`/competitions/${selectedCompetition}`);
      if (response.data?.success && response.data?.data) {
        setSelectedCompetitionData(response.data.data);
      } else {
        console.error('Неверный формат ответа при загрузке данных соревнования');
        message.error('Ошибка загрузки данных соревнования');
      }
    } catch (error: any) {
      console.error('Ошибка загрузки данных соревнования', error);
      if (error.response?.status === 404) {
        message.error('Соревнование не найдено');
      } else {
        message.error('Ошибка загрузки данных соревнования: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const loadBrackets = async () => {
    if (!selectedCompetition) return;
    setLoading(true);
    try {
      const response = await apiClient.get(`/brackets/competition/${selectedCompetition}`);
      setBrackets(response.data.data);
    } catch (error) {
      message.error('Ошибка загрузки турнирных сеток');
    } finally {
      setLoading(false);
    }
  };


  const loadParticipants = async () => {
    if (!selectedCompetition) return;
    try {
      const response = await apiClient.get(`/competitions/${selectedCompetition}`);
      if (response.data?.success && response.data?.data) {
        setParticipants(response.data.data.participants || []);
      } else {
        console.error('Неверный формат ответа при загрузке участников');
        setParticipants([]);
      }
    } catch (error: any) {
      console.error('Ошибка загрузки участников', error);
      if (error.response?.status === 404) {
        console.warn('Соревнование не найдено при загрузке участников');
        setParticipants([]);
      }
    }
  };

  const loadWeightCategories = async (sportId: string) => {
    try {
      const response = await apiClient.get(`/references/sports/${sportId}/weight-categories`);
      setWeightCategories(response.data.data || []);
    } catch (error) {
      console.error('Ошибка загрузки весовых категорий', error);
      message.error('Ошибка загрузки весовых категорий для этого вида спорта');
    }
  };

  const loadCategoryResults = async () => {
    if (!selectedCompetition || !selectedBracket) return;
    
    try {
      // Для командных соревнований загружаем результаты команд
      if (selectedBracket.competition?.competitionType === 'TEAM') {
        const response = await apiClient.get(`/competitions/${selectedCompetition}/results`);
        const allResults = response.data.data || [];
        setCategoryResults(allResults);
        return;
      }

      // Загружаем соревнование с участниками
      const competitionResponse = await apiClient.get(`/competitions/${selectedCompetition}`);
      
      if (!competitionResponse.data?.success || !competitionResponse.data?.data) {
        console.error('Соревнование не найдено или неверный формат ответа:', competitionResponse.data);
        message.error('Соревнование не найдено');
        return;
      }
      
      const allParticipants = competitionResponse.data.data.participants || [];
      
      // Фильтруем участников по весовой категории выбранной сетки (только для индивидуальных соревнований)
      const categoryParticipants = allParticipants.filter((p: any) => {
        if (!selectedBracket.weightCategory) return false;
        return p.athlete?.weightCategory?.id === selectedBracket.weightCategory.id;
      });
      
      // Загружаем результаты (уже обработанные с matchResults)
      let allResults: any[] = [];
      try {
        const resultsResponse = await apiClient.get(`/competitions/${selectedCompetition}/results`);
        allResults = resultsResponse.data?.data || [];
      } catch (resultsError: any) {
        // Если результатов еще нет (404), это нормально - просто используем пустой массив
        if (resultsError.response?.status !== 404) {
          console.error('Ошибка загрузки результатов:', resultsError);
        }
      }
      
      // Фильтруем результаты по весовой категории
      const categoryResults = allResults.filter((r: any) => {
        return r.athlete?.weightCategory?.id === selectedBracket.weightCategory.id;
      });
      
      // Создаем мапу результатов по athleteId для быстрого поиска
      const resultsMap = new Map();
      categoryResults.forEach((result: any) => {
        // Используем athleteId из результата или из athlete.id
        const athleteId = result.athleteId || result.athlete?.id;
        if (athleteId) {
          resultsMap.set(athleteId, result);
        }
      });
      
      // Объединяем участников с их результатами
      const participantsWithResults = categoryParticipants.map((participant: any) => {
        const athleteId = participant.athlete?.id;
        const result = athleteId ? resultsMap.get(athleteId) : null;
        
        return {
          athlete: participant.athlete,
          position: result?.position || null,
          matchResults: result?.matchResults || [], // Уже обработанные очки за схватки
        };
      });
      
      // Сортируем по месту (сначала те, у кого есть место, затем по очкам)
      participantsWithResults.sort((a, b) => {
        // Сначала по месту (меньшее = лучше)
        if (a.position === null && b.position === null) {
          // Если оба без места, сортируем по общему количеству очков
          const aTotalPoints = (a.matchResults || []).reduce((sum: number, mr: any) => sum + (Number(mr.points) || 0), 0);
          const bTotalPoints = (b.matchResults || []).reduce((sum: number, mr: any) => sum + (Number(mr.points) || 0), 0);
          return bTotalPoints - aTotalPoints; // Больше очков = лучше
        }
        if (a.position === null) return 1; // Без места в конец
        if (b.position === null) return -1;
        if (a.position !== b.position) return a.position - b.position;
        
        // Если места одинаковые, сортируем по общему количеству очков
        const aTotalPoints = (a.matchResults || []).reduce((sum: number, mr: any) => sum + (Number(mr.points) || 0), 0);
        const bTotalPoints = (b.matchResults || []).reduce((sum: number, mr: any) => sum + (Number(mr.points) || 0), 0);
        return bTotalPoints - aTotalPoints;
      });
      
      setCategoryResults(participantsWithResults);
    } catch (error: any) {
      console.error('Ошибка загрузки результатов категории', error);
      // Не показываем ошибку пользователю, если это просто отсутствие данных
      if (error.response?.status === 404) {
        // Соревнование не найдено - возможно, оно было удалено
        console.warn('Соревнование не найдено, возможно оно было удалено');
        setCategoryResults([]);
      } else {
        message.error('Ошибка загрузки результатов категории: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleAddResult = async (result: any) => {
    if (!selectedCompetition || !selectedBracket) return;

    try {
      setSelectedAthlete(result.athlete);
      
      // Загружаем матчи выбранной сетки, в которых участвует этот спортсмен
      const athleteMatches: any[] = [];
      if (selectedBracket.matches) {
        selectedBracket.matches.forEach((match: any) => {
          if (match.athlete1Id === result.athlete.id || match.athlete2Id === result.athlete.id) {
            athleteMatches.push({
              ...match,
              bracketName: selectedBracket.weightCategory?.name || 'Без категории',
            });
          }
        });
      }

      setMatchesForResult(athleteMatches);
      resultForm.resetFields();
      setAddResultModalVisible(true);
    } catch (error: any) {
      message.error('Ошибка загрузки матчей спортсмена');
    }
  };

  const handleAddResultSubmit = async (values: any) => {
    if (!selectedCompetition || !selectedAthlete || !selectedBracket) return;

    try {
      const data = {
        matchId: values.matchId,
        athleteId: selectedAthlete.id,
        position: values.position || undefined,
        points: values.points || undefined,
        time: values.time || undefined,
      };

      await apiClient.post(`/competitions/${selectedCompetition}/results`, data);
      message.success('Результат успешно добавлен');
      setAddResultModalVisible(false);
      loadCategoryResults();
      loadBrackets(); // Обновляем сетки
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при добавлении результата');
    }
  };

  const handleEditPosition = (result: any, isTeam: boolean = false) => {
    setIsEditingTeam(isTeam);
    if (isTeam) {
      setSelectedParticipant({
        id: result.teamId || result.team?.id || '',
        team: result.team,
        position: result.position,
        points: result.points,
      });
    } else {
      setSelectedParticipant({
        id: result.athlete?.id || '',
        athlete: result.athlete,
        position: result.position,
        points: result.points,
      });
    }
    positionForm.setFieldsValue({
      position: result.position,
      points: result.points,
    });
    setEditPositionModalVisible(true);
  };

  const handlePositionSubmit = async (values: any) => {
    if (!selectedParticipant || !selectedCompetition) return;

    try {
      if (isEditingTeam) {
        // Для командных соревнований обновляем место через обновление metadata матчей
        if (!selectedBracket) {
          message.error('Сетка не выбрана');
          return;
        }

        const teamId = selectedParticipant.id;
        // Находим все матчи, где участвует команда
        const teamMatches = selectedBracket.matches?.filter((m: any) => 
          m.team1Id === teamId || m.team2Id === teamId || m.winnerTeamId === teamId
        ) || [];

        if (teamMatches.length === 0) {
          message.error('Матчи команды не найдены');
          return;
        }

        // Обновляем metadata во всех матчах команды
        const updatePromises = teamMatches.map(async (match: any) => {
          const currentMetadata = (match.metadata as any) || {};
          const updatedMetadata = {
            ...currentMetadata,
            teamPositions: {
              ...(currentMetadata.teamPositions || {}),
              [teamId]: values.position || null,
            },
          };

          return apiClient.put(`/brackets/match/${match.id}`, {
            metadata: updatedMetadata,
          });
        });

        await Promise.all(updatePromises);
        message.success('Место команды обновлено');
      } else {
        // Для индивидуальных соревнований - TODO: создать endpoint
        message.success('Место участника обновлено (функционал в разработке)');
      }
      
      setEditPositionModalVisible(false);
      setIsEditingTeam(false);
      loadCategoryResults();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при обновлении места');
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

  const isTeamCompetition = selectedBracket?.competition?.competitionType === 'TEAM';
  
  const resultsColumns = isTeamCompetition
    ? [
        {
          title: 'Команда',
          key: 'team',
          width: 200,
          render: (_: any, record: any) => {
            const team = record.team;
            if (!team) return '-';
            return team.name || '-';
          },
        },
        {
          title: 'Регион',
          key: 'region',
          width: 150,
          render: (_: any, record: any) => {
            const region = record.team?.region;
            if (!region) return <span style={{ color: '#8c8c8c' }}>—</span>;
            return region.name;
          },
        },
        {
          title: 'Итоговое место',
          dataIndex: 'position',
          key: 'position',
          width: 120,
          render: (position: number | null) =>
            position ? (
              <Tag color={position === 1 ? 'gold' : position === 2 ? 'default' : position === 3 ? 'orange' : 'blue'}>
                {position}
              </Tag>
            ) : (
              <span style={{ color: '#8c8c8c' }}>Не определено</span>
            ),
        },
        {
          title: 'Очки за схватки',
          key: 'matchResults',
          width: 300,
          render: (_: any, record: any) => {
            const matchResults = record.matchResults || [];
            if (matchResults.length === 0) {
              return <span style={{ color: '#8c8c8c' }}>Нет данных</span>;
            }
            
            const totalPoints = matchResults.reduce((sum: number, mr: any) => {
              if (mr.points !== null && mr.points !== undefined) {
                const points = Number(mr.points);
                return sum + (isNaN(points) ? 0 : points);
              }
              return sum;
            }, 0);
            
            return (
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {matchResults.map((mr: any, index: number) => {
                  const round = mr.round !== null && mr.round !== undefined ? Number(mr.round) : null;
                  const points = mr.points !== null && mr.points !== undefined ? Number(mr.points) : null;
                  const opponentScore = mr.opponentScore !== null && mr.opponentScore !== undefined ? Number(mr.opponentScore) : null;
                  
                  return (
                    <div key={index} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {round ? (
                        <Tag color="blue">Раунд {round}</Tag>
                      ) : (
                        <Tag color="default">Схватка</Tag>
                      )}
                      <span>
                        {points !== null && !isNaN(Number(points)) ? (
                          <strong>{Number(points)}</strong>
                        ) : (
                          <span style={{ color: '#8c8c8c' }}>—</span>
                        )}
                        {' : '}
                        {opponentScore !== null && !isNaN(Number(opponentScore)) ? (
                          <span>{Number(opponentScore)}</span>
                        ) : (
                          <span style={{ color: '#8c8c8c' }}>—</span>
                        )}
                      </span>
                    </div>
                  );
                })}
                {totalPoints > 0 && (
                  <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #f0f0f0', fontSize: '12px', fontWeight: 'bold' }}>
                    Всего очков: {totalPoints}
                  </div>
                )}
              </Space>
            );
          },
        },
        {
          title: 'Действия',
          key: 'actions',
          width: 200,
          render: (_: any, record: any) => (
            <Space direction="vertical" size="small">
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditPosition(record, true)}
              >
                Редактировать место
              </Button>
            </Space>
          ),
        },
      ]
    : [
        {
          title: 'Спортсмен',
          key: 'athlete',
          width: 200,
          render: (_: any, record: any) => {
            const profile = record.athlete?.user?.profile;
            if (!profile) return '-';
            return `${profile.lastName} ${profile.firstName} ${profile.middleName || ''}`.trim();
          },
        },
    {
      title: 'Итоговое место',
      dataIndex: 'position',
      key: 'position',
      width: 120,
      render: (position: number | null) =>
        position ? (
          <Tag color={position === 1 ? 'gold' : position === 2 ? 'default' : position === 3 ? 'orange' : 'blue'}>
            {position}
          </Tag>
        ) : (
          <span style={{ color: '#8c8c8c' }}>Не определено</span>
        ),
    },
    {
      title: 'Очки за схватки',
      key: 'matchResults',
      width: 300,
      render: (_: any, record: any) => {
        const matchResults = record.matchResults || [];
        if (matchResults.length === 0) {
          return <span style={{ color: '#8c8c8c' }}>Нет данных</span>;
        }
        
        // Вычисляем общее количество очков (только для указанных очков)
        const totalPoints = matchResults.reduce((sum: number, mr: any) => {
          if (mr.points !== null && mr.points !== undefined) {
            const points = Number(mr.points);
            return sum + (isNaN(points) ? 0 : points);
          }
          return sum;
        }, 0);
        
        return (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {matchResults.map((mr: any, index: number) => {
              const round = mr.round !== null && mr.round !== undefined ? Number(mr.round) : null;
              const points = mr.points !== null && mr.points !== undefined ? Number(mr.points) : null;
              const opponentScore = mr.opponentScore !== null && mr.opponentScore !== undefined ? Number(mr.opponentScore) : null;
              
              return (
                <div key={index} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {round ? (
                    <Tag color="blue">Раунд {round}</Tag>
                  ) : (
                    <Tag color="default">Схватка</Tag>
                  )}
                  <span>
                    {points !== null && !isNaN(Number(points)) ? (
                      <strong>{Number(points)}</strong>
                    ) : (
                      <span style={{ color: '#8c8c8c' }}>—</span>
                    )}
                    {' : '}
                    {opponentScore !== null && !isNaN(Number(opponentScore)) ? (
                      <span>{Number(opponentScore)}</span>
                    ) : (
                      <span style={{ color: '#8c8c8c' }}>—</span>
                    )}
                  </span>
                </div>
              );
            })}
            {totalPoints > 0 && (
              <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #f0f0f0', fontSize: '12px', fontWeight: 'bold' }}>
                Всего очков: {totalPoints}
              </div>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Команда',
      key: 'team',
      width: 150,
      render: (_: any, record: any) => {
        const team = record.athlete?.team;
        if (!team) return <span style={{ color: '#8c8c8c' }}>—</span>;
        return (
          <div>
            <div>{team.name}</div>
            {team.region && (
              <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{team.region.name}</div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 200,
      render: (_: any, record: any) => (
        <Space direction="vertical" size="small">
          <Button
            type="link"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => handleAddResult(record)}
          >
            Добавить результат
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditPosition(record)}
          >
            Редактировать место
          </Button>
        </Space>
      ),
    },
  ];

  const columns = [
    {
      title: 'Тип сетки',
      key: 'type',
      render: (_: any, record: Bracket) => (
        <Tag color="blue">{getBracketTypeLabel(record.type)}</Tag>
      ),
    },
    {
      title: 'Весовая категория',
      key: 'weightCategory',
      render: (_: any, record: Bracket) => record.weightCategory?.name || 'Командное соревнование',
    },
    {
      title: 'Количество матчей',
      key: 'matches',
      render: (_: any, record: Bracket) => record.matches?.length || 0,
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Bracket) => (
        <Button type="link" onClick={() => setSelectedBracket(record)}>
          Просмотреть
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#262626' }}>Управление турнирными сетками</h1>
        </div>
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

      {selectedCompetition && (
        <>
          <Card style={{ marginBottom: 24 }}>
            <Table
              columns={columns}
              dataSource={brackets}
              loading={loading}
              rowKey="id"
              locale={{ emptyText: 'Нет турнирных сеток для этого соревнования' }}
            />
          </Card>

          {selectedBracket && (
            <>
              <Card
                title={
                  <Space>
                    <TrophyOutlined />
                    <span>
                      {getBracketTypeLabel(selectedBracket.type)} - {selectedBracket.weightCategory?.name || 'Командное соревнование'}
                    </span>
                  </Space>
                }
                extra={
                  <Button onClick={() => setSelectedBracket(null)}>Закрыть</Button>
                }
                style={{ marginBottom: 24 }}
              >
                <BracketVisualization 
                  competitionId={selectedCompetition || ''} 
                  bracketId={selectedBracket.id} 
                />
              </Card>

              {/* Таблица результатов участников этой категории или команд */}
              {(selectedBracket.weightCategory || selectedBracket.competition?.competitionType === 'TEAM') && (
                <Card 
                  title={
                    <Space>
                      <span>
                        {selectedBracket.competition?.competitionType === 'TEAM' 
                          ? 'Результаты команд' 
                          : 'Результаты участников категории'}
                      </span>
                      {selectedBracket.weightCategory && (
                        <Tag color="blue">{selectedBracket.weightCategory.name}</Tag>
                      )}
                    </Space>
                  }
                  extra={
                    <Button onClick={loadCategoryResults} size="small">
                      Обновить
                    </Button>
                  }
                >
                  {categoryResults.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#8c8c8c' }}>
                      <p>
                        {selectedBracket.competition?.competitionType === 'TEAM'
                          ? 'Нет команд или результатов для этого соревнования'
                          : 'Нет участников или результатов для этой категории'}
                      </p>
                      <p style={{ fontSize: '12px' }}>
                        {selectedBracket.competition?.competitionType === 'TEAM'
                          ? 'Команды появятся здесь после регистрации на соревнование'
                          : 'Участники появятся здесь после регистрации на соревнование'}
                      </p>
                    </div>
                  ) : (
                    <Table
                      columns={resultsColumns}
                      dataSource={categoryResults}
                      loading={loading}
                      rowKey={(record) => 
                        isTeamCompetition 
                          ? (record.teamId || record.team?.id || Math.random())
                          : (record.athleteId || record.athlete?.id || Math.random())
                      }
                      pagination={{
                        showSizeChanger: true,
                        showTotal: (total) => `Всего: ${total}`,
                      }}
                    />
                  )}
                </Card>
              )}
            </>
          )}
        </>
      )}

      {!selectedCompetition && (
        <Card>
          <div style={{ textAlign: 'center', padding: '48px', color: '#8c8c8c' }}>
            <TrophyOutlined style={{ fontSize: '48px', marginBottom: 16 }} />
            <p>Выберите соревнование для просмотра турнирных сеток</p>
          </div>
        </Card>
      )}

      {/* Модалка добавления результата */}
      <Modal
        title={`Добавить результат для ${selectedAthlete?.user?.profile?.lastName || ''} ${selectedAthlete?.user?.profile?.firstName || ''}`}
        open={addResultModalVisible}
        onCancel={() => setAddResultModalVisible(false)}
        onOk={() => resultForm.submit()}
        width={600}
        okText="Добавить"
        cancelText="Отмена"
      >
        <Form
          form={resultForm}
          layout="vertical"
          onFinish={handleAddResultSubmit}
        >
          <Form.Item
            name="matchId"
            label="Матч"
            rules={[{ required: true, message: 'Выберите матч' }]}
          >
            <Select
              placeholder="Выберите матч"
              showSearch
              filterOption={(input, option) =>
                (option?.children as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {matchesForResult.map((match) => (
                <Select.Option key={match.id} value={match.id}>
                  Раунд {match.round}, Позиция {match.position}
                  {match.athlete1 && match.athlete2 && ` (${match.athlete1.user?.profile?.lastName || ''} vs ${match.athlete2.user?.profile?.lastName || ''})`}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="position"
            label="Место"
          >
            <InputNumber
              min={1}
              placeholder="Введите место"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="points"
            label="Очки"
          >
            <InputNumber
              min={0}
              placeholder="Введите очки"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="time"
            label="Время (например, 01:23:45)"
          >
            <Input placeholder="Введите время (необязательно)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модалка редактирования места */}
      <Modal
        title={isEditingTeam ? "Редактировать место команды" : "Редактировать место участника"}
        open={editPositionModalVisible}
        onCancel={() => {
          setEditPositionModalVisible(false);
          positionForm.resetFields();
          setIsEditingTeam(false);
        }}
        onOk={() => positionForm.submit()}
        width={500}
        okText="Сохранить"
        cancelText="Отмена"
      >
        {selectedParticipant && (
          <Form
            form={positionForm}
            layout="vertical"
            onFinish={handlePositionSubmit}
          >
            <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
              <p style={{ margin: 0, fontWeight: 500 }}>
                {isEditingTeam 
                  ? selectedParticipant.team?.name || 'Команда'
                  : `${selectedParticipant.athlete?.user?.profile?.lastName || ''} ${selectedParticipant.athlete?.user?.profile?.firstName || ''}`.trim()}
              </p>
              {isEditingTeam && selectedParticipant.team?.region && (
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#8c8c8c' }}>
                  {selectedParticipant.team.region.name}
                </p>
              )}
            </div>

            <Form.Item
              name="position"
              label="Место"
            >
              <InputNumber
                min={1}
                placeholder="Введите место"
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item
              name="points"
              label="Очки"
            >
              <InputNumber
                min={0}
                placeholder="Введите очки"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

