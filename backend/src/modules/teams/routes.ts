/**
 * Модуль маршрутов управления командами
 * 
 * Функциональность:
 * - GET / - список всех команд (публичный, с фильтрацией)
 * - GET /statistics/regions - статистика по регионам (публичный)
 * - POST / - создание команды (публичный)
 * - GET /my - команда текущего тренера (COACH)
 * - GET /:id - получение команды по ID (публичный)
 * - PUT /:id - обновление команды (тренер или ADMIN)
 * - POST /:id/moderate - модерация команды (ADMIN, MODERATOR)
 * - GET /moderation/pending - команды на модерации
 * - GET /statistics/overview - общая статистика (ADMIN, MODERATOR)
 * - DELETE /:id - удаление команды (только ADMIN)
 * 
 * Особенности:
 * - Публичные маршруты доступны без аутентификации
 * - Модерация команд через систему статусов
 */

import { Router } from 'express';
import { TeamsController } from './controllers/teams.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import {
  createTeamSchema,
  updateTeamSchema,
  moderateTeamSchema,
} from './types';

const router = Router();
const teamsController = new TeamsController();

// Публичные маршруты (для гостей)
router.get('/', teamsController.getAllTeams.bind(teamsController));

// Статистика по регионам (публичный маршрут)
router.get(
  '/statistics/regions',
  teamsController.getRegionsStatistics.bind(teamsController)
);

// Создать команду (публичный маршрут - доступен для неавторизованных пользователей)
router.post(
  '/',
  validate(createTeamSchema),
  teamsController.createTeam.bind(teamsController)
);

// Получить команду текущего тренера (должен быть ПЕРЕД /:id, чтобы не перехватывался как параметр)
// Добавляем middleware напрямую, так как это защищенный маршрут
router.get(
  '/my',
  authenticate,
  authorize('COACH'),
  teamsController.getMyTeam.bind(teamsController)
);

// Получить команду по ID (публичный маршрут, должен быть после /my)
router.get('/:id', teamsController.getTeamById.bind(teamsController));

// Маршруты, требующие авторизации
router.use(authenticate);

// Обновить команду (только админ или тренер этой команды)
router.put(
  '/:id',
  validate(updateTeamSchema),
  teamsController.updateTeam.bind(teamsController)
);

// Модерация команды (для админов и модераторов)
router.post(
  '/:id/moderate',
  authorize('ADMIN', 'MODERATOR'),
  validate(moderateTeamSchema),
  teamsController.moderateTeam.bind(teamsController)
);

// Получить команды на модерации (для админов и модераторов)
router.get(
  '/moderation/pending',
  authorize('ADMIN', 'MODERATOR'),
  teamsController.getPendingTeams.bind(teamsController)
);

// Статистика команд (для админов и модераторов)
router.get(
  '/statistics/overview',
  authorize('ADMIN', 'MODERATOR'),
  teamsController.getStatistics.bind(teamsController)
);

// Удалить команду (только для админов)
router.delete(
  '/:id',
  authorize('ADMIN'),
  teamsController.deleteTeam.bind(teamsController)
);

export default router;

