/**
 * Сервис управления соревнованиями
 * 
 * Основная бизнес-логика:
 * - getAllCompetitions() - получение соревнований с пагинацией и фильтрацией
 * - getCompetitionById() - получение соревнования с полными данными
 * - createCompetition() - создание соревнования
 * - updateCompetition() - обновление данных соревнования
 * - deleteCompetition() - удаление соревнования
 * - changeStatus() - изменение статуса (UPCOMING, REGISTRATION, ONGOING, COMPLETED, CANCELLED)
 * - registerParticipant() - регистрация спортсмена на соревнование
 * - updateParticipantStatus() - изменение статуса участника
 * - getCompetitionParticipants() - получение списка участников
 * - getJudges() - получение списка судей
 * - addJudge() / removeJudge() - управление судьями
 * - getCoaches() - получение списка тренеров
 * - addCoach() / removeCoach() - управление тренерами
 * - getJudgeCompetitions() - соревнования где пользователь является судьей
 * - getCoachCompetitions() - соревнования где участвуют спортсмены тренера
 * - getCompetitionStatistics() - подсчет статистики
 * - getCompetitionResults() - получение результатов
 * - createOrUpdateResult() - создание/обновление результата
 * 
 * Особенности:
 * - Поддержка индивидуальных и командных соревнований
 * - Управление статусами участников (REGISTERED, CONFIRMED, DISQUALIFIED)
 * - Автоматическое обновление статуса соревнования на основе дат
 * - Связь с событиями (events) соревнования
 */

import prisma from '../../../utils/database';
import logger from '../../../utils/logger';
import { CreateCompetitionDto, UpdateCompetitionDto, RegisterParticipantDto } from '../types';
import { CompetitionStatus, ParticipantStatus } from '@prisma/client';

