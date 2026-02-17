/**
 * Модуль ограничения частоты запросов (Rate Limiting)
 * 
 * Функциональность:
 * - Защита от DDoS атак и злоупотреблений
 * - Ограничение общих запросов (200 запросов за 15 минут)
 * - Ограничение попыток входа (10 попыток за 15 минут)
 * - Ограничение загрузки файлов (50 загрузок за час)
 * - Логирование превышений лимитов
 * 
 * Настройки читаются из security-config.ts
 * Можно отключить через переменные окружения
 */

import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { securityConfig } from '../utils/security-config';

// Пустой middleware для случаев когда rate limiting отключен
const noopMiddleware = (req: Request, res: Response, next: NextFunction) => {
  next();
};

// Общий rate limiting для всех API endpoints
// Защита от общего спама и DDoS
export const generalRateLimit = securityConfig.features.rateLimiting.enabled &&
  securityConfig.features.rateLimiting.general.enabled
  ? rateLimit({
      windowMs: securityConfig.features.rateLimiting.general.windowMs, // Окно времени (15 минут)
      max: securityConfig.features.rateLimiting.general.max, // Максимум запросов (200)
      message: securityConfig.messages.rateLimitExceeded,
      standardHeaders: true, // Добавлять заголовки RateLimit-*
      legacyHeaders: false, // Не добавлять старые заголовки X-RateLimit-*
      handler: (req: Request, res: Response) => {
        // Логируем превышение лимита
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          path: req.path,
          method: req.method,
        });
        res.status(429).json({
          success: false,
          message: securityConfig.messages.rateLimitExceeded,
        });
      },
    })
  : noopMiddleware;

// Rate limiting для endpoints аутентификации
// Более строгие ограничения для защиты от брутфорса
export const authRateLimit = securityConfig.features.rateLimiting.enabled &&
  securityConfig.features.rateLimiting.auth.enabled
  ? rateLimit({
      windowMs: securityConfig.features.rateLimiting.auth.windowMs, // 15 минут
      max: securityConfig.features.rateLimiting.auth.max, // Только 10 попыток
      message: securityConfig.messages.authRateLimitExceeded,
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: securityConfig.features.rateLimiting.auth.skipSuccessfulRequests, // Не считать успешные входы
      handler: (req: Request, res: Response) => {
        // Логируем подозрительную активность
        logger.warn('Auth rate limit exceeded', {
          ip: req.ip,
          path: req.path,
        });
        res.status(429).json({
          success: false,
          message: securityConfig.messages.authRateLimitExceeded,
        });
      },
    })
  : noopMiddleware;

// Rate limiting для загрузки файлов
// Защита от спама загрузками и переполнения диска
export const uploadRateLimit = securityConfig.features.rateLimiting.enabled &&
  securityConfig.features.rateLimiting.upload.enabled
  ? rateLimit({
      windowMs: securityConfig.features.rateLimiting.upload.windowMs, // 1 час
      max: securityConfig.features.rateLimiting.upload.max, // 50 файлов
      message: securityConfig.messages.uploadRateLimitExceeded,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        // Логируем превышение лимита загрузок
        logger.warn('Upload rate limit exceeded', {
          ip: req.ip,
          path: req.path,
        });
        res.status(429).json({
          success: false,
          message: securityConfig.messages.uploadRateLimitExceeded,
        });
      },
    })
  : noopMiddleware;

