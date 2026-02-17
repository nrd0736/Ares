/**
 * Сервис управления пользователями
 * 
 * Основная бизнес-логика:
 * - getAllUsers() - получение пользователей с пагинацией, поиском и фильтрацией
 * - getUserById() - получение пользователя с полными данными
 * - createUser() - создание пользователя с хешированием пароля
 * - updateUser() - обновление данных пользователя
 * - deleteUser() - удаление пользователя
 * - deactivateUser() - деактивация (мягкое удаление)
 * - updateProfile() - обновление профиля
 * - changePassword() - смена пароля с проверкой старого
 * - getStatistics() - подсчет статистики по ролям
 * - exportUsers() - экспорт в CSV
 * 
 * Особенности:
 * - Поддержка всех ролей и их специфичных полей
 * - Хеширование паролей через bcrypt (10 раундов)
 * - Поиск по ФИО и email с поддержкой нескольких слов
 * - Автоматическое создание связанных записей (Coach, Athlete, Judge, Moderator)
 */

import bcrypt from 'bcrypt';
import prisma from '../../../utils/database';
import logger from '../../../utils/logger';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateProfileDto,
  ChangePasswordDto,
} from '../types';
import { UserRole } from '@prisma/client';

export class UsersService {
  /**
   * Получить всех пользователей с пагинацией и поиском
   */
  async getAllUsers(page: number = 1, limit: number = 10, role?: UserRole, search?: string) {
    try {
      const skip = (page - 1) * limit;
      const where: any = role ? { role } : {};

      // Добавляем поиск по ФИО и email
      if (search && search.trim()) {
        const searchTerm = search.trim();
        const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 0);
        
        if (searchWords.length === 0) {
          // Если после разбивки нет слов, используем исходный запрос
          where.OR = [
            { email: { contains: searchTerm, mode: 'insensitive' } },
            {
              profile: {
                firstName: { contains: searchTerm, mode: 'insensitive' },
              },
            },
            {
              profile: {
                lastName: { contains: searchTerm, mode: 'insensitive' },
              },
            },
            {
              profile: {
                middleName: { contains: searchTerm, mode: 'insensitive' },
              },
            },
          ];
        } else if (searchWords.length === 1) {
          // Одно слово - ищем в любом поле
          where.OR = [
            { email: { contains: searchWords[0], mode: 'insensitive' } },
            {
              profile: {
                firstName: { contains: searchWords[0], mode: 'insensitive' },
              },
            },
            {
              profile: {
                lastName: { contains: searchWords[0], mode: 'insensitive' },
              },
            },
            {
              profile: {
                middleName: { contains: searchWords[0], mode: 'insensitive' },
              },
            },
          ];
        } else {
          // Несколько слов - ищем комбинации
          // Вариант 1: все слова в одном поле (для обратной совместимости)
          const singleFieldConditions = [
            { email: { contains: searchTerm, mode: 'insensitive' } },
            {
              profile: {
                firstName: { contains: searchTerm, mode: 'insensitive' },
              },
            },
            {
              profile: {
                lastName: { contains: searchTerm, mode: 'insensitive' },
              },
            },
            {
              profile: {
                middleName: { contains: searchTerm, mode: 'insensitive' },
              },
            },
          ];
          
          // Вариант 2: комбинации полей (например, "Иванов Иван" = lastName содержит "Иванов" AND firstName содержит "Иван")
          const multiFieldConditions: any[] = [];
          
          // Генерируем различные комбинации для 2-3 слов
          if (searchWords.length === 2) {
            // "Фамилия Имя" или "Имя Отчество"
            multiFieldConditions.push({
              profile: {
                AND: [
                  { lastName: { contains: searchWords[0], mode: 'insensitive' } },
                  { firstName: { contains: searchWords[1], mode: 'insensitive' } },
                ],
              },
            });
            multiFieldConditions.push({
              profile: {
                AND: [
                  { firstName: { contains: searchWords[0], mode: 'insensitive' } },
                  { lastName: { contains: searchWords[1], mode: 'insensitive' } },
                ],
              },
            });
            multiFieldConditions.push({
              profile: {
                AND: [
                  { firstName: { contains: searchWords[0], mode: 'insensitive' } },
                  { middleName: { contains: searchWords[1], mode: 'insensitive' } },
                ],
              },
            });
            multiFieldConditions.push({
              profile: {
                AND: [
                  { lastName: { contains: searchWords[0], mode: 'insensitive' } },
                  { middleName: { contains: searchWords[1], mode: 'insensitive' } },
                ],
              },
            });
          } else if (searchWords.length === 3) {
            // "Фамилия Имя Отчество"
            multiFieldConditions.push({
              profile: {
                AND: [
                  { lastName: { contains: searchWords[0], mode: 'insensitive' } },
                  { firstName: { contains: searchWords[1], mode: 'insensitive' } },
                  { middleName: { contains: searchWords[2], mode: 'insensitive' } },
                ],
              },
            });
            // Также пробуем другие порядки
            multiFieldConditions.push({
              profile: {
                AND: [
                  { lastName: { contains: searchWords[0], mode: 'insensitive' } },
                  { firstName: { contains: searchWords[1], mode: 'insensitive' } },
                ],
              },
            });
          }
          
          // Объединяем все условия через OR
          where.OR = [...singleFieldConditions, ...multiFieldConditions];
        }
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          include: {
            profile: true,
            judgeProfile: {
              include: {
                region: {
                  include: {
                    federalDistrict: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prisma.user.count({ where }),
      ]);

      logger.info(`Получен список пользователей: страница ${page}, всего ${total}, поиск: ${search || 'нет'}`);

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      logger.error('Ошибка при получении списка пользователей', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Получить пользователя по ID
   */
  async getUserById(id: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          profile: true,
          coach: {
            include: {
              team: true,
            },
          },
          athlete: {
            include: {
              team: true,
              coach: {
                include: {
                  user: {
                    include: { profile: true },
                  },
                },
              },
            },
          },
          moderator: true,
          judgeProfile: {
            include: {
              region: {
                include: {
                  federalDistrict: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        logger.warn(`Пользователь с ID ${id} не найден`);
        throw new Error('Пользователь не найден');
      }

      logger.debug(`Получен пользователь: ${user.email}`);
      return user;
    } catch (error: any) {
      logger.error(`Ошибка при получении пользователя ${id}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Создать нового пользователя
   */
  async createUser(dto: CreateUserDto) {
    try {
      // Проверяем, существует ли пользователь с таким email
      const existingUser = await prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        logger.warn(`Попытка создать пользователя с существующим email: ${dto.email}`);
        throw new Error('Пользователь с таким email уже существует');
      }

      // Хешируем пароль
      const passwordHash = await bcrypt.hash(dto.password, 10);

      // Создаем пользователя с профилем
      const user = await prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          role: dto.role,
          profile: {
            create: {
              firstName: dto.firstName,
              lastName: dto.lastName,
              middleName: dto.middleName,
              phone: dto.phone,
            },
          },
        },
        include: {
          profile: true,
        },
      });

      // Если это тренер, создаем запись Coach
      if (dto.role === 'COACH' && dto.teamId) {
        await prisma.coach.create({
          data: {
            userId: user.id,
            teamId: dto.teamId,
          },
        });
        logger.debug(`Создан тренер для пользователя ${user.email} с командой ${dto.teamId}`);
      }

      // Если это спортсмен, создаем запись Athlete
      if (dto.role === 'ATHLETE') {
        if (!dto.teamId) {
          throw new Error('Для спортсмена необходимо указать команду');
        }
        if (!dto.birthDate || !dto.gender) {
          throw new Error('Для спортсмена необходимо указать дату рождения и пол');
        }

        const newAthlete = await prisma.athlete.create({
          data: {
            userId: user.id,
            teamId: dto.teamId,
            coachId: dto.coachId || undefined,
            weightCategoryId: dto.weightCategoryId || undefined,
            weight: dto.weight || undefined,
            birthDate: new Date(dto.birthDate),
            gender: dto.gender,
            sportsRankId: dto.sportsRankId || undefined,
          },
        });
        logger.debug(`Создан спортсмен для пользователя ${user.email} с командой ${dto.teamId}`);

        // Автоматически регистрируем спортсмена на ВСЕ соревнования, где команда участвует
        // Ищем заявки со статусом APPROVED - это означает, что команда участвует в соревновании
        const teamApplications = await prisma.application.findMany({
          where: {
            teamId: dto.teamId,
            status: 'APPROVED',
          },
          include: {
            competition: true,
          },
        });
        
        logger.debug(`Найдено ${teamApplications.length} одобренных заявок для команды ${dto.teamId}`);
        
        // Регистрируем спортсмена на все соревнования, где команда участвует
        const registeredCompetitionIds: string[] = [];
        for (const application of teamApplications) {
          const competition = application.competition;
          // Регистрируем только на соревнования со статусом UPCOMING или REGISTRATION
          if (competition.status === 'UPCOMING' || competition.status === 'REGISTRATION') {
            try {
              const participant = await prisma.competitionParticipant.upsert({
                where: {
                  competitionId_athleteId: {
                    competitionId: competition.id,
                    athleteId: newAthlete.id,
                  },
                },
                create: {
                  competitionId: competition.id,
                  athleteId: newAthlete.id,
                  status: 'CONFIRMED', // Админ создаёт - сразу подтверждён
                },
                update: {
                  status: 'CONFIRMED', // Обновляем на подтверждён
                },
              });
              
              // Проверяем, что регистрация прошла успешно
              const verifyParticipant = await prisma.competitionParticipant.findUnique({
                where: {
                  competitionId_athleteId: {
                    competitionId: competition.id,
                    athleteId: newAthlete.id,
                  },
                },
              });
              
              registeredCompetitionIds.push(competition.id);
              logger.info(`Автоматически зарегистрирован новый спортсмен ${newAthlete.id} на соревнование ${competition.id} (команда ${dto.teamId})`);
              
              if (!newAthlete.weightCategoryId) {
                logger.warn(`Спортсмен ${newAthlete.id} зарегистрирован на соревнование ${competition.id}, но не имеет весовой категории. Он не появится в сетке!`);
              }
            } catch (error: any) {
              logger.error(`Не удалось зарегистрировать нового спортсмена ${newAthlete.id} на соревнование ${competition.id}: ${error.message}`);
            }
          }
        }

        // Обновляем сетки для зарегистрированных соревнований
        // Делаем это синхронно, чтобы гарантировать пересоздание сеток
        if (registeredCompetitionIds.length > 0) {
          try {
            // Импортируем сервисы асинхронно, чтобы избежать циклических зависимостей
            const { BracketsService } = await import('../../brackets/services/brackets.service');
            const bracketsService = new BracketsService();
            
            for (const competitionId of registeredCompetitionIds) {
              try {
                const result = await bracketsService.autoCreateBracketsForCompetition(competitionId);
                logger.info(`Сетки пересозданы для соревнования ${competitionId}: создано ${result.created} сеток`);
              } catch (error: any) {
                logger.error(`Ошибка при пересоздании сеток для соревнования ${competitionId}: ${error.message}`, {
                  error: error.stack,
                  competitionId,
                  athleteId: newAthlete.id,
                });
                // Не прерываем выполнение, продолжаем для других соревнований
              }
            }
          } catch (error: any) {
            logger.error(`Ошибка при импорте BracketsService: ${error.message}`, {
              error: error.stack,
            });
          }
        } else {
          logger.info(`Спортсмен ${newAthlete.id} не был зарегистрирован ни на одно соревнование (команда ${dto.teamId})`);
        }
        }

      // Если это модератор, создаем запись Moderator
      if (dto.role === 'MODERATOR') {
        if (!dto.description) {
          throw new Error('Для модератора необходимо указать описание');
        }
        if (!dto.allowedTabs || dto.allowedTabs.length === 0) {
          throw new Error('Для модератора необходимо выбрать хотя бы одну вкладку');
        }

        await prisma.moderator.create({
          data: {
            userId: user.id,
            description: dto.description,
            allowedTabs: dto.allowedTabs,
          },
        });
        logger.debug(`Создан модератор для пользователя ${user.email}`);
      }

      // Если это судья, создаем запись JudgeProfile
      if (dto.role === 'JUDGE') {
        // Функция для очистки значений
        const cleanValue = (value: any): string | null => {
          if (value === undefined || value === null || value === '' || value === 'undefined' || value === 'null') {
            return null;
          }
          return value;
        };

        await prisma.judgeProfile.create({
          data: {
            userId: user.id,
            city: cleanValue(dto.judgeCity),
            category: cleanValue(dto.judgeCategory),
            position: cleanValue(dto.judgePosition),
            regionId: cleanValue(dto.judgeRegionId),
          },
        });
        logger.debug(`Создан профиль судьи для пользователя ${user.email}`);
      }

      logger.info(`Создан новый пользователь: ${user.email} с ролью ${user.role}`);
      return user;
    } catch (error: any) {
      logger.error('Ошибка при создании пользователя', {
        error: error.message,
        email: dto.email,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Обновить пользователя
   */
  async updateUser(id: string, dto: UpdateUserDto) {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        logger.warn(`Попытка обновить несуществующего пользователя: ${id}`);
        throw new Error('Пользователь не найден');
      }

      // Если меняется email, проверяем уникальность
      if (dto.email && dto.email !== user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: dto.email },
        });

        if (existingUser) {
          logger.warn(`Попытка изменить email на существующий: ${dto.email}`);
          throw new Error('Пользователь с таким email уже существует');
        }
      }

      // Если указан новый пароль, хешируем его и сохраняем временный пароль
      const updateData: any = {
        email: dto.email,
        role: dto.role,
        isActive: dto.isActive,
        profile: {
          update: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            middleName: dto.middleName,
            phone: dto.phone,
            avatarUrl: dto.avatarUrl,
          },
        },
      };

      if (dto.password) {
        updateData.passwordHash = await bcrypt.hash(dto.password, 10);
        logger.info(`Пароль обновлен для пользователя: ${user.email}`);
      }

      // Обновляем пользователя и профиль
      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        include: {
          profile: true,
          coach: true,
          athlete: true,
          moderator: true,
          judgeProfile: {
            include: {
              region: {
                include: {
                  federalDistrict: true,
                },
              },
            },
          },
        },
      });

      // Если это тренер и указана команда, обновляем или создаем запись Coach
      if (dto.role === 'COACH' || user.role === 'COACH') {
        if (dto.teamId) {
          const existingCoach = await prisma.coach.findUnique({
            where: { userId: id },
          });

          if (existingCoach) {
            await prisma.coach.update({
              where: { id: existingCoach.id },
              data: { teamId: dto.teamId },
            });
          } else {
            await prisma.coach.create({
              data: {
                userId: id,
                teamId: dto.teamId,
              },
            });
          }
          logger.debug(`Обновлена команда тренера для пользователя ${updatedUser.email}`);
        }
      }

      // Если это спортсмен, обновляем или создаем запись Athlete
      if (dto.role === 'ATHLETE' || user.role === 'ATHLETE') {
        const existingAthlete = await prisma.athlete.findUnique({
          where: { userId: id },
        });

        const athleteData: any = {};
        if (dto.teamId) athleteData.teamId = dto.teamId;
        if (dto.coachId !== undefined) athleteData.coachId = dto.coachId || null;
        if (dto.weightCategoryId !== undefined) athleteData.weightCategoryId = dto.weightCategoryId || null;
        if (dto.weight !== undefined) athleteData.weight = dto.weight || null;
        if (dto.birthDate) athleteData.birthDate = new Date(dto.birthDate);
        if (dto.gender) athleteData.gender = dto.gender;
        if (dto.sportsRankId !== undefined) athleteData.sportsRankId = dto.sportsRankId || null;

        let athleteId: string;
        let newTeamId: string | undefined = dto.teamId;
        let oldTeamId: string | undefined = existingAthlete?.teamId;

        if (existingAthlete) {
          await prisma.athlete.update({
            where: { id: existingAthlete.id },
            data: athleteData,
          });
          athleteId = existingAthlete.id;
        } else {
          // Если создаем нового спортсмена, нужны обязательные поля
          if (!dto.teamId || !dto.birthDate || !dto.gender) {
            throw new Error('Для создания спортсмена необходимо указать команду, дату рождения и пол');
          }
          const newAthlete = await prisma.athlete.create({
            data: {
              userId: id,
              teamId: dto.teamId,
              coachId: dto.coachId || undefined,
              weightCategoryId: dto.weightCategoryId || undefined,
              weight: dto.weight || undefined,
              birthDate: new Date(dto.birthDate),
              gender: dto.gender,
              sportsRankId: dto.sportsRankId || undefined,
            },
          });
          athleteId = newAthlete.id;
        }
        logger.debug(`Обновлен спортсмен для пользователя ${updatedUser.email}`);

        // Если команда изменилась или спортсмен только что создан, регистрируем его на соревнования
        if (newTeamId && (newTeamId !== oldTeamId || !existingAthlete)) {
          // Находим все одобренные заявки команды на соревнования
          const teamApplications = await prisma.application.findMany({
            where: {
              teamId: newTeamId,
              status: 'APPROVED',
            },
            include: {
              competition: true,
            },
          });

          // Регистрируем спортсмена на все соревнования, где команда участвует
          const registeredCompetitionIds: string[] = [];
          
          // Получаем актуальные данные спортсмена с весовой категорией
          const updatedAthlete = await prisma.athlete.findUnique({
            where: { id: athleteId },
            include: {
              weightCategory: true,
            },
          });
          
          for (const application of teamApplications) {
            const competition = application.competition;
            // Регистрируем только на соревнования со статусом UPCOMING или REGISTRATION
            if (competition.status === 'UPCOMING' || competition.status === 'REGISTRATION') {
              try {
                const participant = await prisma.competitionParticipant.upsert({
                  where: {
                    competitionId_athleteId: {
                      competitionId: competition.id,
                      athleteId: athleteId,
                    },
                  },
                  create: {
                    competitionId: competition.id,
                    athleteId: athleteId,
                    status: 'CONFIRMED', // Админ создаёт/обновляет - сразу подтверждён
                  },
                  update: {
                    status: 'CONFIRMED', // Обновляем на подтверждён
                  },
                });
                registeredCompetitionIds.push(competition.id);
                logger.info(`Автоматически зарегистрирован спортсмен ${athleteId} (весовая категория: ${updatedAthlete?.weightCategoryId || 'не указана'}) на соревнование ${competition.id} (команда ${newTeamId})`);
                
                // Проверяем, есть ли у спортсмена весовая категория
                if (!updatedAthlete?.weightCategoryId) {
                  logger.warn(`ВНИМАНИЕ: Спортсмен ${athleteId} зарегистрирован на соревнование ${competition.id}, но не имеет весовой категории. Он не появится в сетке!`);
                }
              } catch (error: any) {
                logger.error(`Не удалось зарегистрировать спортсмена ${athleteId} на соревнование ${competition.id}: ${error.message}`, {
                  error: error.stack,
                  competitionId: competition.id,
                  athleteId,
                });
              }
            }
          }

          // Обновляем сетки для зарегистрированных соревнований
          // Делаем это синхронно, чтобы гарантировать пересоздание сеток
          if (registeredCompetitionIds.length > 0) {
            try {
              // Импортируем сервисы асинхронно, чтобы избежать циклических зависимостей
              const { BracketsService } = await import('../../brackets/services/brackets.service');
              const bracketsService = new BracketsService();
              
              for (const competitionId of registeredCompetitionIds) {
                try {
                  logger.info(`Начинаем полное пересоздание сеток для соревнования ${competitionId} после регистрации спортсмена ${athleteId}`);
                  const result = await bracketsService.autoCreateBracketsForCompetition(competitionId);
                  logger.info(`Сетки полностью пересозданы для соревнования ${competitionId}: создано ${result.created} сеток`);
                } catch (error: any) {
                  logger.error(`Ошибка при пересоздании сеток для соревнования ${competitionId}: ${error.message}`, {
                    error: error.stack,
                    competitionId,
                    athleteId,
                  });
                  // Не прерываем выполнение, продолжаем для других соревнований
                }
              }
            } catch (error: any) {
              logger.error(`Ошибка при импорте BracketsService: ${error.message}`, {
                error: error.stack,
              });
            }
          } else {
            logger.info(`Спортсмен ${athleteId} не был зарегистрирован ни на одно соревнование (команда ${newTeamId})`);
          }
        }
      }

      // Если это модератор, обновляем или создаем запись Moderator
      if (dto.role === 'MODERATOR' || user.role === 'MODERATOR') {
        const existingModerator = await prisma.moderator.findUnique({
          where: { userId: id },
        });

        const moderatorData: any = {};
        if (dto.description !== undefined) moderatorData.description = dto.description;
        if (dto.allowedTabs !== undefined) moderatorData.allowedTabs = dto.allowedTabs;

        if (existingModerator) {
          await prisma.moderator.update({
            where: { id: existingModerator.id },
            data: moderatorData,
          });
        } else if (dto.role === 'MODERATOR') {
          // Если создаем нового модератора, нужны обязательные поля
          if (!dto.description || !dto.allowedTabs || dto.allowedTabs.length === 0) {
            throw new Error('Для создания модератора необходимо указать описание и выбрать хотя бы одну вкладку');
          }
          await prisma.moderator.create({
            data: {
              userId: id,
              description: dto.description,
              allowedTabs: dto.allowedTabs,
            },
          });
        }
        logger.debug(`Обновлен модератор для пользователя ${updatedUser.email}`);
      }

      // Если это судья, обновляем или создаем запись JudgeProfile
      if (dto.role === 'JUDGE' || user.role === 'JUDGE') {
        const existingJudgeProfile = await prisma.judgeProfile.findUnique({
          where: { userId: id },
        });

        // Функция для очистки значений
        const cleanValue = (value: any): string | null => {
          if (value === undefined || value === null || value === '' || value === 'undefined' || value === 'null') {
            return null;
          }
          return value;
        };

        const judgeData: any = {};
        if (dto.judgeCity !== undefined) judgeData.city = cleanValue(dto.judgeCity);
        if (dto.judgeCategory !== undefined) judgeData.category = cleanValue(dto.judgeCategory);
        if (dto.judgePosition !== undefined) judgeData.position = cleanValue(dto.judgePosition);
        if (dto.judgeRegionId !== undefined) judgeData.regionId = cleanValue(dto.judgeRegionId);

        if (existingJudgeProfile) {
          await prisma.judgeProfile.update({
            where: { id: existingJudgeProfile.id },
            data: judgeData,
          });
        } else if (dto.role === 'JUDGE') {
          // Создаем профиль судьи, если его еще нет
          await prisma.judgeProfile.create({
            data: {
              userId: id,
              city: cleanValue(dto.judgeCity),
              category: cleanValue(dto.judgeCategory),
              position: cleanValue(dto.judgePosition),
              regionId: cleanValue(dto.judgeRegionId),
            },
          });
        }
        
        // Перезагружаем пользователя, чтобы получить обновленный judgeProfile
        const finalUser = await prisma.user.findUnique({
          where: { id },
          include: {
            profile: true,
            coach: true,
            athlete: true,
            moderator: true,
            judgeProfile: {
              include: {
                region: {
                  include: {
                    federalDistrict: true,
                  },
                },
              },
            },
          },
        });
        
        logger.info(`Обновлен пользователь: ${updatedUser.email}`);
        return finalUser || updatedUser;
      }

      logger.info(`Обновлен пользователь: ${updatedUser.email}`);
      return updatedUser;
    } catch (error: any) {
      logger.error(`Ошибка при обновлении пользователя ${id}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Удалить пользователя (мягкое удаление - деактивация)
   */
  /**
   * Деактивировать пользователя
   */
  async deactivateUser(id: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        logger.warn(`Попытка деактивировать несуществующего пользователя: ${id}`);
        throw new Error('Пользователь не найден');
      }

      const deactivatedUser = await prisma.user.update({
        where: { id },
        data: {
          isActive: false,
        },
      });

      logger.info(`Пользователь деактивирован: ${deactivatedUser.email}`);
      return deactivatedUser;
    } catch (error: any) {
      logger.error(`Ошибка при деактивации пользователя ${id}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Удалить пользователя (полное удаление)
   */
  async deleteUser(id: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        logger.warn(`Попытка удалить несуществующего пользователя: ${id}`);
        throw new Error('Пользователь не найден');
      }

      // Удаляем связанные записи перед удалением пользователя
      // Удаляем уведомления, отправленные этим пользователем
      await prisma.notification.deleteMany({
        where: { senderId: id },
      });

      // Удаляем приглашения, созданные этим пользователем
      await prisma.invitation.deleteMany({
        where: { createdBy: id },
      });

      // Удаляем новости, созданные этим пользователем
      await prisma.news.deleteMany({
        where: { authorId: id },
      });

      // Удаляем обращения, созданные этим пользователем
      await prisma.ticket.deleteMany({
        where: { userId: id },
      });

      // Полное удаление пользователя (каскадное удаление через Prisma для других связанных таблиц)
      await prisma.user.delete({
        where: { id },
      });

      logger.info(`Пользователь удален: ${user.email}`);
      return { message: 'Пользователь успешно удален' };
    } catch (error: any) {
      logger.error(`Ошибка при удалении пользователя ${id}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Обновить профиль текущего пользователя
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });

      if (!user) {
        logger.warn(`Попытка обновить профиль несуществующего пользователя: ${userId}`);
        throw new Error('Пользователь не найден');
      }

      // Обновляем профиль пользователя
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          profile: {
            update: {
              firstName: dto.firstName,
              lastName: dto.lastName,
              middleName: dto.middleName,
              phone: dto.phone,
              avatarUrl: dto.avatarUrl,
            },
          },
        },
        include: {
          profile: true,
          judgeProfile: {
            include: {
              region: {
                include: {
                  federalDistrict: true,
                },
              },
            },
          },
        },
      });

      // Если пользователь - судья, обновляем JudgeProfile
      if (user.role === 'JUDGE') {
        const existingJudgeProfile = await prisma.judgeProfile.findUnique({
          where: { userId: userId },
        });

        // Функция для очистки значений
        const cleanValue = (value: any): string | null => {
          if (value === undefined || value === null || value === '' || value === 'undefined' || value === 'null') {
            return null;
          }
          return value;
        };

        const judgeData: any = {};
        if (dto.judgeCity !== undefined) judgeData.city = cleanValue(dto.judgeCity);
        if (dto.judgeCategory !== undefined) judgeData.category = cleanValue(dto.judgeCategory);
        if (dto.judgePosition !== undefined) judgeData.position = cleanValue(dto.judgePosition);
        if (dto.judgeRegionId !== undefined) judgeData.regionId = cleanValue(dto.judgeRegionId);

        if (Object.keys(judgeData).length > 0) {
          if (existingJudgeProfile) {
            await prisma.judgeProfile.update({
              where: { id: existingJudgeProfile.id },
              data: judgeData,
            });
          } else {
            // Создаем профиль судьи, если его еще нет
            await prisma.judgeProfile.create({
              data: {
                userId: userId,
                city: cleanValue(dto.judgeCity),
                category: cleanValue(dto.judgeCategory),
                position: cleanValue(dto.judgePosition),
                regionId: cleanValue(dto.judgeRegionId),
              },
            });
          }
        }
      }

      logger.info(`Обновлен профиль пользователя: ${updatedUser.email}`);
      return updatedUser;
    } catch (error: any) {
      logger.error(`Ошибка при обновлении профиля пользователя ${userId}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Сменить пароль пользователя
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        logger.warn(`Попытка сменить пароль несуществующего пользователя: ${userId}`);
        throw new Error('Пользователь не найден');
      }

      // Проверяем старый пароль
      const isValidPassword = await bcrypt.compare(dto.oldPassword, user.passwordHash);
      if (!isValidPassword) {
        logger.warn(`Неверный старый пароль для пользователя: ${user.email}`);
        throw new Error('Неверный текущий пароль');
      }

      // Хешируем новый пароль
      const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

      // Обновляем пароль
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: newPasswordHash,
        },
      });

      logger.info(`Пароль изменен для пользователя: ${user.email}`);
      return { success: true };
    } catch (error: any) {
      logger.error(`Ошибка при смене пароля пользователя ${userId}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Экспорт пользователей с генерацией временных паролей
   */
  async exportUsers(role?: UserRole, userIds?: string[]) {
    try {
      let where: any = { isActive: true };
      
      if (userIds && userIds.length > 0) {
        // Если указаны конкретные ID пользователей, экспортируем только их
        where.id = { in: userIds };
      } else if (role) {
        // Если указана роль, фильтруем по роли
        where.role = role;
      }
      
      const users = await prisma.user.findMany({
        where,
        include: {
          profile: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Генерируем временные пароли и обновляем их в базе
      const exportData = await Promise.all(
        users.map(async (user) => {
          // Генерируем новый временный пароль
          const tempPassword = this.generateTempPassword();
          
          // Хешируем и обновляем пароль в базе
          const passwordHash = await bcrypt.hash(tempPassword, 10);
          await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash },
          });

          const fullName = user.profile
            ? `${user.profile.lastName || ''} ${user.profile.firstName || ''} ${user.profile.middleName || ''}`.trim()
            : 'Не указано';

          const roleLabels: Record<string, string> = {
            ADMIN: 'Администратор',
            MODERATOR: 'Модератор',
            JUDGE: 'Судья',
            COACH: 'Тренер',
            ATHLETE: 'Спортсмен',
            GUEST: 'Гость',
          };

          return {
            fullName,
            role: roleLabels[user.role] || user.role,
            email: user.email,
            password: tempPassword,
          };
        })
      );

      logger.info(`Экспортировано ${exportData.length} пользователей с временными паролями`);
      return exportData;
    } catch (error: any) {
      logger.error('Ошибка при экспорте пользователей', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Генерация временного пароля
   */
  private generateTempPassword(): string {
    const length = 12;
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    const allChars = lowercase + uppercase + numbers + symbols;
    
    let password = '';
    // Гарантируем наличие хотя бы одного символа каждого типа
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Заполняем остальные символы
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Перемешиваем символы
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Получить статистику пользователей
   */
  async getUsersStatistics() {
    try {
      const [total, byRole, active] = await Promise.all([
        prisma.user.count(),
        prisma.user.groupBy({
          by: ['role'],
          _count: true,
        }),
        prisma.user.count({
          where: { isActive: true },
        }),
      ]);

      const statistics = {
        total,
        active,
        inactive: total - active,
        byRole: byRole.reduce((acc, item) => {
          acc[item.role] = item._count;
          return acc;
        }, {} as Record<UserRole, number>),
      };

      logger.debug('Получена статистика пользователей', statistics);
      return statistics;
    } catch (error: any) {
      logger.error('Ошибка при получении статистики пользователей', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}

