/**
 * Модуль валидации входных данных
 * 
 * Функциональность:
 * - Валидация данных запросов с помощью Zod схем
 * - Проверка body, query и params
 * - Автоматическое преобразование типов данных
 * - Детальные сообщения об ошибках валидации
 * - Защита от невалидных данных на входе в API
 * 
 * Использование:
 * app.post('/api/users', validate(userCreateSchema), controller.create)
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Middleware валидации с использованием Zod схемы
 * 
 * Принимает Zod схему и возвращает middleware функцию
 * Валидирует body, query и params запроса
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Валидируем данные запроса по схеме
      const validated = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      // Заменяем данные в request на валидированные
      // Это обеспечивает типобезопасность и преобразование типов
      if (validated.body) {
        req.body = validated.body;
      }
      if (validated.query) {
        req.query = validated.query;
      }
      if (validated.params) {
        req.params = validated.params;
      }
      
      next();
    } catch (error) {
      // Обработка ошибок валидации Zod
      if (error instanceof ZodError) {
        // Формируем читаемые сообщения об ошибках
        const errorMessages = (error.errors || []).map((err: any) => {
          const path = (err.path || []).join('.');
          return `${path}: ${err.message || 'Ошибка валидации'}`;
        });
        return res.status(400).json({
          success: false,
          message: errorMessages.length > 0 ? errorMessages[0] : 'Ошибка валидации',
          errors: error.errors || [],
        });
      }
      // Если это не Zod ошибка - логируем и передаем дальше
      console.error('Validation middleware error:', error);
      next(error);
    }
  };
};

