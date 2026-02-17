/**
 * Вспомогательные функции для логирования действий пользователей
 * 
 * Функциональность:
 * - getUserFromRequest() - извлечение информации о пользователе из запроса
 * - logAction() - удобная функция для логирования действий
 * 
 * Использование:
 * - В контроллерах для логирования действий пользователей
 * - Автоматическое извлечение контекста из запроса
 */

import { loggingService } from '../services/logging.service';
import { Request } from 'express';

/**
 * Извлечение информации о пользователе из Express запроса
 */
export function getUserFromRequest(req: any) {
  const user = req.user;
  if (!user) return null;

  return {
    userId: user.id,
    userEmail: user.email,
    userName: user.profile
      ? `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim()
      : user.email,
  };
}

/**
 * Получить IP адрес из запроса
 */
export function getIpAddress(req: Request): string | undefined {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress
  );
}

/**
 * Логировать действие
 */
export async function logAction(
  req: Request,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  entityType: string,
  options: {
    entityId?: string;
    entityName?: string;
    changes?: any;
    description?: string;
  }
) {
  try {
    const user = getUserFromRequest(req);
    const ipAddress = getIpAddress(req);
    const userAgent = req.headers['user-agent'];

    await loggingService.createLog({
      userId: user?.userId,
      userEmail: user?.userEmail,
      userName: user?.userName,
      action,
      entityType,
      entityId: options.entityId,
      entityName: options.entityName,
      changes: options.changes,
      description: options.description,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    // Игнорируем ошибки логирования, чтобы не прерывать основную операцию
    console.error('Ошибка при логировании действия:', error);
  }
}

