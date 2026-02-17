/**
 * Контроллер системы обращений (тикетов)
 * 
 * Функциональность:
 * - createTicket() - создание обращения (публичный)
 * - getUserTickets() - обращения текущего пользователя
 * - getTicketById() - получение обращения по ID
 * - getAllTickets() - все обращения (ADMIN, MODERATOR)
 * - updateTicketStatus() - изменение статуса обращения
 * - replyToTicket() - ответ на обращение
 * - getStatistics() - статистика обращений
 * 
 * Особенности:
 * - Гости могут создавать обращения
 * - Авторизованные пользователи видят свои обращения
 * - Администраторы и модераторы обрабатывают обращения
 */

import { Request, Response } from 'express';
import { TicketsService } from '../services/tickets.service';
import { AuthRequest } from '../../../middleware/auth';
import logger from '../../../utils/logger';
import { TicketStatus } from '@prisma/client';

const ticketsService = new TicketsService();

export class TicketsController {
  /**
   * Создать обращение
   */
  async createTicket(req: AuthRequest, res: Response) {
    try {
      // Если пользователь авторизован, используем его ID, иначе null (для гостей)
      const userId = req.user?.id;

      const ticket = await ticketsService.createTicket(req.body, userId);

      res.status(201).json({
        success: true,
        data: ticket,
        message: 'Обращение успешно создано',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере createTicket', {
        error: error.message,
        subject: req.body.subject,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при создании обращения',
      });
    }
  }

  /**
   * Получить все обращения (админ)
   */
  async getAllTickets(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as TicketStatus | undefined;
      const category = req.query.category as string | undefined;

      const result = await ticketsService.getAllTickets(page, limit, status, category);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getAllTickets', {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении обращений',
      });
    }
  }

  /**
   * Получить обращения пользователя
   */
  async getUserTickets(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Требуется авторизация',
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await ticketsService.getUserTickets(req.user.id, page, limit);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getUserTickets', {
        error: error.message,
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении обращений',
      });
    }
  }

  /**
   * Получить обращение по ID
   */
  async getTicketById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const ticket = await ticketsService.getTicketById(id, userId);

      res.json({
        success: true,
        data: ticket,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getTicketById', {
        error: error.message,
        ticketId: req.params.id,
      });
      res.status(
        error.message === 'Обращение не найдено' || error.message.includes('прав')
          ? 404
          : 500
      ).json({
        success: false,
        message: error.message || 'Ошибка при получении обращения',
      });
    }
  }

  /**
   * Обновить статус обращения
   */
  async updateTicketStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const ticket = await ticketsService.updateTicketStatus(id, req.body);

      res.json({
        success: true,
        data: ticket,
        message: `Статус обращения изменен на ${req.body.status}`,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере updateTicketStatus', {
        error: error.message,
        ticketId: req.params.id,
      });
      res.status(error.message === 'Обращение не найдено' ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при обновлении статуса обращения',
      });
    }
  }

  /**
   * Ответить на обращение
   */
  async replyToTicket(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Требуется авторизация',
        });
      }

      const { id } = req.params;
      const ticket = await ticketsService.replyToTicket(id, req.body, req.user.id);

      res.json({
        success: true,
        data: ticket,
        message: 'Ответ на обращение отправлен',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере replyToTicket', {
        error: error.message,
        ticketId: req.params.id,
      });
      res.status(error.message === 'Обращение не найдено' ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при отправке ответа',
      });
    }
  }

  /**
   * Получить статистику обращений
   */
  async getStatistics(req: Request, res: Response) {
    try {
      const statistics = await ticketsService.getTicketsStatistics();

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getStatistics', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении статистики',
      });
    }
  }
}

