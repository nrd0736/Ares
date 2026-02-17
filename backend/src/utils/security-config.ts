/**
 * Модуль централизованной конфигурации безопасности
 * 
 * Функциональность:
 * - Централизованное управление всеми настройками безопасности приложения
 * - Rate limiting (ограничение частоты запросов)
 * - Helmet (HTTP заголовки безопасности)
 * - CORS (контроль доступа между источниками)
 * - Валидация паролей и JWT токенов
 * - Санитизация логов и HTML контента
 * - Валидация загружаемых файлов
 * 
 * Все настройки читаются из переменных окружения (.env файл)
 * с безопасными значениями по умолчанию
 */

import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

// ==================== ВКЛЮЧЕНИЕ/ОТКЛЮЧЕНИЕ СИСТЕМ БЕЗОПАСНОСТИ ====================

export const securityFeatures = {
  // Rate limiting - ограничение частоты запросов
  rateLimiting: {
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false', // По умолчанию включено
    general: {
      enabled: process.env.GENERAL_RATE_LIMIT_ENABLED !== 'false',
      windowMs: parseInt(process.env.GENERAL_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 минут
      max: parseInt(process.env.GENERAL_RATE_LIMIT_MAX || '200', 10), // Максимум запросов (увеличено со 100 до 200)
    },
    auth: {
      enabled: process.env.AUTH_RATE_LIMIT_ENABLED !== 'false',
      windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 минут
      max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10), // Максимум попыток входа (увеличено с 5 до 10)
      skipSuccessfulRequests: process.env.AUTH_RATE_LIMIT_SKIP_SUCCESS !== 'false',
    },
    upload: {
      enabled: process.env.UPLOAD_RATE_LIMIT_ENABLED !== 'false',
      windowMs: parseInt(process.env.UPLOAD_RATE_LIMIT_WINDOW_MS || '3600000', 10), // 1 час
      max: parseInt(process.env.UPLOAD_RATE_LIMIT_MAX || '50', 10), // Максимум загрузок (увеличено с 20 до 50)
    },
  },

  // Helmet - HTTP заголовки безопасности
  helmet: {
    enabled: process.env.HELMET_ENABLED !== 'false',
  },

  // CORS - Cross-Origin Resource Sharing
  cors: {
    enabled: process.env.CORS_ENABLED !== 'false',
    credentials: process.env.CORS_CREDENTIALS !== 'false',
  },

  // Валидация паролей
  passwordValidation: {
    enabled: process.env.PASSWORD_VALIDATION_ENABLED !== 'false',
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
    requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
    requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
    requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
    requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL === 'true',
    maxLength: parseInt(process.env.PASSWORD_MAX_LENGTH || '128', 10),
  },

  // Валидация JWT токенов
  jwtValidation: {
    enabled: process.env.JWT_VALIDATION_ENABLED !== 'false',
    minSecretLength: parseInt(process.env.JWT_MIN_SECRET_LENGTH || '32', 10),
    requireInProduction: process.env.JWT_REQUIRE_IN_PRODUCTION !== 'false',
  },

  // Логирование чувствительных данных
  logSanitization: {
    enabled: process.env.LOG_SANITIZATION_ENABLED !== 'false',
  },

  // Санитизация HTML контента
  htmlSanitization: {
    enabled: process.env.HTML_SANITIZATION_ENABLED !== 'false',
  },

  // Валидация файлов
  fileValidation: {
    enabled: process.env.FILE_VALIDATION_ENABLED !== 'false',
    checkMagicBytes: process.env.FILE_VALIDATION_CHECK_MAGIC_BYTES !== 'false',
    checkMimeType: process.env.FILE_VALIDATION_CHECK_MIME_TYPE !== 'false',
  },
};

// ==================== JWT НАСТРОЙКИ ====================

const validateJwtSecret = (secret: string | undefined, isProduction: boolean): string => {
  if (!securityFeatures.jwtValidation.enabled) {
    // Если валидация отключена, используем дефолтный ключ
    return secret || 'your-secret-key-for-development-only';
  }

  if (!secret) {
    if (isProduction && securityFeatures.jwtValidation.requireInProduction) {
      throw new Error('JWT_SECRET must be set in production environment');
    }
    // В development возвращаем ключ достаточной длины
    return 'your-secret-key-for-development-only-change-in-production-min-32-chars';
  }

  if (secret.length < securityFeatures.jwtValidation.minSecretLength) {
    throw new Error(
      `JWT_SECRET must be at least ${securityFeatures.jwtValidation.minSecretLength} characters long`
    );
  }

  return secret;
};

