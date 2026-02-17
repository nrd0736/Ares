/**
 * Утилита для генерации структуры турнирной сетки
 * 
 * Функциональность:
 * - generateSimpleBracket() - создание узлов и связей для ReactFlow
 * - Поддержка индивидуальных и командных соревнований
 * - Автоматическое позиционирование узлов
 * - Обработка победителей и продвижения в следующий раунд
 * 
 * Используется в:
 * - BracketVisualization компоненте
 * - Отображении сеток соревнований
 */

import { Node, Edge, Position } from 'reactflow';

interface Match {
  id: string;
  round: number;
  position: number;
  athlete1?: any;
  athlete2?: any;
  team1?: any;
  team2?: any;
  winnerId?: string;
  winnerTeamId?: string;
  status: string;
}

interface AthleteInfo {
  athleteId: string;
  number: number;
  name: string;
  region: string;
}

export const generateSimpleBracket = (
  matches: Match[],
  getAthleteName: (athlete: any) => string,
  getAthleteRegion: (athlete: any) => string,
  getMatchWinner: (match: Match | undefined) => any,
  handleNodeClick: (matchId: string) => void,
  isTeamCompetition?: boolean
): { nodes: Node[]; edges: Edge[]; athleteMap: Map<string, AthleteInfo> } => {
  // Определяем тип соревнования: проверяем первый матч первого раунда
  // Если не передан явно, определяем по наличию team1/team2 в первом матче
  const firstRoundMatchesForType = matches.filter(m => m.round === 1);
  const isTeam = isTeamCompetition !== undefined 
    ? isTeamCompetition 
    : (firstRoundMatchesForType.length > 0 && !!(firstRoundMatchesForType[0].team1 || firstRoundMatchesForType[0].team2));

  // Группируем матчи по раундам
  const matchesByRound: Record<number, Match[]> = {};
  matches.forEach((match) => {
    if (!matchesByRound[match.round]) {
      matchesByRound[match.round] = [];
    }
    matchesByRound[match.round].push(match);
  });

  const rounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => a - b);

  const newNodes: Node[] = [];
  const newEdges: Edge[] = [];

  const nodeWidth = 200;
  const nodeHeight = 70;
  const horizontalGap = 250;
  const verticalGap = 20;
  const headerHeight = 80;
  const groupLabelWidth = 60;
  const pairGap = 10; // Расстояние между участниками одного матча

  // Создаем карту спортсменов с постоянными номерами
  const athleteMap = new Map<string, AthleteInfo>();
  let participantNumber = 1;

  // Первый раунд - присваиваем номера всем участникам (спортсменам или командам)
  const firstRoundMatches = matchesByRound[1]?.sort((a, b) => a.position - b.position) || [];
  
  firstRoundMatches.forEach((match) => {
    if (isTeam) {
      // Обрабатываем команды (командные соревнования)
      if (match.team1 && !athleteMap.has(match.team1.id)) {
        athleteMap.set(match.team1.id, {
          athleteId: match.team1.id,
          number: participantNumber++,
          name: getAthleteName(match.team1),
          region: getAthleteRegion(match.team1),
        });
      }
      if (match.team2 && !athleteMap.has(match.team2.id)) {
        athleteMap.set(match.team2.id, {
          athleteId: match.team2.id,
          number: participantNumber++,
          name: getAthleteName(match.team2),
          region: getAthleteRegion(match.team2),
        });
      }
    } else {
      // Обрабатываем спортсменов (индивидуальные соревнования)
      if (match.athlete1 && !athleteMap.has(match.athlete1.id)) {
        athleteMap.set(match.athlete1.id, {
          athleteId: match.athlete1.id,
          number: participantNumber++,
          name: getAthleteName(match.athlete1),
          region: getAthleteRegion(match.athlete1),
        });
      }
      if (match.athlete2 && !athleteMap.has(match.athlete2.id)) {
        athleteMap.set(match.athlete2.id, {
          athleteId: match.athlete2.id,
          number: participantNumber++,
          name: getAthleteName(match.athlete2),
          region: getAthleteRegion(match.athlete2),
        });
      }
    }
  });

  const finalMatch = matchesByRound[rounds[rounds.length - 1]]?.[0];
  const finalWinner = finalMatch ? getMatchWinner(finalMatch) : null;
  const totalRounds = rounds[rounds.length - 1];

  const getRoundLabel = (round: number) => {
    if (round === totalRounds) return 'ФИНАЛ';
    if (round === totalRounds - 1) return '1/2';
    if (round === totalRounds - 2) return '1/4';
    if (round === totalRounds - 3) return '1/8';
    return `Раунд ${round}`;
  };

  // Добавляем заголовки раундов
  rounds.forEach((round, roundIndex) => {
    newNodes.push({
      id: `header-${round}`,
      type: 'default',
      position: { x: groupLabelWidth + roundIndex * (nodeWidth + horizontalGap), y: 0 },
      data: { label: getRoundLabel(round) },
      draggable: false,
      selectable: false,
      style: {
        background: '#f0f0f0',
        border: '1px solid #d9d9d9',
        borderRadius: '4px',
        padding: '10px',
        fontWeight: 'bold',
        width: nodeWidth,
        textAlign: 'center',
      },
    });
  });

  // Заголовок победителя
  newNodes.push({
    id: `header-winner`,
    type: 'default',
    position: { x: groupLabelWidth + rounds.length * (nodeWidth + horizontalGap), y: 0 },
    data: { label: 'ПОБЕДИТЕЛЬ' },
    draggable: false,
    selectable: false,
    style: {
      background: '#f0f0f0',
      border: '1px solid #d9d9d9',
      borderRadius: '4px',
      padding: '10px',
      fontWeight: 'bold',
      width: nodeWidth,
      textAlign: 'center',
    },
  });

  // Метки групп A и B
  const groupAY = headerHeight + 50;
  const groupBY = headerHeight + 400;

  newNodes.push({
    id: 'label-group-a',
    type: 'default',
    position: { x: 0, y: groupAY },
    data: { label: 'A' },
    draggable: false,
    selectable: false,
    style: {
      background: 'transparent',
      border: 'none',
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#1890ff',
      width: groupLabelWidth,
    },
  });

  newNodes.push({
    id: 'label-group-b',
    type: 'default',
    position: { x: 0, y: groupBY },
    data: { label: 'B' },
    draggable: false,
    selectable: false,
    style: {
      background: 'transparent',
      border: 'none',
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#1890ff',
      width: groupLabelWidth,
    },
  });

  // Сохраняем Y-позиции центров пар для каждого раунда
  // pairCenters[round][position] = Y-координата ЦЕНТРА пары (между двумя участниками)
  const pairCenters: Record<number, Record<number, number>> = {};

  const pairHeight = nodeHeight * 2 + pairGap; // Высота пары (2 узла + отступ)
  const pairSpacing = 40; // Отступ между парами

  // Создаем узлы для каждого раунда
  rounds.forEach((round, roundIndex) => {
    const matches = matchesByRound[round].sort((a, b) => a.position - b.position);
    const xPosition = groupLabelWidth + roundIndex * (nodeWidth + horizontalGap);
    pairCenters[round] = {};

    matches.forEach((match) => {
      const winner = getMatchWinner(match);
      const matchPosition = match.position; // Используем реальную позицию матча

      // Определяем группу (A или B) для первого раунда
      const totalMatches = matches.length;
      const halfMatches = Math.floor(totalMatches / 2);
      const isGroupA = matchPosition <= halfMatches;
      const positionInGroup = isGroupA ? matchPosition - 1 : matchPosition - halfMatches - 1;
      const baseY = isGroupA ? groupAY : groupBY;
      
      // Вычисляем Y-позицию для первого участника пары
      let firstParticipantY;
      
      if (roundIndex === 0) {
        // Первый раунд - фиксированные позиции
        firstParticipantY = baseY + positionInGroup * (pairHeight + pairSpacing);
      } else {
        // Последующие раунды - позиция в ЦЕНТРЕ между двумя предыдущими парами
        const prevRound = round - 1;
        // В олимпийской системе: матч с позицией N получает победителей из матчей с позициями (N*2-1) и (N*2)
        const prevMatch1Position = matchPosition * 2 - 1;
        const prevMatch2Position = matchPosition * 2;
        
        // Берем СОХРАНЕННЫЕ центры предыдущих пар по их позициям
        const prevPair1Center = pairCenters[prevRound]?.[prevMatch1Position];
        const prevPair2Center = pairCenters[prevRound]?.[prevMatch2Position];
        
        if (prevPair1Center !== undefined && prevPair2Center !== undefined) {
          // Центр новой пары = среднее между центрами двух предыдущих
          const newPairCenter = (prevPair1Center + prevPair2Center) / 2;
          // Y первого участника = центр - половина высоты пары
          firstParticipantY = newPairCenter - pairHeight / 2;
        } else if (prevPair1Center !== undefined) {
          // Если есть только один предыдущий матч (например, BYE)
          firstParticipantY = prevPair1Center - pairHeight / 2;
        } else {
          // Fallback - используем позицию в группе
          firstParticipantY = baseY + positionInGroup * (pairHeight + pairSpacing);
        }
      }
      
      // Сохраняем центр этой пары для следующего раунда (по позиции матча)
      const pairCenter = firstParticipantY + pairHeight / 2;
      pairCenters[round][matchPosition] = pairCenter;
      
      const baseMatchY = firstParticipantY;

      // Получаем участников текущего матча
      let participant1 = null;
      let participant2 = null;

      // Используем общий тип соревнования для всех матчей
      if (isTeam) {
        // Командные матчи: используем team1 и team2
        if (round === 1) {
          // Первый раунд - всегда берем из матча
          participant1 = match.team1 || null;
          participant2 = match.team2 || null;
        } else {
          // Последующие раунды - берем победителей из предыдущего раунда
          const prevRoundMatches = matchesByRound[round - 1]?.sort((a, b) => a.position - b.position) || [];
          const prevMatch1 = prevRoundMatches.find(m => m.position === matchPosition * 2 - 1);
          const prevMatch2 = prevRoundMatches.find(m => m.position === matchPosition * 2);
          
          participant1 = prevMatch1 ? getMatchWinner(prevMatch1) : null;
          participant2 = prevMatch2 ? getMatchWinner(prevMatch2) : null;
        }
      } else {
        // Индивидуальные матчи: используем athlete1 и athlete2
        if (round === 1) {
          // Первый раунд - всегда берем из матча
          participant1 = match.athlete1 || null;
          participant2 = match.athlete2 || null;
        } else {
          // Последующие раунды - берем победителей из предыдущего раунда
          const prevRoundMatches = matchesByRound[round - 1]?.sort((a, b) => a.position - b.position) || [];
          const prevMatch1 = prevRoundMatches.find(m => m.position === matchPosition * 2 - 1);
          const prevMatch2 = prevRoundMatches.find(m => m.position === matchPosition * 2);
          
          participant1 = prevMatch1 ? getMatchWinner(prevMatch1) : null;
          participant2 = prevMatch2 ? getMatchWinner(prevMatch2) : null;
        }
      }

      // Создаем узел для первого участника
      if (participant1) {
        // Добавляем участника в карту, если его еще нет (для последующих раундов)
        if (!athleteMap.has(participant1.id)) {
          athleteMap.set(participant1.id, {
            athleteId: participant1.id,
            number: participantNumber++,
            name: getAthleteName(participant1),
            region: getAthleteRegion(participant1),
          });
        }
        const athleteInfo = athleteMap.get(participant1.id)!;
        newNodes.push({
          id: `p${athleteInfo.number}-r${round}-p${matchPosition}-pos1`,
          type: 'athlete',
          position: { x: xPosition, y: baseMatchY },
          data: {
            name: athleteInfo.name,
            region: athleteInfo.region,
            number: athleteInfo.number,
            isWinner: winner?.id === participant1.id,
            onClick: () => handleNodeClick(match.id),
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });
      } else {
        // Создаем пустой узел для будущего участника
        newNodes.push({
          id: `empty-r${round}-p${matchPosition}-pos1`,
          type: 'athlete',
          position: { x: xPosition, y: baseMatchY },
          data: {
            name: '—',
            region: '',
            number: '',
            isWinner: false,
            onClick: () => handleNodeClick(match.id),
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });
      }

      // Создаем узел для второго участника
      if (participant2) {
        // Добавляем участника в карту, если его еще нет (для последующих раундов)
        if (!athleteMap.has(participant2.id)) {
          athleteMap.set(participant2.id, {
            athleteId: participant2.id,
            number: participantNumber++,
            name: getAthleteName(participant2),
            region: getAthleteRegion(participant2),
          });
        }
        const athleteInfo = athleteMap.get(participant2.id)!;
        newNodes.push({
          id: `p${athleteInfo.number}-r${round}-p${matchPosition}-pos2`,
          type: 'athlete',
          position: { x: xPosition, y: baseMatchY + nodeHeight + pairGap },
          data: {
            name: athleteInfo.name,
            region: athleteInfo.region,
            number: athleteInfo.number,
            isWinner: winner?.id === participant2.id,
            onClick: () => handleNodeClick(match.id),
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });
      } else {
        // Создаем пустой узел для будущего участника
        newNodes.push({
          id: `empty-r${round}-p${matchPosition}-pos2`,
          type: 'athlete',
          position: { x: xPosition, y: baseMatchY + nodeHeight + pairGap },
          data: {
            name: '—',
            region: '',
            number: '',
            isWinner: false,
            onClick: () => handleNodeClick(match.id),
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });
      }
    });
  });

  // Добавляем узел финального победителя
  if (finalWinner) {
    const athleteInfo = athleteMap.get(finalWinner.id)!;
    // Центрируем победителя между двумя участниками финала
    const finalRound = rounds[rounds.length - 1];
    const finalMatch = matchesByRound[finalRound]?.find(m => m.round === finalRound);
    let finalWinnerY = headerHeight + 300; // Значение по умолчанию
    
    if (finalMatch && pairCenters[finalRound]?.[finalMatch.position]) {
      // Используем центр финального матча
      finalWinnerY = pairCenters[finalRound][finalMatch.position];
    } else if (rounds.length > 1) {
      // Если нет финального матча, центрируем между двумя полуфиналистами
      const semiFinalRound = finalRound - 1;
      const semiFinal1Center = pairCenters[semiFinalRound]?.[1];
      const semiFinal2Center = pairCenters[semiFinalRound]?.[2];
      if (semiFinal1Center !== undefined && semiFinal2Center !== undefined) {
        finalWinnerY = (semiFinal1Center + semiFinal2Center) / 2;
      }
    }
    
    newNodes.push({
      id: `final-winner`,
      type: 'athlete',
      position: {
        x: groupLabelWidth + rounds.length * (nodeWidth + horizontalGap),
        y: finalWinnerY - nodeHeight / 2, // Центрируем по вертикали
      },
      data: {
        name: athleteInfo.name,
        region: athleteInfo.region,
        number: '',
        isFinalWinner: true,
        onClick: () => {},
      },
      targetPosition: Position.Left,
    });
  }

  // Создаем ребра (связи между узлами)
  rounds.forEach((round, roundIndex) => {
    const currentMatches = matchesByRound[round].sort((a, b) => a.position - b.position);

    if (roundIndex === rounds.length - 1) {
      // Финальный раунд - линии к победителю
      const match = currentMatches[0];
      const winner = getMatchWinner(match);
      
      if (winner) {
        // Получаем обоих участников финала
        const prevRoundMatches = matchesByRound[round - 1]?.sort((a, b) => a.position - b.position);
        if (prevRoundMatches && prevRoundMatches.length >= 2) {
          const prevMatch1 = prevRoundMatches.find(m => m.position === 1);
          const prevMatch2 = prevRoundMatches.find(m => m.position === 2);
          const participant1 = prevMatch1 ? getMatchWinner(prevMatch1) : null;
          const participant2 = prevMatch2 ? getMatchWinner(prevMatch2) : null;
          
          if (participant1 && participant2) {
            const participant1Info = athleteMap.get(participant1.id)!;
            const participant2Info = athleteMap.get(participant2.id)!;
            
            // Линия от первого участника финала
            newEdges.push({
              id: `edge-final-pos1`,
              source: `p${participant1Info.number}-r${round}-p1-pos1`,
              target: `final-winner`,
              type: 'step',
              animated: false,
              style: { stroke: '#000', strokeWidth: 2 },
            });
            
            // Линия от второго участника финала
            newEdges.push({
              id: `edge-final-pos2`,
              source: `p${participant2Info.number}-r${round}-p1-pos2`,
              target: `final-winner`,
              type: 'step',
              animated: false,
              style: { stroke: '#000', strokeWidth: 2 },
            });
          }
        }
      }
    } else {
      // Промежуточные раунды
      const nextRound = round + 1;
      const nextRoundMatches = matchesByRound[nextRound]?.sort((a, b) => a.position - b.position) || [];

      currentMatches.forEach((match) => {
        const matchPosition = match.position;

        // Получаем участников текущего матча
        let participant1 = null;
        let participant2 = null;

        // Используем общий тип соревнования для всех матчей
        if (isTeam) {
          // Командные матчи: используем team1 и team2
          if (round === 1) {
            // Первый раунд - всегда берем из матча
            participant1 = match.team1 || null;
            participant2 = match.team2 || null;
          } else {
            // Последующие раунды - берем победителей из предыдущего раунда
            const prevRoundMatches = matchesByRound[round - 1]?.sort((a, b) => a.position - b.position) || [];
            const prevMatch1 = prevRoundMatches.find(m => m.position === matchPosition * 2 - 1);
            const prevMatch2 = prevRoundMatches.find(m => m.position === matchPosition * 2);
            participant1 = prevMatch1 ? getMatchWinner(prevMatch1) : null;
            participant2 = prevMatch2 ? getMatchWinner(prevMatch2) : null;
          }
        } else {
          // Индивидуальные матчи: используем athlete1 и athlete2
          if (round === 1) {
            // Первый раунд - всегда берем из матча
            participant1 = match.athlete1 || null;
            participant2 = match.athlete2 || null;
          } else {
            // Последующие раунды - берем победителей из предыдущего раунда
            const prevRoundMatches = matchesByRound[round - 1]?.sort((a, b) => a.position - b.position) || [];
            const prevMatch1 = prevRoundMatches.find(m => m.position === matchPosition * 2 - 1);
            const prevMatch2 = prevRoundMatches.find(m => m.position === matchPosition * 2);
            participant1 = prevMatch1 ? getMatchWinner(prevMatch1) : null;
            participant2 = prevMatch2 ? getMatchWinner(prevMatch2) : null;
          }
        }

        // Если нет ни одного участника, не рисуем линии
        if (!participant1 && !participant2) return;

        const participant1Info = participant1 ? athleteMap.get(participant1.id) : null;
        const participant2Info = participant2 ? athleteMap.get(participant2.id) : null;

        // Находим соответствующий матч в следующем раунде
        // Матч с позицией N в текущем раунде переходит в матч с позицией Math.ceil(N/2) в следующем
        const nextMatchPosition = Math.ceil(matchPosition / 2);
        const nextMatch = nextRoundMatches.find(m => m.position === nextMatchPosition);
        if (!nextMatch) return;

        // Определяем позицию в следующем матче (pos1 или pos2)
        // Если matchPosition нечетное - pos1, четное - pos2
        const targetPosition = matchPosition % 2 === 1 ? 'pos1' : 'pos2';

        // Определяем winner для целевого узла
        const winner = getMatchWinner(match);
        let targetId;

        if (winner && athleteMap.has(winner.id)) {
          const winnerInfo = athleteMap.get(winner.id)!;
          targetId = `p${winnerInfo.number}-r${nextRound}-p${nextMatchPosition}-${targetPosition}`;
        } else {
          // Если победителя нет, целевой узел - пустой
          targetId = `empty-r${nextRound}-p${nextMatchPosition}-${targetPosition}`;
        }

        // Определяем, есть ли хотя бы один реальный участник в текущем матче
        const hasAnyParticipant = participant1 || participant2;
        
        // Линия от первого участника текущего матча
        if (participant1 && participant1Info) {
          newEdges.push({
            id: `edge-r${round}-p${matchPosition}-pos1-to-next`,
            source: `p${participant1Info.number}-r${round}-p${matchPosition}-pos1`,
            target: targetId,
            type: 'step',
            animated: false,
            style: { stroke: '#000', strokeWidth: 2 },
          });
        } else if (hasAnyParticipant) {
          // Если есть хоть один участник в матче, рисуем черную линию от пустого слота
          newEdges.push({
            id: `edge-r${round}-p${matchPosition}-pos1-to-next`,
            source: `empty-r${round}-p${matchPosition}-pos1`,
            target: targetId,
            type: 'step',
            animated: false,
            style: { stroke: '#000', strokeWidth: 2 },
          });
        }

        // Линия от второго участника текущего матча
        if (participant2 && participant2Info) {
          newEdges.push({
            id: `edge-r${round}-p${matchPosition}-pos2-to-next`,
            source: `p${participant2Info.number}-r${round}-p${matchPosition}-pos2`,
            target: targetId,
            type: 'step',
            animated: false,
            style: { stroke: '#000', strokeWidth: 2 },
          });
        } else if (hasAnyParticipant) {
          // Если есть хоть один участник в матче, рисуем черную линию от пустого слота
          newEdges.push({
            id: `edge-r${round}-p${matchPosition}-pos2-to-next`,
            source: `empty-r${round}-p${matchPosition}-pos2`,
            target: targetId,
            type: 'step',
            animated: false,
            style: { stroke: '#000', strokeWidth: 2 },
          });
        }
      });
    }
  });

  return { nodes: newNodes, edges: newEdges, athleteMap };
};
