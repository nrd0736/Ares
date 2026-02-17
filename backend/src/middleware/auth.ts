/**
 * Модуль аутентификации и авторизации
 * 
 * Функциональность:
 * - Проверка JWT токенов
 * - Извлечение данных пользователя из токена
 * - Проверка прав доступа по ролям
 * - Опциональная аутентификация для гостевых эндпоинтов
 * 
 * Используется как middleware для защиты API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../utils/config';
import { securityConfig } from '../utils/security-config';
import { UserRole } from '@prisma/client';

// Расширенный интерфейс Request с информацией о пользователе
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

/**
 * Middleware аутентификации
 * Проверяет наличие и валидность JWT токена
 * Блокирует доступ если токен отсутствует или невалиден
 */
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Извлекаем токен из заголовка Authorization
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: securityConfig.messages.authenticationRequired,
      });
    }

    // Проверяем подпись токена и извлекаем данные
    const decoded = jwt.verify(token, config.jwtSecret) as {
      id: string;
      email: string;
      role: UserRole;
    };

    // Сохраняем данные пользователя в request для использования в роутах
    req.user = decoded;
    next();
  } catch (error) {
    // Токен невалиден или истек
    return res.status(401).json({
      success: false,
      message: securityConfig.messages.invalidToken,
    });
  }
};

/**
 * Middleware опциональной аутентификации
 * 
 * Использование:
 * - Для гостевых эндпоинтов (доступны всем, но с разным функционалом для авторизованных)
 * - Устанавливает req.user если токен валиден
 * - НЕ блокирует запрос если токена нет или он невалиден
 */
export const optionalAuthenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      try {
        // Пытаемся декодировать токен
        const decoded = jwt.verify(token, config.jwtSecret) as {
          id: string;
          email: string;
          role: UserRole;
        };
        req.user = decoded;
      } catch (error) {
        // Если токен невалидный - просто игнорируем, продолжаем как гостя
      }
    }
    // Продолжаем в любом случае (с пользователем или без)
    next();
  } catch (error) {
    // В случае любой ошибки продолжаем как гостя
    next();
  }
};

/**
 * Middleware авторизации по ролям
 * 
 * Использование:
 * authorize('ADMIN') - только для администраторов
 * authorize('ADMIN', 'MODERATOR') - для админов и модераторов
 * 
 * Проверяет:
 * 1. Пользователь аутентифицирован (req.user существует)
 * 2. Роль пользователя входит в список разрешенных ролей
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Проверяем что пользователь аутентифицирован
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: securityConfig.messages.authenticationRequired,
      });
    }

    // Проверяем что роль пользователя разрешена
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: securityConfig.messages.insufficientPermissions,
      });
    }

    next();
  };
};

