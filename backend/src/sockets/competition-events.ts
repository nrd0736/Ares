/**
 * Модуль инициализации Socket.IO для real-time обновлений
 * 
 * Функциональность:
 * - Инициализация Socket.IO сервера
 * - Подписка на события соревнований
 * - Подписка на события судей
 * - Отправка обновлений матчей, сеток и результатов
 * 
 * События:
 * - subscribe:competition - подписка на события соревнования
 * - unsubscribe:competition - отписка от событий соревнования
 * - subscribe:judge - подписка на события судьи
 * - match:update - обновление матча
 * - bracket:update - обновление сетки
 * - result:update - обновление результата
 * 
 * Используется для:
 * - Real-time обновления сеток соревнований
 * - Мгновенные уведомления о результатах
 * - Синхронизация данных между клиентами
 */

import { Server, Socket } from 'socket.io';
import logger from '../utils/logger';

export const initializeSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    logger.info('Подключение по сокету');

    socket.on('subscribe:competition', (competitionId: string) => {
      socket.join(`competition:${competitionId}`);
      logger.debug('Подписка на соревнование');
    });

    socket.on('unsubscribe:competition', (competitionId: string) => {
      socket.leave(`competition:${competitionId}`);
      logger.debug('Отписка от соревнования');
    });

    socket.on('subscribe:judge', (judgeId: string) => {
      socket.join(`judge:${judgeId}`);
      logger.debug('Подписка на судью');
    });

    socket.on('disconnect', () => {
      logger.info('Отключение по сокету');
    });
  });

  // Функции для отправки событий
  return {
    emitMatchUpdate: (competitionId: string, matchData: any) => {
      io.to(`competition:${competitionId}`).emit('match:update', matchData);
    },
    emitBracketUpdate: (competitionId: string, bracketData: any) => {
      io.to(`competition:${competitionId}`).emit('bracket:update', bracketData);
    },
    emitResultUpdate: (competitionId: string, resultData: any) => {
      io.to(`competition:${competitionId}`).emit('result:update', resultData);
    },
  };
};

