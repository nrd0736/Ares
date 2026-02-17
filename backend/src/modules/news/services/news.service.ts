/**
 * Сервис управления новостями
 * 
 * Основная бизнес-логика:
 * - getAllNews() - получение новостей с пагинацией и фильтрацией
 * - getLatestNews() - последние новости
 * - getNewsByCategory() - новости по категории
 * - getNewsById() - получение новости по ID
 * - createNews() - создание новости
 * - updateNews() - обновление новости
 * - deleteNews() - удаление новости
 * 
 * Особенности:
 * - Поддержка категорий новостей
 * - Автоматическое определение автора
 * - Сортировка по дате создания
 */

import prisma from '../../../utils/database';
import logger from '../../../utils/logger';
import { CreateNewsDto, UpdateNewsDto } from '../types';

export class NewsService {
  /**
   * Получить все новости с пагинацией
   */
  async getAllNews(page: number = 1, limit: number = 10, category?: string) {
    try {
      const skip = (page - 1) * limit;
      const where: any = {};

      if (category) {
        where.category = category;
      }

      const [news, total] = await Promise.all([
        prisma.news.findMany({
          where,
          skip,
          take: limit,
          include: {
            author: {
              include: {
                profile: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prisma.news.count({ where }),
      ]);

      logger.debug(`Получен список новостей: страница ${page}, всего ${total}`);

      // Обрабатываем images - Prisma возвращает JSON как объект, нужно преобразовать в массив
      const processedNews = news.map((item: any) => {
        let imagesArray: string[] = [];
        if (item.images) {
          if (Array.isArray(item.images)) {
            imagesArray = item.images;
          } else if (typeof item.images === 'object') {
            // Prisma возвращает JSON как объект, преобразуем в массив
            try {
              const values = Object.values(item.images);
              imagesArray = values.filter((v: any) => typeof v === 'string') as string[];
            } catch (e) {
              logger.warn(`Ошибка обработки images для новости ${item.id}:`, e);
            }
          } else if (typeof item.images === 'string') {
            try {
              const parsed = JSON.parse(item.images);
              imagesArray = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
              imagesArray = [item.images];
            }
          }
        }
        return {
          ...item,
          images: imagesArray,
        };
      });

      return {
        news: processedNews,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      logger.error('Ошибка при получении списка новостей', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить новость по ID
   */
  async getNewsById(id: string) {
    try {
      const news = await prisma.news.findUnique({
        where: { id },
        include: {
          author: {
            include: {
              profile: true,
            },
          },
        },
      });

      if (!news) {
        logger.warn(`Новость с ID ${id} не найдена`);
        throw new Error('Новость не найдена');
      }

      logger.debug(`Получена новость: ${news.title}`);
      
      // Обрабатываем images - Prisma возвращает JSON как объект, нужно преобразовать в массив
      let imagesArray: string[] = [];
      if ((news as any).images) {
        const images = (news as any).images;
        if (Array.isArray(images)) {
          imagesArray = images;
        } else if (typeof images === 'object') {
          try {
            const values = Object.values(images);
            imagesArray = values.filter((v: any) => typeof v === 'string') as string[];
          } catch (e) {
            logger.warn(`Ошибка обработки images для новости ${id}:`, e);
          }
        } else if (typeof images === 'string') {
          try {
            const parsed = JSON.parse(images);
            imagesArray = Array.isArray(parsed) ? parsed : [parsed];
          } catch (e) {
            imagesArray = [images];
          }
        }
      }

      return {
        ...news,
        images: imagesArray,
      };
    } catch (error: any) {
      logger.error(`Ошибка при получении новости ${id}`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Создать новость
   */
  async createNews(dto: CreateNewsDto, authorId: string) {
    try {
      logger.debug(`Создание новости: ${dto.title} автором ${authorId}`);

      const news = await prisma.news.create({
        data: {
          title: dto.title,
          content: dto.content,
          category: dto.category,
          images: dto.images || [],
          attachments: dto.attachments || [],
          authorId,
        },
        include: {
          author: {
            include: {
              profile: true,
            },
          },
        },
      });

      logger.info(`Создана новость: ${news.title} (ID: ${news.id})`);

      // Отправляем real-time обновление
      if (global.io) {
        global.io.emit('news:created', news);
      }

      return news;
    } catch (error: any) {
      logger.error('Ошибка при создании новости', {
        error: error.message,
        title: dto.title,
        authorId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Обновить новость
   */
  async updateNews(id: string, dto: UpdateNewsDto, userId: string) {
    try {
      const news = await prisma.news.findUnique({
        where: { id },
      });

      if (!news) {
        logger.warn(`Попытка обновить несуществующую новость: ${id}`);
        throw new Error('Новость не найдена');
      }

      // Проверяем права (только автор или админ может редактировать)
      if (news.authorId !== userId) {
        // Проверяем, является ли пользователь админом
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
          logger.warn(`Попытка редактирования новости другим пользователем: ${userId}, автор: ${news.authorId}`);
          throw new Error('Недостаточно прав для редактирования новости');
        }
      }

      const updatedNews = await prisma.news.update({
        where: { id },
        data: {
          title: dto.title,
          content: dto.content,
          category: dto.category,
          images: dto.images,
          attachments: dto.attachments,
        },
        include: {
          author: {
            include: {
              profile: true,
            },
          },
        },
      });

      logger.info(`Обновлена новость: ${updatedNews.title} (ID: ${updatedNews.id})`);

      // Отправляем real-time обновление
      if (global.io) {
        global.io.emit('news:updated', updatedNews);
      }

      return updatedNews;
    } catch (error: any) {
      logger.error(`Ошибка при обновлении новости ${id}`, {
        error: error.message,
        userId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Удалить новость
   */
  async deleteNews(id: string, userId: string) {
    try {
      const news = await prisma.news.findUnique({
        where: { id },
      });

      if (!news) {
        logger.warn(`Попытка удалить несуществующую новость: ${id}`);
        throw new Error('Новость не найдена');
      }

      // Проверяем права
      if (news.authorId !== userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
          logger.warn(`Попытка удаления новости другим пользователем: ${userId}, автор: ${news.authorId}`);
          throw new Error('Недостаточно прав для удаления новости');
        }
      }

      await prisma.news.delete({
        where: { id },
      });

      logger.info(`Удалена новость: ${news.title} (ID: ${news.id})`);

      // Отправляем real-time обновление
      if (global.io) {
        global.io.emit('news:deleted', { id });
      }

      return { success: true };
    } catch (error: any) {
      logger.error(`Ошибка при удалении новости ${id}`, {
        error: error.message,
        userId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить последние новости
   */
  async getLatestNews(limit: number = 5) {
    try {
      const news = await prisma.news.findMany({
        take: limit,
        include: {
          author: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      logger.debug(`Получено ${news.length} последних новостей`);
      return news;
    } catch (error: any) {
      logger.error('Ошибка при получении последних новостей', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить новости по категории
   */
  async getNewsByCategory(category: string, page: number = 1, limit: number = 10) {
    try {
      return await this.getAllNews(page, limit, category);
    } catch (error: any) {
      logger.error('Ошибка при получении новостей по категории', {
        error: error.message,
        category,
        stack: error.stack,
      });
      throw error;
    }
  }
}

