/**
 * Контроллер управления резервным копированием
 * 
 * Функциональность:
 * - exportDatabase() - экспорт БД в JSON или CSV
 * - importDatabase() - импорт БД из файла
 * - getAllBackups() - список всех бэкапов
 * - downloadBackup() - скачивание бэкапа
 * - deleteBackup() - удаление бэкапа
 * - getBackupSettings() - настройки автоматического резервного копирования
 * - updateBackupSettings() - обновление настроек
 * 
 * Доступ: ADMIN, MODERATOR
 */

import { Response } from 'express';
import { AuthRequest } from '../../../types/express';
import { backupsService } from '../services/backups.service';
import { logAction } from '../../logging/helpers/log-action.helper';
import fs from 'fs/promises';

export class BackupsController {
  /**
   * Экспорт БД в JSON или CSV
   */
  async exportDatabase(req: AuthRequest, res: Response) {
    try {
      const { format = 'json', description } = req.body;

      let result;
      if (format === 'json') {
        result = await backupsService.exportToJson(description);
      } else if (format === 'csv') {
        result = await backupsService.exportToCsv(description);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Неподдерживаемый формат. Используйте json или csv',
        });
      }

      // Логируем создание бэкапа
      await logAction(req, 'CREATE', 'Backup', {
        entityId: result.id,
        entityName: result.filename,
        description: `Создан бэкап: ${result.filename} (${format.toUpperCase()})`,
      });

      // Отправляем файл
      const filePath = result.filePath;
      res.download(filePath, result.filename, (err) => {
        if (err) {
          res.status(500).json({
            success: false,
            message: 'Ошибка при отправке файла',
          });
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при экспорте базы данных',
      });
    }
  }

  /**
   * Импорт БД из JSON или CSV
   */
  async importDatabase(req: AuthRequest, res: Response) {
    try {
      const { format, data, clearBeforeImport = false } = req.body;

      if (format === 'json') {
        await backupsService.importFromJson(data, clearBeforeImport);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Импорт из CSV пока не поддерживается',
        });
      }

      res.json({
        success: true,
        message: 'Данные успешно импортированы',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при импорте базы данных',
      });
    }
  }

  /**
   * Получить список всех бэкапов
   */
  async getAllBackups(req: AuthRequest, res: Response) {
    try {
      const backups = await backupsService.getAllBackups();
      res.json({
        success: true,
        data: backups,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении списка бэкапов',
      });
    }
  }

  /**
   * Скачать бэкап
   */
  async downloadBackup(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const backup = await backupsService.getBackupById(id);

      if (!backup) {
        return res.status(404).json({
          success: false,
          message: 'Бэкап не найден',
        });
      }

      // Проверяем существование файла
      try {
        await fs.access(backup.filePath);
      } catch {
        return res.status(404).json({
          success: false,
          message: 'Файл бэкапа не найден',
        });
      }

      res.download(backup.filePath, backup.filename, (err) => {
        if (err) {
          res.status(500).json({
            success: false,
            message: 'Ошибка при отправке файла',
          });
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при скачивании бэкапа',
      });
    }
  }

  /**
   * Удалить бэкап
   */
  async deleteBackup(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      
      // Получаем информацию о бэкапе перед удалением для логирования
      const backup = await backupsService.getBackupById(id);
      
      await backupsService.deleteBackup(id);
      
      // Логируем удаление бэкапа
      await logAction(req, 'DELETE', 'Backup', {
        entityId: backup.id,
        entityName: backup.filename,
        description: `Удален бэкап: ${backup.filename}`,
      });
      
      res.json({
        success: true,
        message: 'Бэкап успешно удален',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при удалении бэкапа',
      });
    }
  }

  /**
   * Получить настройки автоматического резервного копирования
   */
  async getBackupSettings(req: AuthRequest, res: Response) {
    try {
      const settings = await backupsService.getBackupSettings();
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
   * Обновить настройки автоматического резервного копирования
   */
  async updateBackupSettings(req: AuthRequest, res: Response) {
    try {
      const settings = await backupsService.updateBackupSettings(req.body);
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
}

export const backupsController = new BackupsController();

