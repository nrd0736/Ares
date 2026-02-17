/**
 * Сервис управления документами
 * 
 * Основная бизнес-логика:
 * - getAllCategories() - получение всех категорий с документами
 * - getCategoryById() - получение категории по ID
 * - createCategory() - создание категории
 * - updateCategory() - обновление категории
 * - deleteCategory() - удаление категории
 * - getAllDocuments() - получение всех документов с фильтрацией
 * - getDocumentById() - получение документа по ID
 * - createDocument() - создание документа
 * - updateDocument() - обновление документа
 * - deleteDocument() - удаление документа и файла
 * 
 * Особенности:
 * - Организация документов по категориям
 * - Поддержка публичных и приватных документов
 * - Сортировка по полю order
 * - Удаление физических файлов при удалении документа
 */

import prisma from '../../../utils/database';
import logger from '../../../utils/logger';
import {
  CreateDocumentCategoryDto,
  UpdateDocumentCategoryDto,
  CreateDocumentDto,
  UpdateDocumentDto,
} from '../types';

export class DocumentsService {
  // ========== Категории ==========

  /**
   * Получить все категории документов
   */
  async getAllCategories() {
    try {
      const categories = await prisma.documentCategory.findMany({
        include: {
          documents: {
            where: { isPublic: true },
            orderBy: { order: 'asc' },
          },
          _count: {
            select: { documents: true },
          },
        },
        orderBy: { order: 'asc' },
      });

      return categories;
    } catch (error: any) {
      logger.error('Ошибка при получении категорий документов', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить категорию по ID
   */
  async getCategoryById(id: string) {
    try {
      const category = await prisma.documentCategory.findUnique({
        where: { id },
        include: {
          documents: {
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!category) {
        throw new Error('Категория не найдена');
      }

      return category;
    } catch (error: any) {
      logger.error(`Ошибка при получении категории ${id}`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Создать категорию
   */
  async createCategory(dto: CreateDocumentCategoryDto) {
    try {
      const category = await prisma.documentCategory.create({
        data: {
          name: dto.name,
          description: dto.description,
          order: dto.order || 0,
        },
      });

      logger.info(`Создана категория документов: ${category.name} (ID: ${category.id})`);
      return category;
    } catch (error: any) {
      logger.error('Ошибка при создании категории документов', {
        error: error.message,
        dto,
      });
      throw error;
    }
  }

  /**
   * Обновить категорию
   */
  async updateCategory(id: string, dto: UpdateDocumentCategoryDto) {
    try {
      const category = await prisma.documentCategory.update({
        where: { id },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.order !== undefined && { order: dto.order }),
        },
      });

      logger.info(`Обновлена категория документов: ${category.name} (ID: ${category.id})`);
      return category;
    } catch (error: any) {
      logger.error(`Ошибка при обновлении категории ${id}`, {
        error: error.message,
        dto,
      });
      throw error;
    }
  }

  /**
   * Удалить категорию
   */
  async deleteCategory(id: string) {
    try {
      // Проверяем, есть ли документы в категории
      const category = await prisma.documentCategory.findUnique({
        where: { id },
        include: {
          _count: {
            select: { documents: true },
          },
        },
      });

      if (!category) {
        throw new Error('Категория не найдена');
      }

      if (category._count.documents > 0) {
        throw new Error('Невозможно удалить категорию, в которой есть документы');
      }

      await prisma.documentCategory.delete({
        where: { id },
      });

      logger.info(`Удалена категория документов: ${category.name} (ID: ${id})`);
      return { success: true };
    } catch (error: any) {
      logger.error(`Ошибка при удалении категории ${id}`, {
        error: error.message,
      });
      throw error;
    }
  }

  // ========== Документы ==========

  /**
   * Получить все документы (для админа)
   */
  async getAllDocuments() {
    try {
      const documents = await prisma.document.findMany({
        include: {
          category: true,
        },
        orderBy: [
          { category: { order: 'asc' } },
          { order: 'asc' },
        ],
      });

      return documents;
    } catch (error: any) {
      logger.error('Ошибка при получении документов', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить публичные документы (для гостей)
   */
  async getPublicDocuments() {
    try {
      const documents = await prisma.document.findMany({
        where: { isPublic: true },
        include: {
          category: true,
        },
        orderBy: [
          { category: { order: 'asc' } },
          { order: 'asc' },
        ],
      });

      return documents;
    } catch (error: any) {
      logger.error('Ошибка при получении публичных документов', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить документ по ID
   */
  async getDocumentById(id: string) {
    try {
      const document = await prisma.document.findUnique({
        where: { id },
        include: {
          category: true,
        },
      });

      if (!document) {
        throw new Error('Документ не найден');
      }

      return document;
    } catch (error: any) {
      logger.error(`Ошибка при получении документа ${id}`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Создать документ
   */
  async createDocument(dto: CreateDocumentDto) {
    try {
      // Проверяем существование категории
      const category = await prisma.documentCategory.findUnique({
        where: { id: dto.categoryId },
      });

      if (!category) {
        throw new Error('Категория не найдена');
      }

      const document = await prisma.document.create({
        data: {
          title: dto.title,
          description: dto.description,
          categoryId: dto.categoryId,
          fileUrl: dto.fileUrl,
          fileName: dto.fileName,
          fileSize: dto.fileSize,
          mimeType: dto.mimeType,
          order: dto.order || 0,
          isPublic: dto.isPublic !== undefined ? dto.isPublic : true,
        },
        include: {
          category: true,
        },
      });

      logger.info(`Создан документ: ${document.title} (ID: ${document.id})`);
      return document;
    } catch (error: any) {
      logger.error('Ошибка при создании документа', {
        error: error.message,
        dto,
      });
      throw error;
    }
  }

  /**
   * Обновить документ
   */
  async updateDocument(id: string, dto: UpdateDocumentDto) {
    try {
      // Если меняется категория, проверяем её существование
      if (dto.categoryId) {
        const category = await prisma.documentCategory.findUnique({
          where: { id: dto.categoryId },
        });

        if (!category) {
          throw new Error('Категория не найдена');
        }
      }

      const document = await prisma.document.update({
        where: { id },
        data: {
          ...(dto.title && { title: dto.title }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.categoryId && { categoryId: dto.categoryId }),
          ...(dto.order !== undefined && { order: dto.order }),
          ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
          ...(dto.fileUrl && { fileUrl: dto.fileUrl }),
          ...(dto.fileName && { fileName: dto.fileName }),
          ...(dto.fileSize !== undefined && { fileSize: dto.fileSize }),
          ...(dto.mimeType !== undefined && { mimeType: dto.mimeType }),
        },
        include: {
          category: true,
        },
      });

      logger.info(`Обновлен документ: ${document.title} (ID: ${document.id})`);
      return document;
    } catch (error: any) {
      logger.error(`Ошибка при обновлении документа ${id}`, {
        error: error.message,
        dto,
      });
      throw error;
    }
  }

  /**
   * Удалить документ
   */
  async deleteDocument(id: string) {
    try {
      const document = await prisma.document.findUnique({
        where: { id },
      });

      if (!document) {
        throw new Error('Документ не найден');
      }

      await prisma.document.delete({
        where: { id },
      });

      logger.info(`Удален документ: ${document.title} (ID: ${id})`);
      return { success: true };
    } catch (error: any) {
      logger.error(`Ошибка при удалении документа ${id}`, {
        error: error.message,
      });
      throw error;
    }
  }
}

