/**
 * Контроллер управления новостями
 * 
 * Функциональность:
 * - getAllNews() - список всех новостей с пагинацией
 * - getLatestNews() - последние новости
 * - getNewsByCategory() - новости по категории
 * - getNewsById() - получение новости по ID
 * - createNews() - создание новости
 * - updateNews() - обновление новости
 * - deleteNews() - удаление новости
 * 
 * Права доступа:
 * - Публичные операции доступны всем
 * - Любой авторизованный пользователь может создавать новости
 * - Автор может редактировать/удалять свои новости
 */

import { Request, Response } from 'express';
import { NewsService } from '../services/news.service';
import { AuthRequest } from '../../../middleware/auth';
import logger from '../../../utils/logger';

const newsService = new NewsService();

export class NewsController {
  /**
   * Получить все новости
   */
  async getAllNews(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const category = req.query.category as string | undefined;

      const result = await newsService.getAllNews(page, limit, category);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getAllNews', {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении новостей',
      });
    }
  }

  /**
   * Получить новость по ID
   */
  async getNewsById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const news = await newsService.getNewsById(id);

      res.json({
        success: true,
        data: news,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getNewsById', {
        error: error.message,
        newsId: req.params.id,
      });
      res.status(error.message === 'Новость не найдена' ? 404 : 500).json({
        success: false,
        message: error.message || 'Ошибка при получении новости',
      });
    }
  }

  /**
   * Создать новость
   */
  async createNews(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Требуется авторизация',
        });
      }

      const news = await newsService.createNews(req.body, req.user.id);

      res.status(201).json({
        success: true,
        data: news,
        message: 'Новость успешно создана',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере createNews', {
        error: error.message,
        title: req.body.title,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при создании новости',
      });
    }
  }

  /**
   * Обновить новость
   */
  async updateNews(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Требуется авторизация',
        });
      }

      const { id } = req.params;
      const news = await newsService.updateNews(id, req.body, req.user.id);

      res.json({
        success: true,
        data: news,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере updateNews', {
        error: error.message,
        newsId: req.params.id,
      });
      res.status(
        error.message === 'Новость не найдена' || error.message.includes('прав')
          ? 404
          : 400
      ).json({
        success: false,
        message: error.message || 'Ошибка при обновлении новости',
      });
    }
  }

  /**
   * Удалить новость
   */
  async deleteNews(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Требуется авторизация',
        });
      }

      const { id } = req.params;
      await newsService.deleteNews(id, req.user.id);

      res.json({
        success: true,
        message: 'Новость успешно удалена',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере deleteNews', {
        error: error.message,
        newsId: req.params.id,
      });
      res.status(
        error.message === 'Новость не найдена' || error.message.includes('прав')
          ? 404
          : 400
      ).json({
        success: false,
        message: error.message || 'Ошибка при удалении новости',
      });
    }
  }

  /**
   * Получить последние новости
   */
  async getLatestNews(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const news = await newsService.getLatestNews(limit);

      res.json({
        success: true,
        data: news,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getLatestNews', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении последних новостей',
      });
    }
  }

  /**
   * Получить новости по категории
   */
  async getNewsByCategory(req: Request, res: Response) {
    try {
      const { category } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await newsService.getNewsByCategory(category, page, limit);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getNewsByCategory', {
        error: error.message,
        category: req.params.category,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении новостей по категории',
      });
    }
  }
}

