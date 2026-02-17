/**
 * Модуль маршрутов аутентификации
 * 
 * Функциональность:
 * - POST /login - вход в систему
 * - POST /register - регистрация нового пользователя
 * - POST /invite - создание приглашения (только авторизованные)
 * - GET /invitations - список всех приглашений
 * - DELETE /invitations/:id - удаление приглашения
 * - POST /register-by-invitation - регистрация по приглашению
 * - GET /me - получение данных текущего пользователя
 * - GET /me/matches - история схваток (для спортсменов)
 * - GET /me/competitions - соревнования (для спортсменов)
 * - GET /coaches - публичный список тренеров
 * - GET /athlete-requests - запросы на регистрацию спортсменов (для тренеров)
 * - POST /athlete-requests/:requestId/approve - одобрить заявку
 * - POST /athlete-requests/:requestId/reject - отклонить заявку
 * 
 * Middleware:
 * - authRateLimit - ограничение попыток входа/регистрации
 * - validate - валидация входных данных
 * - authenticate - проверка JWT токена
 */

import { Router } from 'express';
import { AuthController } from './controllers/auth.controller';
import { AthleteApprovalController } from './controllers/athlete-approval.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { loginSchema, registerSchema, inviteSchema } from './types';
import { authRateLimit } from '../../middleware/rate-limit';

const router = Router();
const authController = new AuthController();
const athleteApprovalController = new AthleteApprovalController();

// Публичные endpoints (без аутентификации)
router.post('/login', authRateLimit, validate(loginSchema), authController.login.bind(authController));
router.post('/register', authRateLimit, validate(registerSchema), authController.register.bind(authController));
router.post('/register-by-invitation', authController.registerByInvitation.bind(authController));
router.get('/coaches', authController.getCoaches.bind(authController));

// Защищенные endpoints (требуется аутентификация)
router.post('/invite', authenticate, validate(inviteSchema), authController.createInvitation.bind(authController));
router.get('/invitations', authenticate, authController.getAllInvitations.bind(authController));
router.delete('/invitations/:id', authenticate, authController.deleteInvitation.bind(authController));
router.get('/me', authenticate, authController.getMe.bind(authController));
router.get('/me/matches', authenticate, authController.getMyMatches.bind(authController));
router.get('/me/competitions', authenticate, authController.getMyCompetitions.bind(authController));

// Endpoints одобрения спортсменов (для тренеров)
router.get('/athlete-requests', authenticate, athleteApprovalController.getRequests.bind(athleteApprovalController));
router.post('/athlete-requests/:requestId/approve', authenticate, athleteApprovalController.approve.bind(athleteApprovalController));
router.post('/athlete-requests/:requestId/reject', authenticate, athleteApprovalController.reject.bind(athleteApprovalController));

export default router;

