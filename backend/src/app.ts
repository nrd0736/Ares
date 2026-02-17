/**
 * Основной модуль Express приложения
 * 
 * Функциональность:
 * - Настройка всех middleware (безопасность, CORS, сжатие, логирование)
 * - Подключение всех маршрутов API
 * - Настройка статической раздачи файлов
 * - Обработка ошибок
 * 
 * Middleware:
 * - Helmet - HTTP заголовки безопасности
 * - CORS - контроль доступа между источниками
 * - Compression - сжатие ответов
 * - Rate limiting - ограничение частоты запросов
 * - Logging context - контекст для логирования
 * 
 * Маршруты:
 * - /api/auth - аутентификация
 * - /api/users - управление пользователями
 * - /api/teams - управление командами
 * - /api/competitions - управление соревнованиями
 * - /api/brackets - сетки соревнований
 * - /api/applications - заявки на участие
 * - /api/documents - документы
 * - /api/organization - настройки организации
 * - /api/backups - управление бэкапами
 * - /api/logging - логи системы
 * - И другие модули
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { errorHandler } from './middleware/error-handler';
import { config } from './utils/config';
import { securityConfig } from './utils/security-config';
import { generalRateLimit } from './middleware/rate-limit';
import authRoutes from './modules/auth/routes';
import usersRoutes from './modules/users/routes';
import teamsRoutes from './modules/teams/routes';
import competitionsRoutes from './modules/competitions/routes';
import bracketsRoutes from './modules/brackets/routes';
import newsRoutes from './modules/news/routes';
import notificationsRoutes from './modules/notifications/routes';
import applicationsRoutes from './modules/applications/routes';
import referencesRoutes from './modules/references/routes';
import disqualificationsRoutes from './modules/disqualifications/routes';
import ticketsRoutes from './modules/tickets/routes';
import uploadRoutes from './modules/upload/routes';
import liveStreamsRoutes from './modules/live-streams/routes';
import organizationRoutes from './modules/organization/routes';
import backupsRoutes from './modules/backups/routes';
import loggingRoutes from './modules/logging/routes';
import documentsRoutes from './modules/documents/routes';
import frontendLogsRoutes from './modules/logs/routes/frontend-logs.routes';
import { setLoggingContext } from './middleware/logging-context.middleware';
import path from 'path';

const app: Application = express();

// Middleware
if (securityConfig.features.helmet.enabled) {
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "blob:", "http://localhost:*", "https:"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "ws:", "wss:"],
      },
    },
  }));
}
app.use(compression());
if (securityConfig.features.cors.enabled) {
  app.use(cors({
    origin: securityConfig.cors.origin,
    credentials: securityConfig.cors.credentials,
  }));
}
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(generalRateLimit);

// Configure morgan with colors for HTTP status codes
morgan.token('timestamp', () => new Date().toISOString().replace('T', ' ').split('.')[0]);
morgan.token('colored-status', (req, res) => {
  const status = res.statusCode;
  const chalk = require('chalk');
  if (status >= 500) return chalk.bold.red(status);
  if (status >= 400) return chalk.bold.yellow(status);
  if (status >= 300) return chalk.bold.cyan(status);
  if (status >= 200) return chalk.bold.green(status);
  return chalk.white(status);
});
morgan.token('colored-method', (req) => {
  const chalk = require('chalk');
  const method = req.method;
  switch (method) {
    case 'GET': return chalk.blue(method);
    case 'POST': return chalk.green(method);
    case 'PUT': return chalk.yellow(method);
    case 'PATCH': return chalk.yellow(method);
    case 'DELETE': return chalk.red(method);
    default: return chalk.white(method);
  }
});
app.use(morgan((tokens, req, res) => {
  const chalk = require('chalk');
  return [
    chalk.bold.magenta('[HTTP]'),
    chalk.dim(`[${tokens.timestamp(req, res)}]`),
    tokens['colored-method'](req, res),
    chalk.white(tokens.url(req, res)),
    tokens['colored-status'](req, res),
    chalk.dim(`${tokens['response-time'](req, res)} ms`)
  ].join(' ');
}));

// Устанавливаем контекст для логирования (должен быть после express.json, но до роутов)
app.use(setLoggingContext);

// Статическая раздача загруженных файлов с CORS заголовками
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', securityConfig.cors.origin);
  res.header('Access-Control-Allow-Credentials', securityConfig.cors.credentials ? 'true' : 'false');
  next();
}, express.static(path.join(process.cwd(), config.uploadDir || './uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/competitions', competitionsRoutes);
app.use('/api/brackets', bracketsRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/references', referencesRoutes);
app.use('/api/disqualifications', disqualificationsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/live-streams', liveStreamsRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/backups', backupsRoutes);
app.use('/api/logging', loggingRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/logs', frontendLogsRoutes);

// Error handler (должен быть последним)
app.use(errorHandler);

export default app;

