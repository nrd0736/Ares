/**
 * Модуль типов и схем валидации для новостей
 * 
 * Функциональность:
 * - Zod схемы для валидации операций с новостями
 * - TypeScript интерфейсы для DTO
 * 
 * Схемы:
 * - createNewsSchema - создание новости
 * - updateNewsSchema - обновление новости
 */

import { z } from 'zod';

// Схема для создания новости
export const createNewsSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Заголовок обязателен'),
    content: z.string().min(1, 'Содержание обязательно'),
    category: z.string().optional(),
    images: z.array(z.string()).optional(), // Убираем .url() валидацию, так как пути могут быть относительными
    attachments: z.array(z.string()).optional(),
  }),
});

// Схема для обновления новости
export const updateNewsSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    content: z.string().min(1).optional(),
    category: z.string().optional(),
    images: z.array(z.string()).optional(), // Убираем .url() валидацию, так как пути могут быть относительными
    attachments: z.array(z.string()).optional(),
  }),
  params: z.object({
    id: z.string().uuid('Некорректный ID новости'),
  }),
});

// Типы для DTO
export interface CreateNewsDto {
  title: string;
  content: string;
  category?: string;
  images?: string[];
  attachments?: string[];
}

export interface UpdateNewsDto {
  title?: string;
  content?: string;
  category?: string;
  images?: string[];
  attachments?: string[];
}

