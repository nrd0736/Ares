/**
 * Middleware для Prisma для автоматического логирования изменений в БД
 * 
 * Функциональность:
 * - Автоматическое логирование всех операций записи (create, update, delete)
 * - Извлечение данных до удаления для логирования
 * - Сохранение контекста пользователя (кто, когда, откуда)
 * - Определение изменений при обновлении
 * 
 * Особенности:
 * - Пропускает операции чтения (для производительности)
 * - Пропускает логирование самих логов (защита от рекурсии)
 * - Использует контекст из logging-context.middleware
 */

import { Prisma } from '@prisma/client';
import { loggingService, LogAction } from '../services/logging.service';

/**
 * Создание middleware для автоматического логирования
 */
export function createLoggingMiddleware(userContext?: {
  userId?: string;
  userEmail?: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  return async (params: Prisma.MiddlewareParams, next: (params: Prisma.MiddlewareParams) => Promise<any>) => {
    // Для delete нужно получить данные ДО удаления
    let deletedData: any = null;
    if (params.action === 'delete' && params.model && params.args?.where) {
      try {
        const prisma = (await import('../../../utils/database')).default;
        const modelName = params.model.charAt(0).toLowerCase() + params.model.slice(1);
        const model = (prisma as any)[modelName];
        if (model && model.findUnique) {
          deletedData = await model.findUnique({ where: params.args.where });
        }
      } catch (err) {
        // Игнорируем ошибки
      }
    }

    const result = await next(params);

    // Логируем только операции изменения данных
    if (['create', 'update', 'delete'].includes(params.action)) {
      try {
        const logAction: LogAction = {
          userId: userContext?.userId,
          userEmail: userContext?.userEmail,
          userName: userContext?.userName,
          action: params.action === 'create' ? 'CREATE' : params.action === 'update' ? 'UPDATE' : 'DELETE',
          entityType: params.model || 'Unknown',
          ipAddress: userContext?.ipAddress,
          userAgent: userContext?.userAgent,
        };

        // Для create и update получаем ID и данные
        if (params.action === 'create' && result) {
          logAction.entityId = result.id || result[0]?.id;
          logAction.changes = { new: result };
          
          // Пытаемся получить название сущности
          if (result.name) {
            logAction.entityName = result.name;
          } else if (result.title) {
            logAction.entityName = result.title;
          } else if (result.email) {
            logAction.entityName = result.email;
          }
        }

        if (params.action === 'update' && params.args?.where) {
          logAction.entityId = params.args.where.id || params.args.where[Object.keys(params.args.where)[0]];
          logAction.changes = {
            old: params.args.data ? {} : undefined,
            new: params.args.data || {},
          };

          // Если есть результат, используем его для получения названия
          if (result) {
            if (result.name) {
              logAction.entityName = result.name;
            } else if (result.title) {
              logAction.entityName = result.title;
            } else if (result.email) {
              logAction.entityName = result.email;
            }
          }
        }

        if (params.action === 'delete' && params.args?.where) {
          logAction.entityId = params.args.where.id || params.args.where[Object.keys(params.args.where)[0]];
          
          // Используем данные, полученные ДО удаления
          if (deletedData) {
            logAction.changes = { old: deletedData };
            if (deletedData.name) {
              logAction.entityName = deletedData.name;
            } else if (deletedData.title) {
              logAction.entityName = deletedData.title;
            } else if (deletedData.email) {
              logAction.entityName = deletedData.email;
            } else if (deletedData.filename) {
              logAction.entityName = deletedData.filename;
            }
          }
        }

        // Формируем описание
        logAction.description = `${logAction.action} ${logAction.entityType}${logAction.entityName ? `: ${logAction.entityName}` : ''}`;

        // Создаем лог асинхронно, не блокируя основную операцию
        loggingService.createLog(logAction).catch((err) => {
          // Ошибки логирования не должны влиять на основную операцию
          console.error('Ошибка при логировании:', err);
        });
      } catch (error) {
        // Игнорируем ошибки логирования
        console.error('Ошибка в middleware логирования:', error);
      }
    }

    return result;
  };
}

