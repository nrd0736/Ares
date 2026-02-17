/**
 * Планировщик автоматического резервного копирования
 * 
 * Функциональность:
 * - startBackupScheduler() - запуск планировщика
 * - Автоматическое создание бэкапов по расписанию
 * - Настройка через backup-settings.json
 * 
 * Особенности:
 * - Расписание настраивается администратором
 * - Автоматическая очистка старых бэкапов
 * - Ограничение количества хранимых бэкапов
 */

import { backupsService } from './backups.service';
import logger from '../../../utils/logger';
import cron, { type ScheduledTask } from 'node-cron';

let scheduledTask: ScheduledTask | null = null;

/**
 * Запуск планировщика автоматического резервного копирования
 */
export async function startBackupScheduler() {
  try {
    const settings = await backupsService.getBackupSettings();
    
    if (!settings.enabled) {
      logger.info('Automatic backup disabled');
      return;
    }

    // Останавливаем предыдущую задачу, если она существует
    if (scheduledTask) {
      scheduledTask.stop();
      scheduledTask = null;
    }

    const interval = settings.interval || 'daily';
    const time = settings.time || '02:00';
    const [hours, minutes] = time.split(':').map(Number);

    let cronExpression: string;

    switch (interval) {
      case 'daily':
        // Ежедневно в указанное время
        cronExpression = `${minutes} ${hours} * * *`;
        break;
      case 'weekly':
        // Еженедельно в понедельник в указанное время
        cronExpression = `${minutes} ${hours} * * 1`;
        break;
      case 'monthly':
        // Ежемесячно 1-го числа в указанное время
        cronExpression = `${minutes} ${hours} 1 * *`;
        break;
      default:
        cronExpression = `${minutes} ${hours} * * *`;
    }

    scheduledTask = cron.schedule(cronExpression, async () => {
      try {
        logger.info('Starting scheduled backup');
        await backupsService.createScheduledBackup();
        
        // Удаляем старые бэкапы, если превышен лимит
        const maxBackups = settings.maxBackups || 30;
        const allBackups = await backupsService.getAllBackups();
        const scheduledBackups = allBackups.filter(b => b.type === 'scheduled');
        
        if (scheduledBackups.length > maxBackups) {
          // Сортируем по дате создания и удаляем самые старые
          scheduledBackups.sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          
          const toDelete = scheduledBackups.slice(0, scheduledBackups.length - maxBackups);
          for (const backup of toDelete) {
            await backupsService.deleteBackup(backup.id);
            logger.info('Old backup deleted', { filename: backup.filename });
          }
        }
        
        logger.info('Scheduled backup completed');
      } catch (error: any) {
        logger.error('Scheduled backup failed', {
          error: error.message,
          stack: error.stack,
        });
      }
    }, {
      timezone: 'Europe/Moscow',
    });

    logger.info('Backup scheduler started', { interval, time });
  } catch (error: any) {
    logger.error('Failed to start backup scheduler', {
      error: error.message,
    });
  }
}

/**
 * Остановить планировщик
 */
export function stopBackupScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    logger.info('Backup scheduler stopped');
  }
}

/**
 * Перезапустить планировщик (используется при изменении настроек)
 */
export async function restartBackupScheduler() {
  stopBackupScheduler();
  await startBackupScheduler();
}

