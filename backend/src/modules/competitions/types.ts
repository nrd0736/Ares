/**
 * Модуль типов и схем валидации для управления соревнованиями
 * 
 * Функциональность:
 * - Zod схемы для валидации операций с соревнованиями
 * - TypeScript интерфейсы для DTO
 * - Поддержка типов соревнований: INDIVIDUAL, TEAM
 * - Управление участниками и их статусами
 * 
 * Схемы:
 * - createCompetitionSchema - создание соревнования
 * - updateCompetitionSchema - обновление соревнования
 * - registerParticipantSchema - регистрация участника
 * - updateParticipantStatusSchema - изменение статуса участника
 */

import { z } from 'zod';
import { CompetitionStatus, ParticipantStatus, CompetitionType } from '@prisma/client';

// Схема для создания соревнования
export const createCompetitionSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Название соревнования обязательно'),
    sportId: z.string().uuid('Некорректный ID вида спорта'),
    competitionType: z.nativeEnum(CompetitionType).default('INDIVIDUAL'),
    startDate: z.string().datetime('Некорректная дата начала'),
    endDate: z.string().datetime('Некорректная дата окончания'),
    location: z.string().optional(),
    description: z.string().optional(),
    organizerInfo: z.string().optional(),
  }),
});

// Схема для обновления соревнования
export const updateCompetitionSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    sportId: z.string().uuid().optional(),
    competitionType: z.nativeEnum(CompetitionType).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    location: z.string().optional(),
    description: z.string().optional(),
    organizerInfo: z.string().optional(),
    status: z.nativeEnum(CompetitionStatus).optional(),
  }),
  params: z.object({
    id: z.string().uuid('Некорректный ID соревнования'),
  }),
});

// Схема для регистрации участника
export const registerParticipantSchema = z.object({
  body: z.object({
    athleteId: z.string().uuid('Некорректный ID спортсмена'),
  }),
  params: z.object({
    id: z.string().uuid('Некорректный ID соревнования'),
  }),
});

// Схема для обновления статуса участника
export const updateParticipantStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(ParticipantStatus),
  }),
  params: z.object({
    competitionId: z.string().uuid(),
    participantId: z.string().uuid(),
  }),
});

// Типы для DTO
export interface CreateCompetitionDto {
  name: string;
  sportId: string;
  competitionType?: CompetitionType;
  startDate: Date;
  endDate: Date;
  location?: string;
  description?: string;
  organizerInfo?: string;
}

export interface UpdateCompetitionDto {
  name?: string;
  sportId?: string;
  competitionType?: CompetitionType;
  startDate?: Date;
  endDate?: Date;
  location?: string;
  description?: string;
  organizerInfo?: string;
  status?: CompetitionStatus;
}

export interface RegisterParticipantDto {
  athleteId: string;
}

