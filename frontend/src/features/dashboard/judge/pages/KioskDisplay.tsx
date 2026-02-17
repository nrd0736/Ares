/**
 * Страница отображения киоска (полноэкранный режим для судей)
 * 
 * Функциональность:
 * - Полноэкранный режим для работы на соревнованиях
 * - Отображение текущих матчей
 * - Ввод результатов
 * - Real-time обновления
 * - Оптимизирован для больших экранов
 */

import { useState, useEffect } from 'react';
import { Typography, Tag, Spin, Button, Select, Card, Space, Switch, message, Modal } from 'antd';
import { 
  TrophyOutlined, 
  UserOutlined, 
  CloseOutlined, 
  ClockCircleOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../../../../services/api-client';
import { useCompetitionSocket } from '../../../../hooks/useSocket';
import { config } from '../../../../utils/config';
import logger from '../../../../utils/logger';

const { Title, Text } = Typography;
const { Option } = Select;

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
        avatarUrl?: string;
      };
    };
    team?: {
      name: string;
      region?: {
        name: string;
      };
    };
    sportsRank?: {
      name: string;
    };
  };
  athlete2?: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
        avatarUrl?: string;
      };
    };
    team?: {
      name: string;
      region?: {
        name: string;
      };
    };
    sportsRank?: {
      name: string;
    };
  };
  team1?: {
    id: string;
    name: string;
    iconUrl?: string;
    region?: {
      name: string;
    };
  };
  team2?: {
    id: string;
    name: string;
    iconUrl?: string;
    region?: {
      name: string;
    };
  };
  winnerId?: string;
  winnerTeamId?: string;
  status: string;
  score?: any;
  metadata?: {
    pendingResult?: {
      winnerId?: string;
      winnerTeamId?: string;
      score?: any;
    };
    isPending?: boolean;
  };
  bracket: {
    weightCategory?: {
      name: string;
    } | null;
    competition: {
      id: string;
      name: string;
      iconUrl?: string;
      competitionType?: 'INDIVIDUAL' | 'TEAM';
    };
  };
}

interface Competition {
  id: string;
  name: string;
  iconUrl?: string;
  organizerInfo?: string;
  sport: {
    name: string;
  };
}

