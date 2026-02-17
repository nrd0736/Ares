/**
 * Модуль маршрутов системы обращений (тикетов)
 * 
 * Функциональность:
 * - POST / - создание обращения (публичный, но может быть авторизованным)
 * - GET /my - обращения текущего пользователя
 * - GET /:id - получение обращения по ID
 * - GET / - все обращения (ADMIN, MODERATOR)
 * - PUT /:id/status - изменение статуса обращения (ADMIN, MODERATOR)
 * - POST /:id/reply - ответ на обращение (ADMIN, MODERATOR)
 * - GET /statistics/overview - статистика обращений (ADMIN, MODERATOR)
 * 
 * Особенности:
 * - Гости могут создавать обращения
 * - Авторизованные пользователи видят свои обращения
 * - Администраторы и модераторы обрабатывают обращения
 */

import { Router } from 'express';
import { TicketsController } from './controllers/tickets.controller';
import { authenticate, authorize, optionalAuthenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import {
  createTicketSchema,
  updateTicketStatusSchema,
  replyTicketSchema,
} from './types';

const router = Router();
const ticketsController = new TicketsController();

// Создать обращение (доступно для гостей, но если пользователь авторизован - используем его ID)
router.post(
  '/',
  optionalAuthenticate,
  validate(createTicketSchema),
  ticketsController.createTicket.bind(ticketsController)
);

// Все остальные маршруты требуют авторизации
router.use(authenticate);

// Получить обращения пользователя
router.get('/my', ticketsController.getUserTickets.bind(ticketsController));

// Получить обращение по ID
router.get('/:id', ticketsController.getTicketById.bind(ticketsController));

// Получить все обращения (для админов и модераторов)
router.get(
  '/',
  authorize('ADMIN', 'MODERATOR'),
  ticketsController.getAllTickets.bind(ticketsController)
);

// Обновить статус обращения (для админов и модераторов)
router.put(
  '/:id/status',
  authorize('ADMIN', 'MODERATOR'),
  validate(updateTicketStatusSchema),
  ticketsController.updateTicketStatus.bind(ticketsController)
);

// Ответить на обращение (для админов и модераторов)
router.post(
  '/:id/reply',
  authorize('ADMIN', 'MODERATOR'),
  validate(replyTicketSchema),
  ticketsController.replyToTicket.bind(ticketsController)
);

// Статистика обращений (для админов и модераторов)
router.get(
  '/statistics/overview',
  authorize('ADMIN', 'MODERATOR'),
  ticketsController.getStatistics.bind(ticketsController)
);

export default router;

