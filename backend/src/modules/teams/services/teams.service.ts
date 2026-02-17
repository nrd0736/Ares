/**
 * Сервис управления командами
 * 
 * Основная бизнес-логика:
 * - getAllTeams() - получение команд с пагинацией, фильтрацией и поиском
 * - getTeamById() - получение команды с полными данными (тренер, спортсмены, регион)
 * - getMyTeam() - команда текущего тренера
 * - createTeam() - создание команды с автоматической привязкой к тренеру
 * - updateTeam() - обновление данных команды
 * - deleteTeam() - удаление команды
 * - moderateTeam() - изменение статуса команды (модерация)
 * - getPendingTeams() - команды со статусом PENDING
 * - getStatistics() - подсчет статистики
 * - getRegionsStatistics() - статистика по регионам
 * 
 * Особенности:
 * - Система модерации: команды создаются со статусом PENDING
 * - Автоматическая привязка тренера к команде при создании
 * - Подсчет количества спортсменов в команде
 * - Фильтрация по региону и статусу
 */

import prisma from '../../../utils/database';
import logger from '../../../utils/logger';
import { CreateTeamDto, UpdateTeamDto } from '../types';
import { TeamStatus, ApplicationStatus } from '@prisma/client';
import { ApplicationsService } from '../../applications/services/applications.service';

