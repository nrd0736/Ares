/**
 * Модуль маршрутов управления заявками на участие в соревнованиях
 * 
 * Функциональность:
 * - GET /team/my - заявки команды текущего тренера (COACH)
 * - POST / - создание заявки (COACH)
 * - GET /:id - получение заявки по ID
 * - GET / - все заявки (ADMIN, MODERATOR)
 * - GET /moderation/pending - заявки на модерации (ADMIN, MODERATOR)
 * - PUT /:id/status - изменение статуса заявки (ADMIN, MODERATOR)
 * - GET /statistics/overview - статистика заявок (ADMIN, MODERATOR)
 * - GET /team/:teamId - заявки команды по ID (ADMIN, MODERATOR)
 * - POST /admin - создание заявки от имени команды (ADMIN, MODERATOR)
 * 
 * Особенности:
 * - Тренеры создают заявки для своих спортсменов
 * - Администраторы и модераторы модерируют заявки
 * - Система статусов для контроля процесса регистрации
 */

import { Router } from 'express';
import { ApplicationsController } from './controllers/applications.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import {
  createApplicationSchema,
  updateApplicationStatusSchema,
} from './types';

const router = Router();
const applicationsController = new ApplicationsController();

// Все маршруты требуют авторизации
router.use(authenticate);

// Получить заявки команды (тренер)
router.get('/team/my', applicationsController.getTeamApplications.bind(applicationsController));

// Создать заявку (тренер)
router.post(
  '/',
  validate(createApplicationSchema),
  applicationsController.createApplication.bind(applicationsController)
);

// Получить заявку по ID
router.get('/:id', applicationsController.getApplicationById.bind(applicationsController));

// Получить все заявки (админ)
router.get(
  '/',
  authorize('ADMIN', 'MODERATOR'),
  applicationsController.getAllApplications.bind(applicationsController)
);

// Получить заявки на модерации (админ)
router.get(
  '/moderation/pending',
  authorize('ADMIN', 'MODERATOR'),
  applicationsController.getPendingApplications.bind(applicationsController)
);

// Обновить статус заявки (модерация, админ)
router.put(
  '/:id/status',
  authorize('ADMIN', 'MODERATOR'),
  validate(updateApplicationStatusSchema),
  applicationsController.updateApplicationStatus.bind(applicationsController)
);

// Статистика заявок (админ)
router.get(
  '/statistics/overview',
  authorize('ADMIN', 'MODERATOR'),
  applicationsController.getStatistics.bind(applicationsController)
);

// Получить заявки команды по ID (админ)
router.get(
  '/team/:teamId',
  authorize('ADMIN', 'MODERATOR'),
  applicationsController.getTeamApplicationsById.bind(applicationsController)
);

// Создать заявку от имени команды (админ)
router.post(
  '/admin',
  authorize('ADMIN', 'MODERATOR'),
  applicationsController.createApplicationAsAdmin.bind(applicationsController)
);

export default router;

