/**
 * Модуль маршрутов управления системными логами
 * 
 * Функциональность:
 * - GET / - получение логов с фильтрацией и пагинацией
 * - GET /settings - настройки логирования
 * - PUT /settings - обновление настроек логирования
 * - POST /clean - очистка старых логов
 * 
 * Доступ: ADMIN, MODERATOR
 * 
 * Логи включают:
 * - Действия пользователей
 * - Изменения в базе данных
 * - Системные события
 */

import { Router } from 'express';
import { loggingController } from './controllers/logging.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

// Все маршруты требуют аутентификации и прав администратора или модератора
router.use(authenticate);
router.use(authorize('ADMIN', 'MODERATOR'));

// Получить логи
router.get('/', loggingController.getLogs.bind(loggingController));

// Получить настройки логирования
router.get('/settings', loggingController.getSettings.bind(loggingController));

// Обновить настройки логирования
router.put('/settings', loggingController.updateSettings.bind(loggingController));

// Очистить старые логи
router.post('/clean', loggingController.cleanOldLogs.bind(loggingController));

export default router;

