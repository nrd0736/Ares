/**
 * Сервис управления уведомлениями
 * 
 * Основная бизнес-логика:
 * - createNotification() - создание уведомления (поддержка различных типов получателей)
 * - getUserNotifications() - уведомления пользователя
 * - getUnreadCount() - количество непрочитанных
 * - markAsRead() - отметить как прочитанное
 * - markAllAsRead() - отметить все как прочитанные
 * - deleteNotification() - удалить уведомление
 * 
 * Типы получателей:
 * - ALL - всем пользователям
 * - ROLE - пользователям с определенной ролью
 * - USER - конкретному пользователю
 * - TEAM - всем спортсменам команды
 * 
 * Особенности:
 * - Real-time отправка через Socket.IO
 * - Автоматические уведомления при событиях
 */

import prisma from '../../../utils/database';
import logger from '../../../utils/logger';
import { CreateNotificationDto } from '../types';

export class NotificationsService {
  /**
   * Создать уведомление
   */
  async createNotification(dto: CreateNotificationDto, senderId: string) {
    try {
      logger.debug(`Создание уведомления: ${dto.title}, тип получателя: ${dto.recipientType}`);

      let notifications = [];

      if (dto.recipientType === 'ALL') {
        // Отправляем всем пользователям
        const users = await prisma.user.findMany({
          where: { isActive: true },
        });

        notifications = await Promise.all(
          users.map((user) =>
            prisma.notification.create({
              data: {
                title: dto.title,
                message: dto.message,
                senderId,
                recipientType: dto.recipientType,
                recipientId: user.id,
              },
            })
          )
        );
      } else if (dto.recipientType === 'TEAM' && dto.recipientId) {
        // Отправляем всем участникам команды
        const team = await prisma.team.findUnique({
          where: { id: dto.recipientId },
          include: {
            coaches: {
              include: { user: true },
            },
            athletes: {
              include: { user: true },
            },
          },
        });

        if (!team) {
          throw new Error('Команда не найдена');
        }

        const recipients = [
          ...team.coaches.map((c) => c.userId),
          ...team.athletes.map((a) => a.userId),
        ];

        notifications = await Promise.all(
          recipients.map((userId) =>
            prisma.notification.create({
              data: {
                title: dto.title,
                message: dto.message,
                senderId,
                recipientType: dto.recipientType,
                recipientId: userId,
              },
            })
          )
        );
      } else if (dto.recipientType === 'COMPETITION' && dto.recipientId) {
        // Отправляем всем участникам соревнования
        const participants = await prisma.competitionParticipant.findMany({
          where: {
            competitionId: dto.recipientId,
            status: 'CONFIRMED',
          },
          include: {
            athlete: {
              include: { user: true },
            },
          },
        });

        notifications = await Promise.all(
          participants.map((p) =>
            prisma.notification.create({
              data: {
                title: dto.title,
                message: dto.message,
                senderId,
                recipientType: dto.recipientType,
                recipientId: p.athlete.userId,
              },
            })
          )
        );
      } else if (dto.recipientType === 'USER' && dto.recipientId) {
        // Отправляем конкретному пользователю
        const notification = await prisma.notification.create({
          data: {
            title: dto.title,
            message: dto.message,
            senderId,
            recipientType: dto.recipientType,
            recipientId: dto.recipientId,
          },
        });
        notifications = [notification];
      } else {
        throw new Error('Некорректные параметры получателя');
      }

      logger.info(`Создано ${notifications.length} уведомлений: ${dto.title}`);

      // Отправляем real-time уведомления
      if (global.io) {
        notifications.forEach((notification) => {
          if (notification.recipientId) {
            global.io.to(`user:${notification.recipientId}`).emit('notification:new', notification);
          }
        });
      }

      return notifications;
    } catch (error: any) {
      logger.error('Ошибка при создании уведомления', {
        error: error.message,
        recipientType: dto.recipientType,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить уведомления пользователя
   */
  async getUserNotifications(userId: string, page: number = 1, limit: number = 20, unreadOnly: boolean = false) {
    try {
      const skip = (page - 1) * limit;
      const where: any = {
        recipientId: userId,
      };

      if (unreadOnly) {
        where.read = false;
      }

      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          skip,
          take: limit,
          include: {
            sender: {
              include: {
                profile: true,
              },
            },
          },
          orderBy: {
            sentAt: 'desc',
          },
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({
          where: {
            recipientId: userId,
            read: false,
          },
        }),
      ]);

      logger.debug(`Получено ${notifications.length} уведомлений для пользователя ${userId}`);

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        unreadCount,
      };
    } catch (error: any) {
      logger.error('Ошибка при получении уведомлений пользователя', {
        error: error.message,
        userId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Отметить уведомление как прочитанное
   */
  async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        logger.warn(`Уведомление ${notificationId} не найдено`);
        throw new Error('Уведомление не найдено');
      }

      if (notification.recipientId !== userId) {
        logger.warn(`Попытка отметить чужое уведомление: ${notificationId}, пользователь: ${userId}`);
        throw new Error('Недостаточно прав');
      }

      const updated = await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
      });

      logger.debug(`Уведомление ${notificationId} отмечено как прочитанное`);

      return updated;
    } catch (error: any) {
      logger.error('Ошибка при отметке уведомления как прочитанного', {
        error: error.message,
        notificationId,
        userId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Отметить все уведомления как прочитанные
   */
  async markAllAsRead(userId: string) {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          recipientId: userId,
          read: false,
        },
        data: {
          read: true,
        },
      });

      logger.info(`Отмечено ${result.count} уведомлений как прочитанные для пользователя ${userId}`);

      return { count: result.count };
    } catch (error: any) {
      logger.error('Ошибка при отметке всех уведомлений как прочитанных', {
        error: error.message,
        userId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Удалить уведомление
   */
  async deleteNotification(notificationId: string, userId: string) {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        logger.warn(`Уведомление ${notificationId} не найдено`);
        throw new Error('Уведомление не найдено');
      }

      if (notification.recipientId !== userId) {
        logger.warn(`Попытка удалить чужое уведомление: ${notificationId}, пользователь: ${userId}`);
        throw new Error('Недостаточно прав');
      }

      await prisma.notification.delete({
        where: { id: notificationId },
      });

      logger.debug(`Уведомление ${notificationId} удалено`);

      return { success: true };
    } catch (error: any) {
      logger.error('Ошибка при удалении уведомления', {
        error: error.message,
        notificationId,
        userId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить количество непрочитанных уведомлений
   */
  async getUnreadCount(userId: string) {
    try {
      const count = await prisma.notification.count({
        where: {
          recipientId: userId,
          read: false,
        },
      });

      return { count };
    } catch (error: any) {
      logger.error('Ошибка при получении количества непрочитанных уведомлений', {
        error: error.message,
        userId,
        stack: error.stack,
      });
      throw error;
    }
  }
}

