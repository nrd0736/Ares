/**
 * Модуль маршрутов управления пользователями
 * 
 * Функциональность:
 * - GET / - список всех пользователей (ADMIN, MODERATOR)
 * - GET /statistics - статистика пользователей
 * - GET /export - экспорт пользователей в файл
 * - GET /:id - получение пользователя по ID
 * - POST / - создание нового пользователя (ADMIN, MODERATOR)
 * - PUT /:id - обновление пользователя (ADMIN, MODERATOR)
 * - PATCH /:id/deactivate - деактивация пользователя
 * - DELETE /:id - удаление пользователя (только ADMIN)
 * - PUT /profile/me - обновление собственного профиля
 * - POST /change-password - смена пароля
 * 
 * Все маршруты требуют аутентификации
 */

import { Router } from 'express';
import { UsersController } from './controllers/users.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import {
  createUserSchema,
  updateUserSchema,
  updateProfileSchema,
  changePasswordSchema,
} from './types';

const router = Router();
const usersController = new UsersController();

// Все маршруты требуют авторизации
router.use(authenticate);

// Получить всех пользователей (для админов и модераторов)
router.get(
  '/',
  authorize('ADMIN', 'MODERATOR'),
  usersController.getAllUsers.bind(usersController)
);

// Получить статистику пользователей (для админов и модераторов)
router.get(
  '/statistics',
  authorize('ADMIN', 'MODERATOR'),
  usersController.getStatistics.bind(usersController)
);

// Экспорт пользователей (для админов и модераторов)
router.get(
  '/export',
  authorize('ADMIN', 'MODERATOR'),
  usersController.exportUsers.bind(usersController)
);

// Получить пользователя по ID
router.get(
  '/:id',
  usersController.getUserById.bind(usersController)
);

// Создать нового пользователя (для админов и модераторов)
router.post(
  '/',
  authorize('ADMIN', 'MODERATOR'),
  validate(createUserSchema),
  usersController.createUser.bind(usersController)
);

// Обновить пользователя (для админов и модераторов)
router.put(
  '/:id',
  authorize('ADMIN', 'MODERATOR'),
  validate(updateUserSchema),
  usersController.updateUser.bind(usersController)
);

// Деактивировать пользователя (для админов и модераторов)
router.patch(
  '/:id/deactivate',
  authorize('ADMIN', 'MODERATOR'),
  usersController.deactivateUser.bind(usersController)
);

// Удалить пользователя (только для админов)
router.delete(
  '/:id',
  authorize('ADMIN'),
  usersController.deleteUser.bind(usersController)
);

// Обновить свой профиль
router.put(
  '/profile/me',
  validate(updateProfileSchema),
  usersController.updateProfile.bind(usersController)
);

// Сменить пароль
router.post(
  '/change-password',
  validate(changePasswordSchema),
  usersController.changePassword.bind(usersController)
);

export default router;

