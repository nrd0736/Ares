/**
 * Страница календаря выступлений (тренер)
 * 
 * Функциональность:
 * - Календарь соревнований команды
 * - Расписание матчей спортсменов
 * - Фильтрация по соревнованиям
 */

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Card, List, Tag, Space, Select } from 'antd';
import { TrophyOutlined, CalendarOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import dayjs, { Dayjs } from 'dayjs';
import type { CalendarMode } from 'antd/es/calendar/generateCalendar';

interface Competition {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface WeightCategory {
  id: string;
  name: string;
  minWeight?: number;
  maxWeight?: number;
}

interface Match {
  id: string;
  round: number;
  position: number;
  scheduledTime?: string;
  status: string;
  bracket: {
    id: string;
    weightCategory?: WeightCategory | null;
    competition: {
      id: string;
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
}

interface TeamAthlete {
  id: string;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  competition: {
    id: string;
    name: string;
  };
}

const getRoundLabel = (round: number, totalRounds: number): string => {
  if (round === totalRounds) {
    return 'Финал';
  }
  if (round === totalRounds - 1) {
    return '1/2';
  }
  if (round === totalRounds - 2) {
    return '1/4';
  }
  if (round === totalRounds - 3) {
    return '1/8';
  }
  if (round === totalRounds - 4) {
    return '1/16';
  }
  if (round === totalRounds - 5) {
    return '1/32';
  }
  const roundsToFinal = totalRounds - round;
  const participantsInRound = Math.pow(2, roundsToFinal);
  return `1/${participantsInRound}`;
};

export const CompetitionCalendar = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [teamAthletes, setTeamAthletes] = useState<TeamAthlete[]>([]);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [mode, setMode] = useState<CalendarMode>('month');
  const [loading, setLoading] = useState(false);

  const loadCompetitions = async () => {
    try {
      // Загружаем только соревнования, где участвуют спортсмены команды тренера
      const response = await apiClient.get('/competitions/coach/my');
      setCompetitions(response.data.data.competitions || []);
    } catch (error) {
      console.error('Ошибка загрузки соревнований', error);
    }
  };

  const loadTeamAthletes = async () => {
    try {
      // Получаем информацию о команде тренера
      const response = await apiClient.get('/teams/my');
      const team = response.data.data;
      setTeamAthletes(team.athletes || []);
    } catch (error) {
      console.error('Ошибка загрузки спортсменов команды', error);
      setTeamAthletes([]);
    }
  };

  const loadMatches = useCallback(async () => {
    if (!selectedCompetition || teamAthletes.length === 0) return;
    setLoading(true);
    try {
      // Загружаем все сетки соревнования (матчи уже включены в ответ)
      const bracketsResponse = await apiClient.get(`/brackets/competition/${selectedCompetition}`);
      const brackets = Array.isArray(bracketsResponse.data.data) 
        ? bracketsResponse.data.data 
        : bracketsResponse.data.data?.brackets || [];
      
      // Получаем ID спортсменов команды
      const athleteIds = teamAthletes.map((a: any) => a.id);
      
      // Получаем информацию о команде тренера
      const teamResponse = await apiClient.get('/teams/my');
      const team = teamResponse.data.data;
      const teamId = team?.id;
      
      // Извлекаем все матчи из всех сеток и фильтруем по спортсменам команды или команде
      const allMatches: Match[] = [];
      for (const bracket of brackets) {
        const bracketMatches = bracket.matches || [];
        
        // Фильтруем матчи:
        // - Для индивидуальных соревнований: где участвуют спортсмены команды
        // - Для командных соревнований: где участвует команда
        const teamMatches = bracketMatches.filter((match: any) => {
          // Командный матч
          if (match.team1 || match.team2) {
            return (match.team1?.id === teamId) || (match.team2?.id === teamId);
          }
          // Индивидуальный матч
          return (match.athlete1?.id && athleteIds.includes(match.athlete1.id)) ||
                 (match.athlete2?.id && athleteIds.includes(match.athlete2.id));
        });
        
        // Добавляем информацию о bracket к каждому матчу
        const matchesWithBracket = teamMatches.map((match: any) => {
          return {
            ...match,
            scheduledTime: match.scheduledTime || null,
            bracket: match.bracket || {
              id: bracket.id,
              weightCategory: bracket.weightCategory || null,
              competition: {
                id: selectedCompetition,
                name: competitions.find(c => c.id === selectedCompetition)?.name || '',
              },
            },
          };
        });
        allMatches.push(...matchesWithBracket);
      }
      
      // Фильтруем только незавершенные матчи (SCHEDULED или IN_PROGRESS)
      const filteredMatches = allMatches.filter(m => 
        m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS'
      );
      
      setMatches(filteredMatches);
    } catch (error: any) {
      console.error('Ошибка загрузки матчей', error);
      if (error.response?.status !== 404) {
        // Игнорируем 404 ошибки
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCompetition, teamAthletes, competitions]);

  useEffect(() => {
    loadCompetitions();
    loadTeamAthletes();
  }, []);

  const loadEvents = useCallback(async () => {
    if (!selectedCompetition) return;
    try {
      const response = await apiClient.get(`/competitions/${selectedCompetition}/events`);
      setEvents(response.data.data || []);
    } catch (error) {
      console.error('Ошибка загрузки мероприятий', error);
    }
  }, [selectedCompetition]);

  useEffect(() => {
    if (selectedCompetition && teamAthletes.length > 0) {
      loadMatches();
      loadEvents();
    }
  }, [selectedCompetition, teamAthletes, loadMatches, loadEvents]);

  // Слушаем события обновления матчей из турнирных сеток
  useEffect(() => {
    const handleBracketMatchUpdated = () => {
      if (selectedCompetition && teamAthletes.length > 0) {
        try {
          loadMatches();
        } catch (error) {
          // Игнорируем ошибки при обновлении
        }
      }
    };

    window.addEventListener('bracket-match-updated', handleBracketMatchUpdated);
    return () => {
      window.removeEventListener('bracket-match-updated', handleBracketMatchUpdated);
    };
  }, [selectedCompetition, teamAthletes, loadMatches]);

  const getMatchesForDate = (date: Dayjs) => {
    const filtered = matches.filter((match) => {
      // Исключаем завершенные матчи из календаря
      if (match.status === 'COMPLETED') return false;
      // Исключаем отмененные матчи
      if (match.status === 'CANCELLED') return false;
      if (!match.scheduledTime) return false;
      const matchDate = dayjs(match.scheduledTime);
      const isSameDay = matchDate.isSame(date, 'day');
      return isSameDay;
    });
    return filtered;
  };

  const getEventsForDate = (date: Dayjs) => {
    return events.filter((event) => {
      const eventDate = dayjs(event.startTime);
      return eventDate.isSame(date, 'day');
    });
  };

  const getTotalRounds = (): number => {
    if (matches.length === 0) return 0;
    return Math.max(...matches.map(m => m.round));
  };

  const cellRender = (value: Dayjs, info: any) => {
    if (info.type === 'date') {
      return dateCellContent(value);
    }
    return null;
  };

  const dateCellContent = (value: Dayjs) => {
    const matchesForDate = getMatchesForDate(value);
    const eventsForDate = getEventsForDate(value);
    return (
      <div>
        {matchesForDate.map((match) => {
          const totalRounds = getTotalRounds();
          const roundLabel = getRoundLabel(match.round, totalRounds);
          const scheduledTime = match.scheduledTime ? dayjs(match.scheduledTime) : null;
          return (
            <div
              key={`match-${match.id}`}
              style={{
                fontSize: '11px',
                padding: '2px 4px',
                margin: '2px 0',
                background: '#1890ff',
                color: '#fff',
                borderRadius: 2,
                cursor: 'pointer',
              }}
              title={`${roundLabel}${match.bracket.weightCategory ? ` - ${match.bracket.weightCategory.name}` : ''}${scheduledTime ? ` (${scheduledTime.format('HH:mm')})` : ''}`}
            >
              {roundLabel}{match.bracket.weightCategory ? ` - ${match.bracket.weightCategory.name}` : ''}
              {scheduledTime && <span style={{ marginLeft: 4 }}>{scheduledTime.format('HH:mm')}</span>}
            </div>
          );
        })}
        {eventsForDate.map((event) => {
          const eventTime = dayjs(event.startTime);
          return (
            <div
              key={`event-${event.id}`}
              style={{
                fontSize: '11px',
                padding: '2px 4px',
                margin: '2px 0',
                background: '#52c41a',
                color: '#fff',
                borderRadius: 2,
              }}
              title={`${event.title}${eventTime ? ` (${eventTime.format('HH:mm')})` : ''}`}
            >
              📅 {event.title}
              {eventTime && <span style={{ marginLeft: 4 }}>{eventTime.format('HH:mm')}</span>}
            </div>
          );
        })}
      </div>
    );
  };

  const selectedDateMatches = getMatchesForDate(selectedDate);
  const selectedDateEvents = getEventsForDate(selectedDate);

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#262626' }}>Календарь выступлений</h1>
        <Select
          placeholder="Выберите соревнование"
          style={{ width: 300 }}
          value={selectedCompetition}
          onChange={(value) => setSelectedCompetition(value)}
          showSearch
          filterOption={(input, option) =>
            (option?.label as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
          }
        >
          {competitions.map((comp) => (
            <Select.Option key={comp.id} value={comp.id} label={comp.name}>
              {comp.name} ({new Date(comp.startDate).toLocaleDateString('ru-RU')})
            </Select.Option>
          ))}
        </Select>
      </div>

      {selectedCompetition ? (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Card>
            <Calendar
              mode={mode}
              onPanelChange={(value, mode) => {
                setMode(mode);
              }}
              onSelect={(date) => setSelectedDate(date)}
              cellRender={cellRender}
            />
          </Card>

          <Card title={`События на ${selectedDate.format('DD.MM.YYYY')}`}>
            {(selectedDateMatches.length > 0 || selectedDateEvents.length > 0) ? (
              <>
                {selectedDateMatches.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <h4 style={{ marginBottom: 8 }}>Схватки</h4>
                    <List
                      loading={loading}
                      dataSource={selectedDateMatches}
                      renderItem={(match) => {
                  const totalRounds = getTotalRounds();
                  const roundLabel = getRoundLabel(match.round, totalRounds);
                  const scheduledTime = match.scheduledTime ? dayjs(match.scheduledTime) : null;
                  
                  return (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<TrophyOutlined style={{ fontSize: 24 }} />}
                        title={
                          <Space>
                            <Tag color="blue">{roundLabel}</Tag>
                            {match.bracket.weightCategory && <span>{match.bracket.weightCategory.name}</span>}
                          </Space>
                        }
                        description={
                          <Space direction="vertical" size="small">
                            {scheduledTime && (
                              <div>
                                <strong>Время:</strong> {scheduledTime.format('HH:mm')}
                              </div>
                            )}
                            <div>
                              <strong>Соревнование:</strong> {match.bracket.competition.name}
                            </div>
                            {/* Командный матч */}
                            {(match.team1 || match.team2) && (
                              <div>
                                <strong>Команды:</strong>{' '}
                                {match.team1 ? match.team1.name : 'TBD'}{' '}
                                vs{' '}
                                {match.team2 ? match.team2.name : 'TBD'}
                              </div>
                            )}
                            {/* Индивидуальный матч */}
                            {!match.team1 && !match.team2 && (match.athlete1 || match.athlete2) && (
                              <div>
                                <strong>Участники:</strong>{' '}
                                {match.athlete1
                                  ? `${match.athlete1.user.profile.lastName} ${match.athlete1.user.profile.firstName}`
                                  : 'TBD'}{' '}
                                vs{' '}
                                {match.athlete2
                                  ? `${match.athlete2.user.profile.lastName} ${match.athlete2.user.profile.firstName}`
                                  : 'TBD'}
                              </div>
                            )}
                          </Space>
                        }
                      />
                    </List.Item>
                  );
                }}
                    />
                  </div>
                )}
                {selectedDateEvents.length > 0 && (
                  <div>
                    <h4 style={{ marginBottom: 8 }}>Мероприятия</h4>
                    <List
                      dataSource={selectedDateEvents}
                      renderItem={(event) => {
                        const eventStartTime = dayjs(event.startTime);
                        const eventEndTime = event.endTime ? dayjs(event.endTime) : null;
                        
                        return (
                          <List.Item>
                            <List.Item.Meta
                              avatar={<CalendarOutlined style={{ fontSize: 24, color: '#52c41a' }} />}
                              title={
                                <Space>
                                  <span style={{ fontWeight: 'bold' }}>{event.title}</span>
                                  <Tag color="green">Мероприятие</Tag>
                                </Space>
                              }
                              description={
                                <Space direction="vertical" size="small">
                                  {eventStartTime && (
                                    <div>
                                      <strong>Время:</strong>{' '}
                                      {eventStartTime.format('HH:mm')}
                                      {eventEndTime && ` - ${eventEndTime.format('HH:mm')}`}
                                    </div>
                                  )}
                                  {event.location && (
                                    <div>
                                      <strong>Место:</strong> {event.location}
                                    </div>
                                  )}
                                  {event.description && (
                                    <div>
                                      <strong>Описание:</strong> {event.description}
                                    </div>
                                  )}
                                </Space>
                              }
                            />
                          </List.Item>
                        );
                      }}
                    />
                  </div>
                )}
              </>
            ) : (
              <p style={{ textAlign: 'center', color: '#8c8c8c', padding: '20px' }}>
                На эту дату нет запланированных событий
              </p>
            )}
          </Card>

          {matches.filter(m => !m.scheduledTime && m.status !== 'COMPLETED' && m.status !== 'CANCELLED').length > 0 && (
            <Card title="Схватки без расписания">
              <List
                loading={loading}
                dataSource={matches.filter(m => !m.scheduledTime && m.status !== 'COMPLETED' && m.status !== 'CANCELLED')}
                renderItem={(match) => {
                  const totalRounds = getTotalRounds();
                  const roundLabel = getRoundLabel(match.round, totalRounds);
                  
                  return (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<TrophyOutlined style={{ fontSize: 24, color: '#d9d9d9' }} />}
                        title={
                          <Space>
                            <Tag color="default">{roundLabel}</Tag>
                            {match.bracket.weightCategory && <span>{match.bracket.weightCategory.name}</span>}
                            {!match.bracket.weightCategory && <span>Командное соревнование</span>}
                          </Space>
                        }
                        description={
                          <Space direction="vertical" size="small">
                            <div>
                              <strong>Соревнование:</strong> {match.bracket.competition.name}
                            </div>
                            {/* Командный матч */}
                            {(match.team1 || match.team2) && (
                              <div>
                                <strong>Команды:</strong>{' '}
                                {match.team1 ? match.team1.name : 'TBD'}{' '}
                                vs{' '}
                                {match.team2 ? match.team2.name : 'TBD'}
                              </div>
                            )}
                            {/* Индивидуальный матч */}
                            {!match.team1 && !match.team2 && (match.athlete1 || match.athlete2) && (
                              <div>
                                <strong>Участники:</strong>{' '}
                                {match.athlete1
                                  ? `${match.athlete1.user.profile.lastName} ${match.athlete1.user.profile.firstName}`
                                  : 'TBD'}{' '}
                                vs{' '}
                                {match.athlete2
                                  ? `${match.athlete2.user.profile.lastName} ${match.athlete2.user.profile.firstName}`
                                  : 'TBD'}
                              </div>
                            )}
                            <Tag color="orange">Расписание не установлено</Tag>
                          </Space>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            </Card>
          )}
        </Space>
      ) : (
        <Card>
          <p>Выберите соревнование для просмотра календаря схваток спортсменов вашей команды</p>
        </Card>
      )}
    </div>
  );
};
