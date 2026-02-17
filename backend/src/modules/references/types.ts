/**
 * Модуль типов и схем валидации для справочников
 * 
 * Функциональность:
 * - Zod схемы для валидации операций со справочниками
 * - TypeScript интерфейсы для DTO
 * 
 * Схемы:
 * - createFederalDistrictSchema / updateFederalDistrictSchema - федеральные округа
 * - createRegionSchema / updateRegionSchema - регионы
 * - createSportSchema / updateSportSchema - виды спорта
 * - createWeightCategorySchema / updateWeightCategorySchema - весовые категории
 * - createSportsRankSchema / updateSportsRankSchema - спортивные разряды
 */

import { z } from 'zod';

// Схема для создания федерального округа
export const createFederalDistrictSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Название обязательно'),
    code: z.string().min(1, 'Код обязателен'),
    description: z.string().optional(),
  }),
});

// Схема для создания региона
export const createRegionSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Название обязательно'),
    code: z.string().min(1, 'Код обязателен'),
    federalDistrictId: z.string().uuid('Некорректный ID федерального округа'),
  }),
});

// Схема для создания вида спорта
export const createSportSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Название обязательно'),
    description: z.string().optional(),
    rules: z.string().optional(),
  }),
});

// Схема для создания весовой категории
export const createWeightCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Название обязательно'),
    sportId: z.string().uuid('Некорректный ID вида спорта'),
    minWeight: z.number().optional(),
    maxWeight: z.number().optional(),
  }),
});

// Схема для создания спортивного разряда
export const createSportsRankSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Название обязательно'),
    description: z.string().optional(),
    order: z.number().int().optional(),
  }),
});

// Типы для DTO
export interface CreateFederalDistrictDto {
  name: string;
  code: string;
  description?: string;
}

export interface CreateRegionDto {
  name: string;
  code: string;
  federalDistrictId: string;
}

export interface CreateSportDto {
  name: string;
  description?: string;
  rules?: string;
}

export interface CreateWeightCategoryDto {
  name: string;
  sportId: string;
  minWeight?: number;
  maxWeight?: number;
}

export interface CreateSportsRankDto {
  name: string;
  description?: string;
  order?: number;
}

// Схемы для обновления
export const updateFederalDistrictSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    description: z.string().optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const updateRegionSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    federalDistrictId: z.string().uuid().optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const updateSportSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    rules: z.string().optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const updateWeightCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    sportId: z.string().uuid().optional(),
    minWeight: z.number().optional(),
    maxWeight: z.number().optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const updateSportsRankSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    order: z.number().int().optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

