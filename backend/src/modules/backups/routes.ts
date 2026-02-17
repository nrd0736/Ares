/**
 * Модуль маршрутов управления резервным копированием
 * 
 * Функциональность:
 * - POST /export - экспорт базы данных в файл
 * - POST /import - импорт базы данных из файла
 * - GET / - список всех бэкапов
 * - GET /:id/download - скачать бэкап
 * - DELETE /:id - удалить бэкап
 * - GET /settings - настройки автоматического резервного копирования
 * - PUT /settings - обновление настроек автоматического резервного копирования
 * 
 * Доступ: ADMIN, MODERATOR
 */

import { Router } from 'express';
import { backupsController } from './controllers/backups.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { createBackupSchema, updateBackupSettingsSchema, importBackupSchema } from './types';

const router = Router();

// Все маршруты требуют аутентификации и прав администратора или модератора
router.use(authenticate);
router.use(authorize('ADMIN', 'MODERATOR'));

// Экспорт БД
router.post(
  '/export',
  validate(createBackupSchema),
  backupsController.exportDatabase.bind(backupsController)
);

// Импорт БД
router.post(
  '/import',
  validate(importBackupSchema),
  backupsController.importDatabase.bind(backupsController)
);

// Получить список всех бэкапов
router.get(
  '/',
  backupsController.getAllBackups.bind(backupsController)
);

// Скачать бэкап
router.get(
  '/:id/download',
  backupsController.downloadBackup.bind(backupsController)
);

// Удалить бэкап
router.delete(
  '/:id',
  backupsController.deleteBackup.bind(backupsController)
);

// Получить настройки автоматического резервного копирования
router.get(
  '/settings',
  backupsController.getBackupSettings.bind(backupsController)
);

// Обновить настройки автоматического резервного копирования
router.put(
  '/settings',
  validate(updateBackupSettingsSchema),
  backupsController.updateBackupSettings.bind(backupsController)
);

export default router;