export const jwtConfig = {
  secret: validateJwtSecret(process.env.JWT_SECRET, isProduction),
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
};

// ==================== CORS НАСТРОЙКИ ====================

const corsOrigin = (() => {
  if (!securityFeatures.cors.enabled) {
    return '*'; // Разрешить все источники, если CORS отключен
  }

  const origin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  if (isProduction && !origin.match(/^https?:\/\/.+/)) {
    throw new Error('CORS_ORIGIN must be a valid URL in production');
  }
  return origin;
})();

export const corsConfig = {
  origin: corsOrigin,
  credentials: securityFeatures.cors.credentials,
};

// ==================== СООБЩЕНИЯ ОБ ОШИБКАХ ====================

export const securityMessages = {
  rateLimitExceeded: process.env.RATE_LIMIT_MESSAGE || 'Слишком много запросов с этого IP, попробуйте позже',
  authRateLimitExceeded: process.env.AUTH_RATE_LIMIT_MESSAGE || 'Слишком много попыток входа, попробуйте позже',
  uploadRateLimitExceeded: process.env.UPLOAD_RATE_LIMIT_MESSAGE || 'Превышен лимит загрузки файлов',
  authenticationRequired: process.env.AUTH_REQUIRED_MESSAGE || 'Требуется аутентификация',
  insufficientPermissions: process.env.PERMISSIONS_MESSAGE || 'Недостаточно прав доступа',
  invalidToken: process.env.INVALID_TOKEN_MESSAGE || 'Невалидный или истекший токен',
};

// ==================== СЕТЕВЫЕ НАСТРОЙКИ ====================

export const networkConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  // Описание: 0.0.0.0 означает прослушивание на всех сетевых интерфейсах
  // Используйте 127.0.0.1 только если нужен доступ только с локального компьютера
};

// ==================== НАСТРОЙКИ БАЗЫ ДАННЫХ ====================

export const databaseConfig = {
  url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/apec_db?schema=public',
};

// ==================== НАСТРОЙКИ EMAIL (SMTP) ====================

export const smtpConfig = {
  host: process.env.SMTP_HOST || '',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
};

// ==================== НАСТРОЙКИ ЗАГРУЗКИ ФАЙЛОВ ====================

export const uploadConfig = {
  dir: process.env.UPLOAD_DIR || './uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10 MB по умолчанию
};

// ==================== SSL/HTTPS НАСТРОЙКИ ====================

/**
 * SSL/HTTPS configuration
 * 
 * Настройка работы сервера через HTTPS с SSL сертификатами:
 * - HTTPS_ENABLED=true - сервер работает по HTTPS (требуются сертификаты)
 * - HTTPS_ENABLED=false - сервер работает по HTTP (по умолчанию)
 * 
 * Пути к сертификатам:
 * - SSL_CERT_PATH - путь к сертификату (fullchain.pem или certificate.crt)
 * - SSL_KEY_PATH - путь к приватному ключу (privkey.pem или private.key)
 * - SSL_CA_PATH - (опционально) путь к цепочке сертификатов CA
 * - SSL_PASSPHRASE - (опционально) пароль для приватного ключа
 */
export const sslConfig = {
  enabled: process.env.HTTPS_ENABLED === 'true',
  certPath: process.env.SSL_CERT_PATH || '',
  keyPath: process.env.SSL_KEY_PATH || '',
  caPath: process.env.SSL_CA_PATH || '',
  passphrase: process.env.SSL_PASSPHRASE || undefined,
};

// ==================== ЭКСПОРТ КОНФИГУРАЦИИ ====================

export const securityConfig = {
  features: securityFeatures,
  jwt: jwtConfig,
  cors: corsConfig,
  messages: securityMessages,
  network: networkConfig,
  database: databaseConfig,
  smtp: smtpConfig,
  upload: uploadConfig,
  ssl: sslConfig,
  isProduction,
};
