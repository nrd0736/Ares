/**
 * Контроллер управления документами
 * 
 * Функциональность:
 * - getAllCategories() - список всех категорий
 * - getCategoryById() - категория по ID
 * - createCategory() - создание категории
 * - updateCategory() - обновление категории
 * - deleteCategory() - удаление категории
 * - getAllDocuments() - список документов
 * - getDocumentById() - документ по ID
 * - createDocument() - создание документа с загрузкой файла
 * - updateDocument() - обновление документа
 * - deleteDocument() - удаление документа
 * 
 * Права доступа:
 * - Публичные операции доступны всем
 * - Администраторы и модераторы могут управлять документами
 */

import { Request, Response } from 'express';
import { DocumentsService } from '../services/documents.service';
import { AuthRequest } from '../../../middleware/auth';
import logger from '../../../utils/logger';
import {
  CreateDocumentCategoryDto,
  UpdateDocumentCategoryDto,
  CreateDocumentDto,
  UpdateDocumentDto,
} from '../types';
import { validateDocumentFile } from '../../../utils/file-validator';
import fs from 'fs';

export class DocumentsController {
  private documentsService = new DocumentsService();

  // ========== Категории ==========

  /**
   * Получить все категории (публичные для гостей, все для админов)
   */
  async getAllCategories(req: AuthRequest, res: Response) {
    try {
      const categories = await this.documentsService.getAllCategories();
      res.json({
        success: true,
        data: categories,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getAllCategories', {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении категорий',
      });
    }
  }

  /**
   * Получить категорию по ID
   */
  async getCategoryById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const category = await this.documentsService.getCategoryById(id);
      res.json({
        success: true,
        data: category,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getCategoryById', {
        error: error.message,
        categoryId: req.params.id,
      });
      res.status(error.message === 'Категория не найдена' ? 404 : 500).json({
        success: false,
        message: error.message || 'Ошибка при получении категории',
      });
    }
  }

  /**
   * Создать категорию (только для админов)
   */
  async createCategory(req: AuthRequest, res: Response) {
    try {
      const dto: CreateDocumentCategoryDto = req.body;
      const category = await this.documentsService.createCategory(dto);
      res.status(201).json({
        success: true,
        data: category,
        message: 'Категория успешно создана',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере createCategory', {
        error: error.message,
        body: req.body,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при создании категории',
      });
    }
  }

  /**
   * Обновить категорию (только для админов)
   */
  async updateCategory(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const dto: UpdateDocumentCategoryDto = req.body;
      const category = await this.documentsService.updateCategory(id, dto);
      res.json({
        success: true,
        data: category,
        message: 'Категория успешно обновлена',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере updateCategory', {
        error: error.message,
        categoryId: req.params.id,
        body: req.body,
      });
      res.status(error.message === 'Категория не найдена' ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при обновлении категории',
      });
    }
  }

  /**
   * Удалить категорию (только для админов)
   */
  async deleteCategory(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await this.documentsService.deleteCategory(id);
      res.json({
        success: true,
        message: 'Категория успешно удалена',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере deleteCategory', {
        error: error.message,
        categoryId: req.params.id,
      });
      res.status(error.message === 'Категория не найдена' ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при удалении категории',
      });
    }
  }

  // ========== Документы ==========

  /**
   * Получить все документы (для админов) или публичные (для гостей)
   */
  async getAllDocuments(req: AuthRequest, res: Response) {
    try {
      const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'MODERATOR';
      const documents = isAdmin
        ? await this.documentsService.getAllDocuments()
        : await this.documentsService.getPublicDocuments();
      
      res.json({
        success: true,
        data: documents,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getAllDocuments', {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении документов',
      });
    }
  }

  /**
   * Получить документ по ID
   */
  async getDocumentById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const document = await this.documentsService.getDocumentById(id);
      res.json({
        success: true,
        data: document,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getDocumentById', {
        error: error.message,
        documentId: req.params.id,
      });
      res.status(error.message === 'Документ не найден' ? 404 : 500).json({
        success: false,
        message: error.message || 'Ошибка при получении документа',
      });
    }
  }

  /**
   * Создать документ (только для админов)
   */
  async createDocument(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Файл не загружен',
        });
      }

      const isValid = await validateDocumentFile(req.file);
      if (!isValid) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'Недопустимый формат файла',
        });
      }

      const dto: CreateDocumentDto = {
        title: req.body.title,
        description: req.body.description,
        categoryId: req.body.categoryId,
        order: req.body.order ?? 0,
        isPublic: req.body.isPublic ?? true,
        fileUrl: `/uploads/documents/${req.file.filename}`,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      };

      const document = await this.documentsService.createDocument(dto);
      res.status(201).json({
        success: true,
        data: document,
        message: 'Документ успешно создан',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере createDocument', {
        error: error.message,
        body: req.body,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при создании документа',
      });
    }
  }

  /**
   * Обновить документ (только для админов)
   */
  async updateDocument(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const dto: UpdateDocumentDto = {
        ...(req.body.title && { title: req.body.title }),
        ...(req.body.description !== undefined && { description: req.body.description }),
        ...(req.body.categoryId && { categoryId: req.body.categoryId }),
        ...(req.body.order !== undefined && { order: req.body.order }),
        ...(req.body.isPublic !== undefined && { isPublic: req.body.isPublic }),
      };

      if (req.file) {
        const isValid = await validateDocumentFile(req.file);
        if (!isValid) {
          fs.unlinkSync(req.file.path);
          return res.status(400).json({
            success: false,
            message: 'Недопустимый формат файла',
          });
        }

        dto.fileUrl = `/uploads/documents/${req.file.filename}`;
        dto.fileName = req.file.originalname;
        dto.fileSize = req.file.size;
        dto.mimeType = req.file.mimetype;
      }

      const document = await this.documentsService.updateDocument(id, dto);
      res.json({
        success: true,
        data: document,
        message: 'Документ успешно обновлен',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере updateDocument', {
        error: error.message,
        documentId: req.params.id,
        body: req.body,
      });
      res.status(error.message === 'Документ не найден' ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при обновлении документа',
      });
    }
  }

  /**
   * Удалить документ (только для админов)
   */
  async deleteDocument(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await this.documentsService.deleteDocument(id);
      res.json({
        success: true,
        message: 'Документ успешно удален',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере deleteDocument', {
        error: error.message,
        documentId: req.params.id,
      });
      res.status(error.message === 'Документ не найден' ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при удалении документа',
      });
    }
  }
}

