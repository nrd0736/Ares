/**
 * Модуль типов и схем валидации для уведомлений
 * 
 * Функциональность:
 * - Zod схемы для валидации операций с уведомлениями
 * - TypeScript интерфейсы для DTO
 * 
 * Схемы:
 * - createNotificationSchema - создание уведомления
 * - markAsReadSchema - пометка уведомления как прочитанного
 */

import { z } from 'zod';

// Схема для создания уведомления
export const createNotificationSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Заголовок обязателен'),
    message: z.string().min(1, 'Сообщение обязательно'),
    recipientType: z.enum(['USER', 'TEAM', 'COMPETITION', 'ALL']),
    recipientId: z.string().uuid().optional(),
  }),
});

// Схема для пометки уведомления как прочитанного
export const markAsReadSchema = z.object({
  params: z.object({
    id: z.string().uuid('Некорректный ID уведомления'),
  }),
});

// Типы для DTO
export interface CreateNotificationDto {
  title: string;
  message: string;
  recipientType: 'USER' | 'TEAM' | 'COMPETITION' | 'ALL';
  recipientId?: string;
}

