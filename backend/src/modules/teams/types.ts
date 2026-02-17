/**
 * Модуль типов и схем валидации для управления командами
 * 
 * Функциональность:
 * - Zod схемы для валидации операций с командами
 * - TypeScript интерфейсы для DTO
 * - Поддержка модерации команд (статусы: PENDING, APPROVED, REJECTED)
 * 
 * Схемы:
 * - createTeamSchema - создание новой команды
 * - updateTeamSchema - обновление команды
 * - moderateTeamSchema - модерация команды (изменение статуса)
 */

import { z } from 'zod';
import { TeamStatus } from '@prisma/client';

// Схема для создания команды
export const createTeamSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Название команды обязательно'),
    regionId: z.string().uuid('Некорректный ID региона'),
    address: z.string().optional(),
    contactInfo: z.string().optional(),
    description: z.string().optional(),
    logoUrl: z.string().url().optional().or(z.literal('')),
    status: z.nativeEnum(TeamStatus).optional(), // Администратор может указать статус
  }),
});

// Схема для обновления команды
export const updateTeamSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    regionId: z.string().uuid().optional(),
    address: z.string().optional(),
    contactInfo: z.string().optional(),
    description: z.string().optional(),
    logoUrl: z.string().url().optional().or(z.literal('')),
    status: z.nativeEnum(TeamStatus).optional(),
  }),
  params: z.object({
    id: z.string().uuid('Некорректный ID команды'),
  }),
});

// Схема для модерации команды
export const moderateTeamSchema = z.object({
  body: z.object({
    status: z.nativeEnum(TeamStatus),
  }),
  params: z.object({
    id: z.string().uuid('Некорректный ID команды'),
  }),
});

// Типы для DTO
export interface CreateTeamDto {
  name: string;
  regionId: string;
  address?: string;
  contactInfo?: string;
  description?: string;
  logoUrl?: string;
  status?: TeamStatus; // Администратор может указать статус
}

export interface UpdateTeamDto {
  name?: string;
  regionId?: string;
  address?: string;
  contactInfo?: string;
  description?: string;
  logoUrl?: string;
  status?: TeamStatus;
}

