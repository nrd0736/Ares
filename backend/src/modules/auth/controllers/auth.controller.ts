/**
 * Контроллер аутентификации и управления пользователями
 * 
 * Функциональность:
 * - login() - вход в систему (возврат JWT токена)
 * - register() - регистрация нового пользователя
 * - createInvitation() - создание приглашения для регистрации
 * - registerByInvitation() - регистрация по токену приглашения
 * - getMe() - получение данных текущего пользователя
 * - getMyMatches() - история поединков (для спортсменов)
 * - getMyCompetitions() - соревнования пользователя
 * - getCoaches() - публичный список всех тренеров
 * - getAllInvitations() - список всех приглашений
 * - deleteInvitation() - удаление приглашения
 * 
 * Используется сервисами:
 * - AuthService - основная бизнес-логика аутентификации
 * - CompetitionsService - получение данных о соревнованиях
 */

import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { CompetitionsService } from '../../competitions/services/competitions.service';
import { AuthRequest } from '../../../middleware/auth';
import prisma from '../../../utils/database';

const authService = new AuthService();
const competitionsService = new CompetitionsService();

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const result = await authService.login(req.body);
      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error.message || 'Login failed',
      });
    }
  }

  async register(req: Request, res: Response) {
    try {
      const result = await authService.register(req.body);
      
      // Если требуется подтверждение, не возвращаем токен
      if (result.requiresApproval) {
        return res.status(201).json({
          success: true,
          data: result,
        });
      }
      
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Registration failed',
      });
    }
  }

  async createInvitation(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const result = await authService.createInvitation(req.body, req.user.id);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create invitation',
      });
    }
  }

  async registerByInvitation(req: Request, res: Response) {
    try {
      const { token, password, ...profileData } = req.body;
      const result = await authService.registerByInvitation(token, password, profileData);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Registration failed',
      });
    }
  }

  async getMe(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Получаем полную информацию о пользователе из БД с профилем и связанными данными
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { 
          profile: true,
          moderator: true,
          athlete: {
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
              coach: {
                include: {
                  user: {
                    include: {
                      profile: true,
                    },
                  },
                },
              },
              weightCategory: true,
              sportsRank: true,
              educationalOrganization: true,
            },
          },
          coach: {
            include: {
              team: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      res.json({
        success: true,
        data: {
          user,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get user info',
      });
    }
  }

  /**
   * Получить список тренеров для выбора при регистрации спортсмена
   */
  async getCoaches(req: Request, res: Response) {
    try {
      const coaches = await prisma.coach.findMany({
        include: {
          user: {
            include: {
              profile: true,
            },
          },
          team: {
            include: {
              region: true,
            },
          },
        },
        orderBy: {
          user: {
            profile: {
              lastName: 'asc',
            },
          },
        },
      });

      // Возвращаем полную структуру для совместимости с фронтендом
      const coachesList = coaches
        .filter((coach) => coach.user && coach.user.profile && coach.team)
        .map((coach) => ({
          id: coach.id,
          userId: coach.userId,
          user: {
            id: coach.user.id,
            email: coach.user.email,
            profile: {
              firstName: coach.user.profile.firstName,
              lastName: coach.user.profile.lastName,
              middleName: coach.user.profile.middleName,
              phone: coach.user.profile.phone,
            },
          },
          team: {
            id: coach.team.id,
            name: coach.team.name,
            region: coach.team.region ? {
              id: coach.team.region.id,
              name: coach.team.region.name,
            } : null,
          },
        }));

      res.json({
        success: true,
        data: { coaches: coachesList },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get coaches',
      });
    }
  }

  /**
   * Получить список всех приглашений
   */
  async getAllInvitations(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Только администраторы и модераторы могут видеть все приглашения
      // Остальные видят только свои
      const createdBy = (req.user.role === 'ADMIN' || req.user.role === 'MODERATOR') ? undefined : req.user.id;

      const invitations = await authService.getAllInvitations(createdBy);

      res.json({
        success: true,
        data: { invitations },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to get invitations',
      });
    }
  }

  /**
   * Удалить приглашение
   */
  async deleteInvitation(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const { id } = req.params;
      const result = await authService.deleteInvitation(id, req.user.id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to delete invitation',
      });
    }
  }

  /**
   * Получить историю схваток текущего спортсмена
   */
  async getMyMatches(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Получаем спортсмена текущего пользователя
      const athlete = await prisma.athlete.findUnique({
        where: { userId: req.user.id },
      });

      if (!athlete) {
        return res.status(404).json({
          success: false,
          message: 'Спортсмен не найден',
        });
      }

      // Получаем все матчи, где спортсмен участвовал (как athlete1 или athlete2)
      const matches = await prisma.match.findMany({
        where: {
          OR: [
            { athlete1Id: athlete.id },
            { athlete2Id: athlete.id },
          ],
          status: 'COMPLETED', // Только завершённые матчи
        },
        include: {
          bracket: {
            include: {
              competition: {
                include: {
                  sport: true,
                },
              },
              weightCategory: true,
            },
          },
          athlete1: {
            include: {
              user: {
                include: {
                  profile: true,
                },
              },
            },
          },
          athlete2: {
            include: {
              user: {
                include: {
                  profile: true,
                },
              },
            },
          },
          results: {
            where: {
              athleteId: athlete.id,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json({
        success: true,
        data: matches,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении истории схваток',
      });
    }
  }

  /**
   * Получить соревнования текущего спортсмена
   */
  async getMyCompetitions(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Получаем спортсмена текущего пользователя
      const athlete = await prisma.athlete.findUnique({
        where: { userId: req.user.id },
      });

      if (!athlete) {
        return res.status(404).json({
          success: false,
          message: 'Спортсмен не найден',
        });
      }

      // Получаем индивидуальные соревнования, где спортсмен участвует
      const participants = await prisma.competitionParticipant.findMany({
        where: {
          athleteId: athlete.id,
          status: 'CONFIRMED', // Только подтверждённые
        },
        include: {
          competition: {
            include: {
              sport: true,
            },
          },
        },
        orderBy: {
          competition: {
            startDate: 'desc',
          },
        },
      });

      // Получаем командные соревнования, где участвует команда спортсмена
      const teamParticipants = await prisma.teamParticipant.findMany({
        where: {
          teamId: athlete.teamId,
          status: 'CONFIRMED', // Только подтверждённые
        },
        include: {
          competition: {
            include: {
              sport: true,
            },
          },
          team: true,
        },
        orderBy: {
          competition: {
            startDate: 'desc',
          },
        },
      });

      // Обрабатываем индивидуальные соревнования
      const individualCompetitions = await Promise.all(
        participants.map(async (participant) => {
          const competition = participant.competition;
          
          // Получаем результаты спортсмена в этом соревновании
          const brackets = await prisma.bracket.findMany({
            where: { competitionId: competition.id },
            include: {
              matches: {
                where: {
                  OR: [
                    { athlete1Id: athlete.id },
                    { athlete2Id: athlete.id },
                  ],
                  status: 'COMPLETED',
                },
                include: {
                  results: {
                    where: { athleteId: athlete.id },
                  },
                },
              },
              weightCategory: true,
            },
          });

          // Собираем результаты
          let bestPosition: number | null = null;
          let totalPoints = 0;
          let weightCategoryName: string | null = null;

          brackets.forEach((bracket) => {
            bracket.matches.forEach((match) => {
              match.results.forEach((result) => {
                if (result.position !== null && result.position !== undefined) {
                  if (bestPosition === null || result.position < bestPosition) {
                    bestPosition = result.position;
                  }
                }
                if (result.points !== null && result.points !== undefined) {
                  totalPoints += result.points;
                }
              });
            });
            if (bracket.weightCategory && !weightCategoryName) {
              weightCategoryName = bracket.weightCategory.name;
            }
          });

          return {
            id: participant.id,
            competition: {
              id: competition.id,
              name: competition.name,
              startDate: competition.startDate,
              endDate: competition.endDate,
              status: competition.status,
              location: competition.location,
              competitionType: competition.competitionType,
              sport: {
                name: competition.sport.name,
              },
            },
            position: bestPosition,
            points: totalPoints > 0 ? totalPoints : undefined,
            weightCategory: weightCategoryName ? { name: weightCategoryName } : null,
            status: participant.status,
          };
        })
      );

      // Обрабатываем командные соревнования
      const teamCompetitions = await Promise.all(
        teamParticipants.map(async (teamParticipant) => {
          const competition = teamParticipant.competition;
          
          // Получаем результаты команды в этом соревновании
          let teamPosition: number | null = null;
          try {
            const results = await competitionsService.getCompetitionResults(competition.id);
            const resultsArray = Array.isArray(results) ? results : [];
            const teamResult = resultsArray.find((r: any) => r.team?.id === athlete.teamId || r.teamId === athlete.teamId);
            if (teamResult) {
              teamPosition = teamResult.position || null;
            }
          } catch (error) {
            // Игнорируем ошибки, если результатов еще нет
          }

          return {
            id: teamParticipant.id,
            competition: {
              id: competition.id,
              name: competition.name,
              startDate: competition.startDate,
              endDate: competition.endDate,
              status: competition.status,
              location: competition.location,
              competitionType: competition.competitionType,
              sport: {
                name: competition.sport.name,
              },
            },
            position: teamPosition,
            teamPosition: teamPosition,
            points: undefined, // Для командных соревнований очки не применимы
            weightCategory: null, // Для командных соревнований нет весовых категорий
            status: teamParticipant.status,
            team: {
              id: teamParticipant.team.id,
              name: teamParticipant.team.name,
            },
          };
        })
      );

      // Объединяем и сортируем по дате начала
      const allCompetitions = [...individualCompetitions, ...teamCompetitions].sort((a, b) => 
        new Date(b.competition.startDate).getTime() - new Date(a.competition.startDate).getTime()
      );

      res.json({
        success: true,
        data: allCompetitions,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении соревнований',
      });
    }
  }
}
