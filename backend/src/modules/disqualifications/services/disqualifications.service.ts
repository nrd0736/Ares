/**
 * Сервис управления дисквалификациями
 * 
 * Основная бизнес-логика:
 * - createDisqualification() - создание дисквалификации
 * - getAllDisqualifications() - получение всех дисквалификаций
 * - getDisqualificationById() - получение дисквалификации по ID
 * - getActiveDisqualificationsByAthlete() - активные дисквалификации спортсмена
 * - updateDisqualification() - обновление дисквалификации
 * - removeDisqualification() - снятие дисквалификации
 * 
 * Особенности:
 * - Привязка к соревнованию и спортсмену
 * - Указание причины дисквалификации
 * - Автоматическая проверка активных дисквалификаций
 * - Влияние на участие в соревнованиях
 */

import prisma from '../../../utils/database';
import logger from '../../../utils/logger';
import { CreateDisqualificationDto, UpdateDisqualificationDto } from '../types';

export class DisqualificationsService {
  /**
   * Создать дисквалификацию
   */
  async createDisqualification(dto: CreateDisqualificationDto, judgeId: string) {
    try {
      logger.debug(`Создание дисквалификации для спортсмена ${dto.athleteId} на соревновании ${dto.competitionId}`);

      // Проверяем существование спортсмена
      const athlete = await prisma.athlete.findUnique({
        where: { id: dto.athleteId },
        include: {
          user: {
            include: { profile: true },
          },
        },
      });

      if (!athlete) {
        logger.warn(`Попытка дисквалифицировать несуществующего спортсмена: ${dto.athleteId}`);
        throw new Error('Спортсмен не найден');
      }

      // Проверяем существование соревнования
      const competition = await prisma.competition.findUnique({
        where: { id: dto.competitionId },
      });

      if (!competition) {
        logger.warn(`Попытка создать дисквалификацию для несуществующего соревнования: ${dto.competitionId}`);
        throw new Error('Соревнование не найдено');
      }

      // Проверяем, зарегистрирован ли спортсмен на соревнование
      const participant = await prisma.competitionParticipant.findUnique({
        where: {
          competitionId_athleteId: {
            competitionId: dto.competitionId,
            athleteId: dto.athleteId,
          },
        },
      });

      if (!participant) {
        logger.warn(`Попытка дисквалифицировать незарегистрированного спортсмена: ${dto.athleteId}`);
        throw new Error('Спортсмен не зарегистрирован на это соревнование');
      }

      // Создаем дисквалификацию
      const disqualification = await prisma.disqualification.create({
        data: {
          athleteId: dto.athleteId,
          competitionId: dto.competitionId,
          reason: dto.reason,
          startDate: new Date(),
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          judgeId,
        },
        include: {
          athlete: {
            include: {
              user: {
                include: { profile: true },
              },
              team: true,
            },
          },
          competition: {
            include: {
              sport: true,
            },
          },
        },
      });

      // Обновляем статус участника на DISQUALIFIED
      await prisma.competitionParticipant.update({
        where: {
          competitionId_athleteId: {
            competitionId: dto.competitionId,
            athleteId: dto.athleteId,
          },
        },
        data: {
          status: 'DISQUALIFIED',
        },
      });

      logger.info('Создана дисквалификация');

      // Отправляем real-time уведомление
      if (global.io) {
        global.io.to(`competition:${dto.competitionId}`).emit('disqualification:created', disqualification);
      }

      return disqualification;
    } catch (error: any) {
      logger.error('Ошибка при создании дисквалификации', {
        error: error.message,
        athleteId: dto.athleteId,
        competitionId: dto.competitionId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить все дисквалификации
   */
  async getAllDisqualifications(
    page: number = 1,
    limit: number = 10,
    competitionId?: string,
    athleteId?: string
  ) {
    try {
      const skip = (page - 1) * limit;
      const where: any = {};

      if (competitionId) {
        where.competitionId = competitionId;
      }

      if (athleteId) {
        where.athleteId = athleteId;
      }

      const [disqualifications, total] = await Promise.all([
        prisma.disqualification.findMany({
          where,
          skip,
          take: limit,
          include: {
            athlete: {
              include: {
                user: {
                  include: { profile: true },
                },
                team: true,
              },
            },
            competition: {
              include: {
                sport: true,
              },
            },
          },
          orderBy: {
            startDate: 'desc',
          },
        }),
        prisma.disqualification.count({ where }),
      ]);

      logger.debug(`Получено ${disqualifications.length} дисквалификаций: страница ${page}, всего ${total}`);

      return {
        disqualifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      logger.error('Ошибка при получении дисквалификаций', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить дисквалификацию по ID
   */
  async getDisqualificationById(id: string) {
    try {
      const disqualification = await prisma.disqualification.findUnique({
        where: { id },
        include: {
          athlete: {
            include: {
              user: {
                include: { profile: true },
              },
              team: true,
            },
          },
          competition: {
            include: {
              sport: true,
            },
          },
        },
      });

      if (!disqualification) {
        logger.warn(`Дисквалификация с ID ${id} не найдена`);
        throw new Error('Дисквалификация не найдена');
      }

      logger.debug(`Получена дисквалификация: ${id}`);
      return disqualification;
    } catch (error: any) {
      logger.error(`Ошибка при получении дисквалификации ${id}`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Обновить дисквалификацию
   */
  async updateDisqualification(id: string, dto: UpdateDisqualificationDto) {
    try {
      const disqualification = await prisma.disqualification.findUnique({
        where: { id },
      });

      if (!disqualification) {
        logger.warn(`Попытка обновить несуществующую дисквалификацию: ${id}`);
        throw new Error('Дисквалификация не найдена');
      }

      const updated = await prisma.disqualification.update({
        where: { id },
        data: {
          reason: dto.reason,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        },
        include: {
          athlete: {
            include: {
              user: {
                include: { profile: true },
              },
            },
          },
          competition: true,
        },
      });

      logger.info(`Обновлена дисквалификация: ${id}`);

      // Если дисквалификация закончилась, обновляем статус участника
      if (dto.endDate && new Date(dto.endDate) <= new Date()) {
        await prisma.competitionParticipant.update({
          where: {
            competitionId_athleteId: {
              competitionId: updated.competitionId,
              athleteId: updated.athleteId,
            },
          },
          data: {
            status: 'CONFIRMED',
          },
        });
      }

      return updated;
    } catch (error: any) {
      logger.error(`Ошибка при обновлении дисквалификации ${id}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Удалить дисквалификацию (снять дисквалификацию)
   */
  async removeDisqualification(id: string) {
    try {
      const disqualification = await prisma.disqualification.findUnique({
        where: { id },
      });

      if (!disqualification) {
        logger.warn(`Попытка удалить несуществующую дисквалификацию: ${id}`);
        throw new Error('Дисквалификация не найдена');
      }

      // Восстанавливаем статус участника
      await prisma.competitionParticipant.update({
        where: {
          competitionId_athleteId: {
            competitionId: disqualification.competitionId,
            athleteId: disqualification.athleteId,
          },
        },
        data: {
          status: 'CONFIRMED',
        },
      });

      // Удаляем дисквалификацию
      await prisma.disqualification.delete({
        where: { id },
      });

      logger.info(`Дисквалификация снята: ${id}`);

      return { success: true };
    } catch (error: any) {
      logger.error(`Ошибка при удалении дисквалификации ${id}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить активные дисквалификации спортсмена
   */
  async getActiveDisqualificationsByAthlete(athleteId: string) {
    try {
      const now = new Date();
      const disqualifications = await prisma.disqualification.findMany({
        where: {
          athleteId,
          startDate: { lte: now },
          OR: [
            { endDate: null },
            { endDate: { gte: now } },
          ],
        },
        include: {
          competition: {
            include: {
              sport: true,
            },
          },
        },
        orderBy: {
          startDate: 'desc',
        },
      });

      logger.debug(`Получено ${disqualifications.length} активных дисквалификаций для спортсмена ${athleteId}`);
      return disqualifications;
    } catch (error: any) {
      logger.error('Ошибка при получении активных дисквалификаций', {
        error: error.message,
        athleteId,
        stack: error.stack,
      });
      throw error;
    }
  }
}

