/**
 * Сервис управления трансляциями
 * 
 * Основная бизнес-логика:
 * - getAllLiveStreams() - получение всех трансляций
 * - getLiveStreamById() - получение трансляции по ID
 * - createLiveStream() - создание трансляции
 * - updateLiveStream() - обновление трансляции
 * - deleteLiveStream() - удаление трансляции
 * 
 * Особенности:
 * - Связь с соревнованиями
 * - Поддержка различных платформ (YouTube, Twitch и т.д.)
 * - Управление активными трансляциями
 */

import prisma from '../../../utils/database';
import logger from '../../../utils/logger';
import { CreateLiveStreamDto, UpdateLiveStreamDto } from '../types';

export class LiveStreamsService {
  /**
   * Получить все трансляции
   */
  async getAllLiveStreams() {
    try {
      const streams = await prisma.liveStream.findMany({
        include: {
          competition: {
            include: {
              sport: true,
            },
          },
        },
        orderBy: [
          { isActive: 'desc' },
          { scheduledTime: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      return streams;
    } catch (error: any) {
      logger.error('Ошибка при получении трансляций', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить трансляцию по ID
   */
  async getLiveStreamById(id: string) {
    try {
      const stream = await prisma.liveStream.findUnique({
        where: { id },
        include: {
          competition: {
            include: {
              sport: true,
            },
          },
        },
      });

      if (!stream) {
        throw new Error('Трансляция не найдена');
      }

      return stream;
    } catch (error: any) {
      logger.error(`Ошибка при получении трансляции ${id}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Создать трансляцию
   */
  async createLiveStream(data: CreateLiveStreamDto) {
    try {
      // Проверяем, существует ли соревнование, если указано
      if (data.competitionId) {
        const competition = await prisma.competition.findUnique({
          where: { id: data.competitionId },
        });

        if (!competition) {
          throw new Error('Соревнование не найдено');
        }
      }

      const stream = await prisma.liveStream.create({
        data: {
          title: data.title,
          description: data.description || null,
          rutubeUrl: data.rutubeUrl,
          competitionId: (data.competitionId && data.competitionId.trim() !== '') ? data.competitionId : null,
          isActive: data.isActive !== undefined ? data.isActive : false,
          scheduledTime: data.scheduledTime ? new Date(data.scheduledTime) : null,
        },
        include: {
          competition: {
            include: {
              sport: true,
            },
          },
        },
      });

      logger.info(`Создана трансляция: ${stream.id} - ${stream.title}`);
      return stream;
    } catch (error: any) {
      logger.error('Ошибка при создании трансляции', {
        error: error.message,
        stack: error.stack,
        data,
      });
      throw error;
    }
  }

  /**
   * Обновить трансляцию
   */
  async updateLiveStream(id: string, data: UpdateLiveStreamDto) {
    try {
      // Проверяем, существует ли трансляция
      const existingStream = await prisma.liveStream.findUnique({
        where: { id },
      });

      if (!existingStream) {
        throw new Error('Трансляция не найдена');
      }

      // Проверяем, существует ли соревнование, если указано
      if (data.competitionId !== undefined && data.competitionId !== null) {
        const competition = await prisma.competition.findUnique({
          where: { id: data.competitionId },
        });

        if (!competition) {
          throw new Error('Соревнование не найдено');
        }
      }

      const updateData: any = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.rutubeUrl !== undefined) updateData.rutubeUrl = data.rutubeUrl;
      if (data.competitionId !== undefined) {
        updateData.competitionId = data.competitionId || null;
      }
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.scheduledTime !== undefined) {
        updateData.scheduledTime = data.scheduledTime ? new Date(data.scheduledTime) : null;
      }

      const stream = await prisma.liveStream.update({
        where: { id },
        data: updateData,
        include: {
          competition: {
            include: {
              sport: true,
            },
          },
        },
      });

      logger.info(`Обновлена трансляция: ${stream.id} - ${stream.title}`);
      return stream;
    } catch (error: any) {
      logger.error(`Ошибка при обновлении трансляции ${id}`, {
        error: error.message,
        stack: error.stack,
        data,
      });
      throw error;
    }
  }

  /**
   * Удалить трансляцию
   */
  async deleteLiveStream(id: string) {
    try {
      const stream = await prisma.liveStream.findUnique({
        where: { id },
      });

      if (!stream) {
        throw new Error('Трансляция не найдена');
      }

      await prisma.liveStream.delete({
        where: { id },
      });

      logger.info(`Удалена трансляция: ${id} - ${stream.title}`);
      return { success: true };
    } catch (error: any) {
      logger.error(`Ошибка при удалении трансляции ${id}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}

