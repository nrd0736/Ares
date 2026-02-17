/**
 * Сервис управления турнирными сетками
 * 
 * Основная бизнес-логика:
 * - getBracketsByCompetition() - получение всех сеток соревнования
 * - getBracketById() - получение сетки с полной структурой
 * - createBracket() - создание сетки с автоматической генерацией структуры
 * - autoCreateBrackets() - создание сеток для всех весовых категорий
 * - updateMatchResult() - обновление результата матча
 * - confirmMatchResult() - подтверждение результата судьей
 * - approveMatchResult() - финализация результата
 * - createMatch() - создание матча вручную
 * - updateMatch() - обновление матча
 * - getBracketMatches() - получение всех матчей сетки
 * - getMatchesRequiringConfirmation() - матчи требующие подтверждения
 * 
 * Особенности:
 * - Автоматическая генерация структуры сетки по алгоритмам
 * - Поддержка single/double elimination и round robin
 * - Real-time обновления через Socket.IO
 * - Система подтверждения результатов судьями
 * - Автоматическое продвижение победителей в следующий раунд
 */

import prisma from '../../../utils/database';
import logger from '../../../utils/logger';
import { CreateBracketDto, CreateTeamBracketDto, UpdateMatchResultDto, UpdateMatchDto } from '../types';
import { BracketType, MatchStatus } from '@prisma/client';
import { BracketGenerator } from '../utils/bracket-generator';

declare global {
  var io: any;
}

export class BracketsService {
  /**
   * Рекурсивно очищает undefined значения из children массивов
   */
  private cleanBracketData(nodes: any): any {
    if (!nodes) return nodes;
    if (Array.isArray(nodes)) {
      return nodes.map(node => this.cleanBracketData(node)).filter(node => node !== undefined);
    }
    if (typeof nodes === 'object' && nodes !== null) {
      const cleaned: any = {};
      for (const key in nodes) {
        if (nodes.hasOwnProperty(key)) {
          if (key === 'children' && Array.isArray(nodes[key])) {
            const cleanedChildren = nodes[key]
              .map((child: any) => this.cleanBracketData(child))
              .filter((child: any) => child !== undefined);
            cleaned[key] = cleanedChildren.length > 0 ? cleanedChildren : undefined;
          } else {
            cleaned[key] = this.cleanBracketData(nodes[key]);
          }
        }
      }
      return cleaned;
    }
    return nodes;
  }

