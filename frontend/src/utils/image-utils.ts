/**
 * Модуль утилит для работы с изображениями
 * 
 * Функциональность:
 * - getImageUrl() - получение полного URL изображения
 * - getAvatarUrl() - получение URL аватара пользователя
 * - getTeamLogoUrl() - получение URL логотипа команды
 * - getCompetitionIconUrl() - получение URL иконки соревнования
 * 
 * Особенности:
 * - Обработка относительных и абсолютных путей
 * - Поддержка пустых значений (возврат пустой строки для дефолтных изображений)
 * - Использование Vite proxy для локальных путей
 */

import { config } from './config';

const API_BASE_URL = config.api.fullBaseURL;

/**
 * Получение полного URL изображения
 */
export const getImageUrl = (imagePath: string | null | undefined, defaultImage: string = '/default-avatar.png'): string => {
  if (!imagePath) {
    // Возвращаем пустую строку, чтобы Avatar использовал иконку по умолчанию
    return '';
  }
  
  // Если это уже полный URL, возвращаем как есть
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Если это путь от корня, используем его напрямую (Vite proxy обработает)
  if (imagePath.startsWith('/')) {
    return imagePath;
  }
  
  return `/${imagePath}`;
};

/**
 * Получить URL аватара пользователя
 */
export const getAvatarUrl = (avatarUrl: string | null | undefined): string => {
  return getImageUrl(avatarUrl, '/default-avatar.png');
};

/**
 * Получить URL логотипа команды
 */
export const getTeamLogoUrl = (logoUrl: string | null | undefined): string => {
  return getImageUrl(logoUrl, '/default-team-logo.png');
};

/**
 * Получить URL иконки соревнования
 */
export const getCompetitionIconUrl = (iconUrl: string | null | undefined): string => {
  return getImageUrl(iconUrl, '/default-competition-icon.png');
};

