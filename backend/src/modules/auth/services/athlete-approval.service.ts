/**
 * Сервис одобрения регистрации спортсменов
 * 
 * Функциональность:
 * - approveAthleteRegistration() - одобрение заявки тренером
 * - rejectAthleteRegistration() - отклонение заявки
 * - getAthleteRequests() - получение списка заявок для тренера
 * 
 * Логика работы:
 * - Спортсмен регистрируется с указанием тренера
 * - Создается запись AthleteRegistrationRequest со статусом PENDING
 * - Тренер видит заявку и может одобрить/отклонить
 * - При одобрении создается связь между спортсменом и тренером
 * - Спортсмен получает доступ к системе
 */

import prisma from '../../../utils/database';
import logger from '../../../utils/logger';
import { Gender } from '@prisma/client';

export class AthleteApprovalService {
  async approveAthleteRegistration(requestId: string, coachId: string, weightCategoryId?: string, weight?: number) {
    try {
      logger.debug(`Подтверждение регистрации спортсмена: requestId=${requestId}, coachId=${coachId}`);

      const request = await prisma.athleteRegistrationRequest.findUnique({
        where: { id: requestId },
        include: {
          user: {
            include: { profile: true },
          },
          coach: {
            include: { team: true },
          },
        },
      });

      if (!request) {
        throw new Error('Запрос на регистрацию не найден');
      }

      if (request.coachId !== coachId) {
        throw new Error('Вы не можете подтвердить этот запрос');
      }

      if (request.status !== 'PENDING') {
        throw new Error('Запрос уже обработан');
      }

      // Получаем команду тренера
      const teamId = request.coach.teamId;

      if (!teamId) {
        throw new Error('Тренер не привязан к команде. Невозможно подтвердить регистрацию спортсмена.');
      }

      // Проверяем, что пользователь еще неактивен (должен быть неактивным до подтверждения)
      if (request.user.isActive) {
        logger.warn(`Пользователь уже активен при подтверждении регистрации: userId=${request.userId}`);
      }

      // Проверяем, что запись Athlete еще не создана (не должна существовать до подтверждения)
      const existingAthlete = await prisma.athlete.findUnique({
        where: { userId: request.userId },
      });

      if (existingAthlete) {
        logger.error(`КРИТИЧЕСКАЯ ОШИБКА: Запись Athlete уже существует для userId=${request.userId} при подтверждении!`);
        throw new Error('Запись спортсмена уже существует. Невозможно подтвердить регистрацию.');
      }

      // Активируем пользователя
      await prisma.user.update({
        where: { id: request.userId },
        data: { isActive: true },
      });

      // Создаем запись спортсмена и привязываем к команде тренера
      // ВАЖНО: Это первое создание записи Athlete - она создается ТОЛЬКО после подтверждения тренером
      const newAthlete = await prisma.athlete.create({
        data: {
          userId: request.userId,
          teamId: teamId, // Привязываем к команде тренера
          coachId: request.coachId,
          birthDate: request.birthDate,
          gender: request.gender,
          weightCategoryId: weightCategoryId || request.weightCategoryId || undefined,
          weight: weight !== undefined ? weight : request.weight || undefined,
          sportsRankId: request.sportsRankId || undefined,
        },
      });

      logger.info(`Регистрация спортсмена подтверждена: userId=${request.userId}, teamId=${teamId}, coachId=${request.coachId}`);

      // Автоматически регистрируем спортсмена на ВСЕ соревнования, где команда участвует
      const teamApplications = await prisma.application.findMany({
        where: {
          teamId: teamId,
          status: 'APPROVED',
        },
        include: {
          competition: true,
        },
      });

      const registeredCompetitionIds: string[] = [];
      for (const application of teamApplications) {
        const competition = application.competition;
        // Регистрируем только на соревнования со статусом UPCOMING или REGISTRATION
        if (competition.status === 'UPCOMING' || competition.status === 'REGISTRATION') {
          try {
            await prisma.competitionParticipant.upsert({
              where: {
                competitionId_athleteId: {
                  competitionId: competition.id,
                  athleteId: newAthlete.id,
                },
              },
              create: {
                competitionId: competition.id,
                athleteId: newAthlete.id,
                status: 'CONFIRMED', // Тренер подтвердил - статус подтверждён
              },
              update: {
                status: 'CONFIRMED', // Обновляем на подтверждён
              },
            });
            registeredCompetitionIds.push(competition.id);
            logger.info(`Автоматически зарегистрирован спортсмен ${newAthlete.id} (весовая категория: ${newAthlete.weightCategoryId || 'не указана'}) на соревнование ${competition.id} после подтверждения тренером`);
            
            if (!newAthlete.weightCategoryId) {
              logger.warn(`ВНИМАНИЕ: Спортсмен ${newAthlete.id} зарегистрирован на соревнование ${competition.id}, но не имеет весовой категории. Он не появится в сетке!`);
            }
          } catch (error: any) {
            logger.error(`Не удалось зарегистрировать спортсмена ${newAthlete.id} на соревнование ${competition.id}: ${error.message}`, {
              error: error.stack,
              competitionId: competition.id,
              athleteId: newAthlete.id,
            });
          }
        }
      }

      // Обновляем сетки для зарегистрированных соревнований
      // Делаем это синхронно, чтобы гарантировать пересоздание сеток
      if (registeredCompetitionIds.length > 0) {
        try {
          const { BracketsService } = await import('../../brackets/services/brackets.service');
          const bracketsService = new BracketsService();
          
          for (const competitionId of registeredCompetitionIds) {
            try {
              logger.info(`Начинаем полное пересоздание сеток для соревнования ${competitionId} после подтверждения спортсмена ${newAthlete.id}`);
              const result = await bracketsService.autoCreateBracketsForCompetition(competitionId);
              logger.info(`Сетки полностью пересозданы для соревнования ${competitionId}: создано ${result.created} сеток`);
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
      }

      // Обновляем статус запроса
      await prisma.athleteRegistrationRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED' },
      });

      // Отправляем уведомление спортсмену
      const { NotificationsService } = await import('../../notifications/services/notifications.service');
      const notificationsService = new NotificationsService();
      
      await notificationsService.createNotification(
        {
          title: 'Регистрация подтверждена',
          message: `Тренер подтвердил вашу регистрацию. Теперь вы можете войти в систему.`,
          recipientType: 'USER',
          recipientId: request.userId,
        },
        request.coach.userId
      );

      logger.info(`Регистрация спортсмена подтверждена: userId=${request.userId}, coachId=${coachId}`);

      return {
        message: 'Спортсмен успешно подтвержден и добавлен в команду',
      };
    } catch (error: any) {
      logger.error('Ошибка при подтверждении регистрации спортсмена', {
        error: error.message,
        requestId,
        coachId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Отклонить регистрацию спортсмена
   */
  async rejectAthleteRegistration(requestId: string, coachId: string) {
    try {
      logger.debug(`Отклонение регистрации спортсмена: requestId=${requestId}, coachId=${coachId}`);

      const request = await prisma.athleteRegistrationRequest.findUnique({
        where: { id: requestId },
        include: {
          user: true,
          coach: true,
        },
      });

      if (!request) {
        throw new Error('Запрос на регистрацию не найден');
      }

      if (request.coachId !== coachId) {
        throw new Error('Вы не можете отклонить этот запрос');
      }

      if (request.status !== 'PENDING') {
        throw new Error('Запрос уже обработан');
      }

      // Сначала удаляем пользователя (это также удалит связанный AthleteRegistrationRequest из-за каскадного удаления)
      // Но сначала обновим статус запроса, чтобы зафиксировать факт отклонения
      await prisma.athleteRegistrationRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED' },
      });

      // Удаляем пользователя - это удалит все связанные данные (профиль, запрос на регистрацию и т.д.)
      // ВАЖНО: Пользователь должен быть удален из системы при отклонении
      await prisma.user.delete({
        where: { id: request.userId },
      });

      logger.info(`Регистрация спортсмена отклонена: userId=${request.userId}, coachId=${coachId}`);

      return {
        message: 'Запрос на регистрацию отклонен',
      };
    } catch (error: any) {
      logger.error('Ошибка при отклонении регистрации спортсмена', {
        error: error.message,
        requestId,
        coachId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить список запросов на регистрацию для тренера
   */
  async getRegistrationRequests(coachId: string) {
    try {
      const requests = await prisma.athleteRegistrationRequest.findMany({
        where: {
          coachId,
          status: 'PENDING',
        },
        include: {
          user: {
            include: { profile: true },
          },
          weightCategory: true,
          sportsRank: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return requests;
    } catch (error: any) {
      logger.error('Ошибка при получении запросов на регистрацию', {
        error: error.message,
        coachId,
        stack: error.stack,
      });
      throw error;
    }
  }
}

