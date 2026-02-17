/**
 * Контроллер одобрения регистрации спортсменов
 * 
 * Функциональность:
 * - approve() - одобрение заявки на регистрацию спортсмена
 * - reject() - отклонение заявки
 * - getRequests() - получение списка заявок для текущего тренера
 * 
 * Доступ:
 * - Только для пользователей с ролью COACH
 * - Тренер может одобрять только заявки, направленные ему
 */

import { Request, Response } from 'express';
import { AthleteApprovalService } from '../services/athlete-approval.service';
import prisma from '../../../utils/database';
import logger from '../../../utils/logger';

export class AthleteApprovalController {
  private approvalService = new AthleteApprovalService();

  /**
   * Подтвердить регистрацию спортсмена
   */
  async approve(req: Request, res: Response) {
    try {
      const { requestId } = req.params;
      const coachId = (req as any).user.id; // ID текущего пользователя (тренера)

      // Проверяем, что пользователь является тренером
      if ((req as any).user.role !== 'COACH') {
        return res.status(403).json({
          success: false,
          message: 'Только тренеры могут подтверждать регистрации спортсменов',
        });
      }

      // Получаем coachId из записи Coach
      const coach = await prisma.coach.findUnique({
        where: { userId: coachId },
      });

      if (!coach) {
        return res.status(404).json({
          success: false,
          message: 'Тренер не найден',
        });
      }

      const { weightCategoryId, weight } = req.body;

      const result = await this.approvalService.approveAthleteRegistration(
        requestId,
        coach.id,
        weightCategoryId,
        weight
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Ошибка при подтверждении регистрации спортсмена', {
        error: error.message,
        stack: error.stack,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при подтверждении регистрации',
      });
    }
  }

  /**
   * Отклонить регистрацию спортсмена
   */
  async reject(req: Request, res: Response) {
    try {
      const { requestId } = req.params;
      const coachId = (req as any).user.id; // ID текущего пользователя (тренера)

      // Проверяем, что пользователь является тренером
      if ((req as any).user.role !== 'COACH') {
        return res.status(403).json({
          success: false,
          message: 'Только тренеры могут отклонять регистрации спортсменов',
        });
      }

      // Получаем coachId из записи Coach
      const coach = await prisma.coach.findUnique({
        where: { userId: coachId },
      });

      if (!coach) {
        return res.status(404).json({
          success: false,
          message: 'Тренер не найден',
        });
      }

      const result = await this.approvalService.rejectAthleteRegistration(requestId, coach.id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Ошибка при отклонении регистрации спортсмена', {
        error: error.message,
        stack: error.stack,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при отклонении регистрации',
      });
    }
  }

  /**
   * Получить список запросов на регистрацию
   */
  async getRequests(req: Request, res: Response) {
    try {
      const coachId = (req as any).user.id; // ID текущего пользователя (тренера)

      // Проверяем, что пользователь является тренером
      if ((req as any).user.role !== 'COACH') {
        return res.status(403).json({
          success: false,
          message: 'Только тренеры могут просматривать запросы на регистрацию',
        });
      }

      // Получаем coachId из записи Coach
      const coach = await prisma.coach.findUnique({
        where: { userId: coachId },
      });

      if (!coach) {
        return res.status(404).json({
          success: false,
          message: 'Тренер не найден',
        });
      }

      const requests = await this.approvalService.getRegistrationRequests(coach.id);

      res.json({
        success: true,
        data: { requests },
      });
    } catch (error: any) {
      logger.error('Ошибка при получении запросов на регистрацию', {
        error: error.message,
        stack: error.stack,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при получении запросов',
      });
    }
  }
}

