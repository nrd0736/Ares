/**
 * Страница подтверждения результатов матчей (судья)
 * 
 * Функциональность:
 * - Просмотр матчей требующих подтверждения
 * - Подтверждение результатов
 * - Редактирование результатов перед подтверждением
 */

import { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Select, Input, message, Space, Checkbox, InputNumber, Radio } from 'antd';
import { CheckCircleOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';

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
  status: string;
  score?: any;
  requiresConfirmation?: boolean;
  confirmedBy?: string[];
  isPending?: boolean;
  pendingResult?: {
    winnerId?: string;
    winnerTeamId?: string;
    score?: any;
    savedAt?: string;
  };
}

interface Bracket {
  id: string;
  type: string;
  competition: {
    id: string;
    name: string;
  };
  weightCategory?: {
    name: string;
  } | null;
  matches: Match[];
}

export const ResultConfirmation = () => {
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<string | null>(null);
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [selectedBracket, setSelectedBracket] = useState<Bracket | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [confirmationModalVisible, setConfirmationModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [loading, setLoading] = useState(false);

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
      // Загружаем матчи, требующие подтверждения
      const response = await apiClient.get(`/brackets/competition/${selectedCompetition}/matches-requiring-confirmation`);
      
      // Группируем матчи по сеткам
      const matchesByBracket: Record<string, any> = {};
      response.data.data.forEach((match: any) => {
        const bracketId = match.bracket.id;
        if (!matchesByBracket[bracketId]) {
          matchesByBracket[bracketId] = {
            id: bracketId,
            type: match.bracket.type,
            weightCategory: match.bracket.weightCategory || null,
            competition: { id: selectedCompetition, name: '' },
            matches: [],
          };
        }
        matchesByBracket[bracketId].matches.push(match);
      });

      const bracketsArray = Object.values(matchesByBracket);
      setBrackets(bracketsArray);
      if (bracketsArray.length > 0) {
        setSelectedBracket(bracketsArray[0]);
      }
    } catch (error) {
      message.error('Ошибка загрузки матчей для подтверждения');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (match: Match) => {
    setSelectedMatch(match);
    form.setFieldsValue({
      confirmed: true,
      notes: '',
    });
    setConfirmationModalVisible(true);
  };

  const handleEdit = async (match: Match) => {
    setSelectedMatch(match);
    const pendingResult = match.pendingResult || {};
    const score = pendingResult.score || match.score || {};
    const isTeamMatch = !!(match.team1 || match.team2);
    
    editForm.setFieldsValue({
      winnerId: isTeamMatch 
        ? (pendingResult.winnerTeamId || match.winnerTeamId)
        : (pendingResult.winnerId || match.winnerId),
      winnerTeamId: isTeamMatch ? (pendingResult.winnerTeamId || match.winnerTeamId) : undefined,
      athlete1Score: !isTeamMatch ? (score?.athlete1 || 0) : undefined,
      athlete2Score: !isTeamMatch ? (score?.athlete2 || 0) : undefined,
      team1Score: isTeamMatch ? (score?.team1 || 0) : undefined,
      team2Score: isTeamMatch ? (score?.team2 || 0) : undefined,
      method: score?.method || 'POINTS',
      notes: score?.notes || '',
    });
    setEditModalVisible(true);
  };

  const handleConfirmationSubmit = async (values: any) => {
    if (!selectedMatch || !selectedBracket) return;

    try {
      // Одобряем результат (финализируем)
      await apiClient.post(`/brackets/${selectedBracket.id}/matches/${selectedMatch.id}/approve`);
      message.success('Результат одобрен и финализирован');
      setConfirmationModalVisible(false);
      loadBrackets();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при одобрении результата');
    }
  };

  const handleEditSubmit = async (values: any) => {
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

      // Обновляем pending результат
      await apiClient.put(
        `/brackets/${selectedBracket.id}/matches/${selectedMatch.id}/result`,
        data
      );

      message.success('Результат обновлен');
      setEditModalVisible(false);
      loadBrackets();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при обновлении результата');
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

  const columns = [
    {
      title: 'Раунд',
      dataIndex: 'round',
      key: 'round',
      render: (round: number) => `Раунд ${round}`,
    },
    {
      title: 'Участник 1 / Команда 1',
      key: 'participant1',
      render: (_: any, record: Match) => {
        if (!record) return '-';
        if (record.team1) {
          return record.team1.name;
        }
        if (record.athlete1) {
          return `${record.athlete1.user.profile.firstName} ${record.athlete1.user.profile.lastName}`;
        }
        return '-';
      },
    },
    {
      title: 'Участник 2 / Команда 2',
      key: 'participant2',
      render: (_: any, record: Match) => {
        if (!record) return '-';
        if (record.team2) {
          return record.team2.name;
        }
        if (record.athlete2) {
          return `${record.athlete2.user.profile.firstName} ${record.athlete2.user.profile.lastName}`;
        }
        return '-';
      },
    },
    {
      title: 'Победитель',
      key: 'winner',
      render: (_: any, record: Match) => {
        if (!record) return '-';
        const isTeamMatch = !!(record.team1 || record.team2);
        const winnerId = isTeamMatch 
          ? (record.pendingResult?.winnerTeamId || record.winnerTeamId)
          : (record.pendingResult?.winnerId || record.winnerId);
        if (!winnerId) return '-';
        
        if (isTeamMatch) {
          const winner = record.team1?.id === winnerId ? record.team1 : record.team2;
          return winner ? winner.name : '-';
        } else {
          const winner = record.athlete1?.id === winnerId ? record.athlete1 : record.athlete2;
          return winner
            ? `${winner.user.profile.firstName} ${winner.user.profile.lastName}`
            : '-';
        }
      },
    },
    {
      title: 'Статус',
      key: 'status',
      render: (_: any, record: Match) => {
        if (!record) return '-';
        if (record.status !== 'COMPLETED') {
          return <Tag color={getStatusColor(record.status)}>{getStatusText(record.status)}</Tag>;
        }
        if (record.isPending) {
          return <Tag color="orange">Ожидает подтверждения</Tag>;
        }
        return <Tag color="green">Подтверждено</Tag>;
      },
    },
    {
      title: 'Счет',
      key: 'score',
      render: (_: any, record: Match) => {
        if (!record) return '-';
        if (record.status !== 'COMPLETED') return '-';
        const score = record.pendingResult?.score || record.score;
        if (!score) return '-';
        const isTeamMatch = !!(record.team1 || record.team2);
        if (isTeamMatch) {
          return `${score.team1 || 0} : ${score.team2 || 0}`;
        } else {
          return `${score.athlete1 || 0} : ${score.athlete2 || 0}`;
        }
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Match) => {
        if (!record) return '-';
        if (record.status !== 'COMPLETED' || !record.isPending) {
          if (record.status === 'COMPLETED' && !record.isPending) {
            return <Tag color="green">Одобрено</Tag>;
          }
          return '-';
        }
        return (
          <Space>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              Редактировать
            </Button>
            <Button
              type="link"
              icon={<CheckCircleOutlined />}
              onClick={() => handleApprove(record)}
            >
              Одобрить
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#262626' }}>Подтверждение результатов</h1>
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

      {selectedCompetition && selectedBracket && (
        <Card
          title={`${selectedBracket.weightCategory?.name || 'Командное соревнование'} - ${selectedBracket.competition.name}`}
        >
          <Table
            columns={columns}
            dataSource={selectedBracket.matches || []}
            loading={loading}
            rowKey="id"
            pagination={false}
          />
        </Card>
      )}

      {selectedCompetition && !selectedBracket && !loading && (
        <Card>
          <div style={{ textAlign: 'center', padding: '48px', color: '#8c8c8c' }}>
            <CheckCircleOutlined style={{ fontSize: '48px', marginBottom: 16 }} />
            <p>Турнирные сетки для этого соревнования еще не созданы</p>
          </div>
        </Card>
      )}

      {!selectedCompetition && (
        <Card>
          <div style={{ textAlign: 'center', padding: '48px', color: '#8c8c8c' }}>
            <CheckCircleOutlined style={{ fontSize: '48px', marginBottom: 16 }} />
            <p>Выберите соревнование для подтверждения результатов</p>
          </div>
        </Card>
      )}

      <Modal
        title="Одобрение результата"
        open={confirmationModalVisible}
        onCancel={() => {
          setConfirmationModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
      >
        {selectedMatch && (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleConfirmationSubmit}
          >
            <div style={{ marginBottom: 16, padding: 12, background: '#f0f2f5', borderRadius: 4 }}>
              <p><strong>Матч:</strong> Раунд {selectedMatch.round}</p>
              {(() => {
                const isTeamMatch = !!(selectedMatch.team1 || selectedMatch.team2);
                return (
                  <>
                    <p>
                      <strong>{isTeamMatch ? 'Команды' : 'Участники'}:</strong>{' '}
                      {isTeamMatch ? (
                        <>
                          {selectedMatch.team1?.name || '-'} vs {selectedMatch.team2?.name || '-'}
                        </>
                      ) : (
                        <>
                          {selectedMatch.athlete1
                            ? `${selectedMatch.athlete1.user.profile.firstName} ${selectedMatch.athlete1.user.profile.lastName}`
                            : '-'}{' '}
                          vs{' '}
                          {selectedMatch.athlete2
                            ? `${selectedMatch.athlete2.user.profile.firstName} ${selectedMatch.athlete2.user.profile.lastName}`
                            : '-'}
                        </>
                      )}
                    </p>
                    {(() => {
                      const winnerId = isTeamMatch
                        ? (selectedMatch.pendingResult?.winnerTeamId || selectedMatch.winnerTeamId)
                        : (selectedMatch.pendingResult?.winnerId || selectedMatch.winnerId);
                      if (!winnerId) return null;
                      
                      if (isTeamMatch) {
                        const winner = selectedMatch.team1?.id === winnerId ? selectedMatch.team1 : selectedMatch.team2;
                        return (
                          <p>
                            <strong>Победитель:</strong> {winner?.name || '-'}
                          </p>
                        );
                      } else {
                        const winner = selectedMatch.athlete1?.id === winnerId ? selectedMatch.athlete1 : selectedMatch.athlete2;
                        return (
                          <p>
                            <strong>Победитель:</strong>{' '}
                            {winner
                              ? `${winner.user.profile.firstName} ${winner.user.profile.lastName}`
                              : '-'}
                          </p>
                        );
                      }
                    })()}
                    {selectedMatch.pendingResult?.score && (
                      <p>
                        <strong>Счет:</strong>{' '}
                        {isTeamMatch
                          ? `${selectedMatch.pendingResult.score.team1 || 0} : ${selectedMatch.pendingResult.score.team2 || 0}`
                          : `${selectedMatch.pendingResult.score.athlete1 || 0} : ${selectedMatch.pendingResult.score.athlete2 || 0}`}
                      </p>
                    )}
                  </>
                );
              })()}
            </div>

            <Form.Item
              name="confirmed"
              valuePropName="checked"
              rules={[{ required: true, message: 'Подтвердите результат' }]}
            >
              <Checkbox>Я подтверждаю правильность результата и готов его одобрить</Checkbox>
            </Form.Item>

            <Form.Item
              name="notes"
              label="Примечания (необязательно)"
            >
              <Input.TextArea rows={3} placeholder="Дополнительные примечания" />
            </Form.Item>
          </Form>
        )}
      </Modal>

      <Modal
        title="Редактирование результата"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
        }}
        onOk={() => editForm.submit()}
        width={600}
      >
        {selectedMatch && (
          <Form form={editForm} layout="vertical" onFinish={handleEditSubmit}>
            <div style={{ marginBottom: 16, padding: 12, background: '#f0f2f5', borderRadius: 4 }}>
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
              name={(() => {
                const isTeamMatch = !!(selectedMatch.team1 || selectedMatch.team2);
                return isTeamMatch ? "winnerTeamId" : "winnerId";
              })()}
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
        )}
      </Modal>
    </div>
  );
};

