/**
 * Сервис аутентификации
 * 
 * Основная бизнес-логика:
 * - login() - проверка учетных данных, генерация JWT
 * - register() - создание нового пользователя, хеширование пароля
 * - createInvitation() - создание токена приглашения
 * - registerByInvitation() - регистрация по приглашению
 * - generateToken() - генерация JWT токена
 * 
 * Особенности:
 * - Поддержка регистрации спортсменов с привязкой к тренеру
 * - Система одобрения для спортсменов (требуется подтверждение тренера)
 * - Хеширование паролей с использованием bcrypt (10 раундов)
 * - Автоматическое создание профилей пользователей
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../../../utils/config';
import prisma from '../../../utils/database';
import { UserRole } from '@prisma/client';
import { LoginDto, RegisterDto, InviteDto } from '../types';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../../utils/logger';

export class AuthService {
  async login(dto: LoginDto) {
    try {
      logger.debug('Попытка входа');

      const user = await prisma.user.findUnique({
        where: { email: dto.email },
        include: { profile: true },
      });

      if (!user || !user.isActive) {
        logger.warn('Неудачная попытка входа: пользователь не найден или неактивен');
        throw new Error('Неверные учетные данные');
      }

      const isValidPassword = await bcrypt.compare(dto.password, user.passwordHash);
      if (!isValidPassword) {
        logger.warn('Неудачная попытка входа: неверный пароль');
        throw new Error('Неверные учетные данные');
      }

      const token = this.generateToken(user.id, user.email, user.role);

      logger.info(`Успешный вход. Роль: ${user.role}`);

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          profile: user.profile,
        },
        token,
      };
    } catch (error: any) {
      logger.error('Ошибка при входе пользователя', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async register(dto: RegisterDto) {
    try {
      logger.debug('Попытка регистрации пользователя');
      
      const existingUser = await prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        logger.warn('Попытка регистрации с существующим email');
        throw new Error('Пользователь с таким email уже существует');
      }

      // Запрещаем регистрацию тренеров через публичную регистрацию
      const requestedRole = dto.role || UserRole.GUEST;
      if (requestedRole === UserRole.COACH) {
        logger.warn('Попытка публичной регистрации тренера');
        throw new Error('Регистрация тренеров доступна только по приглашению администратора');
      }

      const passwordHash = await bcrypt.hash(dto.password, 10);
      const role = requestedRole === UserRole.ATHLETE ? UserRole.ATHLETE : UserRole.GUEST;

      // Спортсмены могут регистрироваться ТОЛЬКО с указанием тренера
      // Проверяем, что coachEmail или coachId указаны и не пустые
      const hasCoachEmail = dto.coachEmail && dto.coachEmail.trim().length > 0;
      const hasCoachId = dto.coachId && dto.coachId.trim().length > 0;
      
      if (role === UserRole.ATHLETE && !hasCoachEmail && !hasCoachId) {
        logger.warn('Попытка регистрации спортсмена без тренера');
        throw new Error('Для регистрации спортсмена необходимо указать email тренера');
      }

      // Если регистрация спортсмена с указанием тренера
      if (role === UserRole.ATHLETE && (dto.coachEmail || dto.coachId)) {
        let coach;
        
        // Ищем тренера по email или ID
        if (dto.coachEmail) {
          // Ищем тренера по email
          const coachUser = await prisma.user.findUnique({
            where: { email: dto.coachEmail },
            include: {
              coach: {
                include: { user: true },
              },
            },
          });

          if (!coachUser || !coachUser.coach) {
            throw new Error('Тренер с таким email не найден');
          }

          if (coachUser.role !== UserRole.COACH) {
            throw new Error('Пользователь с таким email не является тренером');
          }

          coach = coachUser.coach;
        } else if (dto.coachId) {
          // Обратная совместимость: поиск по ID
          coach = await prisma.coach.findUnique({
            where: { id: dto.coachId },
            include: { user: true },
          });

          if (!coach) {
            throw new Error('Тренер не найден');
          }
        } else {
          throw new Error('Не указан email или ID тренера');
        }

        if (!dto.birthDate || !dto.gender) {
          throw new Error('Для регистрации спортсмена необходимо указать дату рождения и пол');
        }

        // Создаем пользователя с неактивным статусом
        // ВАЖНО: НЕ создаем запись Athlete - она будет создана только после подтверждения тренером
        const user = await prisma.user.create({
          data: {
            email: dto.email,
            passwordHash,
            role,
            isActive: false, // Явно указываем false - неактивен до подтверждения тренером
            profile: {
              create: {
                firstName: dto.firstName,
                lastName: dto.lastName,
                middleName: dto.middleName,
                phone: dto.phone,
              },
            },
          },
          include: { profile: true },
        });

        // Проверяем, что пользователь создан неактивным
        if (user.isActive) {
          logger.error('КРИТИЧЕСКАЯ ОШИБКА: Пользователь создан активным, хотя должен быть неактивным');
          // Принудительно устанавливаем неактивный статус
          await prisma.user.update({
            where: { id: user.id },
            data: { isActive: false },
          });
        }

        // Создаем запрос на регистрацию (НЕ создаем Athlete - он будет создан только после подтверждения тренером)
        await prisma.athleteRegistrationRequest.create({
          data: {
            userId: user.id,
            coachId: coach.id, // Используем найденного тренера, а не dto.coachId
            birthDate: new Date(dto.birthDate),
            gender: dto.gender,
            weightCategoryId: dto.weightCategoryId || undefined,
            weight: dto.weight || undefined,
            sportsRankId: dto.sportsRankId || undefined,
          },
        });

        // Дополнительная проверка: убеждаемся, что запись Athlete НЕ создана
        const existingAthlete = await prisma.athlete.findUnique({
          where: { userId: user.id },
        });

        if (existingAthlete) {
          logger.error('КРИТИЧЕСКАЯ ОШИБКА: Запись Athlete уже существует, удаляем');
          await prisma.athlete.delete({
            where: { userId: user.id },
          });
        }

        // Отправляем уведомление тренеру
        const { NotificationsService } = await import('../../notifications/services/notifications.service');
        const notificationsService = new NotificationsService();
        
        await notificationsService.createNotification(
          {
            title: 'Новый запрос на регистрацию спортсмена',
            message: `${dto.firstName} ${dto.lastName} (${dto.email}) хочет стать вашим спортсменом`,
            recipientType: 'USER',
            recipientId: coach.userId,
          },
          user.id
        );

        logger.info('Создан запрос на регистрацию спортсмена, ожидает подтверждения тренера');

        return {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            profile: user.profile,
          },
          requiresApproval: true,
          message: 'Ваш запрос отправлен тренеру на подтверждение. Вы получите уведомление после рассмотрения.',
        };
      }

      // Обычная регистрация (без тренера или не спортсмен)
      const user = await prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          role,
          profile: {
            create: {
              firstName: dto.firstName,
              lastName: dto.lastName,
              middleName: dto.middleName,
              phone: dto.phone,
            },
          },
        },
        include: { profile: true },
      });

      const token = this.generateToken(user.id, user.email, user.role);

      logger.info(`Успешная регистрация. Роль: ${user.role}`);

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          profile: user.profile,
        },
        token,
      };
    } catch (error: any) {
      logger.error('Ошибка при регистрации пользователя', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async createInvitation(dto: InviteDto, createdBy: string) {
    try {
      logger.debug(`Создание приглашения с ролью ${dto.role}`);
      
      const token = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 дней

      const invitation = await prisma.invitation.create({
        data: {
          email: dto.email,
          token,
          role: dto.role,
          teamId: dto.teamId || undefined, // Сохраняем teamId для тренеров
          expiresAt,
          createdBy,
        },
      });

      // Здесь можно отправить email с приглашением
      const inviteUrl = `${config.corsOrigin}/register?token=${token}`;

      logger.info(`Приглашение создано. Роль: ${dto.role}`);

      return {
        invitation,
        inviteUrl,
        qrCode: token, // Для генерации QR кода
      };
    } catch (error: any) {
      logger.error('Ошибка при создании приглашения', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async registerByInvitation(token: string, password: string, profileData: any) {
    try {
      logger.debug('Регистрация по приглашению');
      
      const invitation = await prisma.invitation.findUnique({
        where: { token },
      });

      if (!invitation) {
        logger.warn(`Попытка регистрации с неверным токеном приглашения`);
        throw new Error('Неверный токен приглашения');
      }

      if (invitation.used) {
        logger.warn('Попытка использовать уже использованное приглашение');
        throw new Error('Приглашение уже использовано');
      }

      if (new Date() > invitation.expiresAt) {
        logger.warn('Попытка использовать истекшее приглашение');
        throw new Error('Приглашение истекло');
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email: invitation.email,
          passwordHash,
          role: invitation.role,
          profile: {
            create: profileData,
          },
        },
        include: { profile: true },
      });

      // Если это тренер и указана команда, создаем запись Coach
      if (invitation.role === 'COACH' && invitation.teamId) {
        await prisma.coach.create({
          data: {
            userId: user.id,
            teamId: invitation.teamId,
          },
        });
        logger.debug('Создан тренер с привязкой к команде');
      }

      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { used: true },
      });

      const jwtToken = this.generateToken(user.id, user.email, user.role);

      logger.info(`Успешная регистрация по приглашению. Роль: ${user.role}`);

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          profile: user.profile,
        },
        token: jwtToken,
      };
    } catch (error: any) {
      logger.error('Ошибка при регистрации по приглашению', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить список всех приглашений (для администратора)
   */
  async getAllInvitations(createdBy?: string) {
    try {
      logger.debug(`Получение списка приглашений, создатель: ${createdBy || 'все'}`);

      const where: any = {};
      if (createdBy) {
        where.createdBy = createdBy;
      }

      const invitations = await prisma.invitation.findMany({
        where,
        include: {
          creator: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return invitations.map((invitation) => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        token: invitation.token,
        used: invitation.used,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
        createdBy: {
          email: invitation.creator.email,
          name: `${invitation.creator.profile?.firstName || ''} ${invitation.creator.profile?.lastName || ''}`.trim(),
        },
      }));
    } catch (error: any) {
      logger.error('Ошибка при получении списка приглашений', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Удалить приглашение
   */
  async deleteInvitation(invitationId: string, userId: string) {
    try {
      logger.debug('Удаление приглашения');

      const invitation = await prisma.invitation.findUnique({
        where: { id: invitationId },
      });

      if (!invitation) {
        throw new Error('Приглашение не найдено');
      }

      // Проверяем права доступа (только создатель, администратор или модератор)
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('Пользователь не найден');
      }

      if (user.role !== UserRole.ADMIN && user.role !== UserRole.MODERATOR && invitation.createdBy !== userId) {
        throw new Error('У вас нет прав для удаления этого приглашения');
      }

      await prisma.invitation.delete({
        where: { id: invitationId },
      });

      logger.info('Приглашение удалено');

      return { message: 'Приглашение успешно удалено' };
    } catch (error: any) {
      logger.error('Ошибка при удалении приглашения', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  private generateToken(userId: string, email: string, role: UserRole): string {
    return jwt.sign(
      { id: userId, email, role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
    );
  }
}

