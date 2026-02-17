/**
 * Модуль типов и схем валидации для турнирных сеток
 * 
 * Функциональность:
 * - Zod схемы для валидации операций с сетками
 * - TypeScript интерфейсы для DTO
 * - Поддержка типов сеток: SINGLE_ELIMINATION, DOUBLE_ELIMINATION, ROUND_ROBIN
 * - Управление матчами и их результатами
 * 
 * Схемы:
 * - createBracketSchema - создание турнирной сетки
 * - updateMatchResultSchema - обновление результата матча
 * - updateMatchSchema - обновление матча (расписание, участники)
 */

import { z } from 'zod';
import { BracketType, MatchStatus } from '@prisma/client';

// Схема для создания турнирной сетки
export const createBracketSchema = z.object({
  body: z.object({
    competitionId: z.string().uuid('Некорректный ID соревнования'),
    weightCategoryId: z.string().uuid('Некорректный ID весовой категории'),
    type: z.nativeEnum(BracketType),
    participants: z.array(z.string().uuid()).min(2, 'Минимум 2 участника'),
  }),
});

// Схема для обновления турнирной сетки
export const updateBracketSchema = z.object({
  params: z.object({
    id: z.string().uuid('Некорректный ID сетки'),
  }),
});

// Схема для обновления результата матча
export const updateMatchResultSchema = z.object({
  body: z.object({
    winnerId: z.string().uuid('Некорректный ID победителя').optional(),
    score: z.any().optional(), // JSON объект с деталями счета
    status: z.nativeEnum(MatchStatus),
  }),
  params: z.object({
    bracketId: z.string().uuid(),
    matchId: z.string().uuid(),
  }),
});

// Схема для обновления матча (включая расписание)
export const updateMatchSchema = z.object({
  body: z.object({
    scheduledTime: z.string().datetime().optional().nullable(),
    athlete1Id: z.string().uuid().optional().nullable(),
    athlete2Id: z.string().uuid().optional().nullable(),
    status: z.nativeEnum(MatchStatus).optional(),
  }),
  params: z.object({
    matchId: z.string().uuid(),
  }),
});

// Типы для DTO
export interface CreateBracketDto {
  competitionId: string;
  weightCategoryId: string;
  type: BracketType;
  participants: string[]; // Массив ID спортсменов
}

export interface CreateTeamBracketDto {
  competitionId: string;
  type: BracketType;
  teamIds: string[]; // Массив ID команд
}

export interface UpdateMatchResultDto {
  winnerId?: string;
  winnerTeamId?: string;
  score?: any;
  status: MatchStatus;
}

export interface UpdateMatchDto {
  scheduledTime?: string | null;
  athlete1Id?: string | null;
  athlete2Id?: string | null;
  status?: MatchStatus;
}

// Структура узла в турнирной сетке
export interface BracketNode {
  id: string;
  matchId?: string;
  athlete1Id?: string;
  athlete2Id?: string;
  team1Id?: string;
  team2Id?: string;
  winnerId?: string;
  winnerTeamId?: string;
  round: number;
  position: number;
  children?: BracketNode[];
  score?: any;
  status?: MatchStatus;
}

