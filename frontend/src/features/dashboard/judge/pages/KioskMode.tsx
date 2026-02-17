/**
 * Страница режима киоска для судей
 * 
 * Функциональность:
 * - Полноэкранный режим для работы на соревнованиях
 * - Просмотр текущих матчей
 * - Ввод результатов матчей
 * - Управление расписанием матчей
 * - Подтверждение результатов
 * 
 * Особенности:
 * - Оптимизирован для больших экранов
 * - Real-time обновления через Socket.IO
 * - Удобный интерфейс для быстрого ввода результатов
 */

import { useState, useEffect } from 'react';
import { Card, Select, Button, Space, Modal, Table, Tag, message, Checkbox, InputNumber, Radio, Form, Divider } from 'antd';
import { TrophyOutlined, RocketOutlined, ClockCircleOutlined, PlayCircleOutlined, PauseCircleOutlined, RedoOutlined, EyeOutlined, TeamOutlined, SettingOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import { useCompetitionSocket } from '../../../../hooks/useSocket';

interface Match {
  id: string;
  round: number;
  position: number;
  scheduledTime?: string;
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
  team1?: {
    id: string;
    name: string;
    region?: {
      name: string;
    };
  };
  team2?: {
    id: string;
    name: string;
    region?: {
      name: string;
    };
  };
  winnerId?: string;
  winnerTeamId?: string;
  status: string;
  score?: any;
  bracket?: {
    competition: {
      competitionType: 'INDIVIDUAL' | 'TEAM';
    };
  };
}

interface Bracket {
  id: string;
  weightCategory?: {
    name: string;
  } | null;
  matches: Match[];
}

interface Competition {
  id: string;
  name: string;
  iconUrl?: string;
  sport: {
    name: string;
  };
}

export const KioskMode = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [selectedBracket, setSelectedBracket] = useState<Bracket | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchSelectorVisible, setMatchSelectorVisible] = useState(false);
  const [kioskLaunched, setKioskLaunched] = useState(false);
  const [kioskWindow, setKioskWindow] = useState<Window | null>(null);
  const [withTimer, setWithTimer] = useState(false);
  const [displayMode, setDisplayMode] = useState<'welcome' | 'scoreboard' | 'next-matches'>('scoreboard');
  const [nextMatches, setNextMatches] = useState<Match[]>([]);
  const [selectedNextMatch, setSelectedNextMatch] = useState<string>('');
  const [loadingNextMatches, setLoadingNextMatches] = useState(false);
  
  // Управление
  const [athlete1Score, setAthlete1Score] = useState(0);
  const [athlete2Score, setAthlete2Score] = useState(0);
  const [timerMinutes, setTimerMinutes] = useState(3);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerInterval, setTimerInterval] = useState<any>(null);

  const [form] = Form.useForm();

  // Подписка на real-time обновления
  useCompetitionSocket(selectedCompetition?.id);

  useEffect(() => {
    loadCompetitions();
  }, []);

  useEffect(() => {
    if (selectedCompetition) {
      loadBrackets();
    }
  }, [selectedCompetition]);

  useEffect(() => {
    if (selectedMatch && selectedBracket) {
      const updatedMatch = selectedBracket.matches.find(m => m.id === selectedMatch.id);
      if (updatedMatch) {
        setSelectedMatch(updatedMatch);
        // Обновляем счет из матча (используем pendingResult, если есть)
        const score = (updatedMatch as any).metadata?.pendingResult?.score || updatedMatch.score;
        const isTeamMatch = !!(updatedMatch.team1 || updatedMatch.team2);
        if (score) {
          if (isTeamMatch) {
            setAthlete1Score(score.team1 || 0);
            setAthlete2Score(score.team2 || 0);
          } else {
            setAthlete1Score(score.athlete1 || 0);
            setAthlete2Score(score.athlete2 || 0);
          }
        }
      }
    }
  }, [brackets]);

  // Загрузка следующих матчей
  const loadNextMatches = async () => {
    if (!selectedCompetition?.id) return;
    
    setLoadingNextMatches(true);
    try {
      const bracketsResponse = await apiClient.get(`/brackets/competition/${selectedCompetition.id}`);
      const brackets = Array.isArray(bracketsResponse.data.data) 
        ? bracketsResponse.data.data 
        : bracketsResponse.data.data?.brackets || [];
      
      const allMatches: Match[] = [];
      for (const bracket of brackets) {
        const bracketMatches = bracket.matches || [];
        allMatches.push(...bracketMatches);
      }
      
      const filtered = allMatches
        .filter(m => m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS')
        .sort((a, b) => {
          if (a.status === 'IN_PROGRESS' && b.status !== 'IN_PROGRESS') return -1;
          if (a.status !== 'IN_PROGRESS' && b.status === 'IN_PROGRESS') return 1;
          
          if (a.scheduledTime && b.scheduledTime) {
            return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
          }
          if (a.scheduledTime) return -1;
          if (b.scheduledTime) return 1;
          
          if (a.round !== b.round) return a.round - b.round;
          return a.position - b.position;
        });
      
      setNextMatches(filtered);
      
      if (filtered.length > 0 && !selectedNextMatch) {
        setSelectedNextMatch(filtered[0].id);
      }
    } catch (error) {
      console.error('Ошибка загрузки следующих схваток', error);
      message.error('Не удалось загрузить следующие схватки');
    } finally {
      setLoadingNextMatches(false);
    }
  };

  // Управление таймером
  useEffect(() => {
    if (timerRunning && withTimer && kioskLaunched) {
      const interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev > 0) {
            // Отправляем обновление в киоск
            sendToKiosk('TIMER_UPDATE', { minutes: timerMinutes, seconds: prev - 1 });
            return prev - 1;
          } else if (timerMinutes > 0) {
            setTimerMinutes(m => {
              const newMinutes = m - 1;
              sendToKiosk('TIMER_UPDATE', { minutes: newMinutes, seconds: 59 });
              return newMinutes;
            });
            return 59;
          } else {
            setTimerRunning(false);
            message.info('Время истекло!');
            sendToKiosk('TIMER_UPDATE', { minutes: 0, seconds: 0 });
            return 0;
          }
        });
      }, 1000);
      setTimerInterval(interval);
      return () => clearInterval(interval);
    } else if (timerInterval) {
      clearInterval(timerInterval);
    }
  }, [timerRunning, timerMinutes, withTimer, kioskLaunched]);

  // Функция отправки сообщений в киоск
  const sendToKiosk = (type: string, data: any) => {
    if (kioskWindow && !kioskWindow.closed) {
      kioskWindow.postMessage({
        type,
        ...data
      }, window.location.origin);
    }
  };

  const sendScoreUpdate = (score1: number, score2: number) => {
    if (kioskWindow && !kioskWindow.closed) {
      const isTeamMatch = !!(selectedMatch?.team1 || selectedMatch?.team2);
      sendToKiosk('SCORE_UPDATE', {
        athlete1Score: !isTeamMatch ? score1 : undefined,
        athlete2Score: !isTeamMatch ? score2 : undefined,
        team1Score: isTeamMatch ? score1 : undefined,
        team2Score: isTeamMatch ? score2 : undefined,
      });
    }
  };

  const loadCompetitions = async () => {
    try {
      const response = await apiClient.get('/competitions/judge/my');
      setCompetitions(response.data.data.competitions);
    } catch (error) {
      console.error('Ошибка загрузки соревнований', error);
    }
  };

  const loadBrackets = async () => {
    if (!selectedCompetition) return;
    try {
      const response = await apiClient.get(`/brackets/competition/${selectedCompetition.id}`);
      const updatedBrackets = response.data.data;
      setBrackets(updatedBrackets);
      
      // Обновляем selectedBracket, если он был выбран
      if (selectedBracket) {
        const updatedBracket = updatedBrackets.find((b: any) => b.id === selectedBracket.id);
        if (updatedBracket) {
          setSelectedBracket(updatedBracket);
        }
      }
      
      return updatedBrackets;
    } catch (error) {
      console.error('Ошибка загрузки турнирных сеток', error);
      return null;
    }
  };

  // Функции управления киоском
  const openKioskWindow = (mode: 'welcome' | 'scoreboard' | 'next-matches') => {
    if (!selectedCompetition) {
      message.warning('Выберите соревнование');
      return;
    }

    if (mode === 'scoreboard' && !selectedMatch) {
      message.warning('Выберите схватку для отображения табло');
      return;
    }

    if (mode === 'next-matches' && !selectedNextMatch) {
      message.warning('Выберите следующую схватку');
      return;
    }

    setDisplayMode(mode);

    const kioskUrl = `/kiosk-display?competitionId=${selectedCompetition.id}&mode=${mode}${selectedMatch && mode === 'scoreboard' ? `&matchId=${selectedMatch.id}` : ''}${mode === 'next-matches' && selectedNextMatch ? `&matchId=${selectedNextMatch}` : ''}&timer=${withTimer}`;
    
    // Если окно уже открыто, обновляем его
    if (kioskWindow && !kioskWindow.closed) {
      kioskWindow.location.href = kioskUrl;
      kioskWindow.focus();
      message.success(`Режим киоска изменен на: ${getModeName(mode)}`);
    } else {
      // Открываем новое окно
      const newWindow = window.open(
        kioskUrl,
        'KioskDisplay',
        'width=1920,height=1080,fullscreen=yes,location=no,menubar=no,status=no,toolbar=no'
      );

      if (newWindow) {
        setKioskWindow(newWindow);
        setKioskLaunched(true);
        // Инициализируем счет из текущего матча (используем pendingResult, если есть)
        const score = (selectedMatch as any)?.metadata?.pendingResult?.score || selectedMatch?.score;
        const isTeamMatch = !!(selectedMatch?.team1 || selectedMatch?.team2);
        if (score) {
          if (isTeamMatch) {
            setAthlete1Score(score.team1 || 0);
            setAthlete2Score(score.team2 || 0);
          } else {
            setAthlete1Score(score.athlete1 || 0);
            setAthlete2Score(score.athlete2 || 0);
          }
        } else {
          setAthlete1Score(0);
          setAthlete2Score(0);
        }
        message.success('Киоск запущен в новом окне');
        
        // Следим за закрытием окна
        const checkWindow = setInterval(() => {
          if (newWindow.closed) {
            setKioskWindow(null);
            setKioskLaunched(false);
            clearInterval(checkWindow);
          }
        }, 1000);
      } else {
        message.error('Не удалось открыть новое окно. Проверьте настройки браузера.');
      }
    }
  };

  const getModeName = (mode: string) => {
    switch (mode) {
      case 'welcome': return 'Вступительное окно';
      case 'scoreboard': return 'Табло со счетом';
      case 'next-matches': return 'Следующая схватка';
      default: return mode;
    }
  };

  const getMatchDisplayName = (match: Match) => {
    const isTeamMatch = !!(match.team1 || match.team2);
    const participant1 = isTeamMatch ? match.team1 : match.athlete1;
    const participant2 = isTeamMatch ? match.team2 : match.athlete2;
    
    const name1 = isTeamMatch
      ? (participant1?.name || 'TBD')
      : (participant1 ? `${participant1.user.profile.firstName} ${participant1.user.profile.lastName}` : 'TBD');
    
    const name2 = isTeamMatch
      ? (participant2?.name || 'TBD')
      : (participant2 ? `${participant2.user.profile.firstName} ${participant2.user.profile.lastName}` : 'TBD');
    
    const weightCategory = match.bracket?.weightCategory?.name ? ` (${match.bracket.weightCategory.name})` : '';
    
    return `${name1} vs ${name2}${weightCategory}`;
  };

  const updateScore = (score1: number, score2: number) => {
    setAthlete1Score(score1);
    setAthlete2Score(score2);
    sendScoreUpdate(score1, score2);
  };

  const handleFinishMatch = async (values: any) => {
    if (!selectedMatch || !selectedBracket) return;

    try {
      const isTeamMatch = !!(selectedMatch.team1 || selectedMatch.team2);
      const data: any = {
        score: {
          method: values.method || 'POINTS',
        },
        status: 'COMPLETED',
      };

      if (isTeamMatch) {
        data.winnerTeamId = values.winnerId || values.winnerTeamId;
        data.score.team1 = athlete1Score;
        data.score.team2 = athlete2Score;
      } else {
        data.winnerId = values.winnerId || values.winnerTeamId;
        data.score.athlete1 = athlete1Score;
        data.score.athlete2 = athlete2Score;
      }

      await apiClient.put(
        `/brackets/${selectedBracket.id}/matches/${selectedMatch.id}/result`,
        data
      );

      message.success('Результат матча сохранен');
      
      // Обновляем данные матча, чтобы отобразить победителя в киоске
      const updatedBrackets = await loadBrackets();
      
      // Обновляем selectedMatch с новыми данными (включая winnerId)
      if (updatedBrackets && selectedBracket) {
        const updatedBracket = updatedBrackets.find((b: any) => b.id === selectedBracket.id);
        if (updatedBracket) {
          const updatedMatch = updatedBracket.matches.find((m: any) => m.id === selectedMatch.id);
          if (updatedMatch) {
            setSelectedMatch(updatedMatch);
          }
        }
      }
      
      // НЕ закрываем киоск - победитель должен отображаться на экране
      // Окно киоска остается открытым для показа результата
      // WebSocket событие match:updated автоматически обновит данные в окне киоска
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при сохранении результата');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      SCHEDULED: 'blue',
      IN_PROGRESS: 'orange',
      COMPLETED: 'green',
      CANCELLED: 'red',
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      SCHEDULED: 'Запланирован',
      IN_PROGRESS: 'В процессе',
      COMPLETED: 'Завершен',
      CANCELLED: 'Отменен',
    };
    return texts[status] || status;
  };

  const matchColumns = [
    {
      title: 'Раунд',
      dataIndex: 'round',
      key: 'round',
      render: (round: number) => `Раунд ${round}`,
    },
    {
      title: (record: Match) => {
        const isTeamMatch = !!(record.team1 || record.team2);
        return isTeamMatch ? 'Команда 1' : 'Спортсмен 1';
      },
      key: 'participant1',
      render: (_: any, record: Match) => {
        if (record.team1) {
          return record.team1.name;
        }
        if (record.athlete1) {
          return `${record.athlete1.user.profile.firstName} ${record.athlete1.user.profile.lastName}`;
        }
        return 'BYE';
      },
    },
    {
      title: (record: Match) => {
        const isTeamMatch = !!(record.team1 || record.team2);
        return isTeamMatch ? 'Команда 2' : 'Спортсмен 2';
      },
      key: 'participant2',
      render: (_: any, record: Match) => {
        if (record.team2) {
          return record.team2.name;
        }
        if (record.athlete2) {
          return `${record.athlete2.user.profile.firstName} ${record.athlete2.user.profile.lastName}`;
        }
        return 'BYE';
      },
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Match) => (
        <Button
          type="primary"
          onClick={() => {
            setSelectedMatch(record);
            setMatchSelectorVisible(false);
          }}
        >
          Выбрать
        </Button>
      ),
    },
  ];

  // Рендер интерфейса управления
  const renderControlInterface = () => {
    if (!kioskLaunched || !selectedMatch) return null;

    return (
      <>
        <Card title="Управление текущей схваткой">
          <div style={{ marginBottom: 24, padding: 16, background: '#f0f2f5', borderRadius: 8 }}>
            <h3>Схватка: Раунд {selectedMatch.round}, Позиция {selectedMatch.position}</h3>
            <p style={{ marginBottom: 0 }}>
              {(() => {
                const isTeamMatch = !!(selectedMatch.team1 || selectedMatch.team2);
                const participant1Name = isTeamMatch
                  ? selectedMatch.team1?.name || 'TBD'
                  : selectedMatch.athlete1
                    ? `${selectedMatch.athlete1.user.profile.firstName} ${selectedMatch.athlete1.user.profile.lastName}`
                    : 'TBD';
                const participant2Name = isTeamMatch
                  ? selectedMatch.team2?.name || 'TBD'
                  : selectedMatch.athlete2
                    ? `${selectedMatch.athlete2.user.profile.firstName} ${selectedMatch.athlete2.user.profile.lastName}`
                    : 'TBD';
                return (
                  <>
                    <strong>{participant1Name}</strong>
                    {' VS '}
                    <strong>{participant2Name}</strong>
                  </>
                );
              })()}
            </p>
          </div>

          {/* Управление счетом */}
          <Card title="Управление счетом" style={{ marginBottom: 24 }}>
            <Space size="large" style={{ width: '100%', justifyContent: 'space-around' }}>
              {(() => {
                const isTeamMatch = !!(selectedMatch.team1 || selectedMatch.team2);
                const participant1Name = isTeamMatch
                  ? selectedMatch.team1?.name || 'TBD'
                  : selectedMatch.athlete1
                    ? `${selectedMatch.athlete1.user.profile.firstName} ${selectedMatch.athlete1.user.profile.lastName}`
                    : 'TBD';
                const participant2Name = isTeamMatch
                  ? selectedMatch.team2?.name || 'TBD'
                  : selectedMatch.athlete2
                    ? `${selectedMatch.athlete2.user.profile.firstName} ${selectedMatch.athlete2.user.profile.lastName}`
                    : 'TBD';
                return (
                  <>
                    <div style={{ textAlign: 'center' }}>
                      <h3>{participant1Name}</h3>
                      <Space>
                        <Button size="large" onClick={() => updateScore(Math.max(0, athlete1Score - 1), athlete2Score)}>-</Button>
                        <InputNumber
                          size="large"
                          value={athlete1Score}
                          onChange={(val) => updateScore(val || 0, athlete2Score)}
                          style={{ width: 80, fontSize: 24, textAlign: 'center' }}
                        />
                        <Button size="large" type="primary" onClick={() => updateScore(athlete1Score + 1, athlete2Score)}>+</Button>
                      </Space>
                    </div>

                    <div style={{ fontSize: 32, fontWeight: 'bold' }}>VS</div>

                    <div style={{ textAlign: 'center' }}>
                      <h3>{participant2Name}</h3>
                      <Space>
                        <Button size="large" onClick={() => updateScore(athlete1Score, Math.max(0, athlete2Score - 1))}>-</Button>
                        <InputNumber
                          size="large"
                          value={athlete2Score}
                          onChange={(val) => updateScore(athlete1Score, val || 0)}
                          style={{ width: 80, fontSize: 24, textAlign: 'center' }}
                        />
                        <Button size="large" type="primary" onClick={() => updateScore(athlete1Score, athlete2Score + 1)}>+</Button>
                      </Space>
                    </div>
                  </>
                );
              })()}
            </Space>
          </Card>

          {/* Таймер */}
          {withTimer && (
            <Card title={<><ClockCircleOutlined /> Таймер</>} style={{ marginBottom: 24 }}>
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 48, fontWeight: 'bold', fontFamily: 'monospace' }}>
                    {String(timerMinutes).padStart(2, '0')}:{String(timerSeconds).padStart(2, '0')}
                  </div>
                </div>
                
                <Space style={{ width: '100%', justifyContent: 'center' }}>
                  {!timerRunning ? (
                    <Button 
                      type="primary" 
                      size="large" 
                      icon={<PlayCircleOutlined />}
                      onClick={() => setTimerRunning(true)}
                    >
                      Старт
                    </Button>
                  ) : (
                    <Button 
                      size="large" 
                      icon={<PauseCircleOutlined />}
                      onClick={() => setTimerRunning(false)}
                    >
                      Пауза
                    </Button>
                  )}
                  
                  <Button 
                    size="large" 
                    icon={<RedoOutlined />}
                    onClick={() => {
                      setTimerRunning(false);
                      setTimerMinutes(3);
                      setTimerSeconds(0);
                      sendToKiosk('TIMER_UPDATE', { minutes: 3, seconds: 0 });
                    }}
                  >
                    Сброс
                  </Button>
                </Space>

                <div>
                  <label style={{ marginRight: 8 }}>Установить время:</label>
                  <Space>
                    <InputNumber
                      min={0}
                      max={99}
                      value={timerMinutes}
                      onChange={(val) => {
                        setTimerMinutes(val || 0);
                        sendToKiosk('TIMER_UPDATE', { minutes: val || 0, seconds: timerSeconds });
                      }}
                      disabled={timerRunning}
                      addonAfter="мин"
                    />
                    <InputNumber
                      min={0}
                      max={59}
                      value={timerSeconds}
                      onChange={(val) => {
                        setTimerSeconds(val || 0);
                        sendToKiosk('TIMER_UPDATE', { minutes: timerMinutes, seconds: val || 0 });
                      }}
                      disabled={timerRunning}
                      addonAfter="сек"
                    />
                  </Space>
                </div>
              </Space>
            </Card>
          )}

          {/* Завершение схватки */}
          <Card title="Завершение схватки">
            <Form form={form} layout="vertical" onFinish={handleFinishMatch}>
              <Form.Item
                name={(() => {
                  const isTeamMatch = !!(selectedMatch.team1 || selectedMatch.team2);
                  return isTeamMatch ? "winnerTeamId" : "winnerId";
                })()}
                label="Победитель"
                rules={[{ required: true, message: 'Выберите победителя' }]}
              >
                <Radio.Group style={{ width: '100%' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {(() => {
                      const isTeamMatch = !!(selectedMatch.team1 || selectedMatch.team2);
                      if (isTeamMatch) {
                        return (
                          <>
                            {selectedMatch.team1 && (
                              <Radio value={selectedMatch.team1.id} style={{ fontSize: 16, padding: 12, border: '1px solid #d9d9d9', borderRadius: 4, width: '100%' }}>
                              <TrophyOutlined /> Победа: {selectedMatch.team1.name}
                            </Radio>
                            )}
                            {selectedMatch.team2 && (
                              <Radio value={selectedMatch.team2.id} style={{ fontSize: 16, padding: 12, border: '1px solid #d9d9d9', borderRadius: 4, width: '100%' }}>
                              <TrophyOutlined /> Победа: {selectedMatch.team2.name}
                            </Radio>
                            )}
                          </>
                        );
                      } else {
                        return (
                          <>
                            {selectedMatch.athlete1 && (
                              <Radio value={selectedMatch.athlete1.id} style={{ fontSize: 16, padding: 12, border: '1px solid #d9d9d9', borderRadius: 4, width: '100%' }}>
                                <TrophyOutlined /> Победа: {selectedMatch.athlete1.user.profile.firstName} {selectedMatch.athlete1.user.profile.lastName}
                              </Radio>
                            )}
                            {selectedMatch.athlete2 && (
                              <Radio value={selectedMatch.athlete2.id} style={{ fontSize: 16, padding: 12, border: '1px solid #d9d9d9', borderRadius: 4, width: '100%' }}>
                                <TrophyOutlined /> Победа: {selectedMatch.athlete2.user.profile.firstName} {selectedMatch.athlete2.user.profile.lastName}
                              </Radio>
                            )}
                          </>
                        );
                      }
                    })()}
                  </Space>
                </Radio.Group>
              </Form.Item>

              <Form.Item
                name="method"
                label="Способ победы"
                rules={[{ required: true, message: 'Выберите способ победы' }]}
              >
                <Radio.Group>
                  <Space direction="vertical">
                    <Radio value="POINTS">По очкам</Radio>
                    <Radio value="KNOCKOUT">Нокаут</Radio>
                    <Radio value="TECHNICAL">Техническая победа</Radio>
                    <Radio value="DISQUALIFICATION">Дисквалификация соперника</Radio>
                    <Radio value="WALKOVER">Неявка соперника</Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>

              <Divider />

              <Space>
                <Button 
                  type="primary" 
                  size="large" 
                  htmlType="submit"
                  icon={<TrophyOutlined />}
                >
                  Сохранить результат и завершить
                </Button>
                <Button 
                  size="large" 
                  onClick={() => {
                    if (kioskWindow && !kioskWindow.closed) {
                      kioskWindow.close();
                    }
                    setKioskLaunched(false);
                    setKioskWindow(null);
                    setTimerRunning(false);
                  }}
                >
                  Отмена
                </Button>
              </Space>
            </Form>
          </Card>
        </Card>
      </>
    );
  };

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, marginBottom: 16, color: '#262626' }}>
            <EyeOutlined style={{ marginRight: 10 }} />
            Режим киоска
            {kioskWindow && !kioskWindow.closed && (
              <Tag color="green" style={{ marginLeft: 10 }}>
                ● Киоск открыт
              </Tag>
            )}
          </h1>
          <p style={{ color: '#8c8c8c', marginBottom: 24 }}>
            Выберите соревнование, настройте отображение и запустите киоск в новом окне.
            Управляйте счетом и таймером здесь, отображение будет на отдельном экране.
          </p>

          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Выбор соревнования */}
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                1. Выберите соревнование
              </label>
              <Select
                placeholder="Выберите соревнование"
                style={{ width: '100%', maxWidth: 500 }}
                onChange={(value) => {
                  const comp = competitions.find(c => c.id === value);
                  setSelectedCompetition(comp || null);
                  setSelectedBracket(null);
                  setSelectedMatch(null);
                }}
                value={selectedCompetition?.id}
                size="large"
              >
                {competitions.map((comp) => (
                  <Select.Option key={comp.id} value={comp.id}>
                    {comp.name}
                  </Select.Option>
                ))}
              </Select>
            </div>

            {/* Выбор весовой категории или сетки */}
            {selectedCompetition && (
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  2. Выберите {brackets.length > 0 && brackets[0].weightCategory ? 'весовую категорию' : 'сетку'}
                </label>
                <Select
                  placeholder={brackets.length > 0 && brackets[0].weightCategory ? "Выберите весовую категорию" : "Выберите сетку"}
                  style={{ width: '100%', maxWidth: 500 }}
                  onChange={(value) => {
                    const bracket = brackets.find(b => b.id === value);
                    setSelectedBracket(bracket || null);
                    setSelectedMatch(null);
                  }}
                  value={selectedBracket?.id}
                  size="large"
                >
                  {brackets.map((bracket) => (
                    <Select.Option key={bracket.id} value={bracket.id}>
                      {bracket.weightCategory?.name || 'Командное соревнование'}
                    </Select.Option>
                  ))}
                </Select>
              </div>
            )}

            {/* Выбор режима отображения */}
            {selectedCompetition && (
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  3. Выберите режим отображения
                </label>
                <div style={{ marginBottom: 16 }}>
                  <Space wrap>
                    <Button
                      type={displayMode === 'welcome' ? 'primary' : 'default'}
                      icon={<TrophyOutlined />}
                      onClick={() => setDisplayMode('welcome')}
                    >
                      Вступительное окно
                    </Button>
                    <Button
                      type={displayMode === 'scoreboard' ? 'primary' : 'default'}
                      icon={<TeamOutlined />}
                      onClick={() => setDisplayMode('scoreboard')}
                    >
                      Табло со счетом
                    </Button>
                    <Button
                      type={displayMode === 'next-matches' ? 'primary' : 'default'}
                      icon={<PlayCircleOutlined />}
                      onClick={() => {
                        setDisplayMode('next-matches');
                        loadNextMatches();
                      }}
                    >
                      Следующая схватка
                    </Button>
                  </Space>
                </div>
              </div>
            )}

            {/* Настройки в зависимости от выбранного режима */}
            {selectedBracket && (
              <>
                {/* Настройки для режима scoreboard */}
                {displayMode === 'scoreboard' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                      4. Выберите схватку
                    </label>
                    <Space>
                      <Button
                        onClick={() => setMatchSelectorVisible(true)}
                        size="large"
                      >
                        {selectedMatch 
                          ? `Схватка: Раунд ${selectedMatch.round}, Позиция ${selectedMatch.position}`
                          : 'Выбрать схватку'}
                      </Button>
                      {selectedMatch && (
                        <Tag color="green">Схватка выбрана</Tag>
                      )}
                    </Space>
                  </div>
                )}

                {/* Настройки для режима next-matches */}
                {displayMode === 'next-matches' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                      4. Выберите следующую схватку
                    </label>
                    <Select
                      style={{ width: '100%', maxWidth: 500, marginBottom: 16 }}
                      value={selectedNextMatch}
                      onChange={setSelectedNextMatch}
                      loading={loadingNextMatches}
                      placeholder="Выберите схватку"
                      onDropdownVisibleChange={(open) => {
                        if (open && selectedCompetition) {
                          loadNextMatches();
                        }
                      }}
                    >
                      {nextMatches.map(match => (
                        <Select.Option key={match.id} value={match.id}>
                          {getMatchDisplayName(match)} - {match.status === 'IN_PROGRESS' ? 'В процессе' : 'Запланировано'}
                        </Select.Option>
                      ))}
                    </Select>
                  </div>
                )}

                {/* Общие настройки */}
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                    5. Настройки
                  </label>
                  <Checkbox 
                    checked={withTimer} 
                    onChange={(e) => setWithTimer(e.target.checked)}
                    disabled={displayMode !== 'scoreboard'}
                  >
                    <ClockCircleOutlined /> Включить таймер (только для табло)
                  </Checkbox>
                </div>

                {/* Кнопка запуска/обновления киоска */}
                {selectedCompetition && (displayMode !== 'scoreboard' || selectedMatch) && (
                  <div style={{ 
                    padding: 20, 
                    background: '#f0f2f5', 
                    borderRadius: 8,
                    border: '2px dashed #d9d9d9',
                    marginTop: 16
                  }}>
                    <h3 style={{ marginBottom: 16 }}>Готово к запуску!</h3>
                    <p style={{ marginBottom: 16, color: '#595959' }}>
                      {displayMode === 'welcome' && 'Вступительное окно готово к отображению.'}
                      {displayMode === 'scoreboard' && 'Схватка выбрана. Нажмите кнопку ниже, чтобы открыть киоск в новом окне.'}
                      {displayMode === 'next-matches' && 'Табло следующих схваток готово к отображению.'}
                      {withTimer && displayMode === 'scoreboard' && ' Таймер будет отображаться на экране киоска.'}
                    </p>
                    <Space>
                      <Button
                        type="primary"
                        size="large"
                        icon={<RocketOutlined />}
                        onClick={() => openKioskWindow(displayMode)}
                        style={{ 
                          height: 50,
                          fontSize: 16,
                          fontWeight: 600,
                        }}
                      >
                        {kioskWindow && !kioskWindow.closed ? 'Обновить киоск' : 'Запустить киоск'}
                      </Button>
                      {kioskWindow && !kioskWindow.closed && (
                        <Button
                          danger
                          size="large"
                          onClick={() => {
                            kioskWindow.close();
                            setKioskWindow(null);
                            setKioskLaunched(false);
                            message.info('Окно киоска закрыто');
                          }}
                        >
                          Закрыть киоск
                        </Button>
                      )}
                    </Space>
                  </div>
                )}
              </>
            )}
          </Space>
        </div>
      </Card>

      {/* Интерфейс управления после запуска киоска */}
      {kioskLaunched && renderControlInterface()}

      {!selectedCompetition && (
        <Card style={{ textAlign: 'center', padding: '48px', marginTop: 24 }}>
          <TrophyOutlined style={{ fontSize: '64px', color: '#d9d9d9', marginBottom: 16 }} />
          <p style={{ fontSize: '18px', color: '#8c8c8c' }}>
            Выберите соревнование для начала работы
          </p>
        </Card>
      )}

      {/* Модальное окно выбора схватки */}
      <Modal
        title={`Выберите схватку - ${selectedBracket?.weightCategory?.name || 'Командное соревнование'}`}
        open={matchSelectorVisible}
        onCancel={() => setMatchSelectorVisible(false)}
        footer={null}
        width={900}
      >
        <Table
          columns={matchColumns}
          dataSource={selectedBracket?.matches || []}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Modal>
    </div>
  );
};