/**
 * Модуль маршрутов управления соревнованиями
 * 
 * Функциональность:
 * - GET / - список всех соревнований (публичный)
 * - GET /statistics/overview - общая статистика (публичный)
 * - GET /:id - получение соревнования по ID (публичный)
 * - GET /:id/results - результаты соревнования (публичный)
 * - GET /judge/my - соревнования судьи (JUDGE)
 * - GET /coach/my - соревнования тренера (COACH)
 * - GET /:id/statistics - статистика соревнования
 * - POST / - создание соревнования (ADMIN, MODERATOR)
 * - PUT /:id - обновление соревнования (ADMIN, MODERATOR)
 * - DELETE /:id - удаление соревнования (ADMIN)
 * - POST /:id/participants - регистрация участника
 * - PUT /:competitionId/participants/:participantId/status - изменение статуса участника
 * - POST /:id/judges - добавление судьи
 * - POST /:id/coaches - добавление тренера
 * - GET /:id/report - генерация отчета
 * - GET /:id/reports/* - Word отчеты (список судей, состав команд, победители, протокол, пары)
 * - CRUD для событий (events) соревнования
 * 
 * Особенности:
 * - Публичные маршруты доступны без аутентификации
 * - Генерация Word документов для отчетов
 */

import { Router } from 'express';
import { CompetitionsController } from './controllers/competitions.controller';
import { EventsController } from './controllers/events.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import {
  createCompetitionSchema,
  updateCompetitionSchema,
  registerParticipantSchema,
  updateParticipantStatusSchema,
} from './types';

import { CompetitionWordReportController } from './controllers/competition-word-report.controller';

const router = Router();
const competitionsController = new CompetitionsController();
const eventsController = new EventsController();
const wordReportController = new CompetitionWordReportController();

// Публичные маршруты (для гостей)
router.get('/', competitionsController.getAllCompetitions.bind(competitionsController));
router.get('/statistics/overview', competitionsController.getStatistics.bind(competitionsController));
// Важно: более специфичные маршруты должны быть перед общим маршрутом /:id
router.get('/:id/results', competitionsController.getCompetitionResults.bind(competitionsController));
router.get('/:id', competitionsController.getCompetitionById.bind(competitionsController));

// Маршруты, требующие авторизации
router.use(authenticate);

// ВСЁ ОСТАЛЬНОЕ КАК БЫЛО - НИЧЕГО НЕ МЕНЯЕМ
router.get(
  '/judge/my',
  authorize('JUDGE'),
  competitionsController.getJudgeCompetitions.bind(competitionsController)
);

router.get(
  '/coach/my',
  authorize('COACH'),
  competitionsController.getCoachCompetitions.bind(competitionsController)
);

router.get('/:id/statistics', competitionsController.getCompetitionStatistics.bind(competitionsController));

router.post(
  '/:id/results',
  authorize('ADMIN', 'MODERATOR'),
  competitionsController.createOrUpdateResult.bind(competitionsController)
);

router.get('/:id/judges', competitionsController.getJudges.bind(competitionsController));

router.get('/:id/coaches', competitionsController.getCoaches.bind(competitionsController));

router.get('/:id/participants', competitionsController.getCompetitionParticipants.bind(competitionsController));

router.post(
  '/',
  authorize('ADMIN', 'MODERATOR'),
  validate(createCompetitionSchema),
  competitionsController.createCompetition.bind(competitionsController)
);

router.put(
  '/:id',
  authorize('ADMIN', 'MODERATOR'),
  validate(updateCompetitionSchema),
  competitionsController.updateCompetition.bind(competitionsController)
);

router.post(
  '/:id/status',
  authorize('ADMIN', 'MODERATOR'),
  competitionsController.changeStatus.bind(competitionsController)
);

router.delete(
  '/:id',
  authorize('ADMIN'),
  competitionsController.deleteCompetition.bind(competitionsController)
);

router.post(
  '/:id/participants',
  validate(registerParticipantSchema),
  competitionsController.registerParticipant.bind(competitionsController)
);

router.put(
  '/:competitionId/participants/:participantId/status',
  authorize('ADMIN', 'MODERATOR', 'JUDGE'),
  validate(updateParticipantStatusSchema),
  competitionsController.updateParticipantStatus.bind(competitionsController)
);

router.post(
  '/:id/judges',
  authorize('ADMIN', 'MODERATOR'),
  competitionsController.addJudge.bind(competitionsController)
);

router.delete(
  '/:id/judges/:userId',
  authorize('ADMIN', 'MODERATOR'),
  competitionsController.removeJudge.bind(competitionsController)
);

router.post(
  '/:id/coaches',
  authorize('ADMIN', 'MODERATOR'),
  competitionsController.addCoach.bind(competitionsController)
);

router.delete(
  '/:id/coaches/:coachId',
  authorize('ADMIN', 'MODERATOR'),
  competitionsController.removeCoach.bind(competitionsController)
);

router.get(
  '/:id/report',
  authorize('ADMIN', 'MODERATOR'),
  competitionsController.generateReport.bind(competitionsController)
);

router.get(
  '/:competitionId/events',
  eventsController.getEventsByCompetition.bind(eventsController)
);

router.get(
  '/events/:id',
  eventsController.getEventById.bind(eventsController)
);

router.post(
  '/:competitionId/events',
  authorize('ADMIN', 'MODERATOR'),
  eventsController.createEvent.bind(eventsController)
);

router.put(
  '/events/:id',
  authorize('ADMIN', 'MODERATOR'),
  eventsController.updateEvent.bind(eventsController)
);

router.delete(
  '/events/:id',
  authorize('ADMIN', 'MODERATOR'),
  eventsController.deleteEvent.bind(eventsController)
);

// ============ ТУТ ДОБАВЛЯЕМ НОВЫЕ МАРШРУТЫ - ПОСЛЕ ВСЕХ СУЩЕСТВУЮЩИХ ============

// 1. Список судей
router.get(
  '/:id/reports/judges-list',
  authorize('ADMIN', 'MODERATOR'),
  wordReportController.generateJudgesReport
);

// 2. Состав команд по весовым категориям и разрядам
router.get(
  '/:id/reports/team-composition',
  authorize('ADMIN', 'MODERATOR'),
  wordReportController.generateTeamCompositionReport
);

// 3. Список победителей и призёров
router.get(
  '/:id/reports/winners-list',
  authorize('ADMIN', 'MODERATOR'),
  wordReportController.generateWinnersReport
);

// 4. Протокол хода соревнований
router.get(
  '/:id/reports/protocol',
  authorize('ADMIN', 'MODERATOR'),
  wordReportController.generateProtocolReport
);

// 5. Состав пар
router.get(
  '/:id/reports/pairs-list',
  authorize('ADMIN', 'MODERATOR'),
  wordReportController.generatePairsReport
);

export default router;