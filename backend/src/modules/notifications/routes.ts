/**
 * Модуль маршрутов управления уведомлениями
 * 
 * Функциональность:
 * - GET / - уведомления текущего пользователя
 * - GET /unread/count - количество непрочитанных уведомлений
 * - POST / - создание уведомления (ADMIN, MODERATOR, JUDGE)
 * - POST /:id/read - отметить уведомление как прочитанное
 * - POST /read-all - отметить все уведомления как прочитанные
 * - DELETE /:id - удалить уведомление
 * 
 * Особенности:
 * - Все пользователи получают уведомления
 * - Создавать уведомления могут администраторы, модераторы и судьи
 * - Real-time обновления через Socket.IO
 */

import { Router } from 'express';
import { NotificationsController } from './controllers/notifications.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import {
  createNotificationSchema,
  markAsReadSchema,
} from './types';

const router = Router();
const notificationsController = new NotificationsController();

// Все маршруты требуют авторизации
router.use(authenticate);

// Получить уведомления пользователя
router.get('/', notificationsController.getUserNotifications.bind(notificationsController));

// Получить количество непрочитанных уведомлений
router.get('/unread/count', notificationsController.getUnreadCount.bind(notificationsController));

// Создать уведомление (для админов, модераторов и судей)
router.post(
  '/',
  authorize('ADMIN', 'MODERATOR', 'JUDGE'),
  validate(createNotificationSchema),
  notificationsController.createNotification.bind(notificationsController)
);

// Отметить уведомление как прочитанное
router.post(
  '/:id/read',
  validate(markAsReadSchema),
  notificationsController.markAsRead.bind(notificationsController)
);

// Отметить все уведомления как прочитанные
router.post(
  '/read-all',
  notificationsController.markAllAsRead.bind(notificationsController)
);

// Удалить уведомление
router.delete(
  '/:id',
  notificationsController.deleteNotification.bind(notificationsController)
);

export default router;

