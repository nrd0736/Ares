/**
 * Модуль маршрутов управления документами
 * 
 * Функциональность:
 * - GET /categories - список категорий (публичный)
 * - GET /categories/:id - категория по ID (публичный)
 * - GET / - список документов (публичный)
 * - GET /:id - документ по ID (публичный)
 * - POST /categories - создание категории (ADMIN, MODERATOR)
 * - PUT /categories/:id - обновление категории (ADMIN, MODERATOR)
 * - DELETE /categories/:id - удаление категории (ADMIN, MODERATOR)
 * - POST / - создание документа с загрузкой файла (ADMIN, MODERATOR)
 * - PUT /:id - обновление документа (ADMIN, MODERATOR)
 * - DELETE /:id - удаление документа (ADMIN, MODERATOR)
 * 
 * Особенности:
 * - Публичные маршруты для просмотра документов
 * - Загрузка файлов через uploadDocumentFile middleware
 * - Организация документов по категориям
 */

import { Router } from 'express';
import { DocumentsController } from './controllers/documents.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import {
  createDocumentCategorySchema,
  updateDocumentCategorySchema,
  createDocumentSchema,
  updateDocumentSchema,
} from './types';
import { uploadDocumentFile } from '../../middleware/upload';

const router = Router();
const documentsController = new DocumentsController();

// Публичные маршруты (для гостей)
router.get('/categories', documentsController.getAllCategories.bind(documentsController));
router.get('/categories/:id', documentsController.getCategoryById.bind(documentsController));
router.get('/', documentsController.getAllDocuments.bind(documentsController));
router.get('/:id', documentsController.getDocumentById.bind(documentsController));

// Защищенные маршруты для админов
router.use(authenticate);
router.use(authorize('ADMIN', 'MODERATOR'));

// Категории
router.post(
  '/categories',
  validate(createDocumentCategorySchema),
  documentsController.createCategory.bind(documentsController)
);

router.put(
  '/categories/:id',
  validate(updateDocumentCategorySchema),
  documentsController.updateCategory.bind(documentsController)
);

router.delete(
  '/categories/:id',
  documentsController.deleteCategory.bind(documentsController)
);

// Документы
router.post(
  '/',
  uploadDocumentFile,
  validate(createDocumentSchema),
  documentsController.createDocument.bind(documentsController)
);

router.put(
  '/:id',
  uploadDocumentFile,
  validate(updateDocumentSchema),
  documentsController.updateDocument.bind(documentsController)
);

router.delete(
  '/:id',
  documentsController.deleteDocument.bind(documentsController)
);

export default router;