export class TeamsService {
  /**
   * Получить все команды с пагинацией
   */
  async getAllTeams(
    page: number = 1,
    limit: number = 10,
    status?: TeamStatus,
    regionId?: string,
    excludeStatus?: TeamStatus,
    search?: string
  ) {
    try {
      const skip = (page - 1) * limit;
      const where: any = {};

      // Если указан конкретный статус, используем его, иначе исключаем PENDING если указан excludeStatus
      if (status) {
        where.status = status;
      } else if (excludeStatus) {
        where.status = { not: excludeStatus };
      }

      if (regionId) {
        where.regionId = regionId;
      }

      // Поиск по названию команды
      if (search && search.trim()) {
        where.name = {
          contains: search.trim(),
          mode: 'insensitive',
        };
      }

      const [teams, total] = await Promise.all([
        prisma.team.findMany({
          where,
          skip,
          take: limit,
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
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prisma.team.count({ where }),
      ]);

      logger.debug(`Получен список команд: страница ${page}, всего ${total}`);

      return {
        teams,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      logger.error('Ошибка при получении списка команд', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить команду по ID
   */
  async getTeamById(id: string) {
    try {
      const team = await prisma.team.findUnique({
        where: { id },
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
              coach: {
                include: {
                  user: {
                    include: { profile: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!team) {
        logger.warn(`Команда с ID ${id} не найдена`);
        throw new Error('Команда не найдена');
      }

      logger.debug(`Получена команда: ${team.name}`);
      return team;
    } catch (error: any) {
      logger.error(`Ошибка при получении команды ${id}`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Создать новую команду
   */
  async createTeam(dto: CreateTeamDto) {
    try {
      logger.debug(`Создание команды: ${dto.name}`);

      // Проверяем существование региона
      const region = await prisma.region.findUnique({
        where: { id: dto.regionId },
      });

      if (!region) {
        logger.warn(`Попытка создать команду с несуществующим регионом: ${dto.regionId}`);
        throw new Error('Регион не найден');
      }

      // Создаем команду со статусом (если указан администратором, иначе PENDING)
      const team = await prisma.team.create({
        data: {
          name: dto.name,
          regionId: dto.regionId,
          address: dto.address,
          contactInfo: dto.contactInfo,
          description: dto.description,
          logoUrl: dto.logoUrl,
          status: dto.status || TeamStatus.PENDING, // Администратор может указать статус
        },
        include: {
          region: {
            include: {
              federalDistrict: true,
            },
          },
        },
      });

      logger.info(`Создана новая команда: ${team.name} (ID: ${team.id})`);
      return team;
    } catch (error: any) {
      logger.error('Ошибка при создании команды', {
        error: error.message,
        teamName: dto.name,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Обновить команду
   */
  async updateTeam(id: string, dto: UpdateTeamDto) {
    try {
      const team = await prisma.team.findUnique({
        where: { id },
      });

      if (!team) {
        logger.warn(`Попытка обновить несуществующую команду: ${id}`);
        throw new Error('Команда не найдена');
      }

      // Если меняется регион, проверяем его существование
      if (dto.regionId) {
        const region = await prisma.region.findUnique({
          where: { id: dto.regionId },
        });

        if (!region) {
          logger.warn(`Попытка обновить команду с несуществующим регионом: ${dto.regionId}`);
          throw new Error('Регион не найден');
        }
      }

      const updatedTeam = await prisma.team.update({
        where: { id },
        data: dto,
        include: {
          region: {
            include: {
              federalDistrict: true,
            },
          },
        },
      });

      logger.info(`Обновлена команда: ${updatedTeam.name} (ID: ${updatedTeam.id})`);
      return updatedTeam;
    } catch (error: any) {
      logger.error(`Ошибка при обновлении команды ${id}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Модерация команды (изменение статуса)
   */
  async moderateTeam(id: string, status: TeamStatus, moderatorId: string) {
    try {
      const team = await prisma.team.findUnique({
        where: { id },
      });

      if (!team) {
        logger.warn(`Попытка модерировать несуществующую команду: ${id}`);
        throw new Error('Команда не найдена');
      }

      const updatedTeam = await prisma.team.update({
        where: { id },
        data: { status },
        include: {
          region: {
            include: {
              federalDistrict: true,
            },
          },
        },
      });

      logger.info(
        `Команда ${updatedTeam.name} (ID: ${updatedTeam.id}) изменена модератором ${moderatorId}. Новый статус: ${status}`
      );

      // Если команда одобрена и в contactInfo есть информация о соревновании, создаем заявку
      if (status === TeamStatus.APPROVED && team.contactInfo) {
        try {
          // Ищем competitionId в contactInfo (формат: "Заявка на соревнование: {competitionId}")
          // UUID формат: 8-4-4-4-12 символов (hex)
          const competitionIdMatch = team.contactInfo.match(/Заявка на соревнование:\s*([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
          if (competitionIdMatch && competitionIdMatch[1]) {
            const competitionId = competitionIdMatch[1].trim();
            logger.info(`Найден competitionId в contactInfo команды ${id}: ${competitionId}`);
            
            // Создаем заявку на соревнование
            const applicationsService = new ApplicationsService();
            await applicationsService.createApplicationAsAdmin(
              id,
              competitionId,
              ApplicationStatus.PENDING // Заявка на модерацию
            );
            
            logger.info(`Автоматически создана заявка на соревнование ${competitionId} для команды ${id}`);
          } else {
            logger.debug(`Не найден competitionId в contactInfo команды ${id}. ContactInfo: ${team.contactInfo.substring(0, 200)}`);
          }
        } catch (appError: any) {
          // Логируем ошибку, но не прерываем процесс модерации команды
          logger.warn(`Не удалось создать заявку на соревнование для команды ${id}: ${appError.message}`);
        }
      }

      return updatedTeam;
    } catch (error: any) {
      logger.error(`Ошибка при модерации команды ${id}`, {
        error: error.message,
        moderatorId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Удалить команду (мягкое удаление - изменение статуса)
   */
  async deleteTeam(id: string) {
    try {
      const team = await prisma.team.findUnique({
        where: { id },
      });

      if (!team) {
        logger.warn(`Попытка удалить несуществующую команду: ${id}`);
        throw new Error('Команда не найдена');
      }

      // Мягкое удаление - меняем статус на SUSPENDED
      const deletedTeam = await prisma.team.update({
        where: { id },
        data: {
          status: TeamStatus.SUSPENDED,
        },
      });

      logger.info(`Команда приостановлена: ${deletedTeam.name} (ID: ${deletedTeam.id})`);
      return deletedTeam;
    } catch (error: any) {
      logger.error(`Ошибка при удалении команды ${id}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить статистику команд
   */
  async getTeamsStatistics() {
    try {
      const [total, byStatus, byRegion] = await Promise.all([
        prisma.team.count(),
        prisma.team.groupBy({
          by: ['status'],
          _count: true,
        }),
        prisma.team.groupBy({
          by: ['regionId'],
          _count: true,
        }),
      ]);

      const statistics = {
        total,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<TeamStatus, number>),
        byRegion: byRegion.length,
        pending: byStatus.find((s) => s.status === TeamStatus.PENDING)?._count || 0,
        approved: byStatus.find((s) => s.status === TeamStatus.APPROVED)?._count || 0,
      };

      logger.debug('Получена статистика команд', statistics);
      return statistics;
    } catch (error: any) {
      logger.error('Ошибка при получении статистики команд', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить статистику по регионам (публичная)
   */
  async getRegionsStatistics() {
    try {
      // Получаем информацию о регионах
      const regions = await prisma.region.findMany({
        include: {
          federalDistrict: true,
        },
      });

      // Получаем команды с регионами
      const teams = await prisma.team.findMany({
        where: {
          status: 'APPROVED',
        },
        include: {
          region: true,
          athletes: true,
        },
      });

      // Получаем общее количество соревнований
      const totalCompetitions = await prisma.competition.count();

      const regionStatsMap = new Map<string, {
        name: string;
        athletes: number;
        teams: number;
        competitions: number;
      }>();

      // Инициализируем все регионы
      regions.forEach(region => {
        regionStatsMap.set(region.id, {
          name: region.name,
          athletes: 0,
          teams: 0,
          competitions: 0,
        });
      });

      // Подсчитываем команды и спортсменов по регионам
      teams.forEach(team => {
        if (team.regionId && regionStatsMap.has(team.regionId)) {
          const stat = regionStatsMap.get(team.regionId)!;
          stat.teams += 1;
          stat.athletes += team.athletes.length;
        }
      });

      const regionStats = Array.from(regionStatsMap.values())
        .filter(r => r.athletes > 0 || r.teams > 0)
        .sort((a, b) => b.athletes - a.athletes);

      const totalAthletes = regionStats.reduce((sum, r) => sum + r.athletes, 0);
      // Считаем общее количество команд из всех одобренных команд, а не только из регионов
      // Это гарантирует корректность, даже если у некоторых команд нет региона
      const totalTeams = teams.length;

      return {
        totalAthletes,
        totalTeams,
        totalCompetitions,
        totalRegions: regionStats.length,
        regions: regionStats,
      };
    } catch (error: any) {
      logger.error('Ошибка при получении статистики по регионам', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить команды, ожидающие модерации
   */
  async getPendingTeams(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      const [teams, total] = await Promise.all([
        prisma.team.findMany({
          where: {
            status: TeamStatus.PENDING,
          },
          skip,
          take: limit,
          include: {
            region: {
              include: {
                federalDistrict: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        }),
        prisma.team.count({
          where: {
            status: TeamStatus.PENDING,
          },
        }),
      ]);

      logger.debug(`Получены команды на модерации: страница ${page}, всего ${total}`);

      return {
        teams,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      logger.error('Ошибка при получении команд на модерации', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить команду тренера
   */
  async getTeamByCoach(userId: string) {
    try {
      logger.debug(`Получение команды для тренера ${userId}`);

      const coach = await prisma.coach.findFirst({
        where: {
          userId,
        },
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
                    include: {
                      profile: true,
                    },
                  },
                  weightCategory: true,
                  sportsRank: true,
                },
              },
            },
          },
        },
      });

      if (!coach || !coach.team) {
        logger.warn(`Тренер ${userId} не найден или не привязан к команде`);
        throw new Error('Команда не найдена');
      }

      logger.debug(`Найдена команда ${coach.team.name} для тренера ${userId}`);
      return coach.team;
    } catch (error: any) {
      logger.error('Ошибка при получении команды тренера', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }
}