export class CompetitionsService {
  /**
   * Получить все соревнования с пагинацией
   */
  async getAllCompetitions(
    page: number = 1,
    limit: number = 10,
    status?: CompetitionStatus | CompetitionStatus[],
    sportId?: string
  ) {
    try {
      const skip = (page - 1) * limit;
      const where: any = {};

      if (status) {
        // Если передан массив статусов, используем оператор in
        if (Array.isArray(status)) {
          where.status = { in: status };
        } else {
          where.status = status;
        }
      }

      if (sportId) {
        where.sportId = sportId;
      }

      const [competitions, total] = await Promise.all([
        prisma.competition.findMany({
          where,
          skip,
          take: limit,
          include: {
            sport: true,
            participants: {
              include: {
                athlete: {
                  include: {
                    user: {
                      include: { profile: true },
                    },
                    team: true,
                  },
                },
              },
            },
            judges: {
              include: {
                user: {
                  include: { profile: true },
                },
              },
            },
            coaches: {
              include: {
                coach: {
                  include: {
                    user: {
                      include: { profile: true },
                    },
                    team: true,
                  },
                },
              },
            },
            _count: {
              select: {
                participants: true,
                teamParticipants: true, // Добавляем счетчик командных участников
                brackets: true,
                judges: true,
                coaches: true,
              },
            },
          },
          orderBy: {
            startDate: 'desc',
          },
        }),
        prisma.competition.count({ where }),
      ]);

      // Для командных соревнований считаем количество спортсменов из зарегистрированных команд
      const competitionsWithAthleteCount = await Promise.all(
        competitions.map(async (competition) => {
          if (competition.competitionType === 'TEAM') {
            // Получаем все команды, зарегистрированные на это соревнование
            const teamParticipants = await prisma.teamParticipant.findMany({
              where: {
                competitionId: competition.id,
                status: 'CONFIRMED',
              },
              select: {
                teamId: true,
              },
            });

            const teamIds = teamParticipants.map(tp => tp.teamId);

            // Считаем количество спортсменов в этих командах
            const athletesCount = await prisma.athlete.count({
              where: {
                teamId: {
                  in: teamIds,
                },
              },
            });

            // Обновляем _count.participants для командных соревнований
            return {
              ...competition,
              _count: {
                ...competition._count,
                participants: athletesCount, // Заменяем на количество спортсменов
              },
            };
          }
          return competition;
        })
      );

      logger.debug(`Получен список соревнований: страница ${page}, всего ${total}`);

      return {
        competitions: competitionsWithAthleteCount,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      logger.error('Ошибка при получении списка соревнований', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить соревнование по ID
   */
  async getCompetitionById(id: string) {
    try {
      const competition = await prisma.competition.findUnique({
        where: { id },
          include: {
            sport: true,
            participants: {
              include: {
                athlete: {
                  include: {
                    user: {
                      include: { profile: true },
                    },
                    team: {
                      include: {
                        region: true,
                      },
                    },
                    coach: {
                      include: {
                        user: {
                          include: { profile: true },
                        },
                      },
                    },
                    weightCategory: true,
                  },
                },
              },
            },
            brackets: {
              include: {
                weightCategory: true,
              },
            },
            applications: {
              include: {
                team: true,
              },
            },
            judges: {
              include: {
                user: {
                  include: { profile: true },
                },
              },
            },
            coaches: {
              include: {
                coach: {
                  include: {
                    user: {
                      include: { profile: true },
                    },
                    team: true,
                  },
                },
              },
            },
          },
      });

      if (!competition) {
        logger.warn(`Соревнование с ID ${id} не найдено`);
        throw new Error('Соревнование не найдено');
      }

      logger.debug(`Получено соревнование: ${competition.name}`);
      return competition;
    } catch (error: any) {
      logger.error(`Ошибка при получении соревнования ${id}`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Создать новое соревнование
   */
  async createCompetition(dto: CreateCompetitionDto) {
    try {
      logger.debug(`Создание соревнования: ${dto.name}`);

      // Проверяем существование вида спорта
      const sport = await prisma.sport.findUnique({
        where: { id: dto.sportId },
      });

      if (!sport) {
        logger.warn(`Попытка создать соревнование с несуществующим видом спорта: ${dto.sportId}`);
        throw new Error('Вид спорта не найден');
      }

      // Проверяем корректность дат
      const startDate = new Date(dto.startDate);
      const endDate = new Date(dto.endDate);

      if (startDate >= endDate) {
        logger.warn(`Некорректные даты соревнования: начало ${startDate}, конец ${endDate}`);
        throw new Error('Дата начала должна быть раньше даты окончания');
      }

      // Создаем соревнование со статусом UPCOMING
      const competition = await prisma.competition.create({
        data: {
          name: dto.name,
          sportId: dto.sportId,
          competitionType: dto.competitionType || 'INDIVIDUAL',
          startDate,
          endDate,
          location: dto.location,
          description: dto.description,
          organizerInfo: dto.organizerInfo,
          status: CompetitionStatus.UPCOMING,
        },
        include: {
          sport: true,
        },
      });

      logger.info(`Создано новое соревнование: ${competition.name} (ID: ${competition.id})`);
      return competition;
    } catch (error: any) {
      logger.error('Ошибка при создании соревнования', {
        error: error.message,
        competitionName: dto.name,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Обновить соревнование
   */
  async updateCompetition(id: string, dto: UpdateCompetitionDto) {
    try {
      const competition = await prisma.competition.findUnique({
        where: { id },
      });

      if (!competition) {
        logger.warn(`Попытка обновить несуществующее соревнование: ${id}`);
        throw new Error('Соревнование не найдено');
      }

      // Если меняется вид спорта, проверяем его существование
      if (dto.sportId) {
        const sport = await prisma.sport.findUnique({
          where: { id: dto.sportId },
        });

        if (!sport) {
          logger.warn(`Попытка обновить соревнование с несуществующим видом спорта: ${dto.sportId}`);
          throw new Error('Вид спорта не найден');
        }
      }

      // Проверяем корректность дат, если они обновляются
      if (dto.startDate && dto.endDate) {
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);

        if (startDate >= endDate) {
          logger.warn(`Некорректные даты при обновлении соревнования: начало ${startDate}, конец ${endDate}`);
          throw new Error('Дата начала должна быть раньше даты окончания');
        }
      }

      const updatedCompetition = await prisma.competition.update({
        where: { id },
        data: {
          ...dto,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        },
        include: {
          sport: true,
        },
      });

      logger.info(`Обновлено соревнование: ${updatedCompetition.name} (ID: ${updatedCompetition.id})`);
      return updatedCompetition;
    } catch (error: any) {
      logger.error(`Ошибка при обновлении соревнования ${id}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Удалить соревнование
   */
  async deleteCompetition(id: string) {
    try {
      const competition = await prisma.competition.findUnique({
        where: { id },
      });

      if (!competition) {
        logger.warn(`Попытка удалить несуществующее соревнование: ${id}`);
        throw new Error('Соревнование не найдено');
      }

      // Проверяем, можно ли удалить соревнование
      if (competition.status === CompetitionStatus.IN_PROGRESS) {
        logger.warn(`Попытка удалить соревнование в процессе: ${competition.name}`);
        throw new Error('Нельзя удалить соревнование, которое уже началось');
      }

      // Мягкое удаление - меняем статус на CANCELLED
      const deletedCompetition = await prisma.competition.update({
        where: { id },
        data: {
          status: CompetitionStatus.CANCELLED,
        },
      });

      logger.info(`Соревнование отменено: ${deletedCompetition.name} (ID: ${deletedCompetition.id})`);
      return deletedCompetition;
    } catch (error: any) {
      logger.error(`Ошибка при удалении соревнования ${id}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Зарегистрировать участника на соревнование
   */
  async registerParticipant(competitionId: string, dto: RegisterParticipantDto) {
    try {
      logger.debug(`Регистрация участника ${dto.athleteId} на соревнование ${competitionId}`);

      const competition = await prisma.competition.findUnique({
        where: { id: competitionId },
      });

      if (!competition) {
        logger.warn(`Попытка зарегистрировать участника на несуществующее соревнование: ${competitionId}`);
        throw new Error('Соревнование не найдено');
      }

      // Проверяем статус соревнования
      if (competition.status !== CompetitionStatus.UPCOMING && competition.status !== CompetitionStatus.REGISTRATION) {
        logger.warn(`Попытка зарегистрировать участника на соревнование с недопустимым статусом: ${competition.status}`);
        throw new Error('Регистрация на это соревнование закрыта');
      }

      // Проверяем существование спортсмена
      const athlete = await prisma.athlete.findUnique({
        where: { id: dto.athleteId },
      });

      if (!athlete) {
        logger.warn(`Попытка зарегистрировать несуществующего спортсмена: ${dto.athleteId}`);
        throw new Error('Спортсмен не найден');
      }

      // Проверяем, не зарегистрирован ли уже
      const existingParticipant = await prisma.competitionParticipant.findUnique({
        where: {
          competitionId_athleteId: {
            competitionId,
            athleteId: dto.athleteId,
          },
        },
      });

      if (existingParticipant) {
        logger.warn(`Попытка повторной регистрации участника ${dto.athleteId} на соревнование ${competitionId}`);
        throw new Error('Спортсмен уже зарегистрирован на это соревнование');
      }

      // Регистрируем участника со статусом REGISTERED (не подтверждён)
      // Спортсмен сам зарегистрировался - тренер должен подтвердить (статус станет CONFIRMED)
      // В сетки попадают только участники со статусом CONFIRMED
      const participant = await prisma.competitionParticipant.create({
        data: {
          competitionId,
          athleteId: dto.athleteId,
          status: ParticipantStatus.REGISTERED, // Не подтверждён - тренер должен подтвердить
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
        },
      });

      logger.info(`Участник зарегистрирован: ${participant.athlete.user.email} на соревнование ${competition.name}`);
      
      // Автоматически обновляем или создаем сетки для соревнования
      // Это делается асинхронно, чтобы не блокировать регистрацию
      // Используем autoCreateBracketsForCompetition, который пересоздает сетки с учетом новых участников
      (async () => {
        try {
          const { BracketsService } = await import('../../brackets/services/brackets.service');
          const bracketsService = new BracketsService();
          await bracketsService.autoCreateBracketsForCompetition(competitionId);
          logger.info(`Сетки обновлены для соревнования ${competitionId} после регистрации участника`);
        } catch (error: any) {
          logger.warn(`Не удалось обновить сетки после регистрации участника: ${error.message}`);
        }
      })();
      
      return participant;
    } catch (error: any) {
      logger.error('Ошибка при регистрации участника', {
        error: error.message,
        competitionId,
        athleteId: dto.athleteId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Обновить статус участника
   */
  async updateParticipantStatus(
    competitionId: string,
    participantId: string,
    status: ParticipantStatus
  ) {
    try {
      logger.debug(`Обновление статуса участника ${participantId} на соревновании ${competitionId}: ${status}`);

      const participant = await prisma.competitionParticipant.findUnique({
        where: { id: participantId },
      });

      if (!participant || participant.competitionId !== competitionId) {
        logger.warn(`Участник не найден или не принадлежит соревнованию: ${participantId}, ${competitionId}`);
        throw new Error('Участник не найден');
      }

      const updatedParticipant = await prisma.competitionParticipant.update({
        where: { id: participantId },
        data: { status },
        include: {
          athlete: {
            include: {
              user: {
                include: { profile: true },
              },
            },
          },
        },
      });

      logger.info(`Статус участника обновлен: ${participantId} -> ${status}`);
      return updatedParticipant;
    } catch (error: any) {
      logger.error('Ошибка при обновлении статуса участника', {
        error: error.message,
        competitionId,
        participantId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить статистику соревнований
   */
  async getCompetitionsStatistics() {
    try {
      const [total, byStatus, bySport, upcoming, inProgress] = await Promise.all([
        prisma.competition.count(),
        prisma.competition.groupBy({
          by: ['status'],
          _count: true,
        }),
        prisma.competition.groupBy({
          by: ['sportId'],
          _count: true,
        }),
        prisma.competition.count({
          where: { status: CompetitionStatus.UPCOMING },
        }),
        prisma.competition.count({
          where: { status: CompetitionStatus.IN_PROGRESS },
        }),
      ]);

      const statistics = {
        total,
        upcoming,
        inProgress,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<CompetitionStatus, number>),
        bySport: bySport.length,
      };

      logger.debug('Получена статистика соревнований', statistics);
      return statistics;
    } catch (error: any) {
      logger.error('Ошибка при получении статистики соревнований', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Изменить статус соревнования
   */
  async changeStatus(id: string, status: CompetitionStatus) {
    try {
      logger.debug(`Изменение статуса соревнования ${id} на ${status}`);

      const competition = await prisma.competition.findUnique({
        where: { id },
      });

      if (!competition) {
        logger.warn(`Попытка изменить статус несуществующего соревнования: ${id}`);
        throw new Error('Соревнование не найдено');
      }

      const updatedCompetition = await prisma.competition.update({
        where: { id },
        data: { status },
        include: {
          sport: true,
        },
      });

      logger.info(`Статус соревнования изменен: ${competition.name} -> ${status}`);

      // Если соревнование переходит в статус IN_PROGRESS, автоматически создаем сетки
      if (status === CompetitionStatus.IN_PROGRESS && competition.status !== CompetitionStatus.IN_PROGRESS) {
        try {
          const { BracketsService } = await import('../../brackets/services/brackets.service');
          const bracketsService = new BracketsService();
          
          logger.info(`Автоматическое создание сеток для соревнования ${id}`);
          const result = await bracketsService.autoCreateBracketsForCompetition(id);
          
          logger.info(`Автоматически создано ${result.created} сеток для соревнования ${id}`);
        } catch (error: any) {
          // Не прерываем изменение статуса, если не удалось создать сетки
          logger.warn(`Не удалось автоматически создать сетки для соревнования ${id}: ${error.message}`);
        }
      }

      return updatedCompetition;
    } catch (error: any) {
      logger.error(`Ошибка при изменении статуса соревнования ${id}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Создать или обновить результат участника
   */
  async createOrUpdateResult(dto: {
    matchId: string;
    athleteId: string;
    position?: number;
    points?: number;
    time?: string;
    details?: any;
  }) {
    try {
      // Проверяем существование матча
      const match = await prisma.match.findUnique({
        where: { id: dto.matchId },
      });

      if (!match) {
        throw new Error('Матч не найден');
      }

      // Проверяем, что спортсмен участвует в этом матче
      if (match.athlete1Id !== dto.athleteId && match.athlete2Id !== dto.athleteId) {
        throw new Error('Спортсмен не участвует в этом матче');
      }

      // Ищем существующий результат
      const existingResult = await prisma.result.findFirst({
        where: {
          matchId: dto.matchId,
          athleteId: dto.athleteId,
        },
      });

      let result;
      if (existingResult) {
        // Обновляем существующий результат
        result = await prisma.result.update({
          where: { id: existingResult.id },
          data: {
            position: dto.position,
            points: dto.points,
            time: dto.time,
            details: dto.details,
          },
          include: {
            athlete: {
              include: {
                user: {
                  include: { profile: true },
                },
              },
            },
            match: true,
          },
        });
        logger.info(`Результат обновлен для спортсмена ${dto.athleteId} в матче ${dto.matchId}`);
      } else {
        // Создаем новый результат
        result = await prisma.result.create({
          data: {
            matchId: dto.matchId,
            athleteId: dto.athleteId,
            position: dto.position,
            points: dto.points,
            time: dto.time,
            details: dto.details,
          },
          include: {
            athlete: {
              include: {
                user: {
                  include: { profile: true },
                },
              },
            },
            match: true,
          },
        });
        logger.info(`Результат создан для спортсмена ${dto.athleteId} в матче ${dto.matchId}`);
      }

      return result;
    } catch (error: any) {
      logger.error('Ошибка при создании/обновлении результата', {
        error: error.message,
        dto,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить результаты соревнования (места и очки участников)
   */
  async getCompetitionResults(competitionId: string) {
    try {
      // Получаем информацию о соревновании для определения типа
      const competition = await prisma.competition.findUnique({
        where: { id: competitionId },
        select: { competitionType: true },
      });

      const isTeamCompetition = competition?.competitionType === 'TEAM';

      // Получаем все матчи соревнования через сетки
      const brackets = await prisma.bracket.findMany({
        where: { competitionId },
        include: {
          matches: {
            include: {
              results: {
                include: {
                  athlete: {
                    include: {
                      user: {
                        include: { profile: true },
                      },
                      team: {
                        include: {
                          region: true,
                        },
                      },
                      weightCategory: true,
                    },
                  },
                },
              },
              team1: {
                include: {
                  region: true,
                },
              },
              team2: {
                include: {
                  region: true,
                },
              },
            },
          },
        },
      });

      // Для командных соревнований обрабатываем результаты из матчей
      if (isTeamCompetition) {
        return this.getTeamCompetitionResults(brackets);
      }

      // Собираем все результаты
      const allResults: any[] = [];
      brackets.forEach((bracket) => {
        bracket.matches.forEach((match) => {
          match.results.forEach((result) => {
            allResults.push(result);
          });
        });
      });

      // Группируем по спортсменам, собираем все результаты (очки за схватки) и лучшее место
      const athleteResults = new Map<string, any>();
      
      allResults.forEach((result) => {
        // Пропускаем результаты без athleteId или athlete
        if (!result.athleteId || !result.athlete) {
          logger.warn(`Пропущен результат без athleteId или athlete: ${JSON.stringify(result)}`);
          return;
        }
        
        const athleteId = result.athleteId;
        let existing = athleteResults.get(athleteId);
        
        // Если записи еще нет, создаем новую
        if (!existing) {
          existing = {
            athleteId: result.athleteId,
            athlete: result.athlete,
            position: null,
            matchResults: [],
            matchIds: new Set<string>(), // Для отслеживания уникальности матчей
          };
        }
        
        // Защита: убеждаемся, что matchResults инициализирован
        if (!Array.isArray(existing.matchResults)) {
          existing.matchResults = [];
        }
        if (!existing.matchIds || !(existing.matchIds instanceof Set)) {
          existing.matchIds = new Set<string>();
        }
        
        // Обрабатываем details (может быть объектом или строкой JSON)
        let detailsObj: any = null;
        try {
          if (result.details) {
            if (typeof result.details === 'string') {
              try {
                detailsObj = JSON.parse(result.details);
              } catch (e) {
                logger.warn(`Ошибка парсинга details как JSON: ${result.details}`);
                detailsObj = null;
              }
            } else if (typeof result.details === 'object') {
              detailsObj = result.details;
            }
          }
        } catch (e) {
          logger.warn(`Ошибка обработки details: ${e}`);
          detailsObj = null;
        }
        
        // Добавляем информацию о схватке, если этот матч еще не добавлен
        // Включаем даже если очки не указаны (points может быть null)
        if (result.matchId && !existing.matchIds.has(result.matchId)) {
          // Убеждаемся, что round - это число
          let roundValue: number | null = null;
          if (detailsObj?.round !== null && detailsObj?.round !== undefined) {
            const roundNum = Number(detailsObj.round);
            if (!isNaN(roundNum) && roundNum > 0) {
              roundValue = roundNum;
            }
          }
          
          // Убеждаемся, что opponentScore - это число или null
          let opponentScoreValue: number | null = null;
          if (detailsObj?.opponentScore !== null && detailsObj?.opponentScore !== undefined) {
            const scoreNum = Number(detailsObj.opponentScore);
            if (!isNaN(scoreNum)) {
              opponentScoreValue = scoreNum;
            }
          }
          
          // Обрабатываем очки (могут быть null, если не указаны)
          let pointsValue: number | null = null;
          if (result.points !== null && result.points !== undefined) {
            const pointsNum = Number(result.points);
            if (!isNaN(pointsNum)) {
              pointsValue = pointsNum;
            }
          }
          
          // Добавляем информацию о схватке (даже если очки не указаны)
          existing.matchResults.push({
            matchId: result.matchId,
            round: roundValue,
            points: pointsValue,
            opponentScore: opponentScoreValue,
          });
          existing.matchIds.add(result.matchId);
        }
        
        // Определяем лучшее место (меньшее число = лучшее место)
        if (result.position !== null && result.position !== undefined) {
          if (existing.position === null || result.position < existing.position) {
            existing.position = result.position;
          }
        }
        
        athleteResults.set(athleteId, existing);
      });
      
      // Преобразуем Set в обычные объекты для возврата
      const processedResults = Array.from(athleteResults.values()).map((result: any) => {
        // Убеждаемся, что matchResults - это массив
        if (!Array.isArray(result.matchResults)) {
          result.matchResults = [];
        }
        
        // Сортируем matchResults по раунду (от меньшего к большему)
        result.matchResults.sort((a: any, b: any) => {
          const aRound = a?.round;
          const bRound = b?.round;
          if (aRound === null && bRound === null) return 0;
          if (aRound === null || aRound === undefined) return 1;
          if (bRound === null || bRound === undefined) return -1;
          return Number(aRound) - Number(bRound);
        });
        
        // Удаляем служебное поле matchIds (если это Set, преобразуем в обычное свойство для удаления)
        if (result.matchIds) {
          delete result.matchIds;
        }
        return result;
      });

      // Сортируем по месту
      const sortedResults = processedResults.sort((a, b) => {
        // Сначала по месту (меньшее = лучше)
        if (a.position === null && b.position === null) return 0;
        if (a.position === null) return 1; // Без места в конец
        if (b.position === null) return -1;
        if (a.position !== b.position) return a.position - b.position;
        
        // Если места одинаковые, сортируем по количеству побед (больше очков = лучше)
        const aMatchResults = Array.isArray(a.matchResults) ? a.matchResults : [];
        const bMatchResults = Array.isArray(b.matchResults) ? b.matchResults : [];
        const aTotalPoints = aMatchResults.reduce((sum: number, mr: any) => {
          const points = mr?.points !== null && mr?.points !== undefined ? Number(mr.points) : 0;
          return sum + (isNaN(points) ? 0 : points);
        }, 0);
        const bTotalPoints = bMatchResults.reduce((sum: number, mr: any) => {
          const points = mr?.points !== null && mr?.points !== undefined ? Number(mr.points) : 0;
          return sum + (isNaN(points) ? 0 : points);
        }, 0);
        return bTotalPoints - aTotalPoints;
      });

      return sortedResults;
    } catch (error: any) {
      logger.error(`Ошибка при получении результатов соревнования ${competitionId}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить результаты командного соревнования из матчей
   */
  private getTeamCompetitionResults(brackets: any[]) {
    // Собираем все матчи
    const allMatches: any[] = [];
    brackets.forEach((bracket) => {
      bracket.matches.forEach((match) => {
        if (match.status === 'COMPLETED' && (match.team1Id || match.team2Id)) {
          allMatches.push(match);
        }
      });
    });

    // Группируем по командам
    const teamResults = new Map<string, any>();

    allMatches.forEach((match) => {
      const maxRound = Math.max(...brackets.flatMap(b => b.matches.map((m: any) => m.round)));

      // Обрабатываем команду 1
      if (match.team1Id && match.team1) {
        const teamId = match.team1Id;
        let existing = teamResults.get(teamId);

        if (!existing) {
          existing = {
            teamId: teamId,
            team: match.team1,
            position: null,
            matchResults: [],
            matchIds: new Set<string>(),
          };
        }

        if (!Array.isArray(existing.matchResults)) {
          existing.matchResults = [];
        }
        if (!existing.matchIds || !(existing.matchIds instanceof Set)) {
          existing.matchIds = new Set<string>();
        }

        if (match.id && !existing.matchIds.has(match.id)) {
          const isWinner = match.winnerTeamId === teamId;
          const opponentTeam = match.team2;
          const score = match.score as any;
          const teamScore = score?.team1 !== undefined ? score.team1 : null;
          const opponentScore = score?.team2 !== undefined ? score.team2 : null;

          existing.matchResults.push({
            matchId: match.id,
            round: match.round,
            points: teamScore,
            opponentScore: opponentScore,
            isWinner: isWinner,
            opponent: opponentTeam ? { id: opponentTeam.id, name: opponentTeam.name } : null,
          });
          existing.matchIds.add(match.id);

          // Проверяем, есть ли место в metadata матча (ручное редактирование)
          const matchMetadata = match.metadata as any;
          const manualPosition = matchMetadata?.teamPositions?.[teamId];
          
          if (manualPosition !== null && manualPosition !== undefined) {
            // Используем место из metadata (ручное редактирование)
            if (existing.position === null || manualPosition < existing.position) {
              existing.position = manualPosition;
            }
          } else {
            // Определяем место автоматически
            if (!isWinner && match.round < maxRound) {
              const roundsFromFinal = maxRound - match.round;
              const startPosition = Math.pow(2, roundsFromFinal) + 1;
              const positionOffset = match.position - 1;
              const position = startPosition + positionOffset;
              if (existing.position === null || position < existing.position) {
                existing.position = position;
              }
            } else if (isWinner && match.round === maxRound) {
              // Победитель финала - 1 место
              existing.position = 1;
            } else if (!isWinner && match.round === maxRound) {
              // Проигравший финала - 2 место
              existing.position = 2;
            }
          }
        }

        teamResults.set(teamId, existing);
      }

      // Обрабатываем команду 2
      if (match.team2Id && match.team2) {
        const teamId = match.team2Id;
        let existing = teamResults.get(teamId);

        if (!existing) {
          existing = {
            teamId: teamId,
            team: match.team2,
            position: null,
            matchResults: [],
            matchIds: new Set<string>(),
          };
        }

        if (!Array.isArray(existing.matchResults)) {
          existing.matchResults = [];
        }
        if (!existing.matchIds || !(existing.matchIds instanceof Set)) {
          existing.matchIds = new Set<string>();
        }

        if (match.id && !existing.matchIds.has(match.id)) {
          const isWinner = match.winnerTeamId === teamId;
          const opponentTeam = match.team1;
          const score = match.score as any;
          const teamScore = score?.team2 !== undefined ? score.team2 : null;
          const opponentScore = score?.team1 !== undefined ? score.team1 : null;

          existing.matchResults.push({
            matchId: match.id,
            round: match.round,
            points: teamScore,
            opponentScore: opponentScore,
            isWinner: isWinner,
            opponent: opponentTeam ? { id: opponentTeam.id, name: opponentTeam.name } : null,
          });
          existing.matchIds.add(match.id);

          // Проверяем, есть ли место в metadata матча (ручное редактирование)
          const matchMetadata = match.metadata as any;
          const manualPosition = matchMetadata?.teamPositions?.[teamId];
          
          if (manualPosition !== null && manualPosition !== undefined) {
            // Используем место из metadata (ручное редактирование)
            if (existing.position === null || manualPosition < existing.position) {
              existing.position = manualPosition;
            }
          } else {
            // Определяем место автоматически
            if (!isWinner && match.round < maxRound) {
              const roundsFromFinal = maxRound - match.round;
              const startPosition = Math.pow(2, roundsFromFinal) + 1;
              const positionOffset = match.position - 1;
              const position = startPosition + positionOffset;
              if (existing.position === null || position < existing.position) {
                existing.position = position;
              }
            } else if (isWinner && match.round === maxRound) {
              // Победитель финала - 1 место
              existing.position = 1;
            } else if (!isWinner && match.round === maxRound) {
              // Проигравший финала - 2 место
              existing.position = 2;
            }
          }
        }

        teamResults.set(teamId, existing);
      }
    });

    // Преобразуем в массив и сортируем
    const processedResults = Array.from(teamResults.values()).map((result: any) => {
      if (!Array.isArray(result.matchResults)) {
        result.matchResults = [];
      }
      result.matchResults.sort((a: any, b: any) => {
        const aRound = a?.round;
        const bRound = b?.round;
        if (aRound === null && bRound === null) return 0;
        if (aRound === null || aRound === undefined) return 1;
        if (bRound === null || bRound === undefined) return -1;
        return Number(aRound) - Number(bRound);
      });
      if (result.matchIds) {
        delete result.matchIds;
      }
      return result;
    });

    // Сортируем по месту
    const sortedResults = processedResults.sort((a, b) => {
      if (a.position === null && b.position === null) return 0;
      if (a.position === null) return 1;
      if (b.position === null) return -1;
      if (a.position !== b.position) return a.position - b.position;
      
      const aMatchResults = Array.isArray(a.matchResults) ? a.matchResults : [];
      const bMatchResults = Array.isArray(b.matchResults) ? b.matchResults : [];
      const aTotalPoints = aMatchResults.reduce((sum: number, mr: any) => {
        const points = mr?.points !== null && mr?.points !== undefined ? Number(mr.points) : 0;
        return sum + (isNaN(points) ? 0 : points);
      }, 0);
      const bTotalPoints = bMatchResults.reduce((sum: number, mr: any) => {
        const points = mr?.points !== null && mr?.points !== undefined ? Number(mr.points) : 0;
        return sum + (isNaN(points) ? 0 : points);
      }, 0);
      return bTotalPoints - aTotalPoints;
    });

    return sortedResults;
  }

  /**
   * Добавить судью к соревнованию
   */
  async addJudgeToCompetition(competitionId: string, userId: string) {
    try {
      // Проверяем существование соревнования
      const competition = await prisma.competition.findUnique({
        where: { id: competitionId },
      });

      if (!competition) {
        throw new Error('Соревнование не найдено');
      }

      // Проверяем, что пользователь - судья
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.role !== 'JUDGE') {
        throw new Error('Пользователь не является судьей');
      }

      // Проверяем, не добавлен ли уже судья
      const existing = await prisma.competitionJudge.findUnique({
        where: {
          competitionId_userId: {
            competitionId,
            userId,
          },
        },
      });

      if (existing) {
        throw new Error('Судья уже добавлен к этому соревнованию');
      }

      // Добавляем судью
      const competitionJudge = await prisma.competitionJudge.create({
        data: {
          competitionId,
          userId,
        },
        include: {
          user: {
            include: { profile: true },
          },
        },
      });

      logger.info(`Судья ${userId} добавлен к соревнованию ${competitionId}`);
      return competitionJudge;
    } catch (error: any) {
      logger.error('Ошибка при добавлении судьи к соревнованию', {
        error: error.message,
        competitionId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Удалить судью из соревнования
   */
  async removeJudgeFromCompetition(competitionId: string, userId: string) {
    try {
      await prisma.competitionJudge.delete({
        where: {
          competitionId_userId: {
            competitionId,
            userId,
          },
        },
      });

      logger.info(`Судья ${userId} удален из соревнования ${competitionId}`);
      return { success: true };
    } catch (error: any) {
      logger.error('Ошибка при удалении судьи из соревнования', {
        error: error.message,
        competitionId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Добавить тренера к соревнованию
   */
  async addCoachToCompetition(competitionId: string, coachId: string) {
    try {
      // Проверяем существование соревнования
      const competition = await prisma.competition.findUnique({
        where: { id: competitionId },
      });

      if (!competition) {
        throw new Error('Соревнование не найдено');
      }

      // Проверяем существование тренера
      const coach = await prisma.coach.findUnique({
        where: { id: coachId },
      });

      if (!coach) {
        throw new Error('Тренер не найден');
      }

      // Проверяем, не добавлен ли уже тренер
      const existing = await prisma.competitionCoach.findUnique({
        where: {
          competitionId_coachId: {
            competitionId,
            coachId,
          },
        },
      });

      if (existing) {
        throw new Error('Тренер уже добавлен к этому соревнованию');
      }

      // Добавляем тренера
      const competitionCoach = await prisma.competitionCoach.create({
        data: {
          competitionId,
          coachId,
        },
        include: {
          coach: {
            include: {
              user: {
                include: { profile: true },
              },
              team: true,
            },
          },
        },
      });

      logger.info(`Тренер ${coachId} добавлен к соревнованию ${competitionId}`);
      return competitionCoach;
    } catch (error: any) {
      logger.error('Ошибка при добавлении тренера к соревнованию', {
        error: error.message,
        competitionId,
        coachId,
      });
      throw error;
    }
  }

  /**
   * Удалить тренера из соревнования
   */
  async removeCoachFromCompetition(competitionId: string, coachId: string) {
    try {
      await prisma.competitionCoach.delete({
        where: {
          competitionId_coachId: {
            competitionId,
            coachId,
          },
        },
      });

      logger.info(`Тренер ${coachId} удален из соревнования ${competitionId}`);
      return { success: true };
    } catch (error: any) {
      logger.error('Ошибка при удалении тренера из соревнования', {
        error: error.message,
        competitionId,
        coachId,
      });
      throw error;
    }
  }

  /**
   * Получить всех судей для соревнования
   */
  async getCompetitionJudges(competitionId: string) {
    try {
      const judges = await prisma.competitionJudge.findMany({
        where: { competitionId },
        include: {
          user: {
            include: { profile: true },
          },
        },
      });

      return judges;
    } catch (error: any) {
      logger.error('Ошибка при получении судей соревнования', {
        error: error.message,
        competitionId,
      });
      throw error;
    }
  }

  /**
   * Получить всех тренеров для соревнования
   */
  async getCompetitionCoaches(competitionId: string) {
    try {
      const coaches = await prisma.competitionCoach.findMany({
        where: { competitionId },
        include: {
          coach: {
            include: {
              user: {
                include: { profile: true },
              },
              team: true,
            },
          },
        },
      });

      return coaches;
    } catch (error: any) {
      logger.error('Ошибка при получении тренеров соревнования', {
        error: error.message,
        competitionId,
      });
      throw error;
    }
  }

  /**
   * Получить детальную статистику конкретного соревнования
   */
  async getCompetitionStatistics(competitionId: string) {
    try {
      logger.debug(`Получение статистики соревнования ${competitionId}`);

      const competition = await prisma.competition.findUnique({
        where: { id: competitionId },
        include: {
          sport: true,
          participants: {
            include: {
              athlete: {
                include: {
                  user: {
                    include: { profile: true },
                  },
                  team: true,
                  weightCategory: true,
                },
              },
            },
          },
          teamParticipants: {
            include: {
              team: {
                include: {
                  region: true,
                },
              },
            },
          },
          brackets: {
            include: {
              weightCategory: true,
              matches: {
                include: {
                  athlete1: {
                    include: {
                      user: {
                        include: { profile: true },
                      },
                    },
                  },
                  athlete2: {
                    include: {
                      user: {
                        include: { profile: true },
                      },
                    },
                  },
                  team1: {
                    include: {
                      region: true,
                    },
                  },
                  team2: {
                    include: {
                      region: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!competition) {
        throw new Error('Соревнование не найдено');
      }

      const isTeamCompetition = competition.competitionType === 'TEAM';

      // Подсчет общей статистики
      const totalParticipants = isTeamCompetition 
        ? competition.teamParticipants.length 
        : competition.participants.length;
      const totalMatches = competition.brackets.reduce(
        (sum, bracket) => sum + bracket.matches.length,
        0
      );
      const completedMatches = competition.brackets.reduce(
        (sum, bracket) =>
          sum + bracket.matches.filter((m) => m.status === 'COMPLETED').length,
        0
      );

      // Статистика по весовым категориям/сеткам
      const byWeightCategory: Record<string, any> = {};
      for (const bracket of competition.brackets) {
        const categoryName = bracket.weightCategory?.name || 'Командное соревнование';
        if (!byWeightCategory[categoryName]) {
          byWeightCategory[categoryName] = {
            category: categoryName,
            participants: 0,
            matches: bracket.matches.length,
            completedMatches: bracket.matches.filter((m) => m.status === 'COMPLETED').length,
          };
        }
        // Подсчет участников в этой категории/сетке
        if (isTeamCompetition) {
          // Для командных соревнований считаем уникальные команды в матчах этой сетки
          const uniqueTeams = new Set<string>();
          bracket.matches.forEach((m: any) => {
            if (m.team1Id) uniqueTeams.add(m.team1Id);
            if (m.team2Id) uniqueTeams.add(m.team2Id);
          });
          byWeightCategory[categoryName].participants = uniqueTeams.size;
        } else {
          // Для индивидуальных соревнований считаем участников по весовой категории
          const categoryParticipants = competition.participants.filter(
            (p) => p.athlete.weightCategoryId === bracket.weightCategoryId
          ).length;
          byWeightCategory[categoryName].participants = categoryParticipants;
        }
      }

      let topParticipants: any[] = [];
      let topTeams: any[] = [];

      if (isTeamCompetition) {
        // Для командных соревнований считаем победы команд
        const teamWins: Record<string, { team: any; wins: number }> = {};
        for (const bracket of competition.brackets) {
          for (const match of bracket.matches) {
            if (match.winnerTeamId && match.status === 'COMPLETED') {
              if (!teamWins[match.winnerTeamId]) {
                const winner =
                  match.team1?.id === match.winnerTeamId ? match.team1 : match.team2;
                if (winner) {
                  teamWins[match.winnerTeamId] = {
                    team: winner,
                    wins: 0,
                  };
                }
              }
              if (teamWins[match.winnerTeamId]) {
                teamWins[match.winnerTeamId].wins++;
              }
            }
          }
        }

        topTeams = Object.values(teamWins)
          .sort((a, b) => b.wins - a.wins)
          .slice(0, 10)
          .map((item, index) => ({
            teamName: item.team.name,
            participantsCount: 0, // Для командных соревнований это не применимо
            wins: item.wins,
            position: index + 1,
          }));
      } else {
        // Для индивидуальных соревнований считаем победы спортсменов
        const athleteWins: Record<string, { athlete: any; wins: number }> = {};
        for (const bracket of competition.brackets) {
          for (const match of bracket.matches) {
            if (match.winnerId && match.status === 'COMPLETED') {
              if (!athleteWins[match.winnerId]) {
                const winner =
                  match.athlete1?.id === match.winnerId ? match.athlete1 : match.athlete2;
                if (winner) {
                  athleteWins[match.winnerId] = {
                    athlete: winner,
                    wins: 0,
                  };
                }
              }
              if (athleteWins[match.winnerId]) {
                athleteWins[match.winnerId].wins++;
              }
            }
          }
        }

        topParticipants = Object.values(athleteWins)
          .sort((a, b) => b.wins - a.wins)
          .slice(0, 10)
          .map((item, index) => ({
            athlete: item.athlete,
            wins: item.wins,
            position: index + 1,
          }));

        // Статистика по командам для индивидуальных соревнований
        const teamStats: Record<string, { teamName: string; participantsCount: number; wins: number }> = {};
        for (const participant of competition.participants) {
          const teamId = participant.athlete.teamId;
          const teamName = participant.athlete.team?.name || 'Без команды';
          if (!teamStats[teamId]) {
            teamStats[teamId] = {
              teamName,
              participantsCount: 0,
              wins: 0,
            };
          }
          teamStats[teamId].participantsCount++;
          if (athleteWins[participant.athleteId]) {
            teamStats[teamId].wins += athleteWins[participant.athleteId].wins;
          }
        }

        topTeams = Object.values(teamStats)
          .sort((a, b) => b.wins - a.wins)
          .slice(0, 5);
      }

      const statistics = {
        totalParticipants,
        totalMatches,
        completedMatches,
        byWeightCategory: Object.values(byWeightCategory),
        topParticipants,
        topTeams,
        progress: totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0,
      };

      logger.debug('Статистика соревнования получена', { competitionId, statistics });
      return statistics;
    } catch (error: any) {
      logger.error('Ошибка при получении статистики соревнования', {
        error: error.message,
        competitionId,
      });
      throw error;
    }
  }

  /**
   * Получить соревнования, к которым прикреплен судья
   */
  async getCompetitionsByJudge(userId: string) {
    try {
      logger.debug(`Получение соревнований для судьи ${userId}`);

      const competitions = await prisma.competition.findMany({
        where: {
          judges: {
            some: {
              userId,
            },
          },
        },
        include: {
          sport: true,
          judges: {
            include: {
              user: {
                include: { profile: true },
              },
            },
          },
          _count: {
            select: {
              participants: true,
              brackets: true,
            },
          },
        },
        orderBy: {
          startDate: 'desc',
        },
      });

      logger.debug(`Найдено ${competitions.length} соревнований для судьи ${userId}`);
      return competitions;
    } catch (error: any) {
      logger.error('Ошибка при получении соревнований судьи', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Получить участников соревнования
   */
  async getCompetitionParticipants(competitionId: string) {
    try {
      logger.debug(`Получение участников соревнования ${competitionId}`);

      const participants = await prisma.competitionParticipant.findMany({
        where: { competitionId },
        include: {
          athlete: {
            include: {
              user: {
                include: { profile: true },
              },
              team: {
                include: {
                  region: true,
                },
              },
              weightCategory: true,
              sportsRank: true,
            },
          },
        },
        orderBy: {
          registrationDate: 'asc',
        },
      });

      logger.debug(`Найдено ${participants.length} участников соревнования ${competitionId}`);
      return participants;
    } catch (error: any) {
      logger.error('Ошибка при получении участников соревнования', {
        error: error.message,
        competitionId,
      });
      throw error;
    }
  }

  /**
   * Получить соревнования, в которых участвуют спортсмены команды тренера
   */
  async getCompetitionsByCoach(userId: string) {
    try {
      logger.debug(`Получение соревнований для тренера ${userId}`);

      // Находим тренера и его команду
      const coach = await prisma.coach.findFirst({
        where: {
          userId,
        },
        include: {
          team: {
            include: {
              athletes: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });

      if (!coach || !coach.teamId) {
        logger.debug(`Тренер ${userId} не найден или не привязан к команде`);
        return [];
      }

      const athleteIds = coach.team.athletes.map((a) => a.id);
      const teamId = coach.teamId;

      // Находим соревнования, где участвуют спортсмены команды (индивидуальные соревнования)
      const individualCompetitions = athleteIds.length > 0 ? await prisma.competition.findMany({
        where: {
          participants: {
            some: {
              athleteId: {
                in: athleteIds,
              },
            },
          },
        },
        include: {
          sport: true,
          _count: {
            select: {
              participants: true,
              brackets: true,
            },
          },
        },
        orderBy: {
          startDate: 'desc',
        },
      }) : [];

      // Находим соревнования, где участвует команда (командные соревнования)
      const teamCompetitions = await prisma.competition.findMany({
        where: {
          teamParticipants: {
            some: {
              teamId: teamId,
            },
          },
        },
        include: {
          sport: true,
          _count: {
            select: {
              teamParticipants: true,
              brackets: true,
            },
          },
        },
        orderBy: {
          startDate: 'desc',
        },
      });

      // Объединяем и удаляем дубликаты
      const allCompetitions = [...individualCompetitions, ...teamCompetitions];
      const uniqueCompetitions = Array.from(
        new Map(allCompetitions.map(comp => [comp.id, comp])).values()
      );

      logger.debug(`Найдено ${uniqueCompetitions.length} соревнований для тренера ${userId} (${individualCompetitions.length} индивидуальных, ${teamCompetitions.length} командных)`);
      return uniqueCompetitions;
    } catch (error: any) {
      logger.error('Ошибка при получении соревнований тренера', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }
}

