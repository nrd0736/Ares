/**
 * Модуль маршрутов управления дисквалификациями
 * 
 * Функциональность:
 * - GET / - список всех дисквалификаций (публичный)
 * - GET /:id - получение дисквалификации по ID (публичный)
 * - GET /athlete/:athleteId/active - активные дисквалификации спортсмена (публичный)
 * - POST / - создание дисквалификации (ADMIN, JUDGE)
 * - PUT /:id - обновление дисквалификации (только ADMIN)
 * - DELETE /:id - снятие дисквалификации (только ADMIN)
 * 
 * Особенности:
 * - Публичные маршруты для просмотра дисквалификаций
 * - Судьи могут создавать дисквалификации
 * - Только администраторы могут изменять/снимать дисквалификации
 */

import { Router } from 'express';
import { DisqualificationsController } from './controllers/disqualifications.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import {
  createDisqualificationSchema,
  updateDisqualificationSchema,
} from './types';

const router = Router();
const disqualificationsController = new DisqualificationsController();

// Публичные маршруты
router.get('/', disqualificationsController.getAllDisqualifications.bind(disqualificationsController));
router.get('/:id', disqualificationsController.getDisqualificationById.bind(disqualificationsController));
router.get('/athlete/:athleteId/active', disqualificationsController.getActiveDisqualificationsByAthlete.bind(disqualificationsController));

// Маршруты, требующие авторизации
router.use(authenticate);

// Создать дисквалификацию (судьи и админы)
router.post(
  '/',
  authorize('ADMIN', 'JUDGE'),
  validate(createDisqualificationSchema),
  disqualificationsController.createDisqualification.bind(disqualificationsController)
);

// Обновить дисквалификацию (только админы)
router.put(
  '/:id',
  authorize('ADMIN'),
  validate(updateDisqualificationSchema),
  disqualificationsController.updateDisqualification.bind(disqualificationsController)
);

// Снять дисквалификацию (только админы)
router.delete(
  '/:id',
  authorize('ADMIN'),
  disqualificationsController.removeDisqualification.bind(disqualificationsController)
);

export default router;