  /**
   * Получить все сетки соревнования
   */
  async getBracketsByCompetition(competitionId: string) {
    try {

      // Проверяем статус соревнования
      const competition = await prisma.competition.findUnique({
        where: { id: competitionId },
        select: { status: true, competitionType: true },
      });

      let brackets = await prisma.bracket.findMany({
        where: { competitionId },
        include: {
          competition: {
            select: {
              id: true,
              name: true,
              competitionType: true,
            },
          },
          weightCategory: true,
          matches: {
            include: {
              athlete1: {
                include: {
                  user: {
                    include: { profile: true },
                  },
                  team: {
                    include: {
                      region: true,
                    },
                  },
                },
              },
              athlete2: {
                include: {
                  user: {
                    include: { profile: true },
                  },
                  team: {
                    include: {
                      region: true,
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
            orderBy: [
              { round: 'asc' },
              { position: 'asc' },
            ],
          },
        },
      });

      // Если сеток нет, но соревнование в статусе IN_PROGRESS или REGISTRATION, автоматически создаем сетки
      if (brackets.length === 0 && (competition?.status === 'IN_PROGRESS' || competition?.status === 'REGISTRATION')) {
        logger.info(`Сеток не найдено для соревнования ${competitionId} в статусе ${competition?.status}, создаем автоматически`);
        try {
          const result = await this.autoCreateBracketsForCompetition(competitionId);
          if (result.created > 0) {
            logger.info(`Автоматически создано ${result.created} сеток для соревнования ${competitionId}`);
            // Перезагружаем сетки после создания
            brackets = await prisma.bracket.findMany({
              where: { competitionId },
              include: {
                competition: {
                  select: {
                    id: true,
                    name: true,
                    competitionType: true,
                  },
                },
                weightCategory: true,
                matches: {
                  include: {
                    athlete1: {
                      include: {
                        user: {
                          include: { profile: true },
                        },
                        team: {
                          include: {
                            region: true,
                          },
                        },
                      },
                    },
                    athlete2: {
                      include: {
                        user: {
                          include: { profile: true },
                        },
                        team: {
                          include: {
                            region: true,
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
                  orderBy: [
                    { round: 'asc' },
                    { position: 'asc' },
                  ],
                },
              },
            });
          }
        } catch (error: any) {
          logger.warn(`Не удалось автоматически создать сетки при получении: ${error.message}`);
          // Продолжаем выполнение, возвращаем пустой массив
        }
      }

      return brackets;
    } catch (error: any) {
      logger.error('Ошибка при получении сеток', {
        error: error.message,
        competitionId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить сетку по ID
   */
  async getBracketById(id: string) {
    try {
      const bracket = await prisma.bracket.findUnique({
        where: { id },
        include: {
          competition: true,
          weightCategory: true,
          matches: {
            include: {
              athlete1: {
                include: {
                  user: {
                    include: { profile: true },
                  },
                  team: true,
                },
              },
              athlete2: {
                include: {
                  user: {
                    include: { profile: true },
                  },
                  team: true,
                },
              },
              results: true,
            },
            orderBy: [
              { round: 'asc' },
              { position: 'asc' },
            ],
          },
        },
      });

      if (!bracket) {
        logger.warn(`Сетка с ID ${id} не найдена`);
        throw new Error('Сетка не найдена');
      }

      return bracket;
    } catch (error: any) {
      logger.error(`Ошибка при получении сетки ${id}`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Создать турнирную сетку
   */
  async createBracket(dto: CreateBracketDto) {
    try {

      // Проверяем существование соревнования
      const competition = await prisma.competition.findUnique({
        where: { id: dto.competitionId },
      });

      if (!competition) {
        logger.warn(`Попытка создать сетку для несуществующего соревнования: ${dto.competitionId}`);
        throw new Error('Соревнование не найдено');
      }

      // Проверяем весовую категорию
      const weightCategory = await prisma.weightCategory.findUnique({
        where: { id: dto.weightCategoryId },
      });

      if (!weightCategory) {
        logger.warn(`Попытка создать сетку с несуществующей весовой категорией: ${dto.weightCategoryId}`);
        throw new Error('Весовая категория не найдена');
      }

      // Проверяем, что участники зарегистрированы и подтверждены на соревнование
      // В сетки попадают только подтверждённые участники (CONFIRMED)
      const participants = await prisma.competitionParticipant.findMany({
        where: {
          competitionId: dto.competitionId,
          athleteId: { in: dto.participants },
          status: 'CONFIRMED', // Только подтверждённые
        },
      });

      if (participants.length !== dto.participants.length) {
        logger.warn(`Не все участники зарегистрированы для соревнования: ${dto.competitionId}`);
        throw new Error('Не все участники зарегистрированы на соревнование');
      }

      // Фильтруем null и undefined значения из массива participants
      const validParticipants = dto.participants.filter(id => id != null && id !== '');

      if (validParticipants.length === 0) {
        throw new Error('Нет валидных участников для создания сетки');
      }

      // Генерируем структуру сетки
      let bracketData: any;
      let matchesToCreate: any[] = [];

      switch (dto.type) {
        case BracketType.SINGLE_ELIMINATION:
          const singleNodes = BracketGenerator.generateSingleElimination(validParticipants);
          
          // Рекурсивно очищаем узлы от undefined в children перед сохранением
          const cleanedNodes = this.cleanBracketData(singleNodes);
          
          bracketData = { nodes: cleanedNodes };
          
          // Создаем матчи для ВСЕХ узлов (включая пустые для будущих раундов)
          // Это важно для отображения полной структуры сетки с самого начала
          singleNodes.forEach((node, index) => {
            const athlete1Id = node.athlete1Id || null;
            const athlete2Id = node.athlete2Id || null;
            
            // Пропускаем матчи первого раунда, где оба участника пустые (таких не должно быть)
            if (node.round === 1 && !athlete1Id && !athlete2Id) {
              return;
            }
            
            // Если только один участник (BYE) - автоматически завершаем матч
            const isBye = (athlete1Id && !athlete2Id) || (!athlete1Id && athlete2Id);
            const winnerId = isBye ? (athlete1Id || athlete2Id) : null;
            const status = isBye ? MatchStatus.COMPLETED : MatchStatus.SCHEDULED;
            
            matchesToCreate.push({
              round: node.round,
              position: node.position,
              athlete1Id,
              athlete2Id,
              winnerId,
              status,
            });
          });
          break;

        case BracketType.ROUND_ROBIN:
          const roundRobinNodes = BracketGenerator.generateRoundRobin(validParticipants);
          bracketData = { nodes: roundRobinNodes };
          
          roundRobinNodes.forEach((node) => {
            matchesToCreate.push({
              round: node.round,
              position: node.position,
              athlete1Id: node.athlete1Id || null,
              athlete2Id: node.athlete2Id || null,
              status: MatchStatus.SCHEDULED,
            });
          });
          break;

        case BracketType.DOUBLE_ELIMINATION:
          const { upper, lower } = BracketGenerator.generateDoubleElimination(validParticipants);
          bracketData = { upper, lower };
          
          [...upper, ...lower].forEach((node) => {
            if (node.athlete1Id || node.athlete2Id) {
              matchesToCreate.push({
                round: node.round,
                position: node.position,
                athlete1Id: node.athlete1Id || null,
                athlete2Id: node.athlete2Id || null,
                status: MatchStatus.SCHEDULED,
              });
            }
          });
          break;

        default:
          throw new Error('Неподдерживаемый тип сетки');
      }

      // Создаем сетку и матчи в транзакции
      const bracket = await prisma.$transaction(async (tx) => {
        const newBracket = await tx.bracket.create({
          data: {
            competitionId: dto.competitionId,
            weightCategoryId: dto.weightCategoryId,
            type: dto.type,
            data: bracketData,
          },
        });

        // Создаем матчи
        const createdMatches = await Promise.all(
          matchesToCreate.map((matchData) =>
            tx.match.create({
              data: {
                ...matchData,
                bracketId: newBracket.id,
              },
            })
          )
        );

        // Автоматически продвигаем победителей BYE-матчей в следующий раунд
        // Обрабатываем только первый раунд, остальные обработаются автоматически
        for (const match of createdMatches) {
          if (match.round === 1 && match.status === MatchStatus.COMPLETED && match.winnerId) {
            // Находим следующий матч
            const nextRound = match.round + 1;
            const nextPosition = Math.ceil(match.position / 2);
            const isFirstPosition = match.position % 2 === 1;

            const nextMatch = createdMatches.find(
              m => m.round === nextRound && m.position === nextPosition
            );

            if (nextMatch) {
              // Обновляем следующий матч, заполняя пустую позицию
              if (isFirstPosition && !nextMatch.athlete1Id) {
                await tx.match.update({
                  where: { id: nextMatch.id },
                  data: { athlete1Id: match.winnerId },
                });
                nextMatch.athlete1Id = match.winnerId;
              } else if (!isFirstPosition && !nextMatch.athlete2Id) {
                await tx.match.update({
                  where: { id: nextMatch.id },
                  data: { athlete2Id: match.winnerId },
                });
                nextMatch.athlete2Id = match.winnerId;
              }

              // Если в следующем матче теперь тоже BYE, обрабатываем его рекурсивно
              const nextMatchIsBye = (nextMatch.athlete1Id && !nextMatch.athlete2Id) || 
                                     (!nextMatch.athlete1Id && nextMatch.athlete2Id);
              if (nextMatchIsBye) {
                const nextWinnerId = nextMatch.athlete1Id || nextMatch.athlete2Id;
                await tx.match.update({
                  where: { id: nextMatch.id },
                  data: { 
                    winnerId: nextWinnerId,
                    status: MatchStatus.COMPLETED,
                  },
                });
                nextMatch.winnerId = nextWinnerId;
                nextMatch.status = MatchStatus.COMPLETED;

                // Продолжаем продвижение дальше
                const nextNextRound = nextMatch.round + 1;
                const nextNextPosition = Math.ceil(nextMatch.position / 2);
                const nextIsFirstPosition = nextMatch.position % 2 === 1;

                const nextNextMatch = createdMatches.find(
                  m => m.round === nextNextRound && m.position === nextNextPosition
                );

                if (nextNextMatch) {
                  if (nextIsFirstPosition && !nextNextMatch.athlete1Id) {
                    await tx.match.update({
                      where: { id: nextNextMatch.id },
                      data: { athlete1Id: nextWinnerId },
                    });
                  } else if (!nextIsFirstPosition && !nextNextMatch.athlete2Id) {
                    await tx.match.update({
                      where: { id: nextNextMatch.id },
                      data: { athlete2Id: nextWinnerId },
                    });
                  }
                }
              }
            }
          }
        }

        return { bracket: newBracket, matches: createdMatches };
      });

      logger.info(`Создана турнирная сетка: ${bracket.bracket.id}, тип: ${dto.type}, матчей: ${bracket.matches.length}, BYE-матчи обработаны`);

      // Отправляем real-time обновление
      if (global.io) {
        global.io.to(`competition:${dto.competitionId}`).emit('bracket:created', {
          bracket: bracket.bracket,
          matches: bracket.matches,
        });
      }

      return bracket;
    } catch (error: any) {
      logger.error('Ошибка при создании турнирной сетки', {
        error: error.message,
        competitionId: dto.competitionId,
        type: dto.type,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Создать турнирную сетку для командного соревнования
   * Полностью идентично createBracket, только для команд
   */
  async createTeamBracket(dto: CreateTeamBracketDto) {
    try {

      // Проверяем существование соревнования
      const competition = await prisma.competition.findUnique({
        where: { id: dto.competitionId },
      });

      if (!competition) {
        logger.warn(`Попытка создать сетку для несуществующего соревнования: ${dto.competitionId}`);
        throw new Error('Соревнование не найдено');
      }

      if (competition.competitionType !== 'TEAM') {
        throw new Error('Соревнование не является командным');
      }

      // Проверяем, что команды зарегистрированы и подтверждены на соревнование
      // В сетки попадают только подтверждённые команды (CONFIRMED)
      const teamParticipants = await prisma.teamParticipant.findMany({
        where: {
          competitionId: dto.competitionId,
          teamId: { in: dto.teamIds },
          status: 'CONFIRMED', // Только подтверждённые
        },
      });

      if (teamParticipants.length !== dto.teamIds.length) {
        logger.warn(`Не все команды зарегистрированы для соревнования: ${dto.competitionId}`);
        throw new Error('Не все команды зарегистрированы на соревнование');
      }

      // Фильтруем null и undefined значения из массива teamIds
      const validTeamIds = dto.teamIds.filter(id => id != null && id !== '');
      logger.info(`[TEAM BRACKET] Передано ${dto.teamIds.length} команд, валидных: ${validTeamIds.length}`);

      if (validTeamIds.length === 0) {
        throw new Error('Нет валидных команд для создания сетки');
      }

      // Генерируем структуру сетки
      let bracketData: any;
      let matchesToCreate: any[] = [];

      switch (dto.type) {
        case BracketType.SINGLE_ELIMINATION:
          const singleNodes = BracketGenerator.generateSingleElimination(validTeamIds);
          
          // Рекурсивно очищаем узлы от undefined в children перед сохранением
          const cleanedNodes = this.cleanBracketData(singleNodes);
          
          bracketData = { nodes: cleanedNodes };
          
          // Создаем матчи для ВСЕХ узлов (включая пустые для будущих раундов)
          // Это важно для отображения полной структуры сетки с самого начала
          singleNodes.forEach((node) => {
            const team1Id = node.athlete1Id || null;
            const team2Id = node.athlete2Id || null;
            
            // Пропускаем матчи первого раунда, где оба участника пустые (таких не должно быть)
            if (node.round === 1 && !team1Id && !team2Id) {
              return;
            }
            
            // Если только одна команда (BYE) - автоматически завершаем матч
            const isBye = (team1Id && !team2Id) || (!team1Id && team2Id);
            const winnerTeamId = isBye ? (team1Id || team2Id) : null;
            const status = isBye ? MatchStatus.COMPLETED : MatchStatus.SCHEDULED;
            
            matchesToCreate.push({
              round: node.round,
              position: node.position,
              team1Id,
              team2Id,
              winnerTeamId,
              status,
            });
          });
          break;

        case BracketType.ROUND_ROBIN:
          const roundRobinNodes = BracketGenerator.generateRoundRobin(validTeamIds);
          bracketData = { nodes: roundRobinNodes };
          
          roundRobinNodes.forEach((node) => {
            matchesToCreate.push({
              round: node.round,
              position: node.position,
              team1Id: node.athlete1Id || null,
              team2Id: node.athlete2Id || null,
              status: MatchStatus.SCHEDULED,
            });
          });
          break;

        case BracketType.DOUBLE_ELIMINATION:
          const { upper, lower } = BracketGenerator.generateDoubleElimination(validTeamIds);
          bracketData = { upper, lower };
          
          [...upper, ...lower].forEach((node) => {
            if (node.athlete1Id || node.athlete2Id) {
              matchesToCreate.push({
                round: node.round,
                position: node.position,
                team1Id: node.athlete1Id || null,
                team2Id: node.athlete2Id || null,
                status: MatchStatus.SCHEDULED,
              });
            }
          });
          break;

        default:
          throw new Error('Неподдерживаемый тип сетки');
      }

      // Создаем сетку и матчи в транзакции
      const bracket = await prisma.$transaction(async (tx) => {
        const newBracket = await tx.bracket.create({
          data: {
            competitionId: dto.competitionId,
            weightCategoryId: null, // Для командных соревнований нет весовой категории
            type: dto.type,
            data: bracketData,
          },
        });

        // Создаем матчи
        const createdMatches = await Promise.all(
          matchesToCreate.map((matchData) =>
            tx.match.create({
              data: {
                ...matchData,
                bracketId: newBracket.id,
              },
            })
          )
        );

        // Автоматически продвигаем победителей BYE-матчей в следующий раунд
        // Обрабатываем только первый раунд, остальные обработаются автоматически
        for (const match of createdMatches) {
          if (match.round === 1 && match.status === MatchStatus.COMPLETED && match.winnerTeamId) {
            // Находим следующий матч
            const nextRound = match.round + 1;
            const nextPosition = Math.ceil(match.position / 2);
            const isFirstPosition = match.position % 2 === 1;

            const nextMatch = createdMatches.find(
              m => m.round === nextRound && m.position === nextPosition
            );

            if (nextMatch) {
              // Обновляем следующий матч, заполняя пустую позицию
              if (isFirstPosition && !nextMatch.team1Id) {
                await tx.match.update({
                  where: { id: nextMatch.id },
                  data: { team1Id: match.winnerTeamId },
                });
                nextMatch.team1Id = match.winnerTeamId;
              } else if (!isFirstPosition && !nextMatch.team2Id) {
                await tx.match.update({
                  where: { id: nextMatch.id },
                  data: { team2Id: match.winnerTeamId },
                });
                nextMatch.team2Id = match.winnerTeamId;
              }

              // Если в следующем матче теперь тоже BYE, обрабатываем его рекурсивно
              const nextMatchIsBye = (nextMatch.team1Id && !nextMatch.team2Id) || 
                                     (!nextMatch.team1Id && nextMatch.team2Id);
              if (nextMatchIsBye) {
                const nextWinnerTeamId = nextMatch.team1Id || nextMatch.team2Id;
                await tx.match.update({
                  where: { id: nextMatch.id },
                  data: { 
                    winnerTeamId: nextWinnerTeamId,
                    status: MatchStatus.COMPLETED,
                  },
                });
                nextMatch.winnerTeamId = nextWinnerTeamId;
                nextMatch.status = MatchStatus.COMPLETED;

                // Продолжаем продвижение дальше
                const nextNextRound = nextMatch.round + 1;
                const nextNextPosition = Math.ceil(nextMatch.position / 2);
                const nextIsFirstPosition = nextMatch.position % 2 === 1;

                const nextNextMatch = createdMatches.find(
                  m => m.round === nextNextRound && m.position === nextNextPosition
                );

                if (nextNextMatch) {
                  if (nextIsFirstPosition && !nextNextMatch.team1Id) {
                    await tx.match.update({
                      where: { id: nextNextMatch.id },
                      data: { team1Id: nextWinnerTeamId },
                    });
                  } else if (!nextIsFirstPosition && !nextNextMatch.team2Id) {
                    await tx.match.update({
                      where: { id: nextNextMatch.id },
                      data: { team2Id: nextWinnerTeamId },
                    });
                  }
                }
              }
            }
          }
        }

        return { bracket: newBracket, matches: createdMatches };
      });

      logger.info(`Создана турнирная сетка: ${bracket.bracket.id}, тип: ${dto.type}, матчей: ${bracket.matches.length}, BYE-матчи обработаны`);

      // Отправляем real-time обновление
      if (global.io) {
        global.io.to(`competition:${dto.competitionId}`).emit('bracket:created', {
          bracket: bracket.bracket,
          matches: bracket.matches,
        });
      }

      return bracket;
    } catch (error: any) {
      logger.error('Ошибка при создании турнирной сетки', {
        error: error.message,
        competitionId: dto.competitionId,
        type: dto.type,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Автоматически создать сетки для всех весовых категорий соревнования
   */
  async autoCreateBracketsForCompetition(competitionId: string) {
    try {

      // Получаем соревнование
      const competition = await prisma.competition.findUnique({
        where: { id: competitionId },
        include: {
          sport: {
            include: {
              weightCategories: true,
            },
          },
        },
      });

      if (!competition) {
        throw new Error('Соревнование не найдено');
      }

      // Проверяем тип соревнования
      if (competition.competitionType === 'TEAM') {
        // Для командных соревнований
        return await this.autoCreateTeamBracketsForCompetition(competitionId);
      }

      // Для индивидуальных соревнований (существующая логика)
      // Получаем только подтверждённых участников соревнования
      // REGISTERED - не подтверждён (спортсмен зарегистрировался сам, тренер ещё не подтвердил)
      // CONFIRMED - подтверждён (админ создал или тренер подтвердил)
      const participants = await prisma.competitionParticipant.findMany({
        where: {
          competitionId,
          status: 'CONFIRMED', // Только подтверждённые попадают в сетки
        },
        include: {
          athlete: {
            include: {
              weightCategory: true,
              user: {
                include: {
                  profile: true,
                },
              },
            },
          },
        },
      });

      logger.info(`Найдено ${participants.length} подтверждённых участников соревнования ${competitionId} для создания сеток`);

      // Группируем участников по весовым категориям
      const participantsByCategory = new Map<string, string[]>();
      const participantsWithoutCategory: string[] = [];
      
      for (const participant of participants) {
        const weightCategoryId = participant.athlete.weightCategoryId;
        if (!weightCategoryId) {
          const athleteName = participant.athlete.user?.profile 
            ? `${participant.athlete.user.profile.lastName} ${participant.athlete.user.profile.firstName}`
            : participant.athleteId;
          logger.warn(`Участник ${athleteName} (ID: ${participant.athleteId}) не имеет весовой категории, пропускаем`);
          participantsWithoutCategory.push(participant.athleteId);
          continue;
        }

        if (!participantsByCategory.has(weightCategoryId)) {
          participantsByCategory.set(weightCategoryId, []);
        }
        participantsByCategory.get(weightCategoryId)!.push(participant.athleteId);
        
        const athleteName = participant.athlete.user?.profile 
          ? `${participant.athlete.user.profile.lastName} ${participant.athlete.user.profile.firstName}`
          : participant.athleteId;
        const categoryName = participant.athlete.weightCategory?.name || weightCategoryId;
      }

      logger.info(`Участники сгруппированы по ${participantsByCategory.size} весовым категориям`);
      logger.info(`Детали по категориям:`, Array.from(participantsByCategory.entries()).map(([catId, ids]) => ({
        categoryId: catId,
        participantsCount: ids.length,
      })));
      if (participantsWithoutCategory.length > 0) {
        logger.warn(`Пропущено ${participantsWithoutCategory.length} участников без весовой категории`);
      }

      // Удаляем ВСЕ существующие сетки соревнования для полного пересоздания
      // Это гарантирует, что новые участники будут включены в сетки
      const existingBrackets = await prisma.bracket.findMany({
        where: { competitionId },
        include: {
          matches: {
            select: { id: true },
          },
        },
      });

      if (existingBrackets.length > 0) {
        logger.info(`Удаляем ${existingBrackets.length} существующих сеток для полного пересоздания`);
        
        for (const bracket of existingBrackets) {
          try {
            // Удаляем все матчи сетки
            await prisma.match.deleteMany({
              where: { bracketId: bracket.id },
            });
            // Удаляем саму сетку
            await prisma.bracket.delete({
              where: { id: bracket.id },
            });
          } catch (error: any) {
            logger.warn(`Ошибка при удалении сетки ${bracket.id}: ${error.message}`);
          }
        }
        
        logger.info(`Все существующие сетки удалены, начинаем создание новых с учетом всех участников`);
      }

      // Создаем новые сетки для каждой категории с учетом ВСЕХ участников
      const createdBrackets = [];
      const errors = [];

      for (const [weightCategoryId, athleteIds] of participantsByCategory.entries()) {
        // Создаем сетку даже для 1 участника (будет заполнена пустыми слотами)
        if (athleteIds.length === 0) {
          continue;
        }

        try {
          // Проверяем, что весовая категория принадлежит виду спорта соревнования
          const weightCategory = competition.sport.weightCategories.find(
            wc => wc.id === weightCategoryId
          );

          if (!weightCategory) {
            logger.warn(`Весовая категория ${weightCategoryId} не принадлежит виду спорта ${competition.sportId}`);
            continue;
          }

          logger.info(`Создаем сетку для весовой категории "${weightCategory.name}" (${weightCategoryId}): ${athleteIds.length} участников`);

          // Создаем сетку для этой категории
          const bracketResult = await this.createBracket({
            competitionId,
            weightCategoryId,
            type: BracketType.SINGLE_ELIMINATION,
            participants: athleteIds,
          });

          createdBrackets.push(bracketResult.bracket);
          logger.info(`✓ Создана сетка для весовой категории "${weightCategory.name}": ${athleteIds.length} участников, ID сетки: ${bracketResult.bracket.id}`);
        } catch (error: any) {
          logger.error(`Ошибка при создании сетки для категории ${weightCategoryId}`, {
            error: error.message,
            weightCategoryId,
            participantsCount: athleteIds.length,
            stack: error.stack,
          });
          errors.push({
            weightCategoryId,
            error: error.message,
          });
          // Продолжаем создание сеток для других категорий, даже если одна не создалась
        }
      }

      logger.info(`✓ Автоматически создано ${createdBrackets.length} сеток для соревнования ${competitionId}`);
      
      if (errors.length > 0) {
        logger.warn(`⚠ При создании сеток возникло ${errors.length} ошибок:`, errors);
      }
      
      // Логируем итоговую статистику
      const totalParticipants = Array.from(participantsByCategory.values()).reduce((sum, ids) => sum + ids.length, 0);
      logger.info(`[ИТОГ] Создано ${createdBrackets.length} сеток для ${totalParticipants} участников в ${participantsByCategory.size} весовых категориях`);

      return {
        created: createdBrackets.length,
        updated: 0, // Всегда 0, так как мы удаляем и создаем заново
        brackets: createdBrackets,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      logger.error('Ошибка при автоматическом создании сеток', {
        error: error.message,
        competitionId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Автоматически создать сетки для командного соревнования
   */
  async autoCreateTeamBracketsForCompetition(competitionId: string) {
    try {

      // Получаем соревнование
      const competition = await prisma.competition.findUnique({
        where: { id: competitionId },
        include: {
          sport: true,
        },
      });

      if (!competition) {
        throw new Error('Соревнование не найдено');
      }

      // Получаем только подтверждённых участников-команд
      const teamParticipants = await prisma.teamParticipant.findMany({
        where: {
          competitionId,
          status: 'CONFIRMED',
        },
        include: {
          team: true,
        },
      });
      
      logger.info(`Найдено ${teamParticipants.length} подтверждённых команд для соревнования ${competitionId}`);

      if (teamParticipants.length === 0) {
        logger.warn(`Нет команд-участников для соревнования ${competitionId}`);
        return {
          created: 0,
          updated: 0,
          brackets: [],
        };
      }

      // Удаляем ВСЕ существующие сетки соревнования
      const existingBrackets = await prisma.bracket.findMany({
        where: { competitionId },
        include: {
          matches: {
            select: { id: true },
          },
        },
      });

      if (existingBrackets.length > 0) {
        logger.info(`Удаляем ${existingBrackets.length} существующих сеток для полного пересоздания`);
        
        for (const bracket of existingBrackets) {
          try {
            await prisma.match.deleteMany({
              where: { bracketId: bracket.id },
            });
            await prisma.bracket.delete({
              where: { id: bracket.id },
            });
          } catch (error: any) {
            logger.warn(`Ошибка при удалении сетки ${bracket.id}: ${error.message}`);
          }
        }
      }

      // Создаем одну общую сетку для всех команд (без весовой категории)
      // Фильтруем null и undefined значения
      const allTeamIds = teamParticipants.map(tp => tp.teamId);
      const teamIds = allTeamIds.filter(id => id != null && id !== '');
      
      logger.info(`Создаем сетку для ${teamIds.length} команд (из ${teamParticipants.length} участников)`);
      
      if (teamIds.length === 0) {
        logger.warn(`Нет валидных команд для создания сетки`);
        return {
          created: 0,
          updated: 0,
          brackets: [],
        };
      }

      // Создаем сетку без весовой категории
      const bracketResult = await this.createTeamBracket({
        competitionId,
        type: BracketType.SINGLE_ELIMINATION,
        teamIds,
      });

      logger.info(`✓ Создана сетка для командного соревнования: ${teamIds.length} команд, ID сетки: ${bracketResult.bracket.id}`);

      return {
        created: 1,
        updated: 0,
        brackets: [bracketResult.bracket],
      };
    } catch (error: any) {
      logger.error('Ошибка при автоматическом создании сеток для командного соревнования', {
        error: error.message,
        competitionId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Обновить результат матча (сохраняет как pending, требует подтверждения)
   */
  async updateMatchResult(
    bracketId: string,
    matchId: string,
    dto: UpdateMatchResultDto,
    userRole?: string
  ) {
    try {

      // Проверяем существование матча
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          bracket: true,
        },
      });

      if (!match || match.bracketId !== bracketId) {
        logger.warn(`Матч ${matchId} не найден или не принадлежит сетке ${bracketId}`);
        throw new Error('Матч не найден');
      }

      // Получаем текущие metadata или создаем пустой объект
      const currentMetadata = (match.metadata as any) || {};

      // Определяем тип матча: командный или индивидуальный
      const isTeamMatch = !!(match.team1Id || match.team2Id);
      const winnerId = dto.winnerId || dto.winnerTeamId;
      
      // Если матч завершен, сохраняем результат
      // Для админов и модераторов сохраняем напрямую, для судей - как pending
      if (dto.status === MatchStatus.COMPLETED && winnerId) {
        // Для админов и модераторов сохраняем winnerId напрямую
        // Для судей сохраняем как pending
        const isAdminOrModerator = userRole === 'ADMIN' || userRole === 'MODERATOR';
        
        const updateData: any = {
          status: dto.status,
        };
        
        if (isAdminOrModerator) {
          // Для админов сохраняем winnerId/winnerTeamId напрямую
          if (isTeamMatch) {
            updateData.winnerTeamId = dto.winnerTeamId || winnerId;
          } else {
            updateData.winnerId = dto.winnerId || winnerId;
          }
          updateData.score = dto.score;
          updateData.metadata = {
            ...currentMetadata,
            pendingResult: {
              winnerId: dto.winnerId,
              winnerTeamId: dto.winnerTeamId,
              score: dto.score,
              savedAt: new Date().toISOString(),
            },
            isPending: false,
            isConfirmed: true,
          };
        } else {
          // Для судей сохраняем как pending (без winnerId/winnerTeamId в основном поле)
          updateData.metadata = {
            ...currentMetadata,
            pendingResult: {
              winnerId: dto.winnerId,
              winnerTeamId: dto.winnerTeamId,
              score: dto.score,
              savedAt: new Date().toISOString(),
            },
            isPending: true,
            isConfirmed: false,
          };
        }
        
        const updatedMatch = await prisma.match.update({
          where: { id: matchId },
          data: updateData,
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
            team1: true,
            team2: true,
            bracket: {
              include: {
                competition: {
                  select: {
                    competitionType: true,
                  },
                },
              },
            },
          },
        });

        logger.info(`Результат матча сохранен: ${matchId}, победитель: ${winnerId}, тип: ${isTeamMatch ? 'командный' : 'индивидуальный'}, для админа: ${isAdminOrModerator}`);

        // Для админов и модераторов сразу обновляем следующий раунд и сохраняем результаты
        if (isAdminOrModerator && winnerId) {
          await this.updateNextMatch(bracketId, updatedMatch.round, updatedMatch.position, winnerId, isTeamMatch);
          
          // Для индивидуальных соревнований сохраняем результаты спортсменов
          if (!isTeamMatch) {
            // Загружаем полную информацию о сетке для определения мест
            const bracket = await prisma.bracket.findUnique({
              where: { id: bracketId },
              include: {
                matches: {
                  orderBy: [
                    { round: 'asc' },
                    { position: 'asc' },
                  ],
                },
              },
            });
            
            if (bracket) {
              // Используем обновленный матч, который уже содержит athlete1Id и athlete2Id
              const matchWithIds = updatedMatch;
              
              logger.info(`Попытка сохранить результаты для матча ${matchId}`, {
                matchId,
                athlete1Id: matchWithIds.athlete1Id,
                athlete2Id: matchWithIds.athlete2Id,
                winnerId: dto.winnerId,
                round: matchWithIds.round,
                position: matchWithIds.position,
              });
              
              if (matchWithIds.athlete1Id && matchWithIds.athlete2Id) {
                // Автоматически определяем места и сохраняем очки за схватку
                try {
                  await this.updatePositionsAndScores(bracket, matchWithIds, {
                    winnerId: dto.winnerId,
                    score: dto.score,
                    status: dto.status,
                  });
                  logger.info(`Результаты успешно сохранены для матча ${matchId}: победитель ${dto.winnerId}`);
                } catch (error: any) {
                  logger.error(`Ошибка при сохранении результатов для матча ${matchId}:`, {
                    error: error.message,
                    stack: error.stack,
                  });
                  // Не прерываем выполнение, но логируем ошибку
                }
              } else {
                logger.warn(`Не удалось сохранить результаты: матч ${matchId} не содержит athlete1Id или athlete2Id`, {
                  matchId,
                  athlete1Id: matchWithIds.athlete1Id,
                  athlete2Id: matchWithIds.athlete2Id,
                });
              }
            } else {
              logger.warn(`Не удалось загрузить сетку ${bracketId} для сохранения результатов`);
            }
          }
          // Для командных соревнований места присуждаются командам, но не сохраняются в Result
          // (можно добавить отдельную таблицу TeamResult в будущем, если потребуется)
        }

        // Отправляем real-time обновление
        if (global.io) {
          global.io.to(`competition:${match.bracket.competitionId}`).emit('match:update', {
            match: updatedMatch,
            bracketId,
          });
        }

        return updatedMatch;
      } else {
        // Для других статусов обновляем напрямую
        const updateData: any = {
          status: dto.status,
        };
        
        // Обновляем winnerId только если он указан
        if (dto.winnerId !== undefined && dto.winnerId !== null) {
          updateData.winnerId = dto.winnerId;
        }
        
        // Обновляем score только если он указан
        if (dto.score !== undefined) {
          updateData.score = dto.score;
        }
        
        
        const updatedMatch = await prisma.match.update({
          where: { id: matchId },
          data: updateData,
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
          },
        });

        logger.info(`Результат матча обновлен: ${matchId}`);

        // Отправляем real-time обновление
        if (global.io) {
          global.io.to(`competition:${match.bracket.competitionId}`).emit('match:update', {
            match: updatedMatch,
            bracketId,
          });
        }

        return updatedMatch;
      }
    } catch (error: any) {
      logger.error('Ошибка при обновлении результата матча', {
        error: error.message,
        bracketId,
        matchId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Одобрить и финализировать результат матча (после подтверждения)
   */
  async approveMatchResult(
    bracketId: string,
    matchId: string,
    judgeId: string
  ) {
    try {

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          bracket: true,
        },
      });

      if (!match || match.bracketId !== bracketId) {
        throw new Error('Матч не найден');
      }

      const metadata = (match.metadata as any) || {};
      const pendingResult = metadata.pendingResult;

      if (!pendingResult || !metadata.isPending) {
        throw new Error('Нет ожидающих подтверждения результатов для этого матча');
      }

      // Определяем тип матча: командный или индивидуальный
      const isTeamMatch = !!(match.team1Id || match.team2Id);
      const winnerId = pendingResult.winnerId || pendingResult.winnerTeamId;

      // Финализируем результат: применяем pending данные к основным полям
      const updateData: any = {
        score: pendingResult.score,
        metadata: {
          ...metadata,
          isPending: false,
          isConfirmed: true,
          approvedAt: new Date().toISOString(),
          approvedBy: judgeId,
        },
      };

      if (isTeamMatch) {
        updateData.winnerTeamId = pendingResult.winnerTeamId || winnerId;
      } else {
        updateData.winnerId = pendingResult.winnerId || winnerId;
      }

      const updatedMatch = await prisma.match.update({
        where: { id: matchId },
        data: updateData,
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
          team1: true,
          team2: true,
          bracket: {
            include: {
              competition: {
                select: {
                  competitionType: true,
                },
              },
            },
          },
        },
      });

      // Теперь обновляем структуру сетки и определяем места (финализация)
      const bracket = await prisma.bracket.findUnique({
        where: { id: bracketId },
        include: {
          matches: {
            orderBy: [
              { round: 'desc' },
              { position: 'asc' },
            ],
          },
        },
      });

      if (bracket && winnerId) {
        // Обновляем JSON структуру сетки
        const bracketData = bracket.data as any;
        const updatedData = BracketGenerator.updateBracketAfterMatch(
          bracketData.nodes || bracketData.upper || [],
          matchId,
          winnerId
        );

        await prisma.bracket.update({
          where: { id: bracketId },
          data: {
            data: {
              ...bracketData,
              nodes: updatedData,
            },
          },
        });

        // Определяем следующий матч и обновляем его участников
        await this.updateNextMatch(bracketId, match.round, match.position, winnerId, isTeamMatch);

        // Для индивидуальных соревнований автоматически определяем места и сохраняем очки за схватку
        if (!isTeamMatch) {
          await this.updatePositionsAndScores(bracket, updatedMatch, {
            winnerId: pendingResult.winnerId || winnerId,
            score: pendingResult.score,
            status: MatchStatus.COMPLETED,
          });
        }
        // Для командных соревнований места присуждаются командам, но не сохраняются в Result
      }

      logger.info(`Результат матча одобрен и финализирован: ${matchId}, победитель: ${isTeamMatch ? pendingResult.winnerTeamId : pendingResult.winnerId}`);

      // Отправляем real-time обновление
      if (global.io) {
        global.io.to(`competition:${match.bracket.competitionId}`).emit('match:approved', {
          match: updatedMatch,
          bracketId,
        });
      }

      return updatedMatch;
    } catch (error: any) {
      logger.error('Ошибка при одобрении результата матча', {
        error: error.message,
        bracketId,
        matchId,
        judgeId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Обновить следующий матч после завершения текущего
   */
  private async updateNextMatch(
    bracketId: string,
    currentRound: number,
    currentPosition: number,
    winnerId: string,
    isTeamMatch: boolean = false
  ) {
    try {
      // Находим следующий матч в следующем раунде
      const nextRound = currentRound + 1;
      const nextPosition = Math.ceil(currentPosition / 2);

      const nextMatch = await prisma.match.findFirst({
        where: {
          bracketId,
          round: nextRound,
          position: nextPosition,
        },
      });

      if (nextMatch) {
        // Определяем, в какую позицию ставить победителя
        // Матч с нечетной позицией (1, 3, 5...) идет в первую позицию следующего матча
        // Матч с четной позицией (2, 4, 6...) идет во вторую позицию следующего матча
        const isFirstPosition = currentPosition % 2 === 1;

        // Обновляем только пустую позицию, не перезаписываем уже заполненную
        const updateData: any = {};
        if (isTeamMatch) {
          // Для командных матчей обновляем team1Id/team2Id
          if (isFirstPosition) {
            if (!nextMatch.team1Id) {
              updateData.team1Id = winnerId;
            }
          } else {
            if (!nextMatch.team2Id) {
              updateData.team2Id = winnerId;
            }
          }
        } else {
          // Для индивидуальных матчей обновляем athlete1Id/athlete2Id
          if (isFirstPosition) {
            if (!nextMatch.athlete1Id) {
              updateData.athlete1Id = winnerId;
            }
          } else {
            if (!nextMatch.athlete2Id) {
              updateData.athlete2Id = winnerId;
            }
          }
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.match.update({
            where: { id: nextMatch.id },
            data: updateData,
          });

        }
      }
    } catch (error: any) {
      logger.error('Ошибка при обновлении следующего матча', {
        error: error.message,
        bracketId,
        currentRound,
        stack: error.stack,
      });
    }
  }

  /**
   * Автоматически определить места и сохранить очки за схватку
   */
  private async updatePositionsAndScores(
    bracket: any,
    match: any,
    dto: UpdateMatchResultDto
  ) {
    try {
      logger.info(`updatePositionsAndScores вызван для матча ${match.id}`, {
        athlete1Id: match.athlete1Id,
        athlete2Id: match.athlete2Id,
        winnerId: dto.winnerId,
        round: match.round,
        position: match.position,
      });
      
      if (!match.athlete1Id || !match.athlete2Id || !dto.winnerId) {
        logger.warn(`Пропуск updatePositionsAndScores: нет athlete1Id, athlete2Id или winnerId`, {
          athlete1Id: match.athlete1Id,
          athlete2Id: match.athlete2Id,
          winnerId: dto.winnerId,
        });
        return; // Пропускаем, если нет обоих участников
      }

      const winnerId = dto.winnerId;
      const loserId = match.athlete1Id === winnerId ? match.athlete2Id : match.athlete1Id;

      // Определяем максимальный раунд в сетке
      const maxRound = Math.max(...bracket.matches.map((m: any) => m.round));

      // Определяем место проигравшего в зависимости от раунда и позиции
      let position: number | null = null;
      if (match.round === maxRound) {
        // Финал: победитель = 1, проигравший = 2
        position = 2;
      } else {
        // Для всех остальных раундов: определяем по формуле
        const roundsFromFinal = maxRound - match.round;
        const startPosition = Math.pow(2, roundsFromFinal) + 1;
        // Учитываем позицию матча для более точного определения места
        // Например, для полуфиналов: позиция 1 → место 3, позиция 2 → место 4
        const positionOffset = match.position - 1;
        position = startPosition + positionOffset;
      }

      // Сохраняем очки за схватку для обоих участников
      // Определяем очки победителя и проигравшего
      let winnerScore: number | null = null;
      let loserScore: number | null = null;
      
      if (dto.score) {
        if (match.athlete1Id === winnerId) {
          winnerScore = dto.score.athlete1 !== undefined ? dto.score.athlete1 : null;
          loserScore = dto.score.athlete2 !== undefined ? dto.score.athlete2 : null;
        } else {
          winnerScore = dto.score.athlete2 !== undefined ? dto.score.athlete2 : null;
          loserScore = dto.score.athlete1 !== undefined ? dto.score.athlete1 : null;
        }
      }
      
      // Определяем финальные значения очков (для использования в создании результатов)
      // Если очки не указаны, используем null (не 0, чтобы различать "не указано" и "0 очков")
      const finalWinnerScore = winnerScore !== null && winnerScore !== undefined ? winnerScore : null;
      const finalLoserScore = loserScore !== null && loserScore !== undefined ? loserScore : null;
      
      // Всегда создаем/обновляем результат для победителя (даже если очки не указаны)
      // Это нужно для отслеживания участия в матче
      const winnerResult = await prisma.result.findFirst({
        where: {
          matchId: match.id,
          athleteId: winnerId,
        },
      });

      const winnerDetails: any = {
        round: match.round,
      };
      
      if (finalLoserScore !== null) {
        winnerDetails.opponentScore = finalLoserScore;
      }

      if (winnerResult) {
        await prisma.result.update({
          where: { id: winnerResult.id },
          data: {
            points: finalWinnerScore,
            details: Object.keys(winnerDetails).length > 0 ? winnerDetails : null,
          },
        });
      } else {
        await prisma.result.create({
          data: {
            matchId: match.id,
            athleteId: winnerId,
            points: finalWinnerScore,
            details: Object.keys(winnerDetails).length > 0 ? winnerDetails : null,
          },
        });
      }

      // Создаем/обновляем результат для проигравшего (очки за схватку + место)
      const loserResult = await prisma.result.findFirst({
        where: {
          matchId: match.id,
          athleteId: loserId,
        },
      });

      const loserDetails: any = {
        round: match.round,
      };
      
      if (finalWinnerScore !== null) {
        loserDetails.opponentScore = finalWinnerScore;
      }

      if (loserResult) {
        await prisma.result.update({
          where: { id: loserResult.id },
          data: {
            points: finalLoserScore,
            position: position,
            details: Object.keys(loserDetails).length > 0 ? loserDetails : null,
          },
        });
      } else {
        await prisma.result.create({
          data: {
            matchId: match.id,
            athleteId: loserId,
            points: finalLoserScore,
            position: position,
            details: Object.keys(loserDetails).length > 0 ? loserDetails : null,
          },
        });
      }

      // Если это финал, определяем 1 место для победителя
      // (результат уже создан выше, просто обновляем место)
      if (match.round === maxRound) {
        const winnerResult = await prisma.result.findFirst({
          where: {
            matchId: match.id,
            athleteId: winnerId,
          },
        });

        if (winnerResult) {
          // Обновляем место, сохраняя очки если они есть
          await prisma.result.update({
            where: { id: winnerResult.id },
            data: { position: 1 },
          });
        } else {
          // Если результат почему-то не создан, создаем его
          const winnerDetails: any = {
            round: match.round,
          };
          
          if (finalLoserScore !== null) {
            winnerDetails.opponentScore = finalLoserScore;
          }
          
          await prisma.result.create({
            data: {
              matchId: match.id,
              athleteId: winnerId,
              position: 1,
              points: finalWinnerScore,
              details: Object.keys(winnerDetails).length > 0 ? winnerDetails : null,
            },
          });
        }
      }

      logger.info(`Определены места для матча ${match.id}: победитель = ${winnerId}, проигравший = ${loserId}, место проигравшего = ${position}, очки победителя = ${finalWinnerScore}, очки проигравшего = ${finalLoserScore}`);
    } catch (error: any) {
      logger.error('Ошибка при определении мест и сохранении очков', {
        error: error.message,
        matchId: match.id,
        bracketId: bracket?.id,
        stack: error.stack,
      });
      // Не бросаем ошибку, чтобы не прервать обновление матча
      // Ошибка будет обработана в вызывающем коде
    }
  }

  /**
   * Получить матчи сетки
   */
  async getBracketMatches(bracketId: string, round?: number) {
    try {
      const where: any = { bracketId };
      if (round !== undefined) {
        where.round = round;
      }

      const matches = await prisma.match.findMany({
        where,
        include: {
          athlete1: {
            include: {
              user: {
                include: { profile: true },
              },
              team: true,
            },
          },
          athlete2: {
            include: {
              user: {
                include: { profile: true },
              },
              team: true,
            },
          },
          results: true,
          bracket: {
            include: {
              weightCategory: true,
              competition: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [
          { round: 'asc' },
          { position: 'asc' },
        ],
      });

      return matches;
    } catch (error: any) {
      logger.error('Ошибка при получении матчей сетки', {
        error: error.message,
        bracketId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Создать матч вручную
   */
  async createMatch(bracketId: string, dto: { round: number; position: number; athlete1Id?: string; athlete2Id?: string; scheduledTime?: Date }) {
    try {

      // Проверяем существование сетки
      const bracket = await prisma.bracket.findUnique({
        where: { id: bracketId },
      });

      if (!bracket) {
        throw new Error('Сетка не найдена');
      }

      // Проверяем, что участники зарегистрированы и подтверждены на соревнование
      if (dto.athlete1Id) {
        const participant1 = await prisma.competitionParticipant.findFirst({
          where: {
            competitionId: bracket.competitionId,
            athleteId: dto.athlete1Id,
            status: 'CONFIRMED', // Только подтверждённые
          },
        });

        if (!participant1) {
          throw new Error('Первый участник не подтверждён на соревновании');
        }
      }

      if (dto.athlete2Id) {
        const participant2 = await prisma.competitionParticipant.findFirst({
          where: {
            competitionId: bracket.competitionId,
            athleteId: dto.athlete2Id,
            status: 'CONFIRMED', // Только подтверждённые
          },
        });

        if (!participant2) {
          throw new Error('Второй участник не зарегистрирован на соревнование');
        }
      }

      // Проверяем, нет ли уже матча с такими параметрами
      const existingMatch = await prisma.match.findFirst({
        where: {
          bracketId,
          round: dto.round,
          position: dto.position,
        },
      });

      if (existingMatch) {
        throw new Error('Матч с такими параметрами уже существует');
      }

      // Создаем матч
      const match = await prisma.match.create({
        data: {
          bracketId,
          round: dto.round,
          position: dto.position,
          athlete1Id: dto.athlete1Id || null,
          athlete2Id: dto.athlete2Id || null,
          status: MatchStatus.SCHEDULED,
          scheduledTime: dto.scheduledTime || null,
        },
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
        },
      });

      logger.info(`Создан матч: ${match.id} в сетке ${bracketId}`);

      // Отправляем real-time обновление
      if (global.io) {
        global.io.to(`competition:${bracket.competitionId}`).emit('match:created', {
          match,
          bracketId,
        });
      }

      return match;
    } catch (error: any) {
      logger.error('Ошибка при создании матча', {
        error: error.message,
        bracketId,
        round: dto.round,
        position: dto.position,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Подтвердить результат матча (для важных решений)
   */
  async confirmMatchResult(bracketId: string, matchId: string, judgeId: string, notes?: string) {
    try {

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          bracket: true,
        },
      });

      if (!match) {
        throw new Error('Матч не найден');
      }

      if (match.bracketId !== bracketId) {
        throw new Error('Матч не принадлежит указанной сетке');
      }

      if (match.status !== 'COMPLETED') {
        throw new Error('Можно подтверждать только завершенные матчи');
      }

      // Проверяем, является ли пользователь судьей этого соревнования
      const competition = await prisma.competition.findUnique({
        where: { id: match.bracket.competitionId },
        include: {
          judges: {
            where: { userId: judgeId },
          },
        },
      });

      if (!competition || competition.judges.length === 0) {
        throw new Error('Вы не являетесь судьей этого соревнования');
      }

      // Добавляем подтверждение в metadata матча
      const currentMetadata = (match.metadata as any) || {};
      const confirmations = currentMetadata.confirmations || [];
      
      // Проверяем, не подтверждал ли этот судья уже результат
      const alreadyConfirmed = confirmations.some((c: any) => c.judgeId === judgeId);
      if (alreadyConfirmed) {
        throw new Error('Вы уже подтвердили результат этого матча');
      }

      confirmations.push({
        judgeId,
        confirmedAt: new Date().toISOString(),
        notes,
      });

      const updatedMatch = await prisma.match.update({
        where: { id: matchId },
        data: {
          metadata: {
            ...currentMetadata,
            confirmations,
            isConfirmed: true,
          },
        },
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
        },
      });

      logger.info(`Результат матча ${matchId} подтвержден судьей ${judgeId}`);

      // Отправляем real-time обновление
      if (global.io) {
        global.io.to(`competition:${match.bracket.competitionId}`).emit('match:confirmed', {
          matchId,
          bracketId,
          judgeId,
        });
      }

      return updatedMatch;
    } catch (error: any) {
      logger.error('Ошибка при подтверждении результата матча', {
        error: error.message,
        matchId,
        judgeId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить матчи, требующие подтверждения (pending results)
   */
  async getMatchesRequiringConfirmation(competitionId: string) {
    try {

      const brackets = await prisma.bracket.findMany({
        where: { competitionId },
        include: {
          weightCategory: true,
          matches: {
            where: {
              status: 'COMPLETED',
            },
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
      });

      // Фильтруем только те матчи, которые имеют pending результаты (ожидают подтверждения)
      const matchesRequiringConfirmation = brackets.flatMap(bracket => 
        bracket.matches.filter(match => {
          const metadata = (match.metadata as any) || {};
          // Возвращаем матчи с pending результатами (isPending: true)
          return metadata.isPending === true && !metadata.isConfirmed;
        }).map(match => {
          const metadata = (match.metadata as any) || {};
          const pendingResult = metadata.pendingResult || {};
          
          // Возвращаем матч с данными из pendingResult для отображения
          return {
            ...match,
            // Временно используем pending данные для отображения
            winnerId: pendingResult.winnerId || match.winnerId,
            winnerTeamId: pendingResult.winnerTeamId || match.winnerTeamId,
            score: pendingResult.score || match.score,
            bracket: {
              id: bracket.id,
              type: bracket.type,
              weightCategory: bracket.weightCategory,
            },
            // Сохраняем информацию о pending статусе
            isPending: true,
            pendingResult: pendingResult,
          };
        })
      );

      return matchesRequiringConfirmation;
    } catch (error: any) {
      logger.error('Ошибка при получении матчей, требующих подтверждения', {
        error: error.message,
        competitionId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить матч по ID
   */
  async getMatchById(matchId: string) {
    try {

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          athlete1: {
            include: {
              user: {
                include: { profile: true },
              },
              team: {
                include: {
                  region: true,
                },
              },
              sportsRank: true,
            },
          },
          athlete2: {
            include: {
              user: {
                include: { profile: true },
              },
              team: {
                include: {
                  region: true,
                },
              },
              sportsRank: true,
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
          bracket: {
            include: {
              weightCategory: true,
              competition: {
                select: {
                  id: true,
                  name: true,
                  iconUrl: true,
                  competitionType: true,
                },
              },
            },
          },
        },
      });

      if (!match) {
        throw new Error('Матч не найден');
      }

      return match;
    } catch (error: any) {
      logger.error('Ошибка при получении матча', {
        error: error.message,
        matchId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Обновить матч (включая расписание)
   */
  async updateMatch(matchId: string, dto: UpdateMatchDto) {
    try {

      // Проверяем существование матча
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          bracket: {
            include: {
              competition: true,
            },
          },
        },
      });

      if (!match) {
        logger.warn(`Матч ${matchId} не найден`);
        throw new Error('Матч не найден');
      }

      // Обновляем матч
      const updateData: any = {};
      
      if (dto.scheduledTime !== undefined) {
        updateData.scheduledTime = dto.scheduledTime ? new Date(dto.scheduledTime) : null;
      }
      
      if (dto.athlete1Id !== undefined) {
        updateData.athlete1Id = dto.athlete1Id || null;
      }
      
      if (dto.athlete2Id !== undefined) {
        updateData.athlete2Id = dto.athlete2Id || null;
      }
      
      if (dto.status !== undefined) {
        updateData.status = dto.status;
      }

      const updatedMatch = await prisma.match.update({
        where: { id: matchId },
        data: updateData,
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
          bracket: {
            include: {
              weightCategory: true,
              competition: true,
            },
          },
        },
      });

      logger.info(`Матч ${matchId} обновлен`);

      // Отправляем real-time обновление
      if (global.io) {
        global.io.to(`competition:${match.bracket.competitionId}`).emit('match:updated', {
          match: updatedMatch,
        });
      }

      return updatedMatch;
    } catch (error: any) {
      logger.error('Ошибка при обновлении матча', {
        error: error.message,
        matchId,
        stack: error.stack,
      });
      throw error;
    }
  }
}


