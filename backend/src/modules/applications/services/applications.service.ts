/**
 * Сервис управления заявками на участие в соревнованиях
 * 
 * Основная бизнес-логика:
 * - createApplication() - создание заявки с проверками
 * - getTeamApplications() - получение заявок команды
 * - getApplicationById() - получение заявки с полными данными
 * - getAllApplications() - получение всех заявок с фильтрацией
 * - getPendingApplications() - заявки со статусом PENDING
 * - updateApplicationStatus() - изменение статуса (модерация)
 * - getStatistics() - подсчет статистики по статусам
 * 
 * Особенности:
 * - Проверка что соревнование принимает заявки
 * - Проверка что спортсмены принадлежат команде тренера
 * - Автоматическая регистрация участников при одобрении заявки
 * - Система модерации через статусы
 */

import prisma from '../../../utils/database';
import logger from '../../../utils/logger';
import { CreateApplicationDto, UpdateApplicationStatusDto } from '../types';
import { ApplicationStatus } from '@prisma/client';

export class ApplicationsService {
  /**
   * Создать заявку на соревнование
   */
  async createApplication(dto: CreateApplicationDto, teamId: string) {
    try {
      logger.debug(`Создание заявки на соревнование ${dto.competitionId} от команды ${teamId}`);

      // Проверяем существование соревнования
      const competition = await prisma.competition.findUnique({
        where: { id: dto.competitionId },
      });

      if (!competition) {
        logger.warn(`Попытка создать заявку на несуществующее соревнование: ${dto.competitionId}`);
        throw new Error('Соревнование не найдено');
      }

      // Проверяем, что соревнование принимает заявки
      if (competition.status !== 'UPCOMING' && competition.status !== 'REGISTRATION') {
        logger.warn(`Попытка создать заявку на соревнование с недопустимым статусом: ${competition.status}`);
        throw new Error('Регистрация на это соревнование закрыта');
      }

      // Проверяем, что все спортсмены принадлежат команде
      const athletes = await prisma.athlete.findMany({
        where: {
          id: { in: dto.athleteIds },
          teamId,
        },
      });

      if (athletes.length !== dto.athleteIds.length) {
        logger.warn(`Не все спортсмены принадлежат команде: команда ${teamId}, спортсмены ${dto.athleteIds}`);
        throw new Error('Не все указанные спортсмены принадлежат вашей команде');
      }

      // Проверяем, нет ли уже заявки от этой команды на это соревнование
      const existingApplication = await prisma.application.findFirst({
        where: {
          teamId,
          competitionId: dto.competitionId,
          status: { in: ['PENDING', 'APPROVED'] },
        },
      });

      if (existingApplication) {
        logger.warn(`У команды ${teamId} уже есть активная заявка на соревнование ${dto.competitionId}`);
        throw new Error('У вашей команды уже есть активная заявка на это соревнование');
      }

      // Создаем заявку
      const application = await prisma.application.create({
        data: {
          teamId,
          competitionId: dto.competitionId,
          status: ApplicationStatus.PENDING,
        },
        include: {
          team: {
            include: {
              region: true,
            },
          },
          competition: {
            include: {
              sport: true,
            },
          },
        },
      });

      logger.info(`Создана заявка на соревнование: команда ${teamId}, соревнование ${dto.competitionId} (ID: ${application.id})`);

      // Отправляем real-time уведомление админам
      if (global.io) {
        global.io.emit('application:created', application);
      }

      return application;
    } catch (error: any) {
      logger.error('Ошибка при создании заявки', {
        error: error.message,
        competitionId: dto.competitionId,
        teamId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Создать заявку от имени команды (для администратора)
   */
  async createApplicationAsAdmin(teamId: string, competitionId: string, status: ApplicationStatus = ApplicationStatus.APPROVED) {
    try {
      logger.debug(`Создание заявки администратором: команда ${teamId}, соревнование ${competitionId}`);

      // Проверяем существование команды
      const team = await prisma.team.findUnique({
        where: { id: teamId },
      });

      if (!team) {
        logger.warn(`Попытка создать заявку для несуществующей команды: ${teamId}`);
        throw new Error('Команда не найдена');
      }

      // Проверяем существование соревнования
      const competition = await prisma.competition.findUnique({
        where: { id: competitionId },
      });

      if (!competition) {
        logger.warn(`Попытка создать заявку на несуществующее соревнование: ${competitionId}`);
        throw new Error('Соревнование не найдено');
      }

      // Сохраняем competition для дальнейшего использования
      const competitionType = competition.competitionType;

      // Проверяем, нет ли уже заявки от этой команды на это соревнование
      const existingApplication = await prisma.application.findFirst({
        where: {
          teamId,
          competitionId,
          status: { in: ['PENDING', 'APPROVED'] },
        },
      });

      if (existingApplication) {
        logger.warn(`У команды ${teamId} уже есть активная заявка на соревнование ${competitionId}`);
        throw new Error('У команды уже есть активная заявка на это соревнование');
      }

      // Создаем заявку
      const application = await prisma.application.create({
        data: {
          teamId,
          competitionId,
          status,
        },
        include: {
          team: {
            include: {
              region: true,
            },
          },
          competition: {
            include: {
              sport: true,
            },
          },
        },
      });

      logger.info(`Создана заявка администратором: команда ${teamId}, соревнование ${competitionId} (ID: ${application.id})`);

      // Если заявка одобрена, автоматически регистрируем команду и спортсменов на соревнование
      if (status === ApplicationStatus.APPROVED) {
        // Для командных соревнований создаём teamParticipant
        if (competitionType === 'TEAM') {
          await prisma.teamParticipant.upsert({
            where: {
              competitionId_teamId: {
                competitionId,
                teamId,
              },
            },
            create: {
              competitionId,
              teamId,
              status: 'CONFIRMED', // Команда подтверждена для участия
            },
            update: {
              status: 'CONFIRMED',
            },
          });

          logger.info(`Автоматически зарегистрирована команда ${teamId} на командное соревнование ${competitionId}`);
        }

        // Регистрируем спортсменов команды на соревнование
        const athletes = await prisma.athlete.findMany({
          where: { teamId },
        });

        await Promise.all(
          athletes.map((athlete) =>
            prisma.competitionParticipant.upsert({
              where: {
                competitionId_athleteId: {
                  competitionId,
                  athleteId: athlete.id,
                },
              },
              create: {
                competitionId,
                athleteId: athlete.id,
                status: 'REGISTERED',
              },
              update: {
                status: 'REGISTERED',
              },
            })
          )
        );

        logger.info(`Автоматически зарегистрировано ${athletes.length} спортсменов команды ${teamId} на соревнование ${competitionId}`);
      }

      return application;
    } catch (error: any) {
      logger.error('Ошибка при создании заявки администратором', {
        error: error.message,
        competitionId,
        teamId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить все заявки (для админов)
   */
  async getAllApplications(
    page: number = 1,
    limit: number = 10,
    status?: ApplicationStatus,
    competitionId?: string
  ) {
    try {
      const skip = (page - 1) * limit;
      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (competitionId) {
        where.competitionId = competitionId;
      }

      const [applications, total] = await Promise.all([
        prisma.application.findMany({
          where,
          skip,
          take: limit,
          include: {
            team: {
              include: {
                region: {
                  include: {
                    federalDistrict: true,
                  },
                },
              },
            },
            competition: {
              include: {
                sport: true,
              },
            },
          },
          orderBy: {
            submittedAt: 'desc',
          },
        }),
        prisma.application.count({ where }),
      ]);

      logger.debug(`Получен список заявок: страница ${page}, всего ${total}`);

      return {
        applications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      logger.error('Ошибка при получении списка заявок', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить заявки команды
   */
  async getTeamApplications(teamId: string, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      const [applications, total] = await Promise.all([
        prisma.application.findMany({
          where: { teamId },
          skip,
          take: limit,
          include: {
            competition: {
              include: {
                sport: true,
              },
            },
          },
          orderBy: {
            submittedAt: 'desc',
          },
        }),
        prisma.application.count({ where: { teamId } }),
      ]);

      logger.debug(`Получено ${applications.length} заявок команды ${teamId}`);

      return {
        applications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      logger.error('Ошибка при получении заявок команды', {
        error: error.message,
        teamId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить заявку по ID
   */
  async getApplicationById(id: string) {
    try {
      const application = await prisma.application.findUnique({
        where: { id },
        include: {
          team: {
            include: {
              region: {
                include: {
                  federalDistrict: true,
                },
              },
              coaches: {
                include: {
                  user: {
                    include: { profile: true },
                  },
                },
              },
              athletes: {
                include: {
                  user: {
                    include: { profile: true },
                  },
                },
              },
            },
          },
          competition: {
            include: {
              sport: true,
            },
          },
        },
      });

      if (!application) {
        logger.warn(`Заявка с ID ${id} не найдена`);
        throw new Error('Заявка не найдена');
      }

      logger.debug(`Получена заявка: ${id}`);
      return application;
    } catch (error: any) {
      logger.error(`Ошибка при получении заявки ${id}`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Обновить статус заявки (модерация)
   */
  async updateApplicationStatus(
    id: string,
    dto: UpdateApplicationStatusDto,
    moderatorId: string
  ) {
    try {
      logger.debug(`Обновление статуса заявки ${id} на ${dto.status} модератором ${moderatorId}`);

      const application = await prisma.application.findUnique({
        where: { id },
        include: {
          team: true,
          competition: true,
        },
      });

      if (!application) {
        logger.warn(`Попытка обновить несуществующую заявку: ${id}`);
        throw new Error('Заявка не найдена');
      }

      // Если заявка одобрена, автоматически регистрируем команду и спортсменов на соревнование
      if (dto.status === ApplicationStatus.APPROVED && application.status !== ApplicationStatus.APPROVED) {
        // Проверяем тип соревнования
        if (application.competition?.competitionType === 'TEAM') {
          // Для командных соревнований создаём teamParticipant
          await prisma.teamParticipant.upsert({
            where: {
              competitionId_teamId: {
                competitionId: application.competitionId,
                teamId: application.teamId,
              },
            },
            create: {
              competitionId: application.competitionId,
              teamId: application.teamId,
              status: 'CONFIRMED', // Команда подтверждена для участия
            },
            update: {
              status: 'CONFIRMED',
            },
          });

          logger.info(`Автоматически зарегистрирована команда ${application.teamId} на командное соревнование ${application.competitionId}`);
        }

        // Получаем всех спортсменов команды
        const athletes = await prisma.athlete.findMany({
          where: { teamId: application.teamId },
        });

        // Регистрируем их на соревнование
        await Promise.all(
          athletes.map((athlete) =>
            prisma.competitionParticipant.upsert({
              where: {
                competitionId_athleteId: {
                  competitionId: application.competitionId,
                  athleteId: athlete.id,
                },
              },
              create: {
                competitionId: application.competitionId,
                athleteId: athlete.id,
                status: 'REGISTERED',
              },
              update: {
                status: 'REGISTERED',
              },
            })
          )
        );

        logger.info(`Автоматически зарегистрировано ${athletes.length} спортсменов команды ${application.teamId} на соревнование ${application.competitionId}`);
      }

      // Обновляем статус заявки
      const updatedApplication = await prisma.application.update({
        where: { id },
        data: {
          status: dto.status,
          processedBy: moderatorId,
          processedAt: new Date(),
        },
        include: {
          team: {
            include: {
              region: true,
            },
          },
          competition: {
            include: {
              sport: true,
            },
          },
        },
      });

      logger.info(`Статус заявки обновлен: ${id} -> ${dto.status}`);

      // Отправляем real-time уведомление команде
      if (global.io) {
        global.io.to(`team:${application.teamId}`).emit('application:updated', updatedApplication);
      }

      return updatedApplication;
    } catch (error: any) {
      logger.error('Ошибка при обновлении статуса заявки', {
        error: error.message,
        applicationId: id,
        moderatorId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить заявки, ожидающие модерации
   */
  async getPendingApplications(page: number = 1, limit: number = 10) {
    try {
      return await this.getAllApplications(page, limit, ApplicationStatus.PENDING);
    } catch (error: any) {
      logger.error('Ошибка при получении заявок на модерации', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить статистику заявок
   */
  async getApplicationsStatistics() {
    try {
      const [total, byStatus, byCompetition] = await Promise.all([
        prisma.application.count(),
        prisma.application.groupBy({
          by: ['status'],
          _count: true,
        }),
        prisma.application.groupBy({
          by: ['competitionId'],
          _count: true,
        }),
      ]);

      const statistics = {
        total,
        pending: byStatus.find((s) => s.status === ApplicationStatus.PENDING)?._count || 0,
        approved: byStatus.find((s) => s.status === ApplicationStatus.APPROVED)?._count || 0,
        rejected: byStatus.find((s) => s.status === ApplicationStatus.REJECTED)?._count || 0,
        byCompetition: byCompetition.length,
      };

      logger.debug('Получена статистика заявок', statistics);
      return statistics;
    } catch (error: any) {
      logger.error('Ошибка при получении статистики заявок', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}

