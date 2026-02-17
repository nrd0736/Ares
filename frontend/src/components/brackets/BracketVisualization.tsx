/**
 * Компонент визуализации турнирных сеток
 * 
 * Функциональность:
 * - Отображение турнирной сетки с использованием ReactFlow
 * - Интерактивное управление матчами
 * - Редактирование результатов матчей
 * - Экспорт сетки в изображение (PNG) и PDF
 * - Фильтрация по весовым категориям
 * - Управление расписанием матчей
 * 
 * Использует:
 * - ReactFlow для визуализации графа
 * - html2canvas для экспорта в изображение
 * - jsPDF для экспорта в PDF
 * 
 * Особенности:
 * - Real-time обновления через Socket.IO
 * - Поддержка различных типов сеток
 */

import { useState, useEffect } from 'react';
import { Card, Select, Button, Space, Spin, message, Dropdown, Modal, Form, Radio, Table, InputNumber, DatePicker, TimePicker } from 'antd';
import { DownloadOutlined, FileImageOutlined, FilePdfOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Position,
  Handle,
} from 'reactflow';
import 'reactflow/dist/style.css';
import apiClient from '../../services/api-client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { generateSimpleBracket } from './generate-bracket-simple';
import './BracketVisualization.css';

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
        middleName?: string;
      };
    };
    team?: {
      name: string;
      region?: {
        name: string;
      };
    };
  };
  athlete2?: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
        middleName?: string;
      };
    };
    team?: {
      name: string;
      region?: {
        name: string;
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
  scheduledTime?: string;
}

interface Bracket {
  id: string;
  type: string;
  weightCategory?: {
    name: string;
  } | null;
  competition?: {
    id: string;
    name: string;
    competitionType?: 'INDIVIDUAL' | 'TEAM';
  };
  matches: Match[];
}

interface BracketVisualizationProps {
  competitionId: string;
  bracketId?: string;
}

// Кастомный компонент для узла участника
const AthleteNode = ({ data }: any) => {
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <div
        className={`athlete-node ${data.isWinner ? 'winner' : ''} ${data.isFinalWinner ? 'final-winner' : ''}`}
        onClick={data.onClick}
      >
        <div className="athlete-node-number">{data.number}</div>
        <div className="athlete-node-info">
          <div className="athlete-node-name">{data.name}</div>
          <div className="athlete-node-region">{data.region}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </>
  );
};

const nodeTypes = {
  athlete: AthleteNode,
};

interface AthleteMap {
  [athleteId: string]: {
    number: number;
    name: string;
    region: string;
  };
}

