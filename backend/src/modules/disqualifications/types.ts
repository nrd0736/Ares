/**
 * Модуль типов и схем валидации для дисквалификаций
 * 
 * Функциональность:
 * - Zod схемы для валидации операций с дисквалификациями
 * - TypeScript интерфейсы для DTO
 * 
 * Схемы:
 * - createDisqualificationSchema - создание дисквалификации
 * - updateDisqualificationSchema - обновление дисквалификации
 */

import { z } from 'zod';

// Схема для создания дисквалификации
export const createDisqualificationSchema = z.object({
  body: z.object({
    athleteId: z.string().uuid('Некорректный ID спортсмена'),
    competitionId: z.string().uuid('Некорректный ID соревнования'),
    reason: z.string().min(1, 'Причина обязательна'),
    endDate: z.string().datetime().optional(),
  }),
});

// Схема для обновления дисквалификации
export const updateDisqualificationSchema = z.object({
  body: z.object({
    reason: z.string().min(1).optional(),
    endDate: z.string().datetime().optional(),
  }),
  params: z.object({
    id: z.string().uuid('Некорректный ID дисквалификации'),
  }),
});

// Типы для DTO
export interface CreateDisqualificationDto {
  athleteId: string;
  competitionId: string;
  reason: string;
  endDate?: Date;
}

export interface UpdateDisqualificationDto {
  reason?: string;
  endDate?: Date;
}

