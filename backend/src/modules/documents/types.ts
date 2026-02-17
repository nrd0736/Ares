/**
 * Модуль типов и схем валидации для управления документами
 * 
 * Функциональность:
 * - Zod схемы для валидации операций с документами и категориями
 * - TypeScript интерфейсы для DTO
 * - Поддержка категорий документов
 * - Управление публичностью документов
 * 
 * Схемы:
 * - createDocumentCategorySchema - создание категории
 * - updateDocumentCategorySchema - обновление категории
 * - createDocumentSchema - создание документа
 * - updateDocumentSchema - обновление документа
 */

import { z } from 'zod';

// Схема для создания категории документов
export const createDocumentCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Название категории обязательно'),
    description: z.string().optional(),
    order: z.number().int().optional().default(0),
  }),
});

// Схема для обновления категории документов
export const updateDocumentCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    order: z.number().int().optional(),
  }),
  params: z.object({
    id: z.string().uuid('Некорректный ID категории'),
  }),
});

// Схема для создания документа
export const createDocumentSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Название документа обязательно'),
    description: z.string().optional(),
    categoryId: z.string().uuid('Некорректный ID категории'),
    order: z.union([z.number().int(), z.string()]).transform((val) => {
      if (typeof val === 'string') {
        const num = parseInt(val, 10);
        return isNaN(num) ? 0 : num;
      }
      return val ?? 0;
    }).optional().default(0),
    isPublic: z.union([z.boolean(), z.string()]).transform((val) => {
      if (typeof val === 'string') {
        return val === 'true' || val === '1';
      }
      return val ?? true;
    }).optional().default(true),
  }),
});

// Схема для обновления документа
export const updateDocumentSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    categoryId: z.string().uuid().optional(),
    order: z.union([z.number().int(), z.string()]).transform((val) => {
      if (val === undefined || val === null) return undefined;
      if (typeof val === 'string') {
        const num = parseInt(val, 10);
        return isNaN(num) ? undefined : num;
      }
      return val;
    }).optional(),
    isPublic: z.union([z.boolean(), z.string()]).transform((val) => {
      if (val === undefined || val === null) return undefined;
      if (typeof val === 'string') {
        return val === 'true' || val === '1';
      }
      return val;
    }).optional(),
  }),
  params: z.object({
    id: z.string().uuid('Некорректный ID документа'),
  }),
});

// Типы для DTO
export interface CreateDocumentCategoryDto {
  name: string;
  description?: string;
  order?: number;
}

export interface UpdateDocumentCategoryDto {
  name?: string;
  description?: string;
  order?: number;
}

export interface CreateDocumentDto {
  title: string;
  description?: string;
  categoryId: string;
  order?: number;
  isPublic?: boolean;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType?: string;
}

export interface UpdateDocumentDto {
  title?: string;
  description?: string;
  categoryId?: string;
  order?: number;
  isPublic?: boolean;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