export const BracketVisualization: React.FC<BracketVisualizationProps> = ({
  competitionId,
  bracketId,
}) => {
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [selectedBracket, setSelectedBracket] = useState<Bracket | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editForm] = Form.useForm();
  const [results, setResults] = useState<any[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    loadBrackets();
  }, [competitionId]);

  useEffect(() => {
    if (selectedBracket) {
      loadResults();
      generateFlowDiagram();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBracket]);

  const loadBrackets = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/brackets/competition/${competitionId}`);
      const bracketsData = response.data.data;
      setBrackets(bracketsData);
      
      // Обновляем selectedBracket, если он уже был выбран
      if (selectedBracket) {
        const updatedBracket = bracketsData.find((b: Bracket) => b.id === selectedBracket.id);
        if (updatedBracket) {
          // Создаем новый объект, чтобы React увидел изменение и вызвал useEffect
          setSelectedBracket({ ...updatedBracket });
        }
      } else if (bracketId) {
        const bracket = bracketsData.find((b: Bracket) => b.id === bracketId);
        if (bracket) {
          setSelectedBracket(bracket);
        }
      } else if (bracketsData.length > 0) {
        setSelectedBracket(bracketsData[0]);
      }
    } catch (error) {
      console.error('Ошибка загрузки турнирных сеток', error);
    } finally {
      setLoading(false);
    }
  };

  const loadResults = async () => {
    if (!selectedBracket) return;
    
    try {
      const response = await apiClient.get(`/competitions/${competitionId}/results`);
      setResults(response.data.data || []);
    } catch (error) {
      console.error('Ошибка загрузки результатов', error);
    }
  };

  const getAthleteName = (athlete: any) => {
    if (!athlete) return '—';
    // Если это команда
    if (athlete.name) return athlete.name;
    // Если это спортсмен
    const profile = athlete.user?.profile;
    if (!profile) return '—';
    return `${profile.lastName} ${profile.firstName}`.trim();
  };

  const getAthleteRegion = (athlete: any) => {
    if (!athlete) return '';
    // Если это команда
    if (athlete.region?.name) return athlete.region.name;
    if (athlete.name && !athlete.user) return ''; // Команда без региона
    // Если это спортсмен
    return athlete.team?.region?.name || athlete.team?.name || '';
  };

  const getMatchWinner = (match: Match | undefined) => {
    if (!match) return null;
    // Проверяем командный матч
    if (match.team1 || match.team2) {
      const winnerTeamId = match.winnerTeamId || match.winnerId;
      if (!winnerTeamId) return null;
      if (match.team1?.id === winnerTeamId) return match.team1;
      if (match.team2?.id === winnerTeamId) return match.team2;
      return null;
    }
    // Индивидуальный матч
    if (!match.winnerId) return null;
    if (match.athlete1?.id === match.winnerId) return match.athlete1;
    if (match.athlete2?.id === match.winnerId) return match.athlete2;
    return null;
  };

  const handleNodeClick = (matchId: string) => {
    const match = selectedBracket?.matches.find((m) => m.id === matchId);
    if (match) {
      setEditingMatch(match);
      const isTeamMatch = !!(match.team1 || match.team2);
      editForm.setFieldsValue({
        winnerId: isTeamMatch ? undefined : (match.winnerId || undefined),
        winnerTeamId: isTeamMatch ? (match.winnerTeamId || undefined) : undefined,
        status: match.status || 'SCHEDULED',
        athlete1Score: isTeamMatch 
          ? (match.score?.team1 || undefined)
          : (match.score?.athlete1 || undefined),
        athlete2Score: isTeamMatch 
          ? (match.score?.team2 || undefined)
          : (match.score?.athlete2 || undefined),
        scheduledDate: match.scheduledTime ? dayjs(match.scheduledTime) : undefined,
        scheduledTime: match.scheduledTime ? dayjs(match.scheduledTime) : undefined,
      });
    } else {
      message.error('Матч не найден');
    }
  };

  const generateFlowDiagram = () => {
    if (!selectedBracket || !selectedBracket.matches || selectedBracket.matches.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const isTeamCompetition = selectedBracket.competition?.competitionType === 'TEAM';
    const { nodes: newNodes, edges: newEdges } = generateSimpleBracket(
      selectedBracket.matches,
      getAthleteName,
      getAthleteRegion,
      getMatchWinner,
      handleNodeClick,
      isTeamCompetition
    );

    setNodes(newNodes);
    setEdges(newEdges);
  };

  const handleSaveMatch = async () => {
    if (!editingMatch || !selectedBracket) return;

    try {
      const values = await editForm.validateFields();
      
      // Определяем тип матча: командный или индивидуальный
      const isTeamMatch = !!(editingMatch.team1 || editingMatch.team2);
      const winnerId = isTeamMatch ? values.winnerTeamId : values.winnerId;
      
      // Если статус COMPLETED, обязательно указываем победителя
      if (values.status === 'COMPLETED' && !winnerId) {
        message.error('Для завершенного матча необходимо указать победителя');
        return;
      }
      
      const data: any = {
        status: values.status,
      };
      
      // Добавляем победителя если указан (для командных или индивидуальных)
      if (isTeamMatch) {
        if (values.winnerTeamId) {
          data.winnerTeamId = values.winnerTeamId;
        }
      } else {
        if (values.winnerId) {
          data.winnerId = values.winnerId;
        }
      }
      
      // Добавляем счет если указан (для командных или индивидуальных соревнований)
      if (values.athlete1Score !== undefined || values.athlete2Score !== undefined) {
        if (isTeamMatch) {
          data.score = {
            team1: values.athlete1Score !== undefined ? values.athlete1Score : 0,
            team2: values.athlete2Score !== undefined ? values.athlete2Score : 0,
          };
        } else {
          data.score = {
            athlete1: values.athlete1Score !== undefined ? values.athlete1Score : 0,
            athlete2: values.athlete2Score !== undefined ? values.athlete2Score : 0,
          };
        }
      }
      
      // Обновляем результат матча (критично - если ошибка, показываем пользователю)
      const resultResponse = await apiClient.put(
        `/brackets/${selectedBracket.id}/matches/${editingMatch.id}/result`,
        data
      );
      
      // Показываем успех сразу после сохранения результата
      message.success('Результат матча обновлен');
      
      // Обновляем расписание матча отдельно, если указаны дата и время
      // НО: если матч завершен (COMPLETED), удаляем расписание, так как схватка уже прошла
      // Это НЕ критично - даже если ошибка, результат уже сохранен
      // Выполняем в отдельном блоке, чтобы ошибки не влияли на основной процесс
      (async () => {
        try {
        if (values.status === 'COMPLETED') {
          // Если матч завершен, удаляем расписание
          if (editingMatch.scheduledTime) {
            try {
              await apiClient.put(`/brackets/match/${editingMatch.id}`, {
                scheduledTime: null,
              });
            } catch (deleteError: any) {
              // Игнорируем ошибку при удалении расписания для завершенного матча
            }
          }
        } else {
          // Для незавершенных матчей обновляем расписание, если указаны дата и время
          let scheduledDateTime: string | null = null;
          
          if (values.scheduledDate && values.scheduledTime) {
            // Если указаны и дата, и время, объединяем их
            const scheduledDate = values.scheduledDate.format('YYYY-MM-DD');
            const scheduledTime = values.scheduledTime.format('HH:mm');
            scheduledDateTime = dayjs(`${scheduledDate} ${scheduledTime}`).toISOString();
          } else if (values.scheduledDate && editingMatch.scheduledTime) {
            // Если указана только дата, используем существующее время
            const scheduledDate = values.scheduledDate.format('YYYY-MM-DD');
            const existingTime = dayjs(editingMatch.scheduledTime).format('HH:mm');
            scheduledDateTime = dayjs(`${scheduledDate} ${existingTime}`).toISOString();
          } else if (values.scheduledTime && editingMatch.scheduledTime) {
            // Если указано только время, используем существующую дату
            const existingDate = dayjs(editingMatch.scheduledTime).format('YYYY-MM-DD');
            const scheduledTime = values.scheduledTime.format('HH:mm');
            scheduledDateTime = dayjs(`${existingDate} ${scheduledTime}`).toISOString();
          } else if (values.scheduledDate && !editingMatch.scheduledTime) {
            // Если указана только дата, но нет существующего времени, используем время по умолчанию (10:00)
            const scheduledDate = values.scheduledDate.format('YYYY-MM-DD');
            scheduledDateTime = dayjs(`${scheduledDate} 10:00`).toISOString();
          } else if (values.scheduledTime && !editingMatch.scheduledTime) {
            // Если указано только время, но нет существующей даты, используем сегодняшнюю дату
            const scheduledDate = dayjs().format('YYYY-MM-DD');
            const scheduledTime = values.scheduledTime.format('HH:mm');
            scheduledDateTime = dayjs(`${scheduledDate} ${scheduledTime}`).toISOString();
          }
          
          // Обновляем расписание, если есть изменения или нужно удалить
          if (scheduledDateTime !== null) {
            try {
              await apiClient.put(`/brackets/match/${editingMatch.id}`, {
                scheduledTime: scheduledDateTime,
              });
            } catch (updateError: any) {
              // Не критично - результат матча уже сохранен
            }
          } else if (values.scheduledDate === null && values.scheduledTime === null && editingMatch.scheduledTime) {
            // Удаляем расписание, если пользователь явно удалил дату и время
            try {
              await apiClient.put(`/brackets/match/${editingMatch.id}`, {
                scheduledTime: null,
              });
            } catch (deleteError: any) {
              // Не критично - результат матча уже сохранен
            }
          }
        }
        
          // Уведомляем об обновлении расписания
          window.dispatchEvent(new CustomEvent('bracket-match-updated', {
            detail: { bracketId: selectedBracket.id, competitionId, matchId: editingMatch.id }
          }));
        } catch (scheduleError: any) {
          // НЕ показываем ошибку пользователю - обновление расписания не критично
        }
      })();
      
      // Обновляем локальное состояние матча сразу, используя данные из формы
      if (selectedBracket && selectedBracket.matches) {
        const isTeamMatch = !!(editingMatch.team1 || editingMatch.team2);
        const updatedMatches = selectedBracket.matches.map(match => {
          if (match.id === editingMatch.id) {
            const updatedMatch: any = {
              ...match,
              status: values.status,
              score: values.athlete1Score !== undefined || values.athlete2Score !== undefined
                ? (isTeamMatch
                    ? {
                        team1: values.athlete1Score !== undefined ? values.athlete1Score : 0,
                        team2: values.athlete2Score !== undefined ? values.athlete2Score : 0,
                      }
                    : {
                        athlete1: values.athlete1Score !== undefined ? values.athlete1Score : 0,
                        athlete2: values.athlete2Score !== undefined ? values.athlete2Score : 0,
                      })
                : match.score
            };
            
            // Обновляем победителя в зависимости от типа матча
            if (isTeamMatch) {
              updatedMatch.winnerTeamId = values.winnerTeamId || match.winnerTeamId;
            } else {
              updatedMatch.winnerId = values.winnerId || match.winnerId;
            }
            
            return updatedMatch;
          }
          return match;
        });
        
        // Если матч завершен и есть победитель, обновляем участников следующего раунда
        const winnerId = isTeamMatch ? values.winnerTeamId : values.winnerId;
        if (values.status === 'COMPLETED' && winnerId && editingMatch.round) {
          const nextRound = editingMatch.round + 1;
          const nextPosition = Math.ceil(editingMatch.position / 2);
          const isFirstPosition = editingMatch.position % 2 === 1;
          
          // Находим матч следующего раунда
          const nextMatch = updatedMatches.find(m => 
            m.round === nextRound && m.position === nextPosition
          );
          
          if (nextMatch) {
            // Находим победителя в списке участников
            let winner = null;
            if (isTeamMatch) {
              winner = editingMatch.team1?.id === winnerId 
                ? editingMatch.team1 
                : editingMatch.team2?.id === winnerId 
                ? editingMatch.team2 
                : null;
            } else {
              winner = editingMatch.athlete1?.id === winnerId 
                ? editingMatch.athlete1 
                : editingMatch.athlete2?.id === winnerId 
                ? editingMatch.athlete2 
                : null;
            }
            
            if (winner) {
              // Обновляем участников следующего матча
              const updatedNextMatch = { ...nextMatch };
              if (isTeamMatch) {
                if (isFirstPosition) {
                  updatedNextMatch.team1 = winner;
                } else {
                  updatedNextMatch.team2 = winner;
                }
              } else {
                if (isFirstPosition) {
                  updatedNextMatch.athlete1 = winner;
                } else {
                  updatedNextMatch.athlete2 = winner;
                }
              }
              
              // Заменяем матч в массиве
              const nextMatchIndex = updatedMatches.findIndex(m => m.id === nextMatch.id);
              if (nextMatchIndex !== -1) {
                updatedMatches[nextMatchIndex] = updatedNextMatch;
              }
            }
          }
        }
        
        const updatedBracket = {
          ...selectedBracket,
          matches: updatedMatches
        };
        
        // Обновляем selectedBracket с новыми данными
        setSelectedBracket(updatedBracket);
        
        // НЕМЕДЛЕННО генерируем диаграмму с обновленными данными
        const isTeamCompetition = updatedBracket.competition?.competitionType === 'TEAM';
        const { nodes: newNodes, edges: newEdges } = generateSimpleBracket(
          updatedBracket.matches,
          getAthleteName,
          getAthleteRegion,
          getMatchWinner,
          handleNodeClick,
          isTeamCompetition
        );
        
        // Обновляем визуализацию
        setNodes(newNodes);
        setEdges(newEdges);
      }
      
      setEditingMatch(null);
      
      // Сохраняем ID текущей сетки до асинхронных операций
      const currentBracketId = selectedBracket.id;
      
      // Затем загружаем обновленные данные с сервера для синхронизации
      // Используем более короткую задержку и перезагружаем сразу после сохранения
      setTimeout(async () => {
        try {
          const response = await apiClient.get(`/brackets/competition/${competitionId}`);
          const bracketsData = response.data.data;
          setBrackets(bracketsData);
          
          const serverBracket = bracketsData.find((b: Bracket) => b.id === currentBracketId);
          if (serverBracket) {
            setSelectedBracket(serverBracket);
            // Регенерируем с данными с сервера
            const isTeamCompetition = serverBracket.competition?.competitionType === 'TEAM';
            const { nodes: newNodes, edges: newEdges } = generateSimpleBracket(
              serverBracket.matches,
              getAthleteName,
              getAthleteRegion,
              getMatchWinner,
              handleNodeClick,
              isTeamCompetition
            );
            setNodes(newNodes);
            setEdges(newEdges);
          }
        } catch (error) {
          console.error('Ошибка при загрузке обновленных данных с сервера', error);
        }
      }, 300);
      
      // Обновляем таблицу результатов (не критично, если ошибка)
      try {
        loadResults();
      } catch (error) {
        console.warn('Ошибка при обновлении таблицы результатов (не критично):', error);
      }
      
      // Уведомляем родительский компонент об обновлении
      window.dispatchEvent(new CustomEvent('bracket-match-updated', {
        detail: { bracketId: currentBracketId, competitionId }
      }));
    } catch (error: any) {
      // Показываем ошибку только если это критичная ошибка при сохранении результата
      // Все остальные ошибки (расписание, загрузка результатов) не критичны
      const errorMessage = error.response?.data?.message || error.message || '';
      const isScheduleError = errorMessage.includes('расписание') || 
                              errorMessage.includes('schedule') ||
                              errorMessage.includes('scheduled');
      
      if (!isScheduleError) {
        // Только критические ошибки показываем пользователю
        console.error('Критическая ошибка при сохранении результата:', error);
        message.error(errorMessage || 'Ошибка при сохранении результата');
      }
    }
  };

  const handleExportPNG = async () => {
    const flowElement = document.querySelector('.react-flow') as HTMLElement;
    if (!flowElement) return;

    try {
      const canvas = await html2canvas(flowElement, {
        useCORS: true,
        logging: false,
        scale: 2,
        backgroundColor: '#fff',
      });

      const link = document.createElement('a');
      link.download = `bracket-${selectedBracket?.id || 'export'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      message.success('Сетка экспортирована как PNG');
    } catch (error) {
      message.error('Ошибка при экспорте PNG');
    }
  };

  const handleExportPDF = async () => {
    const flowElement = document.querySelector('.react-flow') as HTMLElement;
    if (!flowElement) return;

    try {
      const canvas = await html2canvas(flowElement, {
        useCORS: true,
        logging: false,
        scale: 2,
        backgroundColor: '#fff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`bracket-${selectedBracket?.id || 'export'}.pdf`);
      message.success('Сетка экспортирована как PDF');
    } catch (error) {
      message.error('Ошибка при экспорте PDF');
    }
  };

  const isTeamCompetition = selectedBracket?.competition?.competitionType === 'TEAM';
  
  const resultsColumns = isTeamCompetition
    ? [
        {
          title: 'МЕСТО',
          dataIndex: 'position',
          key: 'position',
          width: 80,
        },
        {
          title: 'КОМАНДА',
          key: 'name',
          render: (record: any) => record.team?.name || '—',
        },
        {
          title: 'РЕГИОН',
          key: 'region',
          render: (record: any) => record.team?.region?.name || '—',
        },
      ]
    : [
        {
          title: 'МЕСТО',
          dataIndex: 'position',
          key: 'position',
          width: 80,
        },
        {
          title: 'ФИО',
          key: 'name',
          render: (record: any) => getAthleteName(record.athlete),
        },
        {
          title: 'КОМАНДА',
          key: 'team',
          render: (record: any) => getAthleteRegion(record.athlete),
        },
      ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (brackets.length === 0) {
    return <div style={{ textAlign: 'center', padding: '48px' }}>Нет турнирных сеток</div>;
  }

  return (
    <div>
      {selectedBracket && (
        <Card
          title={`Турнирная сетка: ${selectedBracket.weightCategory?.name || 'Командное соревнование'}`}
          extra={
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'png',
                    label: 'Экспорт как PNG',
                    icon: <FileImageOutlined />,
                    onClick: handleExportPNG,
                  },
                  {
                    key: 'pdf',
                    label: 'Экспорт как PDF',
                    icon: <FilePdfOutlined />,
                    onClick: handleExportPDF,
                  },
                ],
              }}
            >
              <Button icon={<DownloadOutlined />}>Экспорт</Button>
            </Dropdown>
          }
        >
          <div style={{ display: 'flex', gap: '20px', background: '#fff' }}>
            <div style={{ flex: 1, height: '800px' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                attributionPosition="bottom-left"
              >
                <Background />
                <Controls />
              </ReactFlow>
            </div>
            <div style={{ width: '300px', padding: '20px' }}>
              <h3 style={{ marginBottom: '16px' }}>ИТОГОВАЯ ТАБЛИЦА</h3>
              <Table
                dataSource={results}
                columns={resultsColumns}
                pagination={false}
                size="small"
                rowKey={(record) => isTeamCompetition ? (record.teamId || record.team?.id || Math.random()) : (record.athleteId || record.athlete?.id || Math.random())}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Модальное окно для редактирования результата матча */}
      <Modal
        title="Редактировать результат матча"
        open={!!editingMatch}
        onOk={handleSaveMatch}
        onCancel={() => {
          setEditingMatch(null);
          editForm.resetFields();
        }}
        okText="Сохранить"
        cancelText="Отмена"
        width={600}
      >
        {editingMatch && (
          <Form form={editForm} layout="vertical">
            {/* Информация об участниках */}
            <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
              <div style={{ marginBottom: 8 }}>
                {(() => {
                  const isTeamMatch = !!(editingMatch.team1 || editingMatch.team2);
                  const participant1 = isTeamMatch ? editingMatch.team1 : editingMatch.athlete1;
                  return participant1 ? (
                    <>
                      <strong>{getAthleteName(participant1)}</strong>
                      <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        {getAthleteRegion(participant1)}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: '#8c8c8c', fontStyle: 'italic' }}>
                      Участник будет определен после завершения предыдущего раунда
                    </div>
                  );
                })()}
              </div>
              <div style={{ textAlign: 'center', margin: '8px 0', fontWeight: 600, color: '#1890ff' }}>
                VS
              </div>
              <div>
                {(() => {
                  const isTeamMatch = !!(editingMatch.team1 || editingMatch.team2);
                  const participant2 = isTeamMatch ? editingMatch.team2 : editingMatch.athlete2;
                  return participant2 ? (
                    <>
                      <strong>{getAthleteName(participant2)}</strong>
                      <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        {getAthleteRegion(participant2)}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: '#8c8c8c', fontStyle: 'italic' }}>
                      Участник будет определен после завершения предыдущего раунда
                    </div>
                  );
                })()}
              </div>
              <div style={{ marginTop: 8, fontSize: '12px', color: '#8c8c8c' }}>
                Раунд {editingMatch.round}, Позиция {editingMatch.position}
              </div>
            </div>

            {/* Статус матча */}
            <Form.Item
              name="status"
              label="Статус матча"
              rules={[{ required: true, message: 'Выберите статус' }]}
            >
              <Radio.Group>
                <Radio value="SCHEDULED">Запланирован</Radio>
                <Radio value="IN_PROGRESS">В процессе</Radio>
                <Radio value="COMPLETED">Завершен</Radio>
                <Radio value="CANCELLED">Отменен</Radio>
              </Radio.Group>
            </Form.Item>

            {/* Расписание матча - показываем только если статус SCHEDULED или IN_PROGRESS */}
            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => prevValues.status !== currentValues.status}
            >
              {({ getFieldValue }) => {
                const status = getFieldValue('status');
                const isScheduled = status === 'SCHEDULED' || status === 'IN_PROGRESS';
                
                return isScheduled ? (
                  <>
                    {/* Отображение текущего расписания, если есть */}
                    {editingMatch.scheduledTime && (
                      <div style={{ marginBottom: 16, padding: 12, background: '#e6f7ff', borderRadius: 4, border: '1px solid #91d5ff' }}>
                        <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: 4 }}>Текущее расписание:</div>
                        <div style={{ fontSize: '16px', color: '#1890ff', fontWeight: 600 }}>
                          📅 {dayjs(editingMatch.scheduledTime).format('DD.MM.YYYY')} в {dayjs(editingMatch.scheduledTime).format('HH:mm')}
                        </div>
                      </div>
                    )}
                    
                    <Form.Item
                      label="Дата схватки"
                      name="scheduledDate"
                      tooltip="Выберите дату проведения схватки"
                    >
                      <DatePicker
                        style={{ width: '100%' }}
                        format="DD.MM.YYYY"
                        placeholder="Выберите дату"
                        allowClear
                      />
                    </Form.Item>
                    
                    <Form.Item
                      label="Время схватки"
                      name="scheduledTime"
                      tooltip="Выберите время проведения схватки"
                    >
                      <TimePicker
                        style={{ width: '100%' }}
                        format="HH:mm"
                        placeholder="Выберите время"
                        showNow
                        allowClear
                      />
                    </Form.Item>
                    
                    <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: -8, marginBottom: 16 }}>
                      💡 Укажите дату и время для отображения схватки в календаре соревнований
                    </div>
                  </>
                ) : null;
              }}
            </Form.Item>

            {/* Победитель - только если статус COMPLETED */}
            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => prevValues.status !== currentValues.status}
            >
              {({ getFieldValue }) => {
                const isTeamMatch = !!(editingMatch.team1 || editingMatch.team2);
                return getFieldValue('status') === 'COMPLETED' ? (
                  <>
                    <Form.Item
                      label="Победитель"
                      name={isTeamMatch ? "winnerTeamId" : "winnerId"}
                      rules={[{ required: true, message: 'Для завершенного матча нужно указать победителя' }]}
                    >
                      <Radio.Group>
                        {isTeamMatch ? (
                          <>
                            {editingMatch.team1 && (
                              <Radio value={editingMatch.team1.id}>
                                {getAthleteName(editingMatch.team1)}
                              </Radio>
                            )}
                            {editingMatch.team2 && (
                              <Radio value={editingMatch.team2.id}>
                                {getAthleteName(editingMatch.team2)}
                              </Radio>
                            )}
                          </>
                        ) : (
                          <>
                            {editingMatch.athlete1 && (
                              <Radio value={editingMatch.athlete1.id}>
                                {getAthleteName(editingMatch.athlete1)}
                              </Radio>
                            )}
                            {editingMatch.athlete2 && (
                              <Radio value={editingMatch.athlete2.id}>
                                {getAthleteName(editingMatch.athlete2)}
                              </Radio>
                            )}
                          </>
                        )}
                      </Radio.Group>
                    </Form.Item>

                    {/* Очки для каждого участника */}
                    {isTeamMatch ? (
                      <>
                        {editingMatch.team1 && (
                          <Form.Item
                            label={`Очки: ${getAthleteName(editingMatch.team1)}`}
                            name="athlete1Score"
                            rules={[{ type: 'number', min: 0, message: 'Очки должны быть неотрицательным числом' }]}
                          >
                            <InputNumber
                              placeholder="Введите очки"
                              min={0}
                              style={{ width: '100%' }}
                            />
                          </Form.Item>
                        )}
                        {editingMatch.team2 && (
                          <Form.Item
                            label={`Очки: ${getAthleteName(editingMatch.team2)}`}
                            name="athlete2Score"
                            rules={[{ type: 'number', min: 0, message: 'Очки должны быть неотрицательным числом' }]}
                          >
                            <InputNumber
                              placeholder="Введите очки"
                              min={0}
                              style={{ width: '100%' }}
                            />
                          </Form.Item>
                        )}
                      </>
                    ) : (
                      <>
                        {editingMatch.athlete1 && (
                          <Form.Item
                            label={`Очки: ${getAthleteName(editingMatch.athlete1)}`}
                            name="athlete1Score"
                            rules={[{ type: 'number', min: 0, message: 'Очки должны быть неотрицательным числом' }]}
                          >
                            <InputNumber
                              placeholder="Введите очки"
                              min={0}
                              style={{ width: '100%' }}
                            />
                          </Form.Item>
                        )}
                        {editingMatch.athlete2 && (
                          <Form.Item
                            label={`Очки: ${getAthleteName(editingMatch.athlete2)}`}
                            name="athlete2Score"
                            rules={[{ type: 'number', min: 0, message: 'Очки должны быть неотрицательным числом' }]}
                          >
                            <InputNumber
                              placeholder="Введите очки"
                              min={0}
                              style={{ width: '100%' }}
                            />
                          </Form.Item>
                        )}
                      </>
                    )}
                  </>
                ) : null;
              }}
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};
