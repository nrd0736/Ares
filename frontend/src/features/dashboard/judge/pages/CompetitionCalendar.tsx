/**
 * Страница календаря соревнований (судья)
 * 
 * Функциональность:
 * - Просмотр соревнований в календарном виде
 * - Фильтрация по статусу
 * - Переход к детальной информации о соревновании
 */

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Card, List, Tag, Space, Modal, Form, Select, TimePicker, Button, message, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, TrophyOutlined, CalendarOutlined } from '@ant-design/icons';
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
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
  athlete2?: {
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
  // Правильная логика: round 1 = первый раунд, round totalRounds = финал
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
  // Для ранних раундов вычисляем количество участников
  const roundsToFinal = totalRounds - round;
  const participantsInRound = Math.pow(2, roundsToFinal);
  return `1/${participantsInRound}`;
};

export const CompetitionCalendar = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [mode, setMode] = useState<CalendarMode>('month');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const loadCompetitions = async () => {
    try {
      // Загружаем только соревнования, к которым прикреплен судья
      const response = await apiClient.get('/competitions/judge/my');
      setCompetitions(response.data.data.competitions || []);
    } catch (error) {
      console.error('Ошибка загрузки соревнований', error);
    }
  };

  const loadMatches = useCallback(async () => {
    if (!selectedCompetition) return;
    setLoading(true);
    try {
      // Загружаем все сетки соревнования (матчи уже включены в ответ)
      const bracketsResponse = await apiClient.get(`/brackets/competition/${selectedCompetition}`);
      // Структура ответа: { success: true, data: [...] }
      const brackets = Array.isArray(bracketsResponse.data.data) 
        ? bracketsResponse.data.data 
        : bracketsResponse.data.data?.brackets || [];
      
      // Извлекаем все матчи из всех сеток (матчи уже включены в brackets)
      const allMatches: Match[] = [];
      for (const bracket of brackets) {
        // Матчи уже включены в bracket.matches
        const bracketMatches = bracket.matches || [];
        
        // Добавляем информацию о bracket к каждому матчу
        const matchesWithBracket = bracketMatches.map((match: any) => {
          return {
            ...match,
            // scheduledTime должен быть в ответе от API, но убеждаемся что он есть
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
      // Показываем ошибку только если это не 404 (не критично)
      if (error.response?.status !== 404) {
        message.error('Ошибка загрузки матчей');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCompetition, competitions]);

  useEffect(() => {
    loadCompetitions();
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
    if (selectedCompetition) {
      loadMatches();
      loadEvents();
    }
  }, [selectedCompetition, loadMatches, loadEvents]);

  // Слушаем события обновления матчей из турнирных сеток
  useEffect(() => {
    const handleBracketMatchUpdated = () => {
      if (selectedCompetition) {
        // Обновляем матчи без показа ошибок - это не критично
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
  }, [selectedCompetition, loadMatches]);

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

  const getMatchesWithoutSchedule = () => {
    // Исключаем завершенные и отмененные матчи
    return matches.filter((match) => 
      !match.scheduledTime && 
      match.status !== 'COMPLETED' && 
      match.status !== 'CANCELLED'
    );
  };

  const getTotalRounds = (): number => {
    if (matches.length === 0) return 0;
    return Math.max(...matches.map(m => m.round));
  };

  const cellRender = (value: Dayjs, info: any) => {
    // Для отображения в ячейках дат используем dateCellContent
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
              onClick={(e) => {
                e.stopPropagation();
                handleEditMatch(match);
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

  const handleEditMatch = (match: Match) => {
    setEditingMatch(match);
    // Устанавливаем дату из матча, если есть расписание, иначе используем выбранную дату
    if (match.scheduledTime) {
      setSelectedDate(dayjs(match.scheduledTime));
    }
    form.setFieldsValue({
      scheduledTime: match.scheduledTime ? dayjs(match.scheduledTime) : dayjs().hour(10).minute(0),
    });
    setModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    if (!selectedCompetition || !editingMatch) return;
    
    try {
      // Объединяем выбранную дату с временем
      const selectedDateOnly = selectedDate.format('YYYY-MM-DD');
      const timeOnly = values.scheduledTime.format('HH:mm');
      const scheduledDateTime = dayjs(`${selectedDateOnly} ${timeOnly}`).toISOString();
      
      await apiClient.put(`/brackets/match/${editingMatch.id}`, {
        scheduledTime: scheduledDateTime,
      });
      message.success('Время схватки обновлено');
      
      setModalVisible(false);
      setEditingMatch(null);
      form.resetFields();
      loadMatches();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при сохранении');
    }
  };

  const handleDeleteSchedule = async (matchId: string) => {
    try {
      await apiClient.put(`/brackets/match/${matchId}`, {
        scheduledTime: null,
      });
      message.success('Расписание удалено');
      loadMatches();
    } catch (error: any) {
      message.error('Ошибка при удалении расписания');
    }
  };

  const selectedDateMatches = getMatchesForDate(selectedDate);
  const selectedDateEvents = getEventsForDate(selectedDate);

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#262626' }}>Календарь соревнования</h1>
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
                    <List.Item
                      actions={[
                        <Button
                          type="link"
                          icon={<EditOutlined />}
                          onClick={() => handleEditMatch(match)}
                        >
                          Редактировать
                        </Button>,
                        <Popconfirm
                          title="Удалить расписание этой схватки?"
                          onConfirm={() => handleDeleteSchedule(match.id)}
                        >
                          <Button type="link" danger icon={<DeleteOutlined />}>
                            Удалить
                          </Button>
                        </Popconfirm>,
                      ]}
                    >
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

          {getMatchesWithoutSchedule().length > 0 && (
            <Card title="Схватки без расписания">
              <List
                loading={loading}
                dataSource={getMatchesWithoutSchedule()}
                renderItem={(match) => {
                  const totalRounds = getTotalRounds();
                  const roundLabel = getRoundLabel(match.round, totalRounds);
                  
                  return (
                    <List.Item
                      actions={[
                        <Button
                          type="link"
                          icon={<EditOutlined />}
                          onClick={() => {
                            setSelectedDate(dayjs());
                            handleEditMatch(match);
                          }}
                        >
                          Установить расписание
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<TrophyOutlined style={{ fontSize: 24, color: '#d9d9d9' }} />}
                        title={
                          <Space>
                            <Tag color="default">{roundLabel}</Tag>
                            {match.bracket.weightCategory && <span>{match.bracket.weightCategory.name}</span>}
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
          <p>Выберите соревнование для просмотра календаря схваток</p>
        </Card>
      )}

      <Modal
        title="Редактировать расписание схватки"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingMatch(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {editingMatch && (
            <>
              <Form.Item label="Раунд">
                <Tag color="blue">
                  {getRoundLabel(editingMatch.round, getTotalRounds())}
                </Tag>
              </Form.Item>
              <Form.Item label="Весовая категория">
                <Tag>{editingMatch.bracket.weightCategory?.name || 'Командное соревнование'}</Tag>
              </Form.Item>
            </>
          )}
          
          <Form.Item label="Дата">
            <Tag>{selectedDate.format('DD.MM.YYYY')}</Tag>
          </Form.Item>
          
          <Form.Item
            name="scheduledTime"
            label="Время"
            rules={[{ required: true, message: 'Укажите время' }]}
          >
            <TimePicker
              format="HH:mm"
              style={{ width: '100%' }}
              showNow
              placeholder="Выберите время"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

