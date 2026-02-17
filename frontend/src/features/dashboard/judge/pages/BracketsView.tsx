/**
 * Страница просмотра турнирных сеток (судья)
 * 
 * Функциональность:
 * - Просмотр сеток соревнований
 * - Подтверждение результатов матчей
 * - Ввод результатов
 * - Real-time обновления через Socket.IO
 */

import { useState, useEffect } from 'react';
import { Card, Select, Table, Tag, Button, Modal, Form, Input, message, Tabs, Space, InputNumber, Radio } from 'antd';
import { TrophyOutlined, CheckCircleOutlined, EyeOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import { useCompetitionSocket } from '../../../../hooks/useSocket';
import { BracketVisualization } from '../../../../components/brackets/BracketVisualization';

interface Match {
  id: string;
  round: number;
  position: number;
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
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  score?: any;
}

interface Bracket {
  id: string;
  type: string;
  weightCategory?: {
    name: string;
  } | null;
  matches: Match[];
}

export const BracketsView = () => {
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<string | null>(null);
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [selectedBracket, setSelectedBracket] = useState<Bracket | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // Подписка на real-time обновления
  useCompetitionSocket(selectedCompetition);

  useEffect(() => {
    loadCompetitions();
  }, []);

  useEffect(() => {
    if (selectedCompetition) {
      loadBrackets();
    }
  }, [selectedCompetition]);

  const loadCompetitions = async () => {
    try {
      // Загружаем только соревнования, к которым прикреплен судья
      const response = await apiClient.get('/competitions/judge/my');
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
      // Обрабатываем разные форматы ответа
      const bracketsData = Array.isArray(response.data.data) 
        ? response.data.data 
        : response.data.data?.brackets || [];
      
      setBrackets(bracketsData);
      // Сбрасываем выбранную сетку при загрузке новых данных
      setSelectedBracket(null);
    } catch (error) {
      console.error('Ошибка загрузки турнирных сеток', error);
      message.error('Ошибка загрузки турнирных сеток');
      setBrackets([]);
      setSelectedBracket(null);
    } finally {
      setLoading(false);
    }
  };

  const handleMatchClick = (match: Match) => {
    if (match.status === 'SCHEDULED' || match.status === 'IN_PROGRESS') {
      setSelectedMatch(match);
      const score = match.score as any;
      const isTeamMatch = !!(match.team1 || match.team2);
      form.setFieldsValue({
        winnerId: isTeamMatch ? match.winnerTeamId : match.winnerId,
        winnerTeamId: isTeamMatch ? match.winnerTeamId : undefined,
        athlete1Score: !isTeamMatch ? (score?.athlete1 || 0) : undefined,
        athlete2Score: !isTeamMatch ? (score?.athlete2 || 0) : undefined,
        team1Score: isTeamMatch ? (score?.team1 || 0) : undefined,
        team2Score: isTeamMatch ? (score?.team2 || 0) : undefined,
        method: score?.method || 'POINTS',
        notes: score?.notes || '',
      });
      setResultModalVisible(true);
    }
  };

  const handleResultSubmit = async (values: any) => {
    if (!selectedMatch || !selectedBracket) return;

    try {
      const isTeamMatch = !!(selectedMatch.team1 || selectedMatch.team2);
      const score: any = {
        method: values.method,
        notes: values.notes,
      };

      if (isTeamMatch) {
        score.team1 = values.team1Score || 0;
        score.team2 = values.team2Score || 0;
      } else {
        score.athlete1 = values.athlete1Score || 0;
        score.athlete2 = values.athlete2Score || 0;
      }

      const data: any = {
        score,
        status: 'COMPLETED',
      };

      if (isTeamMatch) {
        data.winnerTeamId = values.winnerId || values.winnerTeamId;
      } else {
        data.winnerId = values.winnerId || values.winnerTeamId;
      }

      await apiClient.put(
        `/brackets/${selectedBracket.id}/matches/${selectedMatch.id}/result`,
        data
      );

      message.success('Результат матча успешно обновлен');
      setResultModalVisible(false);
      form.resetFields();
      loadBrackets();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при обновлении результата');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      SCHEDULED: 'default',
      IN_PROGRESS: 'processing',
      COMPLETED: 'success',
      CANCELLED: 'error',
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

  const getBracketTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      SINGLE_ELIMINATION: 'Олимпийская система',
      DOUBLE_ELIMINATION: 'Двойная олимпийская система',
      ROUND_ROBIN: 'Круговая система',
    };
    return labels[type] || type;
  };

  const columns = [
    {
      title: 'Раунд',
      dataIndex: 'round',
      key: 'round',
    },
    {
      title: 'Позиция',
      dataIndex: 'position',
      key: 'position',
    },
    {
      title: record => {
        // Определяем тип матча по первому матчу в таблице
        const isTeamMatch = record.team1 || record.team2;
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
      title: record => {
        const isTeamMatch = record.team1 || record.team2;
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
          type="link"
          icon={<CheckCircleOutlined />}
          onClick={() => handleMatchClick(record)}
          disabled={record.status === 'COMPLETED'}
        >
          Ввести результат
        </Button>
      ),
    },
  ];

  const bracketColumns = [
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
        <Button 
          type="link" 
          icon={<EyeOutlined />}
          onClick={() => setSelectedBracket(record)}
        >
          Просмотреть
        </Button>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'table',
      label: 'Таблица',
      children: selectedBracket && (
        <Card
          title={
            <span>
              <TrophyOutlined /> {selectedBracket.weightCategory?.name || 'Неизвестная категория'} {selectedBracket.type ? `- ${getBracketTypeLabel(selectedBracket.type)}` : ''}
            </span>
          }
        >
          <Table
            columns={columns}
            dataSource={selectedBracket.matches}
            rowKey="id"
            pagination={false}
          />
        </Card>
      ),
    },
    {
      key: 'visualization',
      label: 'Визуализация',
      children: selectedCompetition && selectedBracket && (
        <BracketVisualization
          competitionId={selectedCompetition}
          bracketId={selectedBracket.id}
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#262626' }}>Турнирные сетки</h1>
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
              columns={bracketColumns}
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
                      {getBracketTypeLabel(selectedBracket.type)} - {selectedBracket.weightCategory?.name || 'Неизвестная категория'}
                    </span>
                  </Space>
                }
                extra={
                  <Button onClick={() => setSelectedBracket(null)}>Закрыть</Button>
                }
                style={{ marginBottom: 24 }}
              >
                <BracketVisualization 
                  competitionId={selectedCompetition} 
                  bracketId={selectedBracket.id} 
                />
              </Card>

              <Card
                title={
                  <span>
                    <TrophyOutlined /> Матчи сетки
                  </span>
                }
              >
                <Tabs items={tabItems} />
              </Card>
            </>
          )}
        </>
      )}

      <Modal
        title="Ввод результата матча"
        open={resultModalVisible}
        onCancel={() => {
          setResultModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
      >
        {selectedMatch && (() => {
          const isTeamMatch = !!(selectedMatch.team1 || selectedMatch.team2);
          return (
            <Form form={form} layout="vertical" onFinish={handleResultSubmit}>
              <div style={{ 
                marginBottom: 16, 
                padding: 12, 
                background: '#f0f2f5', 
                borderRadius: 4 
              }}>
                <p><strong>Матч:</strong> Раунд {selectedMatch.round}, Позиция {selectedMatch.position}</p>
              </div>

              {/* Счет для спортсмена 1 или команды 1 */}
              {selectedMatch.athlete1 && (
                <Form.Item
                  name="athlete1Score"
                  label={`Счет: ${selectedMatch.athlete1.user.profile.firstName} ${selectedMatch.athlete1.user.profile.lastName}`}
                  rules={[{ required: true, message: 'Введите счет' }]}
                >
                  <InputNumber 
                    min={0} 
                    style={{ width: '100%' }}
                    placeholder="Введите количество очков"
                  />
                </Form.Item>
              )}
              {selectedMatch.team1 && (
                <Form.Item
                  name="team1Score"
                  label={`Счет: ${selectedMatch.team1.name}`}
                  rules={[{ required: true, message: 'Введите счет' }]}
                >
                  <InputNumber 
                    min={0} 
                    style={{ width: '100%' }}
                    placeholder="Введите количество очков"
                  />
                </Form.Item>
              )}

              {/* Счет для спортсмена 2 или команды 2 */}
              {selectedMatch.athlete2 && (
                <Form.Item
                  name="athlete2Score"
                  label={`Счет: ${selectedMatch.athlete2.user.profile.firstName} ${selectedMatch.athlete2.user.profile.lastName}`}
                  rules={[{ required: true, message: 'Введите счет' }]}
                >
                  <InputNumber 
                    min={0} 
                    style={{ width: '100%' }}
                    placeholder="Введите количество очков"
                  />
                </Form.Item>
              )}
              {selectedMatch.team2 && (
                <Form.Item
                  name="team2Score"
                  label={`Счет: ${selectedMatch.team2.name}`}
                  rules={[{ required: true, message: 'Введите счет' }]}
                >
                  <InputNumber 
                    min={0} 
                    style={{ width: '100%' }}
                    placeholder="Введите количество очков"
                  />
                </Form.Item>
              )}

              {/* Способ победы */}
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

              {/* Победитель */}
              <Form.Item
                name={isTeamMatch ? "winnerTeamId" : "winnerId"}
                label="Победитель"
                rules={[{ required: true, message: 'Выберите победителя' }]}
              >
                <Select placeholder="Выберите победителя" size="large">
                  {selectedMatch.athlete1 && (
                    <Select.Option value={selectedMatch.athlete1.id}>
                      {selectedMatch.athlete1.user.profile.firstName}{' '}
                      {selectedMatch.athlete1.user.profile.lastName}
                    </Select.Option>
                  )}
                  {selectedMatch.athlete2 && (
                    <Select.Option value={selectedMatch.athlete2.id}>
                      {selectedMatch.athlete2.user.profile.firstName}{' '}
                      {selectedMatch.athlete2.user.profile.lastName}
                    </Select.Option>
                  )}
                  {selectedMatch.team1 && (
                    <Select.Option value={selectedMatch.team1.id}>
                      {selectedMatch.team1.name}
                    </Select.Option>
                  )}
                  {selectedMatch.team2 && (
                    <Select.Option value={selectedMatch.team2.id}>
                      {selectedMatch.team2.name}
                    </Select.Option>
                  )}
                </Select>
              </Form.Item>

              {/* Примечания */}
              <Form.Item name="notes" label="Примечания (необязательно)">
                <Input.TextArea
                  placeholder="Дополнительные комментарии к результату"
                  rows={3}
                />
              </Form.Item>
            </Form>
          );
        })()}
      </Modal>
    </div>
  );
};

