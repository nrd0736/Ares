/**
 * Модуль централизованной обработки ошибок
 * 
 * Функциональность:
 * - Обработка всех необработанных ошибок в приложении
 * - Логирование ошибок с контекстом запроса
 * - Форматирование ответов об ошибках
 * - Скрытие stack trace в production
 * - Специальная обработка Zod ошибок валидации
 * 
 * Использование:
 * - Добавляется последним middleware в Express app
 * - app.use(errorHandler)
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../utils/logger';

// Интерфейс для кастомных ошибок приложения
export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Централизованный обработчик ошибок
 * 
 * Ловит все ошибки которые не были обработаны в роутах/контроллерах
 * и формирует единообразный ответ клиенту
 */
export const errorHandler = (
  err: AppError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Специальная обработка ошибок валидации Zod
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors,
    });
  }

  // Обработка кастомных ошибок приложения
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // Логируем ошибку с контекстом запроса
  logger.error('Ошибка обработки запроса', {
    message,
    statusCode,
    path: req.path,
    method: req.method,
    // Stack trace только в development для отладки
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Отправляем ответ клиенту
  res.status(statusCode).json({
    success: false,
    message,
    // Stack trace в ответе только в development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

