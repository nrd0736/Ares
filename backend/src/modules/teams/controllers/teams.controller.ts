/**
 * Контроллер управления командами
 * 
 * Функциональность:
 * - getAllTeams() - список команд с пагинацией и фильтрацией
 * - getTeamById() - получение команды по ID
 * - getMyTeam() - команда текущего тренера
 * - createTeam() - создание новой команды
 * - updateTeam() - обновление команды
 * - deleteTeam() - удаление команды
 * - moderateTeam() - модерация команды (изменение статуса)
 * - getPendingTeams() - команды ожидающие модерации
 * - getStatistics() - статистика команд
 * - getRegionsStatistics() - статистика по регионам
 * 
 * Права доступа:
 * - Публичные операции доступны всем
 * - Тренер может управлять только своей командой
 * - Администраторы и модераторы могут модерировать все команды
 */

import { Request, Response } from 'express';
import { TeamsService } from '../services/teams.service';
import { AuthRequest } from '../../../middleware/auth';
import logger from '../../../utils/logger';
import { TeamStatus } from '@prisma/client';

const teamsService = new TeamsService();

export class TeamsController {
  /**
   * Получить все команды
   */
  async getAllTeams(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as TeamStatus | undefined;
      const excludeStatus = req.query.excludeStatus as TeamStatus | undefined;
      const regionId = req.query.regionId as string | undefined;
      const search = req.query.search as string | undefined;

      const result = await teamsService.getAllTeams(page, limit, status, regionId, excludeStatus, search);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getAllTeams', {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении команд',
      });
    }
  }

  /**
   * Получить команду по ID
   */
  async getTeamById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const team = await teamsService.getTeamById(id);

      res.json({
        success: true,
        data: team,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getTeamById', {
        error: error.message,
        teamId: req.params.id,
      });
      res.status(error.message === 'Команда не найдена' ? 404 : 500).json({
        success: false,
        message: error.message || 'Ошибка при получении команды',
      });
    }
  }

  /**
   * Создать новую команду
   */
  async createTeam(req: Request, res: Response) {
    try {
      const team = await teamsService.createTeam(req.body);

      res.status(201).json({
        success: true,
        data: team,
        message: 'Команда успешно создана и ожидает модерации',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере createTeam', {
        error: error.message,
        teamName: req.body.name,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при создании команды',
      });
    }
  }

  /**
   * Обновить команду
   */
  async updateTeam(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const team = await teamsService.updateTeam(id, req.body);

      res.json({
        success: true,
        data: team,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере updateTeam', {
        error: error.message,
        teamId: req.params.id,
      });
      res.status(error.message === 'Команда не найдена' ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при обновлении команды',
      });
    }
  }

  /**
   * Модерация команды (изменение статуса)
   */
  async moderateTeam(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Требуется авторизация',
        });
      }

      const { id } = req.params;
      const { status } = req.body;

      const team = await teamsService.moderateTeam(id, status, req.user.id);

      res.json({
        success: true,
        data: team,
        message: `Статус команды изменен на ${status}`,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере moderateTeam', {
        error: error.message,
        teamId: req.params.id,
        moderatorId: req.user?.id,
      });
      res.status(error.message === 'Команда не найдена' ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при модерации команды',
      });
    }
  }

  /**
   * Удалить команду
   */
  async deleteTeam(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const team = await teamsService.deleteTeam(id);

      res.json({
        success: true,
        data: team,
        message: 'Команда успешно приостановлена',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере deleteTeam', {
        error: error.message,
        teamId: req.params.id,
      });
      res.status(error.message === 'Команда не найдена' ? 404 : 500).json({
        success: false,
        message: error.message || 'Ошибка при удалении команды',
      });
    }
  }

  /**
   * Получить статистику команд
   */
  async getStatistics(req: Request, res: Response) {
    try {
      const statistics = await teamsService.getTeamsStatistics();

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
   * Получить статистику по регионам (публичный endpoint)
   */
  async getRegionsStatistics(req: Request, res: Response) {
    try {
      const statistics = await teamsService.getRegionsStatistics();

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getRegionsStatistics', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении статистики',
      });
    }
  }

  /**
   * Получить команды, ожидающие модерации
   */
  async getPendingTeams(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await teamsService.getPendingTeams(page, limit);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getPendingTeams', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении команд на модерации',
      });
    }
  }

  /**
   * Получить команду текущего тренера
   */
  async getMyTeam(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Пользователь не авторизован',
        });
      }

      const team = await teamsService.getTeamByCoach(userId);

      res.json({
        success: true,
        data: team,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getMyTeam', {
        error: error.message,
        userId: req.user?.id,
      });
      res.status(error.message === 'Команда не найдена' ? 404 : 500).json({
        success: false,
        message: error.message || 'Ошибка при получении команды',
      });
    }
  }
}

