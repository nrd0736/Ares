/**
 * Модуль маршрутов управления турнирными сетками
 * 
 * Функциональность:
 * - GET /competition/:competitionId - все сетки соревнования (публичный)
 * - GET /:id - получение сетки по ID (публичный)
 * - GET /:bracketId/matches - матчи сетки (публичный)
 * - GET /match/:matchId - матч по ID (публичный)
 * - POST / - создание сетки (ADMIN, MODERATOR)
 * - POST /auto-create/:competitionId - автоматическое создание сеток для всех категорий
 * - PUT /:bracketId/matches/:matchId/result - обновление результата (ADMIN, MODERATOR, JUDGE)
 * - POST /:bracketId/matches/:matchId/confirm - подтверждение результата (JUDGE)
 * - POST /:bracketId/matches/:matchId/approve - финализация результата (JUDGE)
 * - POST /:bracketId/matches - создание матча вручную (ADMIN, MODERATOR)
 * - PUT /match/:matchId - обновление матча (ADMIN, MODERATOR, JUDGE)
 * 
 * Особенности:
 * - Публичные маршруты для просмотра сеток
 * - Система подтверждения результатов судьями
 * - Автоматическая генерация сеток по алгоритмам
 */

import { Router } from 'express';
import { BracketsController } from './controllers/brackets.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import {
  createBracketSchema,
  updateMatchResultSchema,
  updateMatchSchema,
} from './types';

const router = Router();
const bracketsController = new BracketsController();

// Публичные маршруты (для гостей)
router.get('/competition/:competitionId', bracketsController.getBracketsByCompetition.bind(bracketsController));
router.get('/competition/:competitionId/matches-requiring-confirmation', bracketsController.getMatchesRequiringConfirmation.bind(bracketsController));
router.get('/match/:matchId', bracketsController.getMatchById.bind(bracketsController));
router.get('/:id', bracketsController.getBracketById.bind(bracketsController));
router.get('/:bracketId/matches', bracketsController.getBracketMatches.bind(bracketsController));

// Маршруты, требующие авторизации
router.use(authenticate);

// Создать турнирную сетку (только для админов)
router.post(
  '/',
  authorize('ADMIN', 'MODERATOR'),
  validate(createBracketSchema),
  bracketsController.createBracket.bind(bracketsController)
);

// Обновить результат матча (судьи и админы)
router.put(
  '/:bracketId/matches/:matchId/result',
  authorize('ADMIN', 'MODERATOR', 'JUDGE'),
  validate(updateMatchResultSchema),
  bracketsController.updateMatchResult.bind(bracketsController)
);

// Подтвердить результат матча (только судьи)
router.post(
  '/:bracketId/matches/:matchId/confirm',
  authorize('JUDGE'),
  bracketsController.confirmMatchResult.bind(bracketsController)
);

// Одобрить и финализировать результат матча (только судьи)
router.post(
  '/:bracketId/matches/:matchId/approve',
  authorize('JUDGE'),
  bracketsController.approveMatchResult.bind(bracketsController)
);

// Автоматически создать сетки для всех весовых категорий (только для админов)
router.post(
  '/auto-create/:competitionId',
  authorize('ADMIN', 'MODERATOR'),
  bracketsController.autoCreateBrackets.bind(bracketsController)
);

// Создать матч вручную (только для админов)
router.post(
  '/:bracketId/matches',
  authorize('ADMIN', 'MODERATOR'),
  bracketsController.createMatch.bind(bracketsController)
);

// Обновить матч (включая расписание) (админы, модераторы и судьи)
router.put(
  '/match/:matchId',
  authorize('ADMIN', 'MODERATOR', 'JUDGE'),
  validate(updateMatchSchema),
  bracketsController.updateMatch.bind(bracketsController)
);

export default router;

