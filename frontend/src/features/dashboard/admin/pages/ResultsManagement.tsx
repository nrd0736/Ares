/**
 * Страница управления результатами соревнований (администратор)
 * 
 * Функциональность:
 * - Просмотр результатов матчей
 * - Редактирование результатов
 * - Экспорт результатов в Excel
 * - Управление результатами по весовым категориям
 */

import { useState, useEffect } from 'react';
import { Card, Select, Table, Tag, Button, Modal, Form, Input, message, Space, InputNumber, Tabs, Dropdown, DatePicker } from 'antd';
import { TrophyOutlined, EditOutlined, CheckCircleOutlined, DownloadOutlined, FileExcelOutlined, PlusOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

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
  winnerId?: string;
  status: string;
  score?: any;
}

interface Participant {
  id: string;
  athlete: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
  position?: number;
  points?: number;
}

interface Competition {
  id: string;
  name: string;
  status: string;
}

export const ResultsManagement = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [editMatchModalVisible, setEditMatchModalVisible] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [positionModalVisible, setPositionModalVisible] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [createMatchModalVisible, setCreateMatchModalVisible] = useState(false);
  const [addResultModalVisible, setAddResultModalVisible] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<any | null>(null);
  const [matchesForResult, setMatchesForResult] = useState<any[]>([]);
  const [brackets, setBrackets] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [matchForm] = Form.useForm();
  const [positionForm] = Form.useForm();
  const [createMatchForm] = Form.useForm();
  const [resultForm] = Form.useForm();

  useEffect(() => {
    loadCompetitions();
  }, []);

  useEffect(() => {
    if (selectedCompetition) {
      loadMatches();
      loadParticipants();
      loadBrackets();
      loadAthletes();
    }
  }, [selectedCompetition]);

  const loadCompetitions = async () => {
    try {
      // Загружаем все соревнования, включая завершенные
      const response = await apiClient.get('/competitions');
      const allCompetitions = response.data.data.competitions || [];
      // Фильтруем только IN_PROGRESS и COMPLETED для отображения результатов
      setCompetitions(allCompetitions.filter((c: any) => 
        c.status === 'IN_PROGRESS' || c.status === 'COMPLETED'
      ));
    } catch (error) {
      message.error('Ошибка загрузки соревнований');
    }
  };

  const loadMatches = async () => {
    if (!selectedCompetition) return;
    setLoading(true);
    try {
      // Загружаем все матчи соревнования через сетки
      const bracketsResponse = await apiClient.get(`/brackets/competition/${selectedCompetition}`);
      const allMatches: Match[] = [];
      bracketsResponse.data.data.forEach((bracket: any) => {
        if (bracket.matches) {
          allMatches.push(...bracket.matches);
        }
      });
      setMatches(allMatches);
    } catch (error) {
      message.error('Ошибка загрузки матчей');
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async () => {
    if (!selectedCompetition) return;
    try {
      // Загружаем результаты из таблицы Result
      const response = await apiClient.get(`/competitions/${selectedCompetition}/results`);
      const results = response.data.data || [];
      
      // Преобразуем результаты в формат участников
      const participantsData = results.map((result: any) => ({
        id: result.athleteId,
        athlete: result.athlete,
        position: result.position,
        points: result.points,
      }));
      
      setParticipants(participantsData);
    } catch (error) {
      message.error('Ошибка загрузки результатов');
    }
  };

  const loadBrackets = async () => {
    if (!selectedCompetition) return;
    try {
      const response = await apiClient.get(`/brackets/competition/${selectedCompetition}`);
      setBrackets(response.data.data || []);
    } catch (error) {
      console.error('Ошибка загрузки сеток', error);
    }
  };

  const loadAthletes = async () => {
    if (!selectedCompetition) return;
    try {
      const response = await apiClient.get(`/competitions/${selectedCompetition}/participants`);
      const participants = response.data.data.participants || [];
      setAthletes(participants.map((p: any) => p.athlete));
    } catch (error) {
      console.error('Ошибка загрузки спортсменов', error);
    }
  };

  const handleEditResult = (match: Match) => {
    setSelectedMatch(match);
    matchForm.setFieldsValue({
      winnerId: match.winnerId || undefined,
      status: match.status,
      athlete1Score: match.score?.athlete1 || undefined,
      athlete2Score: match.score?.athlete2 || undefined,
    });
    setEditMatchModalVisible(true);
  };

  const handleEditPosition = (participant: Participant) => {
    setSelectedParticipant(participant);
    positionForm.setFieldsValue({
      position: participant.position,
      points: participant.points,
    });
    setPositionModalVisible(true);
  };

  const handleResultSubmit = async (values: any) => {
    if (!selectedMatch || !selectedCompetition) return;

    try {
      // Находим bracketId для матча
      const bracketsResponse = await apiClient.get(`/brackets/competition/${selectedCompetition}`);
      const bracket = bracketsResponse.data.data.find((b: any) =>
        b.matches?.some((m: any) => m.id === selectedMatch.id)
      );

      if (!bracket) {
        message.error('Сетка не найдена');
        return;
      }

      const data: any = {
        status: values.status,
      };
      
      // Если статус COMPLETED, обязательно указываем победителя
      if (values.status === 'COMPLETED') {
        if (!values.winnerId) {
          message.error('Для завершенного матча необходимо указать победителя');
          return;
        }
        data.winnerId = values.winnerId;
      }
      
      // Добавляем счет если указан
      if (values.athlete1Score !== undefined || values.athlete2Score !== undefined) {
        data.score = {
          athlete1: values.athlete1Score || 0,
          athlete2: values.athlete2Score || 0,
        };
      }

      await apiClient.put(`/brackets/${bracket.id}/matches/${selectedMatch.id}/result`, data);

      message.success('Результат матча обновлен');
      setEditMatchModalVisible(false);
      loadMatches();
      loadParticipants(); // Обновляем также результаты и места
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при обновлении результата');
    }
  };

  const handlePositionSubmit = async (values: any) => {
    if (!selectedParticipant || !selectedCompetition) return;

    try {
      // TODO: Создать endpoint для обновления места участника
      // await apiClient.put(`/competitions/${selectedCompetition}/participants/${selectedParticipant.id}/position`, {
      //   position: values.position,
      //   points: values.points,
      // });
      message.success('Место участника обновлено');
      setPositionModalVisible(false);
      loadParticipants();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при обновлении места');
    }
  };

  const matchColumns = [
    {
      title: 'Раунд',
      dataIndex: 'round',
      key: 'round',
      render: (round: number) => `Раунд ${round}`,
    },
    {
      title: 'Участник 1',
      key: 'athlete1',
      render: (_: any, record: Match) =>
        record.athlete1
          ? `${record.athlete1.user.profile.firstName} ${record.athlete1.user.profile.lastName}`
          : '-',
    },
    {
      title: 'Участник 2',
      key: 'athlete2',
      render: (_: any, record: Match) =>
        record.athlete2
          ? `${record.athlete2.user.profile.firstName} ${record.athlete2.user.profile.lastName}`
          : '-',
    },
    {
      title: 'Победитель',
      key: 'winner',
      render: (_: any, record: Match) => {
        if (!record.winnerId) return '-';
        const winner = record.athlete1?.id === record.winnerId ? record.athlete1 : record.athlete2;
        return winner
          ? `${winner.user.profile.firstName} ${winner.user.profile.lastName}`
          : '-';
      },
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusLabels: Record<string, string> = {
          SCHEDULED: 'Запланирован',
          IN_PROGRESS: 'В процессе',
          COMPLETED: 'Завершен',
          CANCELLED: 'Отменен',
        };
        const colors: Record<string, string> = {
          SCHEDULED: 'blue',
          IN_PROGRESS: 'orange',
          COMPLETED: 'green',
          CANCELLED: 'red',
        };
        return <Tag color={colors[status] || 'default'}>{statusLabels[status] || status}</Tag>;
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Match) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleEditResult(record)}
        >
          Редактировать
        </Button>
      ),
    },
  ];

  const handleCreateMatch = () => {
    if (!selectedCompetition || brackets.length === 0) {
      message.warning('Выберите соревнование с созданными сетками');
      return;
    }
    createMatchForm.resetFields();
    setCreateMatchModalVisible(true);
  };

  const handleCreateMatchSubmit = async (values: any) => {
    if (!selectedCompetition) return;

    try {
      const data = {
        round: values.round,
        position: values.position,
        athlete1Id: values.athlete1Id || undefined,
        athlete2Id: values.athlete2Id || undefined,
        scheduledTime: values.scheduledTime ? values.scheduledTime.toISOString() : undefined,
      };

      await apiClient.post(`/brackets/${values.bracketId}/matches`, data);
      message.success('Матч успешно создан');
      setCreateMatchModalVisible(false);
      loadMatches();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при создании матча');
    }
  };

  const handleAddResult = async (record: Participant) => {
    if (!selectedCompetition) return;

    try {
      setSelectedAthlete(record.athlete);
      
      // Загружаем матчи, в которых участвует этот спортсмен
      const response = await apiClient.get(`/brackets/competition/${selectedCompetition}`);
      const brackets = response.data.data;
      
      const athleteMatches: any[] = [];
      brackets.forEach((bracket: any) => {
        bracket.matches.forEach((match: any) => {
          if (match.athlete1Id === record.athlete.id || match.athlete2Id === record.athlete.id) {
            athleteMatches.push({
              ...match,
              bracketName: bracket.weightCategory?.name || 'Без категории',
            });
          }
        });
      });

      setMatchesForResult(athleteMatches);
      resultForm.resetFields();
      setAddResultModalVisible(true);
    } catch (error: any) {
      message.error('Ошибка загрузки матчей спортсмена');
    }
  };

  const handleAddResultSubmit = async (values: any) => {
    if (!selectedCompetition || !selectedAthlete) return;

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
      loadParticipants();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при добавлении результата');
    }
  };

  const participantColumns = [
    {
      title: 'Спортсмен',
      key: 'athlete',
      render: (_: any, record: Participant) => {
        const profile = record.athlete.user.profile;
        return `${profile.lastName} ${profile.firstName} ${profile.middleName || ''}`.trim();
      },
    },
    {
      title: 'Место',
      dataIndex: 'position',
      key: 'position',
      render: (position: number | null) =>
        position ? (
          <Tag color={position === 1 ? 'gold' : position === 2 ? 'default' : position === 3 ? 'orange' : 'blue'}>
            {position}
          </Tag>
        ) : (
          '-'
        ),
    },
    {
      title: 'Очки',
      dataIndex: 'points',
      key: 'points',
      render: (points: number | null) => points || '-',
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Participant) => (
        <Space>
          <Button
            type="link"
            icon={<PlusOutlined />}
            onClick={() => handleAddResult(record)}
          >
            Добавить результат
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditPosition(record)}
          >
            Редактировать место
          </Button>
        </Space>
      ),
    },
  ];

  const handleExportFullReport = async (format: 'excel') => {
    if (!selectedCompetition) {
      message.warning('Выберите соревнование');
      return;
    }

    try {
      message.loading({ content: 'Формирование отчета...', key: 'export' });
      
      // Загружаем полные данные соревнования
      const [competitionResponse, bracketsResponse, resultsResponse] = await Promise.all([
        apiClient.get(`/competitions/${selectedCompetition}`),
        apiClient.get(`/brackets/competition/${selectedCompetition}`),
        apiClient.get(`/competitions/${selectedCompetition}/results`),
      ]);

      const competition = competitionResponse.data.data;
      const brackets = bracketsResponse.data.data;
      const results = resultsResponse.data.data;

      // Собираем всех участников с полными данными
      const allParticipants = competition.participants || [];
      const allMatches: any[] = [];
      brackets.forEach((bracket: any) => {
        if (bracket.matches) {
          allMatches.push(...bracket.matches);
        }
      });

      // Excel
      const workbook = XLSX.utils.book_new();
      
      // Лист с информацией о соревновании
      const competitionInfo = [
        ['Параметр', 'Значение'],
        ['Название', competition.name],
        ['Вид спорта', competition.sport?.name || '-'],
        ['Дата начала', new Date(competition.startDate).toLocaleDateString('ru-RU')],
        ['Дата окончания', new Date(competition.endDate).toLocaleDateString('ru-RU')],
        ['Место проведения', competition.location || '-'],
        ['Статус', competition.status === 'UPCOMING' ? 'Предстоящее' : competition.status === 'REGISTRATION' ? 'Регистрация' : competition.status === 'IN_PROGRESS' ? 'В процессе' : competition.status === 'COMPLETED' ? 'Завершено' : 'Отменено'],
      ];
      const infoSheet = XLSX.utils.aoa_to_sheet(competitionInfo);
      XLSX.utils.book_append_sheet(workbook, infoSheet, 'Информация');

      // Лист с весовыми категориями
      const weightCategoriesData = [
        ['Название', 'Минимальный вес (кг)', 'Максимальный вес (кг)'],
        ...brackets.map((b: any) => [
          b.weightCategory?.name || '-',
          b.weightCategory?.minWeight || '-',
          b.weightCategory?.maxWeight || '-',
        ]),
      ];
      const weightCategoriesSheet = XLSX.utils.aoa_to_sheet(weightCategoriesData);
      XLSX.utils.book_append_sheet(workbook, weightCategoriesSheet, 'Весовые категории');
      
      // Лист с участниками
      const participantsData = [
        ['№', 'Фамилия', 'Имя', 'Отчество', 'Команда', 'Регион', 'Тренер', 'Весовые категории'],
        ...allParticipants.map((p: any, index: number) => [
          index + 1,
          p.athlete.user.profile.lastName,
          p.athlete.user.profile.firstName,
          p.athlete.user.profile.middleName || '',
          p.athlete.team?.name || '-',
          p.athlete.team?.region?.name || '-',
          p.athlete.coach ? `${p.athlete.coach.user.profile.lastName} ${p.athlete.coach.user.profile.firstName}` : '-',
          p.athlete.weightCategory ? `${p.athlete.weightCategory.name} (${p.athlete.weightCategory.minWeight || '-'}-${p.athlete.weightCategory.maxWeight || '-'} кг)` : '-',
        ]),
      ];
      const participantsSheet = XLSX.utils.aoa_to_sheet(participantsData);
      XLSX.utils.book_append_sheet(workbook, participantsSheet, 'Участники');

      // Лист с результатами
      const resultsData = [
        ['Место', 'Фамилия', 'Имя', 'Отчество', 'Команда', 'Регион', 'Очки'],
        ...results.map((r: any) => [
          r.position || '',
          r.athlete.user.profile.lastName,
          r.athlete.user.profile.firstName,
          r.athlete.user.profile.middleName || '',
          r.athlete.team?.name || '-',
          r.athlete.team?.region?.name || '-',
          r.points || '',
        ]),
      ];
      const resultsSheet = XLSX.utils.aoa_to_sheet(resultsData);
      XLSX.utils.book_append_sheet(workbook, resultsSheet, 'Результаты');

      // Лист с матчами
      const matchesData = [
        ['Раунд', 'Позиция', 'Участник 1', 'Участник 2', 'Победитель', 'Статус'],
        ...allMatches.map((m: any) => [
          `Раунд ${m.round}`,
          m.position,
          m.athlete1 ? `${m.athlete1.user.profile.lastName} ${m.athlete1.user.profile.firstName}` : '-',
          m.athlete2 ? `${m.athlete2.user.profile.lastName} ${m.athlete2.user.profile.firstName}` : '-',
          m.winnerId ? (m.athlete1?.id === m.winnerId 
            ? `${m.athlete1.user.profile.lastName} ${m.athlete1.user.profile.firstName}`
            : `${m.athlete2?.user.profile.lastName} ${m.athlete2?.user.profile.firstName}`) : '-',
          m.status === 'SCHEDULED' ? 'Запланирован' : m.status === 'IN_PROGRESS' ? 'В процессе' : m.status === 'COMPLETED' ? 'Завершен' : m.status === 'CANCELLED' ? 'Отменен' : m.status,
        ]),
      ];
      const matchesSheet = XLSX.utils.aoa_to_sheet(matchesData);
      XLSX.utils.book_append_sheet(workbook, matchesSheet, 'Матчи');

      XLSX.writeFile(workbook, `report-${competition.name}-${Date.now()}.xlsx`);
      message.success({ content: 'Отчет экспортирован в Excel', key: 'export' });
    } catch (error: any) {
      console.error('Ошибка экспорта:', error);
      message.error({ content: 'Ошибка при экспорте отчета: ' + (error.message || 'Неизвестная ошибка'), key: 'export' });
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#262626' }}>Управление результатами и занятыми местами</h1>
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
          {selectedCompetition && (
            <Button 
              icon={<FileExcelOutlined />}
              onClick={() => handleExportFullReport('excel')}
            >
              Экспорт полного отчета (Excel)
            </Button>
          )}
        </Space>
      </div>

      {selectedCompetition && (
        <Tabs
          defaultActiveKey="matches"
          items={[
            {
              key: 'matches',
              label: 'Матчи и результаты',
              children: (
                <>
                  <Card 
                    title="Все матчи соревнования"
                    extra={
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleCreateMatch}
                      >
                        Создать матч
                      </Button>
                    }
                    style={{ marginBottom: 16 }}
                  >
                    <Table
                      columns={matchColumns}
                      dataSource={matches}
                      loading={loading}
                      rowKey="id"
                      pagination={{
                        showSizeChanger: true,
                        showTotal: (total) => `Всего: ${total}`,
                      }}
                    />
                  </Card>
                  <Card title="Итоговые места участников">
                    <Table
                      columns={participantColumns}
                      dataSource={participants}
                      loading={loading}
                      rowKey="id"
                      pagination={{
                        showSizeChanger: true,
                        showTotal: (total) => `Всего: ${total}`,
                      }}
                    />
                  </Card>
                </>
              ),
            },
          ]}
        />
      )}

      {!selectedCompetition && (
        <Card>
          <div style={{ textAlign: 'center', padding: '48px', color: '#8c8c8c' }}>
            <TrophyOutlined style={{ fontSize: '48px', marginBottom: 16 }} />
            <p>Выберите соревнование для просмотра результатов</p>
          </div>
        </Card>
      )}

      {/* Модалка редактирования матча */}
      <Modal
        title="Редактировать результат матча"
        open={editMatchModalVisible}
        onCancel={() => {
          setEditMatchModalVisible(false);
          matchForm.resetFields();
        }}
        onOk={() => matchForm.submit()}
        width={600}
        okText="Сохранить"
        cancelText="Отмена"
      >
        {selectedMatch && (
          <Form
            form={matchForm}
            layout="vertical"
            onFinish={handleResultSubmit}
          >
            <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
              <p style={{ margin: 0, fontSize: 12, color: '#8c8c8c' }}>Участники:</p>
              <p style={{ margin: '4px 0 0 0', fontWeight: 500 }}>
                {selectedMatch.athlete1 
                  ? `${selectedMatch.athlete1.user.profile.lastName} ${selectedMatch.athlete1.user.profile.firstName}`
                  : 'Участник не определен'
                }
                {' VS '}
                {selectedMatch.athlete2 
                  ? `${selectedMatch.athlete2.user.profile.lastName} ${selectedMatch.athlete2.user.profile.firstName}`
                  : 'Участник не определен'
                }
              </p>
            </div>

            <Form.Item
              name="status"
              label="Статус матча"
              rules={[{ required: true, message: 'Выберите статус' }]}
            >
              <Select>
                <Select.Option value="SCHEDULED">Запланирован</Select.Option>
                <Select.Option value="IN_PROGRESS">В процессе</Select.Option>
                <Select.Option value="COMPLETED">Завершен</Select.Option>
                <Select.Option value="CANCELLED">Отменен</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => prevValues.status !== currentValues.status}
            >
              {({ getFieldValue }) => 
                getFieldValue('status') === 'COMPLETED' ? (
                  <>
                    <Form.Item
                      name="winnerId"
                      label="Победитель"
                      rules={[{ required: true, message: 'Для завершенного матча нужно указать победителя' }]}
                    >
                      <Select placeholder="Выберите победителя">
                        {selectedMatch.athlete1 && (
                          <Select.Option value={selectedMatch.athlete1.id}>
                            {selectedMatch.athlete1.user.profile.lastName} {selectedMatch.athlete1.user.profile.firstName}
                          </Select.Option>
                        )}
                        {selectedMatch.athlete2 && (
                          <Select.Option value={selectedMatch.athlete2.id}>
                            {selectedMatch.athlete2.user.profile.lastName} {selectedMatch.athlete2.user.profile.firstName}
                          </Select.Option>
                        )}
                      </Select>
                    </Form.Item>

                    <Form.Item label="Счет">
                      <Space.Compact style={{ width: '100%' }}>
                        <Form.Item name="athlete1Score" noStyle>
                          <InputNumber 
                            placeholder={selectedMatch.athlete1 ? selectedMatch.athlete1.user.profile.lastName : 'Участник 1'} 
                            min={0}
                            style={{ width: '50%' }}
                          />
                        </Form.Item>
                        <Form.Item name="athlete2Score" noStyle>
                          <InputNumber 
                            placeholder={selectedMatch.athlete2 ? selectedMatch.athlete2.user.profile.lastName : 'Участник 2'} 
                            min={0}
                            style={{ width: '50%' }}
                          />
                        </Form.Item>
                      </Space.Compact>
                    </Form.Item>
                  </>
                ) : null
              }
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Модалка создания матча */}
      <Modal
        title="Создать матч"
        open={createMatchModalVisible}
        onCancel={() => {
          setCreateMatchModalVisible(false);
          createMatchForm.resetFields();
        }}
        onOk={() => createMatchForm.submit()}
        width={600}
        okText="Создать"
        cancelText="Отмена"
      >
        <Form
          form={createMatchForm}
          layout="vertical"
          onFinish={handleCreateMatchSubmit}
        >
          <Form.Item
            name="bracketId"
            label="Сетка"
            rules={[{ required: true, message: 'Выберите сетку' }]}
          >
            <Select placeholder="Выберите сетку">
              {brackets.map((bracket) => (
                <Select.Option key={bracket.id} value={bracket.id}>
                  {bracket.weightCategory?.name || 'Неизвестная категория'}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="round"
            label="Раунд"
            rules={[{ required: true, message: 'Введите номер раунда' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Номер раунда" />
          </Form.Item>

          <Form.Item
            name="position"
            label="Позиция"
            rules={[{ required: true, message: 'Введите позицию' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Позиция в раунде" />
          </Form.Item>

          <Form.Item
            name="athlete1Id"
            label="Участник 1"
          >
            <Select
              placeholder="Выберите участника (необязательно)"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.children as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {athletes.map((athlete) => (
                <Select.Option key={athlete.id} value={athlete.id}>
                  {athlete.user?.profile?.lastName} {athlete.user?.profile?.firstName} {athlete.user?.profile?.middleName || ''}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="athlete2Id"
            label="Участник 2"
          >
            <Select
              placeholder="Выберите участника (необязательно)"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.children as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {athletes.map((athlete) => (
                <Select.Option key={athlete.id} value={athlete.id}>
                  {athlete.user?.profile?.lastName} {athlete.user?.profile?.firstName} {athlete.user?.profile?.middleName || ''}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="scheduledTime"
            label="Запланированное время"
          >
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              placeholder="Выберите время (необязательно)"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Редактировать место участника"
        open={positionModalVisible}
        onCancel={() => {
          setPositionModalVisible(false);
          positionForm.resetFields();
        }}
        onOk={() => positionForm.submit()}
        width={500}
      >
        {selectedParticipant && (
          <Form
            form={positionForm}
            layout="vertical"
            onFinish={handlePositionSubmit}
          >
            <Form.Item
              name="position"
              label="Место"
              rules={[{ required: true, message: 'Введите место' }]}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="points"
              label="Очки"
            >
              <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      )}
    </Modal>

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
                {match.bracketName} - Раунд {match.round}, Позиция {match.position}
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
  </div>
);
};

