/**
 * Контроллер управления заявками на участие в соревнованиях
 * 
 * Функциональность:
 * - createApplication() - создание заявки тренером
 * - createApplicationAsAdmin() - создание заявки администратором
 * - getTeamApplications() - заявки команды текущего тренера
 * - getTeamApplicationsById() - заявки команды по ID
 * - getApplicationById() - получение заявки по ID
 * - getAllApplications() - все заявки (ADMIN, MODERATOR)
 * - getPendingApplications() - заявки на модерации
 * - updateApplicationStatus() - изменение статуса заявки
 * - getStatistics() - статистика заявок
 * 
 * Права доступа:
 * - Тренеры могут создавать заявки для своих спортсменов
 * - Администраторы и модераторы модерируют заявки
 */

import { Request, Response } from 'express';
import { ApplicationsService } from '../services/applications.service';
import { AuthRequest } from '../../../middleware/auth';
import logger from '../../../utils/logger';
import { ApplicationStatus } from '@prisma/client';
import prisma from '../../../utils/database';

const applicationsService = new ApplicationsService();

export class ApplicationsController {
  /**
   * Создать заявку на соревнование
   */
  async createApplication(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Требуется авторизация',
        });
      }

      // Получаем команду тренера
      const coach = await prisma.coach.findUnique({
        where: { userId: req.user.id },
      });

      if (!coach) {
        return res.status(403).json({
          success: false,
          message: 'Только тренеры могут подавать заявки',
        });
      }

      const application = await applicationsService.createApplication(
        req.body,
        coach.teamId
      );

      res.status(201).json({
        success: true,
        data: application,
        message: 'Заявка успешно подана и ожидает модерации',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере createApplication', {
        error: error.message,
        competitionId: req.body.competitionId,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при создании заявки',
      });
    }
  }

  /**
   * Создать заявку от имени команды (админ)
   */
  async createApplicationAsAdmin(req: AuthRequest, res: Response) {
    try {
      const { teamId, competitionId, status } = req.body;

      if (!teamId || !competitionId) {
        return res.status(400).json({
          success: false,
          message: 'Необходимо указать teamId и competitionId',
        });
      }

      const application = await applicationsService.createApplicationAsAdmin(
        teamId,
        competitionId,
        status || ApplicationStatus.APPROVED
      );

      res.status(201).json({
        success: true,
        data: application,
        message: 'Заявка успешно создана',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере createApplicationAsAdmin', {
        error: error.message,
        teamId: req.body.teamId,
        competitionId: req.body.competitionId,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при создании заявки',
      });
    }
  }

  /**
   * Получить все заявки (админ)
   */
  async getAllApplications(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as ApplicationStatus | undefined;
      const competitionId = req.query.competitionId as string | undefined;

      const result = await applicationsService.getAllApplications(
        page,
        limit,
        status,
        competitionId
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getAllApplications', {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении заявок',
      });
    }
  }

  /**
   * Получить заявки команды
   */
  async getTeamApplications(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Требуется авторизация',
        });
      }

      const coach = await prisma.coach.findUnique({
        where: { userId: req.user.id },
      });

      if (!coach) {
        return res.status(403).json({
          success: false,
          message: 'Только тренеры могут просматривать заявки команды',
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await applicationsService.getTeamApplications(
        coach.teamId,
        page,
        limit
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getTeamApplications', {
        error: error.message,
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении заявок команды',
      });
    }
  }

  /**
   * Получить заявку по ID
   */
  async getApplicationById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const application = await applicationsService.getApplicationById(id);

      res.json({
        success: true,
        data: application,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getApplicationById', {
        error: error.message,
        applicationId: req.params.id,
      });
      res.status(error.message === 'Заявка не найдена' ? 404 : 500).json({
        success: false,
        message: error.message || 'Ошибка при получении заявки',
      });
    }
  }

  /**
   * Обновить статус заявки (модерация)
   */
  async updateApplicationStatus(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Требуется авторизация',
        });
      }

      const { id } = req.params;
      const application = await applicationsService.updateApplicationStatus(
        id,
        req.body,
        req.user.id
      );

      res.json({
        success: true,
        data: application,
        message: `Статус заявки изменен на ${req.body.status}`,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере updateApplicationStatus', {
        error: error.message,
        applicationId: req.params.id,
      });
      res.status(error.message === 'Заявка не найдена' ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при обновлении статуса заявки',
      });
    }
  }

  /**
   * Получить заявки на модерации
   */
  async getPendingApplications(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await applicationsService.getPendingApplications(page, limit);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getPendingApplications', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении заявок на модерации',
      });
    }
  }

  /**
   * Получить статистику заявок
   */
  async getStatistics(req: Request, res: Response) {
    try {
      const statistics = await applicationsService.getApplicationsStatistics();

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

  /**
   * Получить заявки команды по ID команды (админ)
   */
  async getTeamApplicationsById(req: Request, res: Response) {
    try {
      const { teamId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await applicationsService.getTeamApplications(teamId, page, limit);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getTeamApplicationsById', {
        error: error.message,
        teamId: req.params.teamId,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении заявок команды',
      });
    }
  }
}

