/**
 * Страница статистики соревнования (судья)
 * 
 * Функциональность:
 * - Статистика по соревнованию
 * - Количество участников
 * - Статистика матчей
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
  competitionType?: 'INDIVIDUAL' | 'TEAM';
  sport: {
    name: string;
  };
  _count?: {
    participants: number;
    brackets: number;
  };
}

interface CompetitionStats {
  totalParticipants: number;
  totalMatches: number;
  completedMatches: number;
  byWeightCategory: Array<{
    category: string;
    participants: number;
    matches: number;
  }>;
  topParticipants?: Array<{
    athlete: {
      user: {
        profile: {
          firstName: string;
          lastName: string;
        };
      };
    };
    wins: number;
    position: number;
  }>;
  topTeams?: Array<{
    teamName: string;
    participantsCount: number;
    wins: number;
    position?: number;
  }>;
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
      // Загружаем соревнования для судьи
      const response = await apiClient.get('/competitions/judge/my');
      setCompetitions(response.data.data.competitions);
    } catch (error) {
      message.error('Ошибка загрузки соревнований');
    }
  };

  const loadStatistics = async () => {
    if (!selectedCompetition) return;
    setLoading(true);
    try {
      const response = await apiClient.get(`/competitions/${selectedCompetition}/statistics`);
      setStats(response.data.data);
    } catch (error: any) {
      console.error('Ошибка загрузки статистики:', error);
      message.error(error.response?.data?.message || 'Ошибка загрузки статистики');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const getColumns = (isTeamCompetition: boolean) => {
    if (isTeamCompetition) {
      return [
        {
          title: 'Место',
          dataIndex: 'position',
          key: 'position',
          render: (position: number | undefined, _: any, index: number) => {
            const pos = position || index + 1;
            return (
              <Tag color={pos === 1 ? 'gold' : pos === 2 ? 'default' : pos === 3 ? 'orange' : 'blue'}>
                {pos}
              </Tag>
            );
          },
        },
        {
          title: 'Команда',
          key: 'team',
          render: (_: any, record: any) => record?.teamName || '-',
        },
        {
          title: 'Побед',
          dataIndex: 'wins',
          key: 'wins',
        },
        {
          title: 'Участников',
          dataIndex: 'participantsCount',
          key: 'participantsCount',
        },
      ];
    } else {
      return [
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
        {
          title: 'Спортсмен',
          key: 'athlete',
          render: (_: any, record: any) =>
            record ? `${record.athlete.user.profile.firstName} ${record.athlete.user.profile.lastName}` : '-',
        },
        {
          title: 'Побед',
          dataIndex: 'wins',
          key: 'wins',
        },
      ];
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

      {selectedCompetition && stats && (() => {
        const selectedComp = competitions.find(c => c.id === selectedCompetition);
        const isTeamCompetition = selectedComp?.competitionType === 'TEAM';
        const columns = getColumns(isTeamCompetition);
        
        return (
          <>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title={isTeamCompetition ? "Команд" : "Участников"}
                    value={stats.totalParticipants}
                    prefix={isTeamCompetition ? <TeamOutlined /> : <UserOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Всего матчей"
                    value={stats.totalMatches}
                    prefix={<TrophyOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Завершено"
                    value={stats.completedMatches}
                    prefix={<BarChartOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title={isTeamCompetition ? "Сеток" : "Вес. категорий"}
                    value={stats.byWeightCategory.length}
                    prefix={<TeamOutlined />}
                  />
                </Card>
              </Col>
            </Row>

            {isTeamCompetition ? (
              <Card title="Топ команд" style={{ marginBottom: 24 }}>
                <Table
                  columns={columns}
                  dataSource={stats.topTeams?.map((team, index) => ({ ...team, position: index + 1 })) || []}
                  rowKey={(record) => record.teamName}
                  pagination={false}
                  locale={{ emptyText: 'Нет данных о командах' }}
                />
              </Card>
            ) : (
              <Card title="Топ участников" style={{ marginBottom: 24 }}>
                <Table
                  columns={columns}
                  dataSource={stats.topParticipants || []}
                  rowKey={(record) => record.athlete.user.profile.firstName}
                  pagination={false}
                  locale={{ emptyText: 'Нет данных об участниках' }}
                />
              </Card>
            )}

            <Card title={isTeamCompetition ? "Статистика по сеткам" : "Статистика по весовым категориям"}>
              <Table
                columns={[
                  { title: isTeamCompetition ? 'Сетка' : 'Весовая категория', dataIndex: 'category', key: 'category' },
                  { title: isTeamCompetition ? 'Команд' : 'Участников', dataIndex: 'participants', key: 'participants' },
                  { title: 'Матчей', dataIndex: 'matches', key: 'matches' },
                ]}
                dataSource={stats.byWeightCategory}
                rowKey="category"
                pagination={false}
              />
            </Card>
          </>
        );
      })()}

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

