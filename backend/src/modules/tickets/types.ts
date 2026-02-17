/**
 * Модуль типов и схем валидации для системы обращений
 * 
 * Функциональность:
 * - Zod схемы для валидации операций с обращениями
 * - TypeScript интерфейсы для DTO
 * 
 * Схемы:
 * - createTicketSchema - создание обращения
 * - updateTicketStatusSchema - изменение статуса обращения
 * - replyTicketSchema - ответ на обращение
 */

import { z } from 'zod';
import { TicketStatus } from '@prisma/client';

// Схема для создания обращения
export const createTicketSchema = z.object({
  body: z.object({
    subject: z.string().min(1, 'Тема обязательна'),
    message: z.string().min(1, 'Сообщение обязательно'),
    category: z.string().optional(),
  }),
});

// Схема для обновления статуса обращения
export const updateTicketStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(TicketStatus),
  }),
  params: z.object({
    id: z.string().uuid('Некорректный ID обращения'),
  }),
});

// Типы для DTO
export interface CreateTicketDto {
  subject: string;
  message: string;
  category?: string;
}

export interface UpdateTicketStatusDto {
  status: TicketStatus;
}

// Схема для ответа на обращение
export const replyTicketSchema = z.object({
  body: z.object({
    reply: z.string().min(1, 'Ответ обязателен'),
    status: z.nativeEnum(TicketStatus).optional(),
  }),
  params: z.object({
    id: z.string().uuid('Некорректный ID обращения'),
  }),
});

export interface ReplyTicketDto {
  reply: string;
  status?: TicketStatus;
}