// Компонент управления киоском для судейского интерфейса
export const KioskControlPanel = () => {
  const [kioskWindow, setKioskWindow] = useState<Window | null>(null);
  const [kioskUrl, setKioskUrl] = useState('');
  const [displayMode, setDisplayMode] = useState<'welcome' | 'scoreboard' | 'next-matches'>('welcome');
  const [withTimer, setWithTimer] = useState(false);
  const [nextMatches, setNextMatches] = useState<Match[]>([]);
  const [selectedNextMatch, setSelectedNextMatch] = useState<string>('');
  const [loadingNextMatches, setLoadingNextMatches] = useState(false);
  const [competitionId, setCompetitionId] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);

  // Получаем данные из localStorage или других источников
  useEffect(() => {
    const savedCompetitionId = localStorage.getItem('selectedCompetitionId');
    const savedMatchId = localStorage.getItem('selectedMatchId');
    
    if (savedCompetitionId) {
      setCompetitionId(savedCompetitionId);
      loadCompetition(savedCompetitionId);
    }
    
    if (savedMatchId) {
      setMatchId(savedMatchId);
    }
    
    // Слушаем изменения в localStorage (если другие компоненты меняют выбор)
    const handleStorageChange = () => {
      const newCompetitionId = localStorage.getItem('selectedCompetitionId');
      const newMatchId = localStorage.getItem('selectedMatchId');
      
      if (newCompetitionId && newCompetitionId !== competitionId) {
        setCompetitionId(newCompetitionId);
        loadCompetition(newCompetitionId);
      }
      
      if (newMatchId && newMatchId !== matchId) {
        setMatchId(newMatchId);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const loadCompetition = async (compId: string) => {
    try {
      const response = await apiClient.get(`/competitions/${compId}`);
      setCompetition(response.data.data);
    } catch (error) {
      logger.error('Failed to load competition', { error: error instanceof Error ? error.message : String(error), competitionId: compId });
    }
  };

  const loadNextMatches = async () => {
    if (!competitionId) return;
    
    setLoadingNextMatches(true);
    try {
      const bracketsResponse = await apiClient.get(`/brackets/competition/${competitionId}`);
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
      logger.error('Failed to load next matches', { error: error instanceof Error ? error.message : String(error) });
      message.error('Не удалось загрузить следующие схватки');
    } finally {
      setLoadingNextMatches(false);
    }
  };

  const openKioskWindow = (mode: 'welcome' | 'scoreboard' | 'next-matches') => {
    if (!competitionId) {
      message.warning('Выберите соревнование');
      return;
    }

    if (mode === 'scoreboard' && !matchId) {
      message.warning('Выберите матч для отображения табло');
      return;
    }

    if (mode === 'next-matches') {
      loadNextMatches();
      if (nextMatches.length === 0) {
        message.warning('Нет запланированных схваток');
        return;
      }
      if (!selectedNextMatch) {
        message.warning('Выберите схватку для отображения');
        return;
      }
    }

    setDisplayMode(mode);

    // Формируем URL для киоска
    let url = `/kiosk?competitionId=${competitionId}&mode=${mode}`;
    
    if (mode === 'scoreboard') {
      url += `&matchId=${matchId}`;
    } else if (mode === 'next-matches' && selectedNextMatch) {
      url += `&matchId=${selectedNextMatch}`;
    }
    
    if (withTimer) {
      url += '&timer=true';
    }

    setKioskUrl(url);

    // Если окно уже открыто, обновляем его
    if (kioskWindow && !kioskWindow.closed) {
      // Отправляем сообщение об изменении режима
      const messageData: any = {
        type: 'DISPLAY_MODE_CHANGE',
        displayMode: mode,
        competitionId,
        withTimer
      };

      if (mode === 'scoreboard') {
        messageData.matchId = matchId;
      } else if (mode === 'next-matches') {
        messageData.matchId = selectedNextMatch;
      }

      kioskWindow.postMessage(messageData, window.location.origin);
      
      // Обновляем URL в окне
      kioskWindow.location.href = url;
      kioskWindow.focus();
      message.success(`Режим киоска изменен на: ${getModeName(mode)}`);
    } else {
      // Открываем новое окно
      const win = window.open(
        url,
        'kiosk',
        'width=1920,height=1080,fullscreen=yes,menubar=no,toolbar=no,location=no,status=no'
      );
      
      if (win) {
        setKioskWindow(win);
        message.success('Окно киоска открыто');
        
        // Следим за закрытием окна
        const checkWindow = setInterval(() => {
          if (win.closed) {
            setKioskWindow(null);
            clearInterval(checkWindow);
          }
        }, 1000);
      } else {
        message.error('Не удалось открыть окно. Разрешите всплывающие окна в браузере.');
      }
    }
  };

  const sendToKiosk = (type: string, data: any) => {
    if (kioskWindow && !kioskWindow.closed) {
      kioskWindow.postMessage({
        type,
        ...data
      }, window.location.origin);
    }
  };

  const changeMatchInKiosk = () => {
    if (!matchId) {
      message.warning('Выберите матч');
      return;
    }

    sendToKiosk('MATCH_CHANGE', {
      matchId: matchId
    });

    if (displayMode !== 'scoreboard') {
      openKioskWindow('scoreboard');
    } else {
      message.success('Текущий матч изменен в киоске');
    }
  };

  const updateNextMatchInKiosk = () => {
    if (!selectedNextMatch) {
      message.warning('Выберите следующую схватку');
      return;
    }

    sendToKiosk('SET_NEXT_MATCH', {
      nextMatchId: selectedNextMatch
    });

    if (displayMode !== 'next-matches') {
      openKioskWindow('next-matches');
    } else {
      message.success('Следующая схватка обновлена в киоске');
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
    
    const weightCategory = match.bracket.weightCategory?.name ? ` (${match.bracket.weightCategory.name})` : '';
    
    return `${name1} vs ${name2}${weightCategory}`;
  };

  return (
    <Card 
      title="Управление киоском"
      style={{ marginBottom: 16 }}
      extra={
        <span style={{ color: kioskWindow && !kioskWindow.closed ? 'green' : 'orange', fontSize: '12px' }}>
          {kioskWindow && !kioskWindow.closed ? '● Окно открыто' : 'Окно закрыто'}
        </span>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <strong>Текущий режим:</strong> {getModeName(displayMode)}
          {kioskWindow && !kioskWindow.closed && (
            <span style={{ marginLeft: 10, color: '#52c41a' }}>
              (Активно)
            </span>
          )}
        </div>

        <Space wrap>
          <Button
            type={displayMode === 'welcome' ? 'primary' : 'default'}
            icon={<TrophyOutlined />}
            onClick={() => openKioskWindow('welcome')}
            disabled={!competitionId}
          >
            Вступительное окно
          </Button>

          <Button
            type={displayMode === 'scoreboard' ? 'primary' : 'default'}
            icon={<UserOutlined />}
            onClick={() => openKioskWindow('scoreboard')}
            disabled={!matchId || !competitionId}
          >
            Табло со счетом
          </Button>

          <Button
            type={displayMode === 'next-matches' ? 'primary' : 'default'}
            icon={<ClockCircleOutlined />}
            onClick={() => openKioskWindow('next-matches')}
            disabled={!competitionId}
          >
            Следующая схватка
          </Button>

          {kioskWindow && !kioskWindow.closed && (
            <Button
              danger
              onClick={() => {
                kioskWindow.close();
                setKioskWindow(null);
                message.info('Окно киоска закрыто');
              }}
            >
              Закрыть киоск
            </Button>
          )}
        </Space>

        {displayMode === 'next-matches' && (
          <div style={{ marginTop: 16 }}>
            <strong>Выберите следующую схватку:</strong>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              value={selectedNextMatch}
              onChange={(value) => {
                setSelectedNextMatch(value);
                sendToKiosk('SET_NEXT_MATCH', { nextMatchId: value });
              }}
              loading={loadingNextMatches}
              placeholder="Выберите схватку"
              onDropdownVisibleChange={(open) => {
                if (open && competitionId) {
                  loadNextMatches();
                }
              }}
            >
              {nextMatches.map(match => (
                <Option key={match.id} value={match.id}>
                  {getMatchDisplayName(match)} - {match.status === 'IN_PROGRESS' ? 'В процессе' : 'Запланировано'}
                </Option>
              ))}
            </Select>
            <Button 
              type="primary"
              onClick={updateNextMatchInKiosk}
              style={{ marginTop: 8, width: '100%' }}
            >
              Обновить в киоске
            </Button>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <Switch
            checked={withTimer}
            onChange={(checked) => {
              setWithTimer(checked);
              if (kioskWindow && !kioskWindow.closed) {
                sendToKiosk('TIMER_TOGGLE', { withTimer: checked });
              }
            }}
          />
          <span style={{ marginLeft: 8 }}>Показывать таймер (только для табло)</span>
        </div>

        {kioskUrl && (
          <div style={{ marginTop: 16 }}>
            <strong>Ссылка на киоск:</strong>
            <div style={{ marginTop: 4, wordBreak: 'break-all', fontSize: '12px', color: '#1890ff' }}>
              {window.location.origin + kioskUrl}
            </div>
          </div>
        )}
      </Space>
    </Card>
  );
};

// Компонент киоска для отдельного окна
export const KioskDisplay = () => {
  const [searchParams] = useSearchParams();
  const matchId = searchParams.get('matchId');
  const competitionId = searchParams.get('competitionId');
  const withTimer = searchParams.get('timer') === 'true';
  const displayMode = searchParams.get('mode') || 'welcome';
  
  const [currentDisplayMode, setCurrentDisplayMode] = useState<'welcome' | 'scoreboard' | 'next-matches'>(displayMode as any);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(matchId);
  const [currentCompetitionId, setCurrentCompetitionId] = useState<string | null>(competitionId);
  const [currentWithTimer, setCurrentWithTimer] = useState(withTimer);
  
  const [match, setMatch] = useState<Match | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [nextMatch, setNextMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [athlete1Score, setAthlete1Score] = useState(0);
  const [athlete2Score, setAthlete2Score] = useState(0);
  const [timerMinutes, setTimerMinutes] = useState(3);
  const [timerSeconds, setTimerSeconds] = useState(0);
  
  const [athlete1AvatarError, setAthlete1AvatarError] = useState(false);
  const [athlete2AvatarError, setAthlete2AvatarError] = useState(false);

  useCompetitionSocket(currentCompetitionId);

  useEffect(() => {
    if (currentCompetitionId) {
      loadCompetition();
    }
    
    if (currentMatchId && currentDisplayMode === 'scoreboard') {
      loadMatch();
      setAthlete1AvatarError(false);
      setAthlete2AvatarError(false);
    }
    
    if (currentMatchId && currentDisplayMode === 'next-matches') {
      loadMatch();
    }
  }, [currentMatchId, currentCompetitionId, currentDisplayMode]);

  useEffect(() => {
    const handleMatchUpdate = (data: any) => {
      if (data.matchId === currentMatchId || data.match?.id === currentMatchId) {
        loadMatch();
      }
      if (data.match && data.match.id === currentMatchId) {
        setMatch(data.match);
        const score = data.match.metadata?.pendingResult?.score || data.match.score;
        const isTeamMatch = !!(data.match.team1 || data.match.team2);
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
    };

    if ((window as any).io) {
      const socket = (window as any).io;
      socket.on('match:update', handleMatchUpdate);
      socket.on('match:updated', handleMatchUpdate);
      socket.on('match:confirmed', handleMatchUpdate);
      socket.on('match:approved', handleMatchUpdate);

      return () => {
        socket.off('match:update', handleMatchUpdate);
        socket.off('match:updated', handleMatchUpdate);
        socket.off('match:confirmed', handleMatchUpdate);
        socket.off('match:approved', handleMatchUpdate);
      };
    }
  }, [currentMatchId]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const { 
        type, 
        athlete1Score: score1, 
        athlete2Score: score2, 
        team1Score: tScore1, 
        team2Score: tScore2, 
        minutes, 
        seconds,
        displayMode: newDisplayMode,
        matchId: newMatchId,
        competitionId: newCompetitionId,
        withTimer: newWithTimer,
        nextMatchId: newNextMatchId
      } = event.data;

      if (type === 'SCORE_UPDATE') {
        if (tScore1 !== undefined || tScore2 !== undefined) {
          setAthlete1Score(tScore1 || 0);
          setAthlete2Score(tScore2 || 0);
        } else {
          setAthlete1Score(score1 || 0);
          setAthlete2Score(score2 || 0);
        }
      } else if (type === 'TIMER_UPDATE' && currentWithTimer) {
        setTimerMinutes(minutes);
        setTimerSeconds(seconds);
      } else if (type === 'DISPLAY_MODE_CHANGE') {
        if (newDisplayMode && ['welcome', 'scoreboard', 'next-matches'].includes(newDisplayMode)) {
          setCurrentDisplayMode(newDisplayMode);
        }
        
        if (newMatchId !== undefined && newDisplayMode === 'scoreboard') {
          setCurrentMatchId(newMatchId);
        }
        
        if (newCompetitionId !== undefined) {
          setCurrentCompetitionId(newCompetitionId);
          loadCompetition();
        }
        
        if (newWithTimer !== undefined) {
          setCurrentWithTimer(newWithTimer);
        }
      } else if (type === 'MATCH_CHANGE') {
        if (newMatchId) {
          setCurrentMatchId(newMatchId);
          setCurrentDisplayMode('scoreboard');
        }
      } else if (type === 'SET_NEXT_MATCH') {
        if (newNextMatchId) {
          setCurrentMatchId(newNextMatchId);
          setCurrentDisplayMode('next-matches');
        }
      } else if (type === 'TIMER_TOGGLE') {
        if (newWithTimer !== undefined) {
          setCurrentWithTimer(newWithTimer);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentWithTimer]);

  const loadCompetition = async () => {
    if (!currentCompetitionId) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get(`/competitions/${currentCompetitionId}`);
      setCompetition(response.data.data);
    } catch (error) {
      logger.error('Failed to load competition', { error: error instanceof Error ? error.message : String(error), competitionId: compId });
    } finally {
      setLoading(false);
    }
  };

  const loadMatch = async () => {
    if (!currentMatchId) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get(`/brackets/match/${currentMatchId}`);
      const matchData = response.data.data;
      
      if (currentDisplayMode === 'scoreboard') {
        setMatch(matchData);
      } else {
        setNextMatch(matchData);
      }
      
      const score = matchData.metadata?.pendingResult?.score || matchData.score;
      const isTeamMatch = !!(matchData.team1 || matchData.team2);
      if (score) {
        if (isTeamMatch) {
          setAthlete1Score(score.team1 || 0);
          setAthlete2Score(score.team2 || 0);
        } else {
          setAthlete1Score(score.athlete1 || 0);
          setAthlete2Score(score.athlete2 || 0);
        }
      }
    } catch (error) {
      logger.error('Failed to load match', { error: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  };

  const getAthleteAvatar = (avatarUrl?: string) => {
    if (!avatarUrl || avatarUrl.trim() === '') {
      return null;
    }
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl;
    }
    return avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`;
  };

  const getTeamIcon = (iconUrl?: string) => {
    if (!iconUrl || iconUrl.trim() === '') {
      return null;
    }
    if (iconUrl.startsWith('http://') || iconUrl.startsWith('https://')) {
      return iconUrl;
    }
    return iconUrl.startsWith('/') ? iconUrl : `/${iconUrl}`;
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  const getBackgroundImageUrl = () => {
    // Используем централизованную конфигурацию
    const apiUrl = config.api.fullBaseURL;
    if (currentDisplayMode === 'scoreboard' && match) {
      return match.bracket.competition.iconUrl 
        ? `${apiUrl}${match.bracket.competition.iconUrl}`
        : '';
    }
    if (competition?.iconUrl) {
      return `${apiUrl}${competition.iconUrl}`;
    }
    return '';
  };

  const backgroundImageUrl = getBackgroundImageUrl();

  const renderWelcomeScreen = () => {
    if (!competition) {
      return (
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#fff' }}>
            Соревнование не найдено
          </h1>
        </div>
      );
    }

    return (
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 1200 }}>
          <Title
            level={1}
            style={{
              color: '#fff',
              fontSize: '64px',
              fontWeight: 'bold',
              marginBottom: 30,
              textShadow: '0 0 30px rgba(220, 20, 60, 0.8), 4px 4px 8px rgba(0,0,0,0.9)',
              letterSpacing: '2px',
            }}
          >
            {competition.name}
          </Title>
          
          {competition.organizerInfo && (
            <Text
              style={{
                color: '#dc143c',
                fontSize: '32px',
                fontWeight: 600,
                textShadow: '0 0 20px rgba(220, 20, 60, 0.6)',
                display: 'block',
                marginTop: 20,
              }}
            >
              {competition.organizerInfo}
            </Text>
          )}
          
          {competition.sport && (
            <Text
              style={{
                color: '#ccc',
                fontSize: '24px',
                textShadow: '1px 1px 4px rgba(0,0,0,0.9)',
                display: 'block',
                marginTop: 30,
              }}
            >
              {competition.sport.name}
            </Text>
          )}
        </div>
      </div>
    );
  };

  const renderScoreboard = () => {
    if (!match) {
      return (
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#fff' }}>
            Матч не найден
          </h1>
        </div>
      );
    }

    const isTeamMatch = !!(match.team1 || match.team2);
    const participant1 = isTeamMatch ? match.team1 : match.athlete1;
    const participant2 = isTeamMatch ? match.team2 : match.athlete2;

    return (
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <Title
            level={1}
            style={{
              color: '#fff',
              fontSize: '48px',
              fontWeight: 'bold',
              marginBottom: 10,
              textShadow: '0 0 30px rgba(220, 20, 60, 0.8), 4px 4px 8px rgba(0,0,0,0.9)',
              letterSpacing: '2px',
            }}
          >
            {match.bracket.competition.name}
          </Title>
          <Text
            style={{
              color: '#dc143c',
              fontSize: '24px',
              fontWeight: 600,
              textShadow: '0 0 20px rgba(220, 20, 60, 0.6)',
            }}
          >
            {match.bracket.weightCategory?.name || 'Командное соревнование'}
          </Text>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            maxWidth: 1400,
            marginTop: 40,
          }}
        >
          {/* Участник 1 */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '40px',
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(10px)',
              borderRadius: 20,
              border: '3px solid #dc143c',
              marginRight: 20,
              boxShadow: '0 0 30px rgba(220, 20, 60, 0.4)',
            }}
          >
            <div
              style={{
                width: 180,
                height: 180,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
                border: '3px solid #fff',
                background: 'rgba(220, 20, 60, 0.2)',
              }}
            >
              {isTeamMatch ? (
                <>
                  {participant1?.iconUrl && !athlete1AvatarError ? (
                    <img
                      src={getTeamIcon(participant1.iconUrl) || ''}
                      alt={participant1?.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                      onError={() => setAthlete1AvatarError(true)}
                    />
                  ) : (
                    <TeamOutlined style={{ fontSize: 80, color: '#fff' }} />
                  )}
                </>
              ) : (
                <>
                  {participant1?.user.profile.avatarUrl && !athlete1AvatarError ? (
                    <img
                      src={getAthleteAvatar(participant1.user.profile.avatarUrl) || ''}
                      alt={`${participant1.user.profile.firstName} ${participant1.user.profile.lastName}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                      onError={() => setAthlete1AvatarError(true)}
                    />
                  ) : (
                    <UserOutlined style={{ fontSize: 80, color: '#fff' }} />
                  )}
                </>
              )}
            </div>

            {isTeamMatch ? (
              <>
                <Text
                  style={{
                    color: '#fff',
                    fontSize: '42px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    marginBottom: 10,
                    textShadow: '0 0 15px rgba(220, 20, 60, 0.7)',
                  }}
                >
                  {participant1?.name || 'TBD'}
                </Text>
                {participant1?.region && (
                  <Text
                    style={{
                      color: '#dc143c',
                      fontSize: '24px',
                      textAlign: 'center',
                      marginBottom: 15,
                    }}
                  >
                    {participant1.region.name}
                  </Text>
                )}
              </>
            ) : (
              <>
                <Text
                  style={{
                    color: '#fff',
                    fontSize: '42px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    marginBottom: 10,
                    textShadow: '0 0 15px rgba(220, 20, 60, 0.7)',
                  }}
                >
                  {participant1
                    ? `${participant1.user.profile.firstName} ${participant1.user.profile.lastName}`
                    : 'TBD'}
                </Text>
                {participant1?.team && (
                  <Text
                    style={{
                      color: '#dc143c',
                      fontSize: '24px',
                      textAlign: 'center',
                      marginBottom: 15,
                    }}
                  >
                    {participant1.team.name}
                  </Text>
                )}
                {participant1?.sportsRank && (
                  <Text
                    style={{
                      color: '#ccc',
                      fontSize: '20px',
                      textAlign: 'center',
                      marginBottom: 15,
                    }}
                  >
                    {participant1.sportsRank.name}
                  </Text>
                )}
              </>
            )}

            {/* Счет для участника 1 */}
            <div
              style={{
                marginTop: 30,
                padding: '20px 40px',
                background: 'rgba(220, 20, 60, 0.3)',
                borderRadius: 15,
                border: '2px solid #dc143c',
              }}
            >
              <Text
                style={{
                  fontSize: '72px',
                  fontWeight: 'bold',
                  color: '#fff',
                  textShadow: '0 0 20px rgba(220, 20, 60, 0.8)',
                }}
              >
                {athlete1Score}
              </Text>
            </div>
          </div>

          {/* VS разделитель */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '0 40px',
            }}
          >
            <Text
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#dc143c',
                textShadow: '0 0 30px rgba(220, 20, 60, 0.8)',
                marginBottom: 20,
              }}
            >
              VS
            </Text>
            <div
              style={{
                background: 'rgba(220, 20, 60, 0.3)',
                padding: '15px 30px',
                borderRadius: 15,
                border: '2px solid #dc143c',
              }}
            >
              <Text
                style={{
                  fontSize: '24px',
                  color: '#fff',
                  fontWeight: 'bold',
                }}
              >
                Раунд {match.round} • Позиция {match.position}
              </Text>
            </div>
          </div>

          {/* Участник 2 */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '40px',
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(10px)',
              borderRadius: 20,
              border: '3px solid #dc143c',
              marginLeft: 20,
              boxShadow: '0 0 30px rgba(220, 20, 60, 0.4)',
            }}
          >
            <div
              style={{
                width: 180,
                height: 180,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
                border: '3px solid #fff',
                background: 'rgba(220, 20, 60, 0.2)',
              }}
            >
              {isTeamMatch ? (
                <>
                  {participant2?.iconUrl && !athlete2AvatarError ? (
                    <img
                      src={getTeamIcon(participant2.iconUrl) || ''}
                      alt={participant2?.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                      onError={() => setAthlete2AvatarError(true)}
                    />
                  ) : (
                    <TeamOutlined style={{ fontSize: 80, color: '#fff' }} />
                  )}
                </>
              ) : (
                <>
                  {participant2?.user.profile.avatarUrl && !athlete2AvatarError ? (
                    <img
                      src={getAthleteAvatar(participant2.user.profile.avatarUrl) || ''}
                      alt={`${participant2.user.profile.firstName} ${participant2.user.profile.lastName}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                      onError={() => setAthlete2AvatarError(true)}
                    />
                  ) : (
                    <UserOutlined style={{ fontSize: 80, color: '#fff' }} />
                  )}
                </>
              )}
            </div>

            {isTeamMatch ? (
              <>
                <Text
                  style={{
                    color: '#fff',
                    fontSize: '42px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    marginBottom: 10,
                    textShadow: '0 0 15px rgba(220, 20, 60, 0.7)',
                  }}
                >
                  {participant2?.name || 'TBD'}
                </Text>
                {participant2?.region && (
                  <Text
                    style={{
                      color: '#dc143c',
                      fontSize: '24px',
                      textAlign: 'center',
                      marginBottom: 15,
                    }}
                  >
                    {participant2.region.name}
                  </Text>
                )}
              </>
            ) : (
              <>
                <Text
                  style={{
                    color: '#fff',
                    fontSize: '42px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    marginBottom: 10,
                    textShadow: '0 0 15px rgba(220, 20, 60, 0.7)',
                  }}
                >
                  {participant2
                    ? `${participant2.user.profile.firstName} ${participant2.user.profile.lastName}`
                    : 'TBD'}
                </Text>
                {participant2?.team && (
                  <Text
                    style={{
                      color: '#dc143c',
                      fontSize: '24px',
                      textAlign: 'center',
                      marginBottom: 15,
                    }}
                  >
                    {participant2.team.name}
                  </Text>
                )}
                {participant2?.sportsRank && (
                  <Text
                    style={{
                      color: '#ccc',
                      fontSize: '20px',
                      textAlign: 'center',
                      marginBottom: 15,
                    }}
                  >
                    {participant2.sportsRank.name}
                  </Text>
                )}
              </>
            )}

            {/* Счет для участника 2 */}
            <div
              style={{
                marginTop: 30,
                padding: '20px 40px',
                background: 'rgba(220, 20, 60, 0.3)',
                borderRadius: 15,
                border: '2px solid #dc143c',
              }}
            >
              <Text
                style={{
                  fontSize: '72px',
                  fontWeight: 'bold',
                  color: '#fff',
                  textShadow: '0 0 20px rgba(220, 20, 60, 0.8)',
                }}
              >
                {athlete2Score}
              </Text>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderNextMatchesScreen = () => {
    const displayMatch = nextMatch || match;
    
    if (!displayMatch) {
      return (
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#fff' }}>
            Схватка не выбрана
          </h1>
        </div>
      );
    }

    const isTeamMatch = !!(displayMatch.team1 || displayMatch.team2);
    const participant1 = isTeamMatch ? displayMatch.team1 : displayMatch.athlete1;
    const participant2 = isTeamMatch ? displayMatch.team2 : displayMatch.athlete2;

    return (
      
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px',
        }}
      >
        <div style={{ 
  textAlign: 'center', 
  marginBottom: 30,
  marginTop: 20 
}}>
  <Text
    style={{
      color: '#dc143c',
      fontSize: '48px',
      fontWeight: 'bold',
      textShadow: '0 0 30px rgba(220, 20, 60, 0.8)',
    }}
  >
    Готовится следующими
  </Text>
</div>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <Title
            level={1}
            style={{
              color: '#fff',
              fontSize: '48px',
              fontWeight: 'bold',
              marginBottom: 10,
              textShadow: '0 0 30px rgba(220, 20, 60, 0.8), 4px 4px 8px rgba(0,0,0,0.9)',
              letterSpacing: '2px',
            }}
          >
            {displayMatch.bracket.competition.name}
          </Title>
          <Text
            style={{
              color: '#dc143c',
              fontSize: '24px',
              fontWeight: 600,
              textShadow: '0 0 20px rgba(220, 20, 60, 0.6)',
            }}
          >
            {displayMatch.bracket.weightCategory?.name || 'Командное соревнование'}
          </Text>
        </div>
              
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            maxWidth: 1400,
            marginTop: 40,
          }}
        >
          {/* Участник 1 */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '40px',
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(10px)',
              borderRadius: 20,
              border: '3px solid #dc143c',
              marginRight: 20,
              boxShadow: '0 0 30px rgba(220, 20, 60, 0.4)',
            }}
          >
            <div
              style={{
                width: 180,
                height: 180,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
                border: '3px solid #fff',
                background: 'rgba(220, 20, 60, 0.2)',
              }}
            >
              {isTeamMatch ? (
                <>
                  {participant1?.iconUrl && !athlete1AvatarError ? (
                    <img
                      src={getTeamIcon(participant1.iconUrl) || ''}
                      alt={participant1?.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                      onError={() => setAthlete1AvatarError(true)}
                    />
                  ) : (
                    <TeamOutlined style={{ fontSize: 80, color: '#fff' }} />
                  )}
                </>
              ) : (
                <>
                  {participant1?.user.profile.avatarUrl && !athlete1AvatarError ? (
                    <img
                      src={getAthleteAvatar(participant1.user.profile.avatarUrl) || ''}
                      alt={`${participant1.user.profile.firstName} ${participant1.user.profile.lastName}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                      onError={() => setAthlete1AvatarError(true)}
                    />
                  ) : (
                    <UserOutlined style={{ fontSize: 80, color: '#fff' }} />
                  )}
                </>
              )}
            </div>

            {isTeamMatch ? (
              <>
                <Text
                  style={{
                    color: '#fff',
                    fontSize: '42px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    marginBottom: 10,
                    textShadow: '0 0 15px rgba(220, 20, 60, 0.7)',
                  }}
                >
                  {participant1?.name || 'TBD'}
                </Text>
                {participant1?.region && (
                  <Text
                    style={{
                      color: '#dc143c',
                      fontSize: '24px',
                      textAlign: 'center',
                      marginBottom: 15,
                    }}
                  >
                    {participant1.region.name}
                  </Text>
                )}
              </>
            ) : (
              <>
                <Text
                  style={{
                    color: '#fff',
                    fontSize: '42px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    marginBottom: 10,
                    textShadow: '0 0 15px rgba(220, 20, 60, 0.7)',
                  }}
                >
                  {participant1
                    ? `${participant1.user.profile.firstName} ${participant1.user.profile.lastName}`
                    : 'TBD'}
                </Text>
                {participant1?.team && (
                  <Text
                    style={{
                      color: '#dc143c',
                      fontSize: '24px',
                      textAlign: 'center',
                      marginBottom: 15,
                    }}
                  >
                    {participant1.team.name}
                  </Text>
                )}
                {participant1?.sportsRank && (
                  <Text
                    style={{
                      color: '#ccc',
                      fontSize: '20px',
                      textAlign: 'center',
                      marginBottom: 15,
                    }}
                  >
                    {participant1.sportsRank.name}
                  </Text>
                )}
              </>
            )}
          </div>

          {/* VS разделитель */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '0 40px',
            }}
          >
            <Text
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#dc143c',
                textShadow: '0 0 30px rgba(220, 20, 60, 0.8)',
                marginBottom: 20,
              }}
            >
              VS
            </Text>
            <div
              style={{
                background: 'rgba(220, 20, 60, 0.3)',
                padding: '15px 30px',
                borderRadius: 15,
                border: '2px solid #dc143c',
              }}
            >
              <Text
                style={{
                  fontSize: '24px',
                  color: '#fff',
                  fontWeight: 'bold',
                }}
              >
                Раунд {displayMatch.round} • Позиция {displayMatch.position}
              </Text>
            </div>
            {displayMatch.scheduledTime && (
              <div
                style={{
                  background: 'rgba(220, 20, 60, 0.3)',
                  padding: '10px 20px',
                  borderRadius: 10,
                  border: '2px solid #dc143c',
                  marginTop: 20,
                }}
              >
                <Text
                  style={{
                    fontSize: '20px',
                    color: '#fff',
                    fontWeight: 'bold',
                  }}
                >
                  Начало: {new Date(displayMatch.scheduledTime).toLocaleTimeString('ru-RU', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </div>
            )}
          </div>

          {/* Участник 2 */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '40px',
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(10px)',
              borderRadius: 20,
              border: '3px solid #dc143c',
              marginLeft: 20,
              boxShadow: '0 0 30px rgba(220, 20, 60, 0.4)',
            }}
          >
            <div
              style={{
                width: 180,
                height: 180,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
                border: '3px solid #fff',
                background: 'rgba(220, 20, 60, 0.2)',
              }}
            >
              {isTeamMatch ? (
                <>
                  {participant2?.iconUrl && !athlete2AvatarError ? (
                    <img
                      src={getTeamIcon(participant2.iconUrl) || ''}
                      alt={participant2?.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                      onError={() => setAthlete2AvatarError(true)}
                    />
                  ) : (
                    <TeamOutlined style={{ fontSize: 80, color: '#fff' }} />
                  )}
                </>
              ) : (
                <>
                  {participant2?.user.profile.avatarUrl && !athlete2AvatarError ? (
                    <img
                      src={getAthleteAvatar(participant2.user.profile.avatarUrl) || ''}
                      alt={`${participant2.user.profile.firstName} ${participant2.user.profile.lastName}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                      onError={() => setAthlete2AvatarError(true)}
                    />
                  ) : (
                    <UserOutlined style={{ fontSize: 80, color: '#fff' }} />
                  )}
                </>
              )}
            </div>

            {isTeamMatch ? (
              <>
                <Text
                  style={{
                    color: '#fff',
                    fontSize: '42px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    marginBottom: 10,
                    textShadow: '0 0 15px rgba(220, 20, 60, 0.7)',
                  }}
                >
                  {participant2?.name || 'TBD'}
                </Text>
                {participant2?.region && (
                  <Text
                    style={{
                      color: '#dc143c',
                      fontSize: '24px',
                      textAlign: 'center',
                      marginBottom: 15,
                    }}
                  >
                    {participant2.region.name}
                  </Text>
                )}
              </>
            ) : (
              <>
                <Text
                  style={{
                    color: '#fff',
                    fontSize: '42px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    marginBottom: 10,
                    textShadow: '0 0 15px rgba(220, 20, 60, 0.7)',
                  }}
                >
                  {participant2
                    ? `${participant2.user.profile.firstName} ${participant2.user.profile.lastName}`
                    : 'TBD'}
                </Text>
                {participant2?.team && (
                  <Text
                    style={{
                      color: '#dc143c',
                      fontSize: '24px',
                      textAlign: 'center',
                      marginBottom: 15,
                    }}
                  >
                    {participant2.team.name}
                  </Text>
                )}
                {participant2?.sportsRank && (
                  <Text
                    style={{
                      color: '#ccc',
                      fontSize: '20px',
                      textAlign: 'center',
                      marginBottom: 15,
                    }}
                  >
                    {participant2.sportsRank.name}
                  </Text>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (currentDisplayMode === 'welcome') {
      return renderWelcomeScreen();
    } else if (currentDisplayMode === 'next-matches') {
      return renderNextMatchesScreen();
    } else {
      return renderScoreboard();
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: '#000',
      }}
    >
      {backgroundImageUrl ? (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url(${backgroundImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(8px)',
            transform: 'scale(1.1)',
            opacity: 0.3,
          }}
        />
      ) : null}

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(139, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.95) 50%, rgba(139, 0, 0, 0.4) 100%)',
          zIndex: 0,
        }}
      />

      <button
        onClick={() => window.close()}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          zIndex: 1000,
          background: 'rgba(220, 20, 60, 0.3)',
          backdropFilter: 'blur(10px)',
          border: '2px solid rgba(220, 20, 60, 0.6)',
          borderRadius: '50%',
          width: 50,
          height: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#fff',
          fontSize: '24px',
          transition: 'all 0.3s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(220, 20, 60, 0.6)';
          e.currentTarget.style.borderColor = 'rgba(220, 20, 60, 1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(220, 20, 60, 0.3)';
          e.currentTarget.style.borderColor = 'rgba(220, 20, 60, 0.6)';
        }}
      >
        <CloseOutlined />
      </button>

      {currentWithTimer && currentDisplayMode === 'scoreboard' && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            padding: '15px 40px',
            borderRadius: 20,
            border: '3px solid #dc143c',
            display: 'flex',
            alignItems: 'center',
            gap: 15,
            boxShadow: '0 0 30px rgba(220, 20, 60, 0.6)',
          }}
        >
          <ClockCircleOutlined style={{ fontSize: 32, color: '#dc143c' }} />
          <div style={{ 
            fontSize: 48, 
            fontWeight: 'bold', 
            fontFamily: 'monospace',
            textShadow: '0 0 20px rgba(220, 20, 60, 0.8)',
            color: '#fff',
          }}>
            {String(timerMinutes).padStart(2, '0')}:{String(timerSeconds).padStart(2, '0')}
          </div>
        </div>
      )}

      {renderContent()}
    </div>
  );
};