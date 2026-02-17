/**
 * Модуль типов и схем валидации для аутентификации
 * 
 * Функциональность:
 * - Zod схемы для валидации запросов входа/регистрации
 * - TypeScript интерфейсы для DTO (Data Transfer Objects)
 * - Валидация паролей с использованием password-validator
 * - Схемы для приглашений пользователей
 * 
 * Поддерживаемые схемы:
 * - loginSchema - вход в систему
 * - registerSchema - регистрация (поддержка спортсменов с тренером)
 * - inviteSchema - приглашение новых пользователей
 */

import { z } from 'zod';
import { UserRole } from '@prisma/client';

import { validatePassword } from '../../utils/password-validator';

// Кастомная валидация пароля с детальными требованиями
const passwordRefinement = z.string().min(8, 'Пароль должен содержать минимум 8 символов')
  .refine((password) => {
    const validation = validatePassword(password);
    return validation.isValid;
  }, (password) => {
    const validation = validatePassword(password);
    return { message: validation.errors[0] || 'Пароль не соответствует требованиям' };
  });

// Схема валидации для входа в систему
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Пароль обязателен'),
  }),
});

// Схема валидации для регистрации
// Поддерживает расширенные данные для спортсменов (тренер, вес, разряд и т.д.)
export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: passwordRefinement,
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    middleName: z.string().optional(),
    phone: z.string().optional(),
    role: z.nativeEnum(UserRole).optional(),
    // Дополнительные поля для регистрации спортсменов
    coachEmail: z.string().email().optional(), // Email тренера
    coachId: z.string().uuid().optional(), // Для обратной совместимости
    birthDate: z.string().optional(),
    gender: z.enum(['MALE', 'FEMALE']).optional(),
    weightCategoryId: z.string().uuid().optional(),
    weight: z.number().positive().optional(),
    sportsRankId: z.string().uuid().optional(),
  }),
});

// Схема валидации для приглашения пользователей
export const inviteSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    role: z.nativeEnum(UserRole),
    teamId: z.string().uuid().optional(), // Для тренеров
  }),
});

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  phone?: string;
  role?: UserRole;
  // Для спортсменов
  coachEmail?: string; // Email тренера вместо ID
  coachId?: string; // Оставляем для обратной совместимости
  birthDate?: string;
  gender?: 'MALE' | 'FEMALE';
  weightCategoryId?: string;
  weight?: number;
  sportsRankId?: string; // ID спортивного разряда
}

export interface InviteDto {
  email: string;
  role: UserRole;
  teamId?: string; // Для тренеров
}

