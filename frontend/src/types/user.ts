/**
 * Модуль типов для пользователей
 * 
 * Типы:
 * - UserRole - роли пользователей в системе
 * - User - интерфейс пользователя с профилем
 */

export type UserRole = 'ADMIN' | 'JUDGE' | 'COACH' | 'ATHLETE' | 'MODERATOR' | 'GUEST';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  profile?: {
    firstName: string;
    lastName: string;
    middleName?: string;
    phone?: string;
    avatarUrl?: string;
  };
}

