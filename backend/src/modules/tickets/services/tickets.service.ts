/**
 * Сервис системы обращений (тикетов)
 * 
 * Основная бизнес-логика:
 * - createTicket() - создание обращения (поддержка гостей)
 * - getUserTickets() - получения обращений пользователя
 * - getTicketById() - получение обращения с историей ответов
 * - getAllTickets() - получение всех обращений с фильтрацией
 * - updateTicketStatus() - изменение статуса обращения
 * - replyToTicket() - ответ на обращение
 * - getStatistics() - подсчет статистики по статусам
 * 
 * Особенности:
 * - Гости могут создавать обращения (создается специальный пользователь)
 * - Система ответов на обращения
 * - Статусы: OPEN, IN_PROGRESS, RESOLVED, CLOSED
 */

import prisma from '../../../utils/database';
import logger from '../../../utils/logger';
import { CreateTicketDto, UpdateTicketStatusDto, ReplyTicketDto } from '../types';
import { TicketStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

export class TicketsService {
  /**
   * Создать обращение
   */
  async createTicket(dto: CreateTicketDto, userId?: string) {
    try {
      logger.debug(`Создание обращения пользователем ${userId || 'гостем'}: ${dto.subject}`);

      // Если userId не указан (гость), ищем или создаем специального пользователя-гостя
      let finalUserId = userId;
      if (!finalUserId) {
        // Ищем пользователя-гостя по email
        let guestUser = await prisma.user.findFirst({
          where: { email: 'guest@system.local' },
        });
        
        if (!guestUser) {
          // Создаем пользователя-гостя
          const passwordHash = await bcrypt.hash('guest', 10);
          guestUser = await prisma.user.create({
            data: {
              email: 'guest@system.local',
              passwordHash,
              role: 'ATHLETE', // Любая роль, не важно
            },
          });
        }
        
        finalUserId = guestUser.id;
      }

      const ticket = await prisma.ticket.create({
        data: {
          userId: finalUserId,
          subject: dto.subject,
          message: dto.message,
          category: dto.category,
          status: TicketStatus.OPEN,
        },
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      });

      logger.info(`Создано обращение: ${ticket.subject} (ID: ${ticket.id})`);

      // Отправляем real-time уведомление админам
      if (global.io) {
        global.io.emit('ticket:created', ticket);
      }

      return ticket;
    } catch (error: any) {
      logger.error('Ошибка при создании обращения', {
        error: error.message,
        userId,
        subject: dto.subject,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить все обращения (для админов)
   */
  async getAllTickets(
    page: number = 1,
    limit: number = 10,
    status?: TicketStatus,
    category?: string
  ) {
    try {
      const skip = (page - 1) * limit;
      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (category) {
        where.category = category;
      }

      const [tickets, total] = await Promise.all([
        prisma.ticket.findMany({
          where,
          skip,
          take: limit,
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prisma.ticket.count({ where }),
      ]);

      // Убираем avatarUrl из profile для гостевых пользователей, чтобы избежать 404
      const processedTickets = tickets.map(ticket => {
        if (ticket.user.email === 'guest@system.local' && ticket.user.profile) {
          return {
            ...ticket,
            user: {
              ...ticket.user,
              profile: {
                ...ticket.user.profile,
                avatarUrl: null, // Убираем аватар для гостевых пользователей
              },
            },
          };
        }
        return ticket;
      });

      logger.debug(`Получено ${processedTickets.length} обращений: страница ${page}, всего ${total}`);

      return {
        tickets: processedTickets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      logger.error('Ошибка при получении обращений', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить обращения пользователя
   */
  async getUserTickets(userId: string, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      const [tickets, total] = await Promise.all([
        prisma.ticket.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prisma.ticket.count({ where: { userId } }),
      ]);

      logger.debug(`Получено ${tickets.length} обращений пользователя ${userId}`);

      return {
        tickets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      logger.error('Ошибка при получении обращений пользователя', {
        error: error.message,
        userId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить обращение по ID
   */
  async getTicketById(id: string, userId?: string) {
    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id },
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      });

      if (!ticket) {
        logger.warn(`Обращение с ID ${id} не найдено`);
        throw new Error('Обращение не найдено');
      }

      // Проверяем права доступа (только автор или админ)
      if (userId && ticket.userId !== userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
          logger.warn(`Попытка получить чужое обращение: ${id}, пользователь: ${userId}`);
          throw new Error('Недостаточно прав для просмотра этого обращения');
        }
      }

      logger.debug(`Получено обращение: ${id}`);
      return ticket;
    } catch (error: any) {
      logger.error(`Ошибка при получении обращения ${id}`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Обновить статус обращения
   */
  async updateTicketStatus(id: string, dto: UpdateTicketStatusDto) {
    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id },
      });

      if (!ticket) {
        logger.warn(`Попытка обновить несуществующее обращение: ${id}`);
        throw new Error('Обращение не найдено');
      }

      const updated = await prisma.ticket.update({
        where: { id },
        data: {
          status: dto.status,
        },
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      });

      logger.info(`Статус обращения обновлен: ${id} -> ${dto.status}`);

      // Отправляем real-time уведомление пользователю
      if (global.io) {
        global.io.to(`user:${ticket.userId}`).emit('ticket:updated', updated);
      }

      return updated;
    } catch (error: any) {
      logger.error(`Ошибка при обновлении статуса обращения ${id}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Ответить на обращение
   */
  async replyToTicket(id: string, dto: ReplyTicketDto, adminId: string) {
    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id },
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      });

      if (!ticket) {
        logger.warn(`Попытка ответить на несуществующее обращение: ${id}`);
        throw new Error('Обращение не найдено');
      }

      // Обновляем статус обращения (по умолчанию RESOLVED, если не указан)
      const newStatus = dto.status || TicketStatus.RESOLVED;
      const updated = await prisma.ticket.update({
        where: { id },
        data: {
          status: newStatus,
        },
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      });

      // Создаем уведомление пользователю
      await prisma.notification.create({
        data: {
          title: `Ответ на ваше обращение: ${ticket.subject}`,
          message: dto.reply,
          recipientType: 'USER',
          recipientId: ticket.userId,
          senderId: adminId,
          read: false,
        },
      });

      logger.info(`Ответ на обращение отправлен: ${id} пользователю ${ticket.userId}`);

      // Отправляем real-time уведомление пользователю
      if (global.io) {
        global.io.to(`user:${ticket.userId}`).emit('ticket:replied', {
          ticket: updated,
          reply: dto.reply,
        });
      }

      return updated;
    } catch (error: any) {
      logger.error(`Ошибка при ответе на обращение ${id}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить статистику обращений
   */
  async getTicketsStatistics() {
    try {
      const [total, byStatus, byCategory, open, inProgress] = await Promise.all([
        prisma.ticket.count(),
        prisma.ticket.groupBy({
          by: ['status'],
          _count: true,
        }),
        prisma.ticket.groupBy({
          by: ['category'],
          _count: true,
        }),
        prisma.ticket.count({
          where: { status: TicketStatus.OPEN },
        }),
        prisma.ticket.count({
          where: { status: TicketStatus.IN_PROGRESS },
        }),
      ]);

      const statistics = {
        total,
        open,
        inProgress,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<TicketStatus, number>),
        byCategory: byCategory.length,
      };

      logger.debug('Получена статистика обращений', statistics);
      return statistics;
    } catch (error: any) {
      logger.error('Ошибка при получении статистики обращений', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}

