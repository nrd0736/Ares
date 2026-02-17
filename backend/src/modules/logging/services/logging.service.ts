/**
 * Сервис управления системными логами
 * 
 * Основная бизнес-логика:
 * - getLogs() - получение логов с фильтрацией
 * - createLog() - создание записи лога
 * - getSettings() - получение настроек логирования
 * - updateSettings() - обновление настроек
 * - cleanOldLogs() - удаление старых логов
 * 
 * Особенности:
 * - Автоматическое логирование через Prisma middleware
 * - Фильтрация по различным критериям
 * - Настройки хранения логов
 * - Автоматическая очистка старых записей
 */

import prisma from '../../../utils/database';
import logger from '../../../utils/logger';
import { Prisma } from '@prisma/client';

export interface LogAction {
  userId?: string;
  userEmail?: string;
  userName?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: string;
  entityId?: string;
  entityName?: string;
  changes?: any;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class LoggingService {
  /**
   * Создать лог
   */
  async createLog(logData: LogAction) {
    try {
      await prisma.systemLog.create({
        data: {
          userId: logData.userId,
          userEmail: logData.userEmail,
          userName: logData.userName,
          action: logData.action,
          entityType: logData.entityType,
          entityId: logData.entityId,
          entityName: logData.entityName,
          changes: logData.changes ? logData.changes : Prisma.JsonNull,
          description: logData.description,
          ipAddress: logData.ipAddress,
          userAgent: logData.userAgent,
        },
      });
    } catch (error: any) {
      // Не прерываем выполнение при ошибке логирования
      logger.error('Ошибка при создании лога', {
        error: error.message,
      });
    }
  }

  /**
   * Получить логи с фильтрацией
   */
  async getLogs(options: {
    limit?: number;
    offset?: number;
    userId?: string;
    entityType?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    try {
      const where: any = {};

      if (options.userId) {
        where.userId = options.userId;
      }

      if (options.entityType) {
        where.entityType = options.entityType;
      }

      if (options.action) {
        where.action = options.action;
      }

      if (options.startDate || options.endDate) {
        where.createdAt = {};
        if (options.startDate) {
          where.createdAt.gte = options.startDate;
        }
        if (options.endDate) {
          where.createdAt.lte = options.endDate;
        }
      }

      const [logs, total] = await Promise.all([
        prisma.systemLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: options.limit || 100,
          skip: options.offset || 0,
        }),
        prisma.systemLog.count({ where }),
      ]);

      return {
        logs,
        total,
        limit: options.limit || 100,
        offset: options.offset || 0,
      };
    } catch (error: any) {
      throw new Error(`Ошибка при получении логов: ${error.message}`);
    }
  }

  /**
   * Получить настройки логирования
   */
  async getLoggingSettings() {
    try {
      // Настройки храним в файле или в БД
      const fs = await import('fs/promises');
      const path = await import('path');
      const settingsFile = path.join(process.cwd(), 'logging-settings.json');

      try {
        const settings = await fs.readFile(settingsFile, 'utf-8');
        return JSON.parse(settings);
      } catch {
        // Если файла нет, возвращаем настройки по умолчанию
        return {
          retentionPeriod: 'month', // 'week', 'month', '3months', '6months', 'year'
        };
      }
    } catch (error: any) {
      return {
        retentionPeriod: 'month',
      };
    }
  }

  /**
   * Обновить настройки логирования
   */
  async updateLoggingSettings(settings: { retentionPeriod: string }) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const settingsFile = path.join(process.cwd(), 'logging-settings.json');

      await fs.writeFile(settingsFile, JSON.stringify(settings, null, 2), 'utf-8');
      return settings;
    } catch (error: any) {
      throw new Error(`Ошибка при обновлении настроек: ${error.message}`);
    }
  }

  /**
   * Очистить старые логи согласно настройкам
   */
  async cleanOldLogs() {
    try {
      const settings = await this.getLoggingSettings();
      const retentionPeriod = settings.retentionPeriod || 'month';

      let cutoffDate: Date;
      const now = new Date();

      switch (retentionPeriod) {
        case 'week':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '3months':
          cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '6months':
          cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const result = await prisma.systemLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      logger.info('Old logs cleaned', { count: result.count, retentionPeriod });
      return result.count;
    } catch (error: any) {
      logger.error('Failed to clean old logs', {
        error: error.message,
      });
      throw error;
    }
  }
}

export const loggingService = new LoggingService();

