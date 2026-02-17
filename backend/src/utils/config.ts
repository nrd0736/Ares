/**
 * Модуль конфигурации приложения
 * 
 * Функциональность:
 * - Загрузка переменных окружения из .env файла
 * - Предоставление централизованного доступа к настройкам
 * - Обертка над security-config для обратной совместимости
 * 
 * Примечание: Основная конфигурация теперь в security-config.ts
 * Этот файл оставлен для обратной совместимости со старым кодом
 */

import dotenv from 'dotenv';
import { securityConfig } from './security-config';

// Загружаем переменные окружения из .env файла
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

// Экспортируем конфигурацию (прокси к security-config)
export const config = {
  port: securityConfig.network.port,
  nodeEnv,
  databaseUrl: securityConfig.database.url,
  // Используем JWT настройки из security-config
  jwtSecret: securityConfig.jwt.secret,
  jwtExpiresIn: securityConfig.jwt.expiresIn,
  // Используем CORS настройки из security-config
  corsOrigin: securityConfig.cors.origin,
  // Используем SMTP настройки из security-config
  smtp: securityConfig.smtp,
  // Используем настройки загрузки из security-config
  uploadDir: securityConfig.upload.dir,
  maxFileSize: securityConfig.upload.maxFileSize,
};

