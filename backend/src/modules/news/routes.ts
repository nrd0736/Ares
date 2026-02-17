/**
 * Модуль маршрутов управления новостями
 * 
 * Функциональность:
 * - GET / - список всех новостей (публичный)
 * - GET /latest - последние новости (публичный)
 * - GET /category/:category - новости по категории (публичный)
 * - GET /:id - получение новости по ID (публичный)
 * - POST / - создание новости (любой авторизованный)
 * - PUT /:id - обновление новости (автор или ADMIN)
 * - DELETE /:id - удаление новости (автор или ADMIN)
 * 
 * Особенности:
 * - Публичные маршруты для просмотра новостей
 * - Любой авторизованный пользователь может создавать новости
 * - Автор может редактировать/удалять свои новости
 */

import { Router } from 'express';
import { NewsController } from './controllers/news.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import {
  createNewsSchema,
  updateNewsSchema,
} from './types';

const router = Router();
const newsController = new NewsController();

// Публичные маршруты (для гостей)
router.get('/', newsController.getAllNews.bind(newsController));
router.get('/latest', newsController.getLatestNews.bind(newsController));
router.get('/category/:category', newsController.getNewsByCategory.bind(newsController));
router.get('/:id', newsController.getNewsById.bind(newsController));

// Маршруты, требующие авторизации
router.use(authenticate);

// Создать новость (любой авторизованный пользователь)
router.post(
  '/',
  validate(createNewsSchema),
  newsController.createNews.bind(newsController)
);

// Обновить новость (автор или админ)
router.put(
  '/:id',
  validate(updateNewsSchema),
  newsController.updateNews.bind(newsController)
);

// Удалить новость (автор или админ)
router.delete(
  '/:id',
  newsController.deleteNews.bind(newsController)
);

export default router;

