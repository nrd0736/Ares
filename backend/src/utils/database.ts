/**
 * Модуль подключения к базе данных
 * 
 * Функциональность:
 * - Создание единственного экземпляра Prisma Client (singleton)
 * - Автоматическое логирование всех изменений в БД
 * - Graceful shutdown при завершении процесса
 * 
 * Логирование:
 * - Все операции записи (create, update, delete) автоматически логируются
 * - Операции чтения не логируются (для производительности)
 * - Контекст пользователя берется из Express middleware
 */

import { PrismaClient } from '@prisma/client';
import { createLoggingMiddleware } from '../modules/logging/middleware/prisma-logging.middleware';

// Создаем единственный экземпляр Prisma Client
const prisma = new PrismaClient({
  // Логируем только ошибки и предупреждения на уровне Prisma
  log: ['error', 'warn'],
});

// Middleware для автоматического логирования всех изменений в БД
prisma.$use(async (params, next) => {
  // Пропускаем операции чтения (не логируем для производительности)
  if (params.action === 'findMany' || params.action === 'findUnique' || params.action === 'findFirst' || params.action === 'count') {
    return next(params);
  }

  // Пропускаем логирование самих логов (защита от бесконечной рекурсии)
  if (params.model === 'SystemLog') {
    return next(params);
  }

  // Получаем информацию о текущем пользователе из глобального контекста
  // Контекст устанавливается в logging-context.middleware.ts
  const userContext = (global as any).currentUserContext || {};

  // Применяем middleware логирования
  const loggingMiddleware = createLoggingMiddleware(userContext);
  return loggingMiddleware(params, next);
});

export default prisma;

// Graceful shutdown: закрываем соединение с БД при завершении процесса
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

