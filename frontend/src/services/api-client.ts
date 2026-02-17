/**
 * Модуль HTTP клиента для работы с API
 * 
 * Функциональность:
 * - Создание axios инстанса с базовыми настройками
 * - Автоматическое добавление JWT токена к запросам
 * - Обработка ошибок авторизации (401)
 * - Поддержка публичных endpoints (без токена)
 * - Обработка FormData для загрузки файлов
 * 
 * Interceptors:
 * - Request: добавление токена из localStorage
 * - Response: обработка 401 ошибок, редирект на логин
 * 
 * Особенности:
 * - Публичные endpoints не блокируются невалидным токеном
 * - Автоматическое удаление токена при 401 ошибке
 */

import axios from 'axios';
import { config } from '../utils/config';

const apiClient = axios.create({
  baseURL: config.api.baseURL,
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем токен к каждому запросу
apiClient.interceptors.request.use((requestConfig) => {
  const token = localStorage.getItem(config.auth.tokenStorageKey);
  if (token) {
    requestConfig.headers.Authorization = `Bearer ${token}`;
  }
  // Если данные - FormData, удаляем Content-Type, чтобы браузер установил правильный заголовок с boundary
  if (requestConfig.data instanceof FormData) {
    delete requestConfig.headers['Content-Type'];
  }
  return requestConfig;
});

// Обработка ошибок
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Публичные эндпоинты, которые не должны блокироваться невалидным токеном
      // Используем централизованную конфигурацию
      const publicEndpoints = config.auth.publicEndpoints;
      
      const isPublicEndpoint = publicEndpoints.some(endpoint => 
        error.config?.url?.includes(endpoint)
      );
      
      // Если это публичный эндпоинт с невалидным токеном, просто удаляем токен и продолжаем
      if (isPublicEndpoint) {
        localStorage.removeItem(config.auth.tokenStorageKey);
        // Повторяем запрос без токена
        const requestConfig = { ...error.config };
        delete requestConfig.headers.Authorization;
        return apiClient.request(requestConfig);
      }
      
      // Не делаем редирект автоматически, пусть компоненты обрабатывают это
      localStorage.removeItem(config.auth.tokenStorageKey);
      // Только если это не запрос на /auth/me (чтобы избежать бесконечного цикла)
      if (!error.config?.url?.includes('/auth/me')) {
        // Используем setTimeout чтобы избежать проблем с React Router
        setTimeout(() => {
          if (window.location.pathname.startsWith('/admin') || 
              window.location.pathname.startsWith('/judge') || 
              window.location.pathname.startsWith('/coach') || 
              window.location.pathname.startsWith('/athlete') ||
              window.location.pathname.startsWith('/moderator')) {
            window.location.href = '/login';
          }
        }, 100);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

