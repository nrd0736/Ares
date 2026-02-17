/**
 * Планировщик автоматической очистки старых логов
 * 
 * Функциональность:
 * - startLogCleanupScheduler() - запуск планировщика
 * - Автоматическая очистка старых логов каждый день в 3:00
 * - Удаление логов старше заданного периода
 * 
 * Особенности:
 * - Расписание: каждый день в 3:00
 * - Период хранения настраивается в настройках логирования
 * - Автоматический запуск при старте сервера
 */

import { loggingService } from './logging.service';
import logger from '../../../utils/logger';
import cron from 'node-cron';

/**
 * Запуск планировщика очистки старых логов
 */
export async function startLogCleanupScheduler() {
  try {
    // Run cleanup every day at 3:00 AM
    cron.schedule('0 3 * * *', async () => {
      try {
        logger.info('Starting automatic log cleanup');
        const deletedCount = await loggingService.cleanOldLogs();
        logger.info('Log cleanup completed', { deletedCount });
      } catch (error: any) {
        logger.error('Log cleanup failed', {
          error: error.message,
          stack: error.stack,
        });
      }
    }, {
      timezone: 'Europe/Moscow',
    });

    logger.info('Log cleanup scheduler started', { schedule: 'daily at 3:00 AM' });
  } catch (error: any) {
    logger.error('Failed to start log cleanup scheduler', {
      error: error.message,
    });
  }
}

