/**
 * Точка входа сервера приложения
 * 
 * Функциональность:
 * - Создание HTTP сервера на основе Express приложения
 * - Инициализация Socket.IO для real-time обновлений
 * - Запуск планировщиков задач (бэкапы, очистка логов)
 * - Обработка graceful shutdown
 * - Обработка ошибок при запуске
 * 
 * Планировщики:
 * - startBackupScheduler - автоматические бэкапы БД
 * - startLogCleanupScheduler - очистка старых логов
 */

import app from './app';
import { config } from './utils/config';
import { securityConfig } from './utils/security-config';
import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { Server } from 'socket.io';
import { initializeSocket } from './sockets/competition-events';
import logger from './utils/logger';
import { startBackupScheduler } from './modules/backups/services/backup-scheduler';
import { startLogCleanupScheduler } from './modules/logging/services/log-cleanup-scheduler';
import * as fs from 'fs';
import * as path from 'path';

// Начало инициализации сервера
logger.info('Server initialization started');

// ==================== СОЗДАНИЕ HTTP/HTTPS СЕРВЕРА ====================

/**
 * Создание HTTP или HTTPS сервера в зависимости от настроек
 * 
 * Если HTTPS_ENABLED=true и указаны пути к сертификатам:
 * - Создается HTTPS сервер с SSL/TLS
 * - Проверяется наличие файлов сертификата и ключа
 * 
 * Если HTTPS_ENABLED=false или сертификаты не указаны:
 * - Создается обычный HTTP сервер
 */
let httpServer: ReturnType<typeof createHttpServer> | ReturnType<typeof createHttpsServer>;
let isHttps = false;

if (securityConfig.ssl.enabled && securityConfig.ssl.certPath && securityConfig.ssl.keyPath) {
  try {
    // Проверяем существование файлов сертификата
    const certPath = path.resolve(securityConfig.ssl.certPath);
    const keyPath = path.resolve(securityConfig.ssl.keyPath);
    
    if (!fs.existsSync(certPath)) {
      throw new Error(`SSL certificate not found at: ${certPath}`);
    }
    
    if (!fs.existsSync(keyPath)) {
      throw new Error(`SSL key not found at: ${keyPath}`);
    }

    // Загружаем сертификаты
    const httpsOptions: any = {
      cert: fs.readFileSync(certPath, 'utf8'),
      key: fs.readFileSync(keyPath, 'utf8'),
    };

    // Опционально: добавляем CA цепочку сертификатов
    if (securityConfig.ssl.caPath) {
      const caPath = path.resolve(securityConfig.ssl.caPath);
      if (fs.existsSync(caPath)) {
        httpsOptions.ca = fs.readFileSync(caPath, 'utf8');
        logger.info('SSL CA chain loaded', { path: caPath });
      } else {
        logger.warn('SSL CA path specified but file not found', { path: caPath });
      }
    }

    // Опционально: добавляем passphrase для приватного ключа
    if (securityConfig.ssl.passphrase) {
      httpsOptions.passphrase = securityConfig.ssl.passphrase;
    }

    // Создаем HTTPS сервер
    httpServer = createHttpsServer(httpsOptions, app);
    isHttps = true;
    
    logger.info('HTTPS server created with SSL certificates', {
      certPath,
      keyPath,
      hasCA: !!securityConfig.ssl.caPath,
      hasPassphrase: !!securityConfig.ssl.passphrase,
    });
  } catch (error: any) {
    logger.error('Failed to create HTTPS server, falling back to HTTP', {
      error: error.message,
      stack: error.stack,
    });
    
    // Fallback на HTTP сервер при ошибке загрузки сертификатов
    httpServer = createHttpServer(app);
    isHttps = false;
  }
} else {
  // Создаем обычный HTTP сервер
  httpServer = createHttpServer(app);
  isHttps = false;
  
  if (securityConfig.ssl.enabled) {
    logger.warn('HTTPS enabled but SSL paths not configured, using HTTP', {
      message: 'Set SSL_CERT_PATH and SSL_KEY_PATH in .env to enable HTTPS',
    });
  } else {
    logger.info('HTTPS disabled, using HTTP');
  }
}

const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigin,
    credentials: true,
  },
});

// Инициализация Socket.IO
try {
  initializeSocket(io);
  logger.info('Socket.IO initialized successfully');
} catch (error: any) {
  logger.error('Socket.IO initialization failed', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
}

// Делаем io доступным глобально для использования в сервисах
global.io = io;

const PORT = config.port || 3000;
const HOST = securityConfig.network.host; // Используем настройку из security-config

logger.info('Server configuration loaded', {
  port: PORT,
  host: HOST,
  environment: config.nodeEnv,
});

// Обработка ошибок при запуске сервера
httpServer.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    logger.error('Port already in use', {
      port: PORT,
      code: error.code,
      message: 'Close another application or change PORT in .env',
    });
    process.exit(1);
  } else {
    logger.error('HTTP server error', {
      error: error.message,
      code: error.code,
      stack: error.stack,
    });
    process.exit(1);
  }
});

// Проверка подключения к базе данных (неблокирующая, с таймаутом)
async function checkDatabaseConnection() {
  try {
    const prisma = await import('./utils/database');
    // Устанавливаем таймаут для быстрой проверки
    const connectPromise = prisma.default.$connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 3000)
    );
    
    await Promise.race([connectPromise, timeoutPromise]);
    logger.info('Database connection established');
    return true;
  } catch (error: any) {
    if (error.message === 'Timeout') {
      logger.warn('Database connection timeout', {
        message: 'Server will start, database will connect on first request',
      });
    } else {
      logger.warn('Database connection error', {
        error: error.message,
        message: 'Server will start, database will connect on first request',
      });
    }
    return false;
  }
}

// Запуск сервера (неблокирующий)
async function startServer() {
  try {
    logger.info('Starting HTTP server');
    
    // Запускаем сервер сразу, проверку БД делаем параллельно
    httpServer.listen(PORT, HOST, () => {
      const protocol = isHttps ? 'https' : 'http';
      const serverUrl = `${protocol}://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`;
      logger.info(`${isHttps ? 'HTTPS' : 'HTTP'} server started successfully`, {
        url: serverUrl,
        protocol,
        port: PORT,
        host: HOST,
        environment: config.nodeEnv,
        corsOrigin: config.corsOrigin,
        ssl: isHttps,
      });
    });

    // Проверяем БД в фоне (не блокируем запуск)
    checkDatabaseConnection().then(async (dbConnected) => {
      if (dbConnected) {
        logger.info('Database connected');
        
        // Запускаем планировщик бэкапов
        try {
          await startBackupScheduler();
          logger.info('Backup scheduler started');
        } catch (error: any) {
          logger.warn('Backup scheduler initialization failed', {
            error: error.message,
            stack: error.stack,
          });
        }

        // Запускаем планировщик очистки логов
        try {
          await startLogCleanupScheduler();
          logger.info('Log cleanup scheduler started');
        } catch (error: any) {
          logger.warn('Log cleanup scheduler initialization failed', {
            error: error.message,
            stack: error.stack,
          });
        }
      }
    }).catch((error) => {
      logger.warn('Database connection check warning', {
        error: error.message,
        stack: error.stack,
      });
    });
  } catch (error: any) {
    logger.error('Server startup failed', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Обработка необработанных ошибок
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: String(promise),
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// Запускаем сервер
logger.info('Starting server process');
startServer().catch((error) => {
  logger.error('Critical server startup error', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

export { io };
