/**
 * Модуль типов и схем валидации для настроек организации
 * 
 * Функциональность:
 * - Zod схемы для валидации операций с настройками организации
 * - TypeScript интерфейсы для DTO
 * 
 * Схемы:
 * - createOrganizationSettingsSchema - создание настроек
 * - updateOrganizationSettingsSchema - обновление настроек
 */

import { z } from 'zod';

// Валидация для URL или относительного пути - принимаем любую строку или null
const urlOrPathSchema = z.union([z.string(), z.null()]).optional();

// Валидация для элементов массива
const urlOrPathItemSchema = z.string();

export const createOrganizationSettingsSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Название организации обязательно'),
    description: z.union([z.string(), z.null()]).optional(),
    content: z.union([z.string(), z.null()]).optional(),
    logoUrl: urlOrPathSchema,
    images: z.array(urlOrPathItemSchema).optional().default([]),
  }),
});

export const updateOrganizationSettingsSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Название организации обязательно').optional(),
    description: z.union([z.string(), z.null()]).optional(),
    content: z.union([z.string(), z.null()]).optional(),
    logoUrl: urlOrPathSchema,
    images: z.array(urlOrPathItemSchema).optional(),
  }),
});

export type CreateOrganizationSettingsDto = z.infer<typeof createOrganizationSettingsSchema>['body'];
export type UpdateOrganizationSettingsDto = z.infer<typeof updateOrganizationSettingsSchema>['body'];

