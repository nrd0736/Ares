/**
 * Сервис для работы с Socket.IO на клиенте
 * 
 * Функциональность:
 * - connect() - подключение к Socket.IO серверу
 * - disconnect() - отключение от сервера
 * - subscribeToCompetition() - подписка на события соревнования
 * - subscribeToNotifications() - подписка на уведомления
 * - subscribeToNews() - подписка на новости
 * - emit() - отправка событий на сервер
 * 
 * Особенности:
 * - Автоматическое переподключение при разрыве связи
 * - Обработка ошибок подключения
 * - Управление подписками на события
 * - Используется для real-time обновлений
 */

import { io, Socket } from 'socket.io-client';
import logger from '../utils/logger';
import { config } from '../utils/config';

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;

  /**
   * Подключение к Socket.IO серверу
   */
  connect(token?: string) {
    if (this.socket?.connected) {
      logger.info('Socket уже подключен');
      return;
    }

    // Если есть старое соединение, которое не подключено, очищаем его
    if (this.socket && !this.socket.connected) {
      try {
        this.socket.removeAllListeners();
        this.socket.close();
      } catch (error) {
        // Игнорируем ошибки при очистке
      }
      this.socket = null;
    }

    // Используем централизованную конфигурацию
    this.socket = io(config.socket.url, {
      auth: token ? { token } : undefined,
      ...config.socket.options,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      logger.info('Socket.IO подключен');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      logger.warn('Socket.IO отключен');
    });

    this.socket.on('connect_error', (error) => {
      // Не логируем как ошибку, так как это может быть нормальной ситуацией (сервер не запущен)
      logger.debug('Ошибка подключения Socket.IO (можно игнорировать)', error);
    });

    return this.socket;
  }

  /**
   * Отключение от Socket.IO сервера
   */
  disconnect() {
    if (this.socket) {
      try {
        // Удаляем все обработчики событий перед отключением
        this.socket.removeAllListeners();
        // Отключаемся только если соединение установлено или находится в процессе подключения
        if (this.socket.connected || this.socket.connecting) {
          this.socket.disconnect();
        }
      } catch (error) {
        // Игнорируем ошибки при отключении (соединение может быть уже закрыто)
        logger.debug('Ошибка при отключении Socket.IO (можно игнорировать)', error);
      } finally {
        this.socket = null;
        this.isConnected = false;
      }
    }
  }

  /**
   * Подписка на события соревнования
   */
  subscribeToCompetition(competitionId: string, callback: (data: any) => void) {
    if (!this.socket) {
      logger.warn('Socket не подключен');
      return;
    }

    this.socket.emit('subscribe:competition', competitionId);
    this.socket.on('match:update', callback);
    this.socket.on('bracket:update', callback);
    this.socket.on('bracket:created', callback);
    this.socket.on('result:update', callback);
    this.socket.on('disqualification:created', callback);

    logger.debug(`Подписка на соревнование: ${competitionId}`);
  }

  /**
   * Отписка от событий соревнования
   */
  unsubscribeFromCompetition(competitionId: string) {
    if (!this.socket) {
      return;
    }

    this.socket.emit('unsubscribe:competition', competitionId);
    this.socket.off('match:update');
    this.socket.off('bracket:update');
    this.socket.off('bracket:created');
    this.socket.off('result:update');
    this.socket.off('disqualification:created');

    logger.debug(`Отписка от соревнования: ${competitionId}`);
  }

  /**
   * Подписка на уведомления пользователя
   */
  subscribeToNotifications(userId: string, callback: (notification: any) => void) {
    if (!this.socket) {
      return;
    }

    this.socket.on('notification:new', callback);
    logger.debug(`Подписка на уведомления пользователя: ${userId}`);
  }

  /**
   * Подписка на новости
   */
  subscribeToNews(callback: (news: any) => void) {
    if (!this.socket) {
      return;
    }

    this.socket.on('news:created', callback);
    this.socket.on('news:updated', callback);
    this.socket.on('news:deleted', callback);

    logger.debug('Подписка на новости');
  }

  /**
   * Подписка на заявки команды
   */
  subscribeToTeamApplications(teamId: string, callback: (application: any) => void) {
    if (!this.socket) {
      return;
    }

    this.socket.on('application:created', callback);
    this.socket.on('application:updated', callback);

    logger.debug(`Подписка на заявки команды: ${teamId}`);
  }

  /**
   * Получить состояние подключения
   */
  getConnectionStatus(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Получить экземпляр socket
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
export default socketService;

