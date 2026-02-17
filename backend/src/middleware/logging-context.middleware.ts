/**
 * Модуль контекста логирования
 * 
 * Функциональность:
 * - Установка контекста пользователя для автоматического логирования
 * - Извлечение IP адреса (в том числе за прокси)
 * - Извлечение User-Agent браузера
 * - Сохранение контекста в глобальной переменной для Prisma middleware
 * - Автоматическая очистка контекста после завершения запроса
 * 
 * Использование:
 * - Применяется ко всем роутам после аутентификации
 * - Контекст используется в database.ts для автоматического логирования изменений
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import prisma from '../utils/database';

/**
 * Middleware установки контекста логирования
 * 
 * Сохраняет информацию о текущем пользователе и запросе
 * в глобальном контексте для использования в Prisma middleware
 */
export const setLoggingContext = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user) {
      // Получаем полные данные пользователя из БД
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { profile: true },
      });

      if (user) {
        // Формируем полное имя пользователя
        const userName = user.profile
          ? `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim()
          : user.email;

        // Сохраняем контекст в глобальную переменную
        // Этот контекст будет использован в Prisma middleware (database.ts)
        (global as any).currentUserContext = {
          userId: user.id,
          userEmail: user.email,
          userName: userName || user.email,
          // Извлекаем реальный IP (даже если запрос идет через прокси)
          ipAddress:
            (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
            (req.headers['x-real-ip'] as string) ||
            req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
        };
      }
    } else {
      // Для неавторизованных запросов очищаем контекст
      (global as any).currentUserContext = {};
    }
  } catch (error) {
    // При ошибке очищаем контекст (не блокируем запрос)
    (global as any).currentUserContext = {};
  }

  // Очищаем контекст после завершения обработки запроса
  // Важно для предотвращения утечек данных между запросами
  res.on('finish', () => {
    (global as any).currentUserContext = {};
  });

  next();
};

