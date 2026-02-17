/**
 * Модуль типов и схем валидации для резервного копирования
 * 
 * Функциональность:
 * - Zod схемы для валидации операций с бэкапами
 * - TypeScript интерфейсы для DTO
 * 
 * Схемы:
 * - createBackupSchema - создание бэкапа (JSON или CSV)
 * - updateBackupSettingsSchema - настройки автоматического резервного копирования
 * - importBackupSchema - импорт данных из бэкапа
 */

import { z } from 'zod';

// Схема для создания бэкапа
export const createBackupSchema = z.object({
  body: z.object({
    format: z.enum(['json', 'csv']).default('json'),
    description: z.string().optional().nullable(),
  }),
});

// Схема для настройки автоматического резервного копирования
export const updateBackupSettingsSchema = z.object({
  body: z.object({
    enabled: z.boolean(),
    interval: z.enum(['daily', 'weekly', 'monthly']).optional(),
    time: z.string().optional(), // Время в формате HH:mm
    maxBackups: z.number().int().min(1).max(100).optional(), // Максимальное количество хранимых бэкапов
  }),
});

// Схема для импорта данных
export const importBackupSchema = z.object({
  body: z.object({
    format: z.enum(['json', 'csv']),
    data: z.any(), // Данные для импорта
    clearBeforeImport: z.boolean().default(false), // Очистить БД перед импортом
  }),
});

export type CreateBackupDto = z.infer<typeof createBackupSchema>['body'];
export type UpdateBackupSettingsDto = z.infer<typeof updateBackupSettingsSchema>['body'];
export type ImportBackupDto = z.infer<typeof importBackupSchema>['body'];

