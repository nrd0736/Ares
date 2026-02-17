/**
 * Глобальные типы TypeScript
 * 
 * Функциональность:
 * - Объявление глобальных переменных для использования в коде
 * - Расширение типов Express Request
 * 
 * Глобальные переменные:
 * - io - экземпляр Socket.IO сервера (доступен через global.io)
 * - currentUserContext - контекст текущего пользователя для логирования
 */

import { Server } from 'socket.io';

declare global {
  var io: Server | undefined;
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: string };
    }
  }
}

export type { AuthRequest } from '../middleware/auth';
export {};

