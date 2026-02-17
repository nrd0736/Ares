/**
 * Сервис управления событиями соревнования
 * 
 * Функциональность:
 * - createEvent() - создание события (расписание, церемонии открытия/закрытия)
 * - updateEvent() - обновление события
 * - deleteEvent() - удаление события
 * - getEventById() - получение события
 * - getEventsByCompetition() - все события соревнования
 * 
 * События используются для:
 * - Расписания соревнований
 * - Церемоний открытия/закрытия
 * - Взвешиваний
 * - Жеребьевок
 */

import prisma from '../../../utils/database';
import logger from '../../../utils/logger';

export interface CreateEventDto {
  competitionId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  location?: string;
}

export interface UpdateEventDto {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
}

export class EventsService {
  /**
   * Создать мероприятие
   */
  async createEvent(dto: CreateEventDto) {
    try {
      const event = await prisma.competitionEvent.create({
        data: {
          competitionId: dto.competitionId,
          title: dto.title,
          description: dto.description,
          startTime: new Date(dto.startTime),
          endTime: dto.endTime ? new Date(dto.endTime) : null,
          location: dto.location,
        },
        include: {
          competition: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      logger.info(`Создано мероприятие ${event.id} для соревнования ${dto.competitionId}`);
      return event;
    } catch (error: any) {
      logger.error('Ошибка при создании мероприятия', {
        error: error.message,
        dto,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить все мероприятия соревнования
   */
  async getEventsByCompetition(competitionId: string) {
    try {
      const events = await prisma.competitionEvent.findMany({
        where: { competitionId },
        include: {
          competition: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          startTime: 'asc',
        },
      });

      return events;
    } catch (error: any) {
      logger.error('Ошибка при получении мероприятий', {
        error: error.message,
        competitionId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить мероприятие по ID
   */
  async getEventById(id: string) {
    try {
      const event = await prisma.competitionEvent.findUnique({
        where: { id },
        include: {
          competition: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!event) {
        throw new Error('Мероприятие не найдено');
      }

      return event;
    } catch (error: any) {
      logger.error('Ошибка при получении мероприятия', {
        error: error.message,
        id,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Обновить мероприятие
   */
  async updateEvent(id: string, dto: UpdateEventDto) {
    try {
      const updateData: any = {};
      
      if (dto.title !== undefined) updateData.title = dto.title;
      if (dto.description !== undefined) updateData.description = dto.description || null;
      if (dto.startTime !== undefined) updateData.startTime = new Date(dto.startTime);
      if (dto.endTime !== undefined && dto.endTime !== null) {
        updateData.endTime = new Date(dto.endTime);
      } else if (dto.endTime === null) {
        updateData.endTime = null;
      }
      if (dto.location !== undefined) updateData.location = dto.location || null;

      const event = await prisma.competitionEvent.update({
        where: { id },
        data: updateData,
        include: {
          competition: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      logger.info(`Обновлено мероприятие ${id}`);
      return event;
    } catch (error: any) {
      logger.error('Ошибка при обновлении мероприятия', {
        error: error.message,
        id,
        dto,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Удалить мероприятие
   */
  async deleteEvent(id: string) {
    try {
      await prisma.competitionEvent.delete({
        where: { id },
      });

      logger.info(`Удалено мероприятие ${id}`);
      return { success: true };
    } catch (error: any) {
      logger.error('Ошибка при удалении мероприятия', {
        error: error.message,
        id,
        stack: error.stack,
      });
      throw error;
    }
  }
}

