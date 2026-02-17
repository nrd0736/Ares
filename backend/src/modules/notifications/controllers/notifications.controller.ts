/**
 * Контроллер управления уведомлениями
 * 
 * Функциональность:
 * - getUserNotifications() - уведомления текущего пользователя
 * - getUnreadCount() - количество непрочитанных уведомлений
 * - createNotification() - создание уведомления (ADMIN, MODERATOR, JUDGE)
 * - markAsRead() - отметить уведомление как прочитанное
 * - markAllAsRead() - отметить все уведомления как прочитанные
 * - deleteNotification() - удалить уведомление
 * 
 * Особенности:
 * - Real-time обновления через Socket.IO
 * - Уведомления могут быть созданы администраторами, модераторами и судьями
 * - Автоматическая отправка уведомлений при различных событиях
 */

import { Request, Response } from 'express';
import { NotificationsService } from '../services/notifications.service';
import { AuthRequest } from '../../../middleware/auth';
import logger from '../../../utils/logger';

const notificationsService = new NotificationsService();

export class NotificationsController {
  /**
   * Создать уведомление
   */
  async createNotification(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Требуется авторизация',
        });
      }

      const notifications = await notificationsService.createNotification(
        req.body,
        req.user.id
      );

      res.status(201).json({
        success: true,
        data: notifications,
        message: `Уведомление отправлено ${notifications.length} получателям`,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере createNotification', {
        error: error.message,
        recipientType: req.body.recipientType,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при создании уведомления',
      });
    }
  }

  /**
   * Получить уведомления пользователя
   */
  async getUserNotifications(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Требуется авторизация',
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const unreadOnly = req.query.unreadOnly === 'true';

      const result = await notificationsService.getUserNotifications(
        req.user.id,
        page,
        limit,
        unreadOnly
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getUserNotifications', {
        error: error.message,
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении уведомлений',
      });
    }
  }

  /**
   * Отметить уведомление как прочитанное
   */
  async markAsRead(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Требуется авторизация',
        });
      }

      const { id } = req.params;
      const notification = await notificationsService.markAsRead(id, req.user.id);

      res.json({
        success: true,
        data: notification,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере markAsRead', {
        error: error.message,
        notificationId: req.params.id,
      });
      res.status(
        error.message === 'Уведомление не найдено' || error.message.includes('прав')
          ? 404
          : 400
      ).json({
        success: false,
        message: error.message || 'Ошибка при обновлении уведомления',
      });
    }
  }

  /**
   * Отметить все уведомления как прочитанные
   */
  async markAllAsRead(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Требуется авторизация',
        });
      }

      const result = await notificationsService.markAllAsRead(req.user.id);

      res.json({
        success: true,
        data: result,
        message: 'Все уведомления отмечены как прочитанные',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере markAllAsRead', {
        error: error.message,
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при обновлении уведомлений',
      });
    }
  }

  /**
   * Удалить уведомление
   */
  async deleteNotification(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Требуется авторизация',
        });
      }

      const { id } = req.params;
      await notificationsService.deleteNotification(id, req.user.id);

      res.json({
        success: true,
        message: 'Уведомление успешно удалено',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере deleteNotification', {
        error: error.message,
        notificationId: req.params.id,
      });
      res.status(
        error.message === 'Уведомление не найдено' || error.message.includes('прав')
          ? 404
          : 400
      ).json({
        success: false,
        message: error.message || 'Ошибка при удалении уведомления',
      });
    }
  }

  /**
   * Получить количество непрочитанных уведомлений
   */
  async getUnreadCount(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Требуется авторизация',
        });
      }

      const result = await notificationsService.getUnreadCount(req.user.id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getUnreadCount', {
        error: error.message,
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении количества уведомлений',
      });
    }
  }
}

