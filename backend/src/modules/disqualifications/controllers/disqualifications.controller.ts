/**
 * Контроллер управления дисквалификациями
 * 
 * Функциональность:
 * - getAllDisqualifications() - список всех дисквалификаций
 * - getDisqualificationById() - получение дисквалификации по ID
 * - getActiveDisqualificationsByAthlete() - активные дисквалификации спортсмена
 * - createDisqualification() - создание дисквалификации (ADMIN, JUDGE)
 * - updateDisqualification() - обновление дисквалификации (только ADMIN)
 * - removeDisqualification() - снятие дисквалификации (только ADMIN)
 * 
 * Права доступа:
 * - Публичные операции доступны всем
 * - Судьи могут создавать дисквалификации
 * - Только администраторы могут изменять/снимать дисквалификации
 */

import { Request, Response } from 'express';
import { DisqualificationsService } from '../services/disqualifications.service';
import { AuthRequest } from '../../../middleware/auth';
import logger from '../../../utils/logger';

const disqualificationsService = new DisqualificationsService();

export class DisqualificationsController {
  /**
   * Создать дисквалификацию
   */
  async createDisqualification(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Требуется авторизация',
        });
      }

      const disqualification = await disqualificationsService.createDisqualification(
        req.body,
        req.user.id
      );

      res.status(201).json({
        success: true,
        data: disqualification,
        message: 'Спортсмен дисквалифицирован',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере createDisqualification', {
        error: error.message,
        athleteId: req.body.athleteId,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при создании дисквалификации',
      });
    }
  }

  /**
   * Получить все дисквалификации
   */
  async getAllDisqualifications(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const competitionId = req.query.competitionId as string | undefined;
      const athleteId = req.query.athleteId as string | undefined;

      const result = await disqualificationsService.getAllDisqualifications(
        page,
        limit,
        competitionId,
        athleteId
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getAllDisqualifications', {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении дисквалификаций',
      });
    }
  }

  /**
   * Получить дисквалификацию по ID
   */
  async getDisqualificationById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const disqualification = await disqualificationsService.getDisqualificationById(id);

      res.json({
        success: true,
        data: disqualification,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getDisqualificationById', {
        error: error.message,
        disqualificationId: req.params.id,
      });
      res.status(error.message === 'Дисквалификация не найдена' ? 404 : 500).json({
        success: false,
        message: error.message || 'Ошибка при получении дисквалификации',
      });
    }
  }

  /**
   * Обновить дисквалификацию
   */
  async updateDisqualification(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const disqualification = await disqualificationsService.updateDisqualification(id, req.body);

      res.json({
        success: true,
        data: disqualification,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере updateDisqualification', {
        error: error.message,
        disqualificationId: req.params.id,
      });
      res.status(error.message === 'Дисквалификация не найдена' ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при обновлении дисквалификации',
      });
    }
  }

  /**
   * Снять дисквалификацию
   */
  async removeDisqualification(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await disqualificationsService.removeDisqualification(id);

      res.json({
        success: true,
        message: 'Дисквалификация успешно снята',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере removeDisqualification', {
        error: error.message,
        disqualificationId: req.params.id,
      });
      res.status(error.message === 'Дисквалификация не найдена' ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при снятии дисквалификации',
      });
    }
  }

  /**
   * Получить активные дисквалификации спортсмена
   */
  async getActiveDisqualificationsByAthlete(req: Request, res: Response) {
    try {
      const { athleteId } = req.params;
      const disqualifications = await disqualificationsService.getActiveDisqualificationsByAthlete(athleteId);

      res.json({
        success: true,
        data: disqualifications,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getActiveDisqualificationsByAthlete', {
        error: error.message,
        athleteId: req.params.athleteId,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении дисквалификаций',
      });
    }
  }
}

