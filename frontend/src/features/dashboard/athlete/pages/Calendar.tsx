/**
 * Страница календаря спортсмена
 * 
 * Функциональность:
 * - Календарь предстоящих соревнований
 * - Расписание матчей
 * - Фильтрация по соревнованиям
 */

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Card, List, Tag, Space, Empty } from 'antd';
import { CalendarOutlined, TrophyOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import dayjs, { Dayjs } from 'dayjs';
import type { CalendarMode } from 'antd/es/calendar/generateCalendar';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store/store';

interface Match {
  id: string;
  round: number;
  position: number;
  scheduledTime?: string;
  status: string;
  bracket: {
    id: string;
    weightCategory?: {
      id: string;
      name: string;
    } | null;
    competition: {
      id: string;
      name: string;
    };
    totalRounds?: number; // Добавляем totalRounds для правильного вычисления меток раундов
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
  const roundsToFinal = totalRounds - round;
  const participantsInRound = Math.pow(2, roundsToFinal);
  return `1/${participantsInRound}`;
};

export const AthleteCalendar = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [matches, setMatches] = useState<Match[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [athleteTeamId, setAthleteTeamId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [mode, setMode] = useState<CalendarMode>('month');
  const [loading, setLoading] = useState(false);

  const loadAthleteInfo = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      const userData = response.data?.data?.user || response.data?.data;
      const athlete = userData?.athlete;
      if (athlete?.id) {
        setAthleteId(athlete.id);
      }
      if (athlete?.teamId || athlete?.team?.id) {
        setAthleteTeamId(athlete.teamId || athlete.team?.id);
      }
    } catch (error) {
      console.error('Ошибка загрузки информации о спортсмене', error);
    }
  };

  const loadMatches = useCallback(async () => {
    if (!athleteId) return;
    setLoading(true);
    try {
      // Получаем соревнования, где участвует спортсмен
      const competitionsResponse = await apiClient.get('/auth/me/competitions');
      const competitions = competitionsResponse.data?.data || [];
      
      // Загружаем все матчи из всех соревнований
      const allMatches: Match[] = [];
      // Сохраняем информацию о totalRounds для каждой сетки
      const bracketTotalRounds: Record<string, number> = {};
      
      for (const compData of competitions) {
        const competitionId = compData.competition?.id;
        const competitionType = compData.competition?.competitionType || 'INDIVIDUAL';
        if (!competitionId) continue;
        
        try {
          const bracketsResponse = await apiClient.get(`/brackets/competition/${competitionId}`);
          const brackets = Array.isArray(bracketsResponse.data.data) 
            ? bracketsResponse.data.data 
            : bracketsResponse.data.data?.brackets || [];
          
          for (const bracket of brackets) {
            const bracketMatches = bracket.matches || [];
            
            // Вычисляем totalRounds для этой сетки на основе ВСЕХ матчей
            if (bracketMatches.length > 0) {
              const maxRound = Math.max(...bracketMatches.map((m: any) => m.round || 0));
              bracketTotalRounds[bracket.id] = maxRound;
            }
            
            // Фильтруем матчи в зависимости от типа соревнования
            const myMatches = bracketMatches.filter((match: any) => {
              if (!match.scheduledTime) return false; // Только запланированные
              
              if (competitionType === 'TEAM') {
                // Для командных соревнований: показываем матчи команды спортсмена
                if (athleteTeamId) {
                  return (match.team1Id === athleteTeamId || match.team2Id === athleteTeamId);
                }
                return false;
              } else {
                // Для индивидуальных соревнований: матчи спортсмена
                return (match.athlete1Id === athleteId || match.athlete2Id === athleteId) ||
                       (match.athlete1?.id === athleteId || match.athlete2?.id === athleteId);
              }
            });
            
            // Добавляем информацию о bracket к каждому матчу, включая totalRounds
            const matchesWithBracket = myMatches.map((match: any) => ({
              ...match,
              scheduledTime: match.scheduledTime,
              bracket: {
                id: bracket.id,
                weightCategory: bracket.weightCategory || null,
                competition: {
                  id: competitionId,
                  name: compData.competition?.name || '',
                },
                totalRounds: bracketTotalRounds[bracket.id], // Добавляем totalRounds
              },
            }));
            
            allMatches.push(...matchesWithBracket);
          }
        } catch (error) {
          console.error(`Ошибка загрузки матчей для соревнования ${competitionId}`, error);
        }
      }
      
      setMatches(allMatches);
    } catch (error) {
      console.error('Ошибка загрузки матчей', error);
    } finally {
      setLoading(false);
    }
  }, [athleteId, athleteTeamId]);

  const loadEvents = useCallback(async () => {
    try {
      // Получаем соревнования, где участвует спортсмен
      const competitionsResponse = await apiClient.get('/auth/me/competitions');
      const competitions = competitionsResponse.data?.data || [];
      
      // Загружаем мероприятия из всех соревнований
      const allEvents: Event[] = [];
      
      for (const compData of competitions) {
        const competitionId = compData.competition?.id;
        if (!competitionId) continue;
        
        try {
          const eventsResponse = await apiClient.get(`/competitions/${competitionId}/events`);
          const competitionEvents = eventsResponse.data?.data || [];
          allEvents.push(...competitionEvents);
        } catch (error) {
          console.error(`Ошибка загрузки мероприятий для соревнования ${competitionId}`, error);
        }
      }
      
      setEvents(allEvents);
    } catch (error) {
      console.error('Ошибка загрузки мероприятий', error);
    }
  }, []);

  useEffect(() => {
    loadAthleteInfo();
  }, []);

  useEffect(() => {
    if (athleteId) {
      loadMatches();
      loadEvents();
    }
  }, [athleteId, athleteTeamId, loadMatches, loadEvents]);

  // Группируем матчи по датам
  const matchesByDate = matches.reduce((acc, match) => {
    if (!match.scheduledTime) return acc;
    const date = dayjs(match.scheduledTime).format('YYYY-MM-DD');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  // Группируем мероприятия по датам
  const eventsByDate = events.reduce((acc, event) => {
    const date = dayjs(event.startTime).format('YYYY-MM-DD');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {} as Record<string, Event[]>);

  // Получаем матчи для выбранной даты
  const getMatchesForDate = (date: Dayjs): Match[] => {
    const dateStr = date.format('YYYY-MM-DD');
    return matchesByDate[dateStr] || [];
  };

  // Получаем мероприятия для выбранной даты
  const getEventsForDate = (date: Dayjs): Event[] => {
    const dateStr = date.format('YYYY-MM-DD');
    return eventsByDate[dateStr] || [];
  };

  // Получаем список дат с матчами
  const getDateCellData = (date: Dayjs) => {
    const dateMatches = getMatchesForDate(date);
    return {
      matches: dateMatches,
      hasMatches: dateMatches.length > 0,
    };
  };

  // Кастомный рендер ячейки календаря
  const dateCellRender = (value: Dayjs) => {
    const dateMatches = getMatchesForDate(value);
    const dateEvents = getEventsForDate(value);
    const totalItems = dateMatches.length + dateEvents.length;
    
    if (totalItems === 0) {
      return null;
    }

    return (
      <div style={{ minHeight: '60px' }}>
        {dateMatches.slice(0, 2).map((match) => (
          <div
            key={`match-${match.id}`}
            style={{
              fontSize: '11px',
              padding: '2px 4px',
              margin: '2px 0',
              background: match.status === 'COMPLETED' ? '#f0f0f0' : '#e6f7ff',
              borderRadius: '2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={`${match.bracket.competition.name}${match.bracket.weightCategory ? ` - ${match.bracket.weightCategory.name}` : ''}`}
          >
            {dayjs(match.scheduledTime).format('HH:mm')}{match.bracket.weightCategory ? ` - ${match.bracket.weightCategory.name}` : ''}
          </div>
        ))}
        {dateEvents.slice(0, 2 - dateMatches.length).map((event) => (
          <div
            key={`event-${event.id}`}
            style={{
              fontSize: '11px',
              padding: '2px 4px',
              margin: '2px 0',
              background: '#d9f7be',
              borderRadius: '2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={event.title}
          >
            📅 {dayjs(event.startTime).format('HH:mm')} - {event.title}
          </div>
        ))}
        {totalItems > 2 && (
          <div style={{ fontSize: '10px', color: '#1890ff', marginTop: '2px' }}>
            +{totalItems - 2} еще
          </div>
        )}
      </div>
    );
  };

  // Получаем матчи и мероприятия для выбранной даты
  const selectedDateMatches = getMatchesForDate(selectedDate);
  const selectedDateEvents = getEventsForDate(selectedDate);

  // Функция для получения totalRounds для конкретного матча
  const getTotalRoundsForMatch = (match: Match): number => {
    // Используем totalRounds из bracket, если он есть, иначе вычисляем из всех матчей этой сетки
    if (match.bracket.totalRounds) {
      return match.bracket.totalRounds;
    }
    // Fallback: вычисляем из матчей спортсмена в этой сетке
    const bracketMatches = matches.filter(m => m.bracket.id === match.bracket.id);
    if (bracketMatches.length > 0) {
      return Math.max(...bracketMatches.map(m => m.round));
    }
    return match.round;
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#262626' }}>Календарь схваток</h1>
        <p style={{ color: '#6c757d', fontSize: '14px' }}>
          Ваши запланированные схватки
        </p>
      </div>

      <Card>
        <Calendar
          value={selectedDate}
          mode={mode}
          onPanelChange={(value, newMode) => {
            setSelectedDate(value);
            setMode(newMode);
          }}
          onSelect={(value) => {
            setSelectedDate(value);
          }}
          dateCellRender={dateCellRender}
          style={{ marginBottom: 24 }}
        />

        {(selectedDateMatches.length > 0 || selectedDateEvents.length > 0) ? (
          <Card title={`События на ${selectedDate.format('DD.MM.YYYY')}`}>
            {selectedDateMatches.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ marginBottom: 8 }}>Схватки</h4>
                <List
                  dataSource={selectedDateMatches}
                  loading={loading}
                  renderItem={(match) => {
                // Определяем тип матча: командный или индивидуальный
                const isTeamMatch = !!(match.team1 || match.team2);
                
                let opponentName = 'Соперник не определен';
                if (isTeamMatch) {
                  // Для командных матчей спортсмен не участвует напрямую
                  // (команды участвуют, но спортсмен видит матч своей команды)
                  const team1Name = match.team1?.name || 'TBD';
                  const team2Name = match.team2?.name || 'TBD';
                  opponentName = `${team1Name} vs ${team2Name}`;
                } else {
                  // Индивидуальный матч
                  const isAthlete1 = match.athlete1Id === athleteId || match.athlete1?.id === athleteId;
                  const opponent = isAthlete1 ? match.athlete2 : match.athlete1;
                  opponentName = opponent 
                    ? `${opponent.user?.profile?.lastName || ''} ${opponent.user?.profile?.firstName || ''}`.trim() || 'Соперник не определен'
                    : 'Соперник не определен';
                }

                const statusColors: Record<string, string> = {
                  SCHEDULED: 'blue',
                  IN_PROGRESS: 'orange',
                  COMPLETED: 'green',
                  CANCELLED: 'red',
                };

                const statusLabels: Record<string, string> = {
                  SCHEDULED: 'Запланировано',
                  IN_PROGRESS: 'В процессе',
                  COMPLETED: 'Завершено',
                  CANCELLED: 'Отменено',
                };

                return (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<TrophyOutlined style={{ fontSize: '24px', color: '#1890ff' }} />}
                      title={
                        <Space>
                          <span style={{ fontWeight: 'bold' }}>
                            {match.bracket.competition.name}
                          </span>
                          <Tag color={statusColors[match.status] || 'default'}>
                            {statusLabels[match.status] || match.status}
                          </Tag>
                        </Space>
                      }
                      description={
                        <div>
                          <div style={{ marginBottom: 8 }}>
                            <strong>Время:</strong>{' '}
                            {match.scheduledTime 
                              ? dayjs(match.scheduledTime).format('DD.MM.YYYY в HH:mm')
                              : 'Не указано'}
                          </div>
                          {match.bracket.weightCategory && (
                            <div style={{ marginBottom: 8 }}>
                              <strong>Весовая категория:</strong>{' '}
                              {match.bracket.weightCategory.name}
                            </div>
                          )}
                          {!match.bracket.weightCategory && (
                            <div style={{ marginBottom: 8 }}>
                              <strong>Тип:</strong> Командное соревнование
                            </div>
                          )}
                          <div style={{ marginBottom: 8 }}>
                            <strong>Раунд:</strong>{' '}
                            {getRoundLabel(match.round, getTotalRoundsForMatch(match))}
                          </div>
                          <div>
                            <strong>{isTeamMatch ? 'Команды' : 'Соперник'}:</strong>{' '}
                            {opponentName}
                          </div>
                        </div>
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
                  loading={loading}
                  renderItem={(event) => {
                    const eventStartTime = dayjs(event.startTime);
                    const eventEndTime = event.endTime ? dayjs(event.endTime) : null;
                    
                    return (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<CalendarOutlined style={{ fontSize: '24px', color: '#52c41a' }} />}
                          title={
                            <Space>
                              <span style={{ fontWeight: 'bold' }}>{event.title}</span>
                              <Tag color="green">Мероприятие</Tag>
                            </Space>
                          }
                          description={
                            <div>
                              <div style={{ marginBottom: 8 }}>
                                <strong>Время:</strong>{' '}
                                {eventStartTime.format('HH:mm')}
                                {eventEndTime && ` - ${eventEndTime.format('HH:mm')}`}
                              </div>
                              {event.location && (
                                <div style={{ marginBottom: 8 }}>
                                  <strong>Место:</strong> {event.location}
                                </div>
                              )}
                              {event.description && (
                                <div>
                                  <strong>Описание:</strong> {event.description}
                                </div>
                              )}
                            </div>
                          }
                        />
                      </List.Item>
                    );
                  }}
                />
              </div>
            )}
          </Card>
        ) : (
          <Card>
            <Empty
              description={
                <div>
                  <p style={{ fontSize: '16px', marginBottom: 8 }}>
                    На {selectedDate.format('DD.MM.YYYY')} нет запланированных событий
                  </p>
                  <p style={{ color: '#8c8c8c', fontSize: '14px' }}>
                    Выберите другую дату в календаре
                  </p>
                </div>
              }
            />
          </Card>
        )}
      </Card>
    </div>
  );
};

