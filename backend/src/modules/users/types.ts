/**
 * Модуль типов и схем валидации для управления пользователями
 * 
 * Функциональность:
 * - Zod схемы для валидации операций с пользователями
 * - TypeScript интерфейсы для DTO
 * - Поддержка всех ролей: ADMIN, MODERATOR, JUDGE, COACH, ATHLETE
 * - Валидация паролей с использованием password-validator
 * 
 * Схемы:
 * - createUserSchema - создание нового пользователя
 * - updateUserSchema - обновление пользователя
 * - updateProfileSchema - обновление собственного профиля
 * - changePasswordSchema - смена пароля
 */

import { z } from 'zod';
import { UserRole } from '@prisma/client';

import { validatePassword } from '../../utils/password-validator';

// Кастомная валидация пароля
const passwordRefinement = z.string().min(8, 'Пароль должен содержать минимум 8 символов')
  .refine((password) => {
    const validation = validatePassword(password);
    return validation.isValid;
  }, (password) => {
    const validation = validatePassword(password);
    return { message: validation.errors[0] || 'Пароль не соответствует требованиям' };
  });

// Схема для создания пользователя
export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Некорректный формат email'),
    password: passwordRefinement,
    role: z.nativeEnum(UserRole),
    firstName: z.string().min(1, 'Имя обязательно'),
    lastName: z.string().min(1, 'Фамилия обязательна'),
    middleName: z.string().optional(),
    phone: z.string().optional(),
    // Поля для тренера
    teamId: z.string().uuid().optional(),
    // Поля для спортсмена
    coachId: z.string().uuid().optional(),
    weightCategoryId: z.string().uuid().optional(),
    weight: z.number().positive().optional(),
    birthDate: z.string().datetime().optional(),
    gender: z.enum(['MALE', 'FEMALE']).optional(),
    sportsRankId: z.string().uuid().optional(), // ID спортивного разряда
    // Поля для модератора
    description: z.string().optional(),
    allowedTabs: z.array(z.string()).optional(),
    // Поля для судьи
    judgeCity: z.string().optional().nullable(),
    judgeCategory: z.string().optional().nullable(),
    judgePosition: z.string().optional().nullable(),
    judgeRegionId: z.string().uuid().optional().nullable(),
  }),
});

// Схема для обновления пользователя
export const updateUserSchema = z.object({
  body: z.object({
    email: z.string().email('Некорректный формат email').optional(),
    role: z.nativeEnum(UserRole).optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(6, 'Пароль должен содержать минимум 6 символов').optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    middleName: z.string().optional(),
    phone: z.string().optional(),
    avatarUrl: z.string().url().optional().or(z.literal('')),
    // Поля для тренера
    teamId: z.string().uuid().optional(),
    // Поля для спортсмена
    coachId: z.string().uuid().optional(),
    weightCategoryId: z.string().uuid().optional(),
    weight: z.number().positive().optional(),
    birthDate: z.string().datetime().optional(),
    gender: z.enum(['MALE', 'FEMALE']).optional(),
    sportsRankId: z.string().uuid().optional(), // ID спортивного разряда
    // Поля для модератора
    description: z.string().optional(),
    allowedTabs: z.array(z.string()).optional(),
    // Поля для судьи
    judgeCity: z.string().optional().nullable(),
    judgeCategory: z.string().optional().nullable(),
    judgePosition: z.string().optional().nullable(),
    judgeRegionId: z.string().uuid().optional().nullable(),
  }),
  params: z.object({
    id: z.string().uuid('Некорректный ID пользователя'),
  }),
});

// Схема для обновления профиля
export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    middleName: z.string().optional(),
    phone: z.string().optional(),
    avatarUrl: z.string().url().optional().or(z.literal('')),
    // Поля для судьи
    judgeCity: z.string().optional().nullable(),
    judgeCategory: z.string().optional().nullable(),
    judgePosition: z.string().optional().nullable(),
    judgeRegionId: z.string().uuid().optional().nullable(),
  }),
});

// Схема для смены пароля
export const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(1, 'Текущий пароль обязателен'),
    newPassword: passwordRefinement,
  }),
});

// Типы для DTO
export interface CreateUserDto {
  email: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  middleName?: string;
  phone?: string;
  // Поля для тренера
  teamId?: string;
  // Поля для спортсмена
  coachId?: string;
  weightCategoryId?: string;
  weight?: number;
  birthDate?: string;
  gender?: 'MALE' | 'FEMALE';
  sportsRankId?: string; // ID спортивного разряда
  // Поля для судьи
  judgeCity?: string; // Город судьи
  judgeCategory?: string; // Категория судьи (ВК, IК, ЗК и т.д.)
  judgePosition?: string; // Должность судьи
  judgeRegionId?: string; // Регион судьи
  // Поля для модератора
  description?: string;
  allowedTabs?: string[];
}

export interface UpdateUserDto {
  email?: string;
  role?: UserRole;
  isActive?: boolean;
  password?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  phone?: string;
  avatarUrl?: string;
  // Поля для тренера
  teamId?: string;
  // Поля для спортсмена
  coachId?: string;
  weightCategoryId?: string;
  weight?: number;
  birthDate?: string;
  gender?: 'MALE' | 'FEMALE';
  sportsRankId?: string; // ID спортивного разряда
  // Поля для модератора
  description?: string;
  // Поля для судьи
  judgeCity?: string; // Город судьи
  judgeCategory?: string; // Категория судьи (ВК, IК, ЗК и т.д.)
  judgePosition?: string; // Должность судьи
  judgeRegionId?: string; // Регион судьи
  allowedTabs?: string[];
}

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  phone?: string;
  avatarUrl?: string;
  // Поля для судьи
  judgeCity?: string;
  judgeCategory?: string;
  judgePosition?: string;
  judgeRegionId?: string;
}

export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

