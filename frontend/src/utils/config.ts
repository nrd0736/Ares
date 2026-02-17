/**
 * Модуль централизованной конфигурации frontend
 * 
 * Функциональность:
 * - Настройки API (baseURL, timeout)
 * - Настройки Socket.IO (URL, опции подключения)
 * - Настройки внешних сервисов (зарезервировано)
 * - Настройки разработки (порты, proxy)
 * - Настройки приложения (название, версия)
 * - Настройки аутентификации (ключи хранения, публичные endpoints)
 * - Настройки загрузки файлов (размеры, типы)
 * - Настройки UI/UX (анимации, тема, язык)
 * 
 * Все настройки читаются из переменных окружения (VITE_*)
 */

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;
const mode = import.meta.env.MODE || 'development';

/**
 * Настройки API
 */
export const apiConfig = {
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10),
  // Полный URL для использования вне Vite прокси (например, для изображений)
  fullBaseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
};

/**
 * Настройки Socket.IO
 */
export const socketConfig = {
  url: import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000',
  options: {
    transports: ['websocket', 'polling'] as const,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout: 5000,
  },
};

/**
 * Настройки внешних сервисов (зарезервировано)
 */
export const externalServicesConfig = {};

/**
 * Настройки разработки (фиксированные значения, не из env)
 */
export const devConfig = {
  port: 5173,
  proxy: {
    api: { target: 'http://127.0.0.1:3000' },
    uploads: { target: 'http://127.0.0.1:3000' },
  },
};

import { APP_NAME, APP_VERSION } from '../config/release-constants';

/**
 * Настройки приложения (название и версия задаются в release-constants.ts)
 */
export const appConfig = {
  name: APP_NAME,
  version: APP_VERSION,
  mode,
  isDevelopment,
  isProduction,
};

/**
 * Настройки аутентификации
 */
export const authConfig = {
  // Ключ для хранения токена в localStorage
  tokenStorageKey: 'token',
  // Ключ для хранения пользователя в localStorage
  userStorageKey: 'user',
  // Публичные эндпоинты, которые не требуют авторизации
  publicEndpoints: [
    '/teams/statistics/regions',
    '/organization',
    '/news',
    '/competitions',
    '/competitions/statistics/overview',
    '/live-streams',
    '/documents',
  ],
};

/**
 * Настройки загрузки файлов
 */
export const uploadConfig = {
  // Максимальный размер файла (в байтах)
  maxFileSize: parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '10485760', 10), // 10 MB по умолчанию
  // Разрешенные типы файлов для изображений
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  // Разрешенные типы файлов для документов
  allowedDocumentTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

/**
 * Настройки UI/UX
 */
export const uiConfig = {
  // Включить анимации
  enableAnimations: import.meta.env.VITE_ENABLE_ANIMATIONS !== 'false',
  // Тема по умолчанию
  defaultTheme: import.meta.env.VITE_DEFAULT_THEME || 'light',
  // Язык по умолчанию
  defaultLocale: import.meta.env.VITE_DEFAULT_LOCALE || 'ru',
};

/**
 * Экспорт всех настроек
 */
export const config = {
  api: apiConfig,
  socket: socketConfig,
  externalServices: externalServicesConfig,
  dev: devConfig,
  app: appConfig,
  auth: authConfig,
  upload: uploadConfig,
  ui: uiConfig,
};

export default config;
