/**
 * Контроллер управления событиями соревнования
 * 
 * Функциональность:
 * - createEvent() - создание события (расписание, церемонии и т.д.)
 * - updateEvent() - обновление события
 * - deleteEvent() - удаление события
 * - getEventById() - получение события по ID
 * - getEventsByCompetition() - все события соревнования
 * 
 * Доступ: ADMIN, MODERATOR
 */

import { Request, Response } from 'express';
import { EventsService, CreateEventDto, UpdateEventDto } from '../services/events.service';
import { AuthRequest } from '../../../middleware/auth';
import logger from '../../../utils/logger';

const eventsService = new EventsService();

export class EventsController {
  /**
   * Создать мероприятие
   */
  async createEvent(req: AuthRequest, res: Response) {
    try {
      const { competitionId } = req.params;
      
      if (!competitionId) {
        return res.status(400).json({
          success: false,
          message: 'ID соревнования обязателен',
        });
      }

      if (!req.body.title || !req.body.startTime) {
        return res.status(400).json({
          success: false,
          message: 'Название и время начала мероприятия обязательны',
        });
      }

      const dto: CreateEventDto = {
        competitionId,
        title: req.body.title,
        description: req.body.description,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        location: req.body.location,
      };

      const event = await eventsService.createEvent(dto);

      res.status(201).json({
        success: true,
        data: event,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере createEvent', {
        error: error.message,
        body: req.body,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при создании мероприятия',
      });
    }
  }

  /**
   * Получить все мероприятия соревнования
   */
  async getEventsByCompetition(req: Request, res: Response) {
    try {
      const { competitionId } = req.params;
      const events = await eventsService.getEventsByCompetition(competitionId);

      res.json({
        success: true,
        data: events,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getEventsByCompetition', {
        error: error.message,
        competitionId: req.params.competitionId,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении мероприятий',
      });
    }
  }

  /**
   * Получить мероприятие по ID
   */
  async getEventById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const event = await eventsService.getEventById(id);

      res.json({
        success: true,
        data: event,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getEventById', {
        error: error.message,
        id: req.params.id,
      });
      res.status(404).json({
        success: false,
        message: error.message || 'Мероприятие не найдено',
      });
    }
  }

  /**
   * Обновить мероприятие
   */
  async updateEvent(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const dto: UpdateEventDto = {
        title: req.body.title,
        description: req.body.description,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        location: req.body.location,
      };

      const event = await eventsService.updateEvent(id, dto);

      res.json({
        success: true,
        data: event,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере updateEvent', {
        error: error.message,
        id: req.params.id,
        body: req.body,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при обновлении мероприятия',
      });
    }
  }

  /**
   * Удалить мероприятие
   */
  async deleteEvent(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await eventsService.deleteEvent(id);

      res.json({
        success: true,
        message: 'Мероприятие удалено',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере deleteEvent', {
        error: error.message,
        id: req.params.id,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при удалении мероприятия',
      });
    }
  }
}

