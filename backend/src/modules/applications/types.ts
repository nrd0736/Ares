/**
 * Модуль типов и схем валидации для заявок на участие в соревнованиях
 * 
 * Функциональность:
 * - Zod схемы для валидации операций с заявками
 * - TypeScript интерфейсы для DTO
 * - Поддержка статусов: PENDING, APPROVED, REJECTED
 * 
 * Схемы:
 * - createApplicationSchema - создание заявки на соревнование
 * - updateApplicationStatusSchema - изменение статуса заявки (модерация)
 */

import { z } from 'zod';
import { ApplicationStatus } from '@prisma/client';

// Схема для создания заявки на соревнование
export const createApplicationSchema = z.object({
  body: z.object({
    competitionId: z.string().uuid('Некорректный ID соревнования'),
    athleteIds: z.array(z.string().uuid()).min(1, 'Необходимо указать хотя бы одного спортсмена'),
  }),
});

// Схема для обновления статуса заявки
export const updateApplicationStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(ApplicationStatus),
  }),
  params: z.object({
    id: z.string().uuid('Некорректный ID заявки'),
  }),
});

// Типы для DTO
export interface CreateApplicationDto {
  competitionId: string;
  athleteIds: string[]; // Массив ID спортсменов для регистрации
}

export interface UpdateApplicationStatusDto {
  status: ApplicationStatus;
}

