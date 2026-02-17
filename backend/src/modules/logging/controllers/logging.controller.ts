/**
 * Контроллер управления системными логами
 * 
 * Функциональность:
 * - getLogs() - получение логов с фильтрацией и пагинацией
 * - getSettings() - настройки логирования
 * - updateSettings() - обновление настроек
 * - cleanOldLogs() - очистка старых логов
 * 
 * Доступ: ADMIN, MODERATOR
 * 
 * Фильтры:
 * - По пользователю
 * - По типу сущности
 * - По действию
 * - По дате
 */

import { Response } from 'express';
import { AuthRequest } from '../../../types/express';
import { loggingService } from '../services/logging.service';

export class LoggingController {
  /**
   * Получить логи
   */
  async getLogs(req: AuthRequest, res: Response) {
    try {
      const {
        limit = 100,
        offset = 0,
        userId,
        entityType,
        action,
        startDate,
        endDate,
      } = req.query;

      const options: any = {
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      };

      if (userId) {
        options.userId = userId as string;
      }

      if (entityType) {
        options.entityType = entityType as string;
      }

      if (action) {
        options.action = action as string;
      }

      if (startDate) {
        options.startDate = new Date(startDate as string);
      }

      if (endDate) {
        options.endDate = new Date(endDate as string);
      }

      const result = await loggingService.getLogs(options);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении логов',
      });
    }
  }

  /**
   * Получить настройки логирования
   */
  async getSettings(req: AuthRequest, res: Response) {
    try {
      const settings = await loggingService.getLoggingSettings();
      res.json({
        success: true,
        data: settings,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении настроек',
      });
    }
  }

  /**
   * Обновить настройки логирования
   */
  async updateSettings(req: AuthRequest, res: Response) {
    try {
      const { retentionPeriod } = req.body;

      if (!retentionPeriod || !['week', 'month', '3months', '6months', 'year'].includes(retentionPeriod)) {
        return res.status(400).json({
          success: false,
          message: 'Некорректный период хранения логов',
        });
      }

      const settings = await loggingService.updateLoggingSettings({ retentionPeriod });
      res.json({
        success: true,
        data: settings,
        message: 'Настройки обновлены',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при обновлении настроек',
      });
    }
  }

  /**
   * Очистить старые логи (запускается автоматически или вручную)
   */
  async cleanOldLogs(req: AuthRequest, res: Response) {
    try {
      const deletedCount = await loggingService.cleanOldLogs();
      res.json({
        success: true,
        message: `Удалено ${deletedCount} старых логов`,
        data: { deletedCount },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при очистке логов',
      });
    }
  }
}

export const loggingController = new LoggingController();

