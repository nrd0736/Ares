/**
 * Модуль типов и схем валидации для трансляций
 * 
 * Функциональность:
 * - Zod схемы для валидации операций с трансляциями
 * - TypeScript интерфейсы для DTO
 * 
 * Схемы:
 * - createLiveStreamSchema - создание трансляции
 * - updateLiveStreamSchema - обновление трансляции
 */

import { z } from 'zod';

// Препроцессор для преобразования пустых строк в null
const preprocessCompetitionId = (val: unknown) => {
  if (val === '' || val === undefined) return null;
  return val;
};

const preprocessScheduledTime = (val: unknown) => {
  if (val === '' || val === undefined) return null;
  return val;
};

export const createLiveStreamSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Название обязательно'),
    description: z.string().nullable().optional(),
    rutubeUrl: z.string().url('Некорректная ссылка на Rutube'),
    competitionId: z.preprocess(
      preprocessCompetitionId,
      z.union([
        z.string().uuid('Некорректный ID соревнования'),
        z.null(),
      ]).optional()
    ),
    isActive: z.boolean().optional().default(false),
    scheduledTime: z.preprocess(
      preprocessScheduledTime,
      z.union([
        z.string().datetime('Некорректная дата и время'),
        z.null(),
      ]).optional()
    ),
  }),
});

export const updateLiveStreamSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Название обязательно').optional(),
    description: z.string().nullable().optional(),
    rutubeUrl: z.string().url('Некорректная ссылка на Rutube').optional(),
    competitionId: z.preprocess(
      preprocessCompetitionId,
      z.union([
        z.string().uuid('Некорректный ID соревнования'),
        z.null(),
      ]).optional()
    ),
    isActive: z.boolean().optional(),
    scheduledTime: z.preprocess(
      preprocessScheduledTime,
      z.union([
        z.string().datetime('Некорректная дата и время'),
        z.null(),
      ]).optional()
    ),
  }),
  params: z.object({
    id: z.string().uuid('Некорректный ID трансляции'),
  }),
});

// Типы для DTO (извлекаем только body)
export type CreateLiveStreamDto = z.infer<typeof createLiveStreamSchema>['body'];
export type UpdateLiveStreamDto = z.infer<typeof updateLiveStreamSchema>['body'];

