/**
 * Модуль логирования системы
 * 
 * Функциональность:
 * - Создание централизованного логгера на основе Winston
 * - Санитизация персональных данных в логах
 * - Запись логов в файлы (error.log, combined.log, exceptions.log, rejections.log)
 * - Вывод в консоль с цветовым форматированием (только в development)
 * - Циклическая ротация файлов логов при достижении размера 1GB
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import { sanitizeLogData, sanitizeLogMessage } from './log-sanitizer';

// Создаем директорию для логов если её нет
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Кастомный формат для санитизации данных
// Удаляет из логов персональные данные (email, телефоны, пароли и т.д.)
const sanitizeFormat = winston.format((info) => {
  if (info.message) {
    info.message = sanitizeLogMessage(String(info.message));
  }
  if (info.meta) {
    info.meta = sanitizeLogData(info.meta);
  }
  const symMessage = Symbol.for('message');
  if (info[symMessage]) {
    const meta = { ...info };
    delete (meta as Record<string, unknown>).level;
    delete (meta as Record<string, unknown>).message;
    delete (meta as Record<string, unknown>).timestamp;
    delete (meta as Record<string, unknown>)[symMessage as unknown as string];
    (info as Record<symbol, unknown>)[symMessage] = sanitizeLogMessage(String(info[symMessage]));
  }
  return info;
})();

// Формат для записи в файлы (JSON с метаданными)
const logFormat = winston.format.combine(
  sanitizeFormat,
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Формат для вывода в консоль (с цветами и читабельным форматом)
const consoleFormat = winston.format.combine(
  sanitizeFormat,
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const sanitizedMessage = sanitizeLogMessage(String(message ?? ''));
    // Удаляем эмодзи для профессионального вида
    const cleanMessage = sanitizedMessage.replace(/[🔧📦✅❌🚀📝🌐💾⚠️▶️]/g, '').trim();
    
    // Извлекаем уровень лога (удаляем ANSI коды цветов)
    const levelText = String(level ?? '').replace(/\u001b\[.*?m/g, '').toUpperCase();
    
    // Цветовая схема для различных уровней логов
    let coloredLevel;
    let coloredMessage;
    switch (levelText) {
      case 'ERROR':
        coloredLevel = chalk.bold.red(`[${levelText}]`);
        coloredMessage = chalk.red(cleanMessage);
        break;
      case 'WARN':
        coloredLevel = chalk.bold.yellow(`[${levelText}]`);
        coloredMessage = chalk.yellow(cleanMessage);
        break;
      case 'INFO':
        coloredLevel = chalk.bold.green(`[${levelText}]`);
        coloredMessage = chalk.white(cleanMessage);
        break;
      case 'DEBUG':
        coloredLevel = chalk.bold.blue(`[${levelText}]`);
        coloredMessage = chalk.gray(cleanMessage);
        break;
      default:
        coloredLevel = chalk.white(`[${levelText}]`);
        coloredMessage = chalk.white(cleanMessage);
    }
    
    // Формат вывода: [ТИП][время] - сообщение {метаданные}
    const coloredTimestamp = chalk.dim(`[${timestamp}]`);
    let msg = `${coloredLevel}${coloredTimestamp} - ${coloredMessage}`;
    
    // Добавляем метаданные если они есть
    if (Object.keys(meta).length > 0 && meta.service !== 'ares-backend') {
      const sanitizedMeta = sanitizeLogData(meta);
      const filteredMeta = { ...sanitizedMeta };
      delete filteredMeta.service;
      
      if (Object.keys(filteredMeta).length > 0) {
        const metaString = JSON.stringify(filteredMeta);
        // Ограничиваем длину вывода для читабельности
        if (metaString.length > 300) {
          msg += ` ${chalk.dim(metaString.substring(0, 300) + '... [truncated]')}`;
        } else {
          msg += ` ${chalk.cyan(metaString)}`;
        }
      }
    }
    return msg;
  })
);

// Создаем основной логгер с настройками
const logger = winston.createLogger({
  // Уровень логирования: info для production, debug для development
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'ares-backend' },
  transports: [
    // Файл для ошибок (только ERROR уровень) с циклической ротацией
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '1g', // Максимальный размер файла 1GB
      maxFiles: '30d', // Хранить логи за последние 30 дней
      zippedArchive: true, // Сжимать старые логи
    }),
    // Общий файл для всех логов с циклической ротацией
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '1g', // Максимальный размер файла 1GB
      maxFiles: '30d', // Хранить логи за последние 30 дней
      zippedArchive: true, // Сжимать старые логи
    }),
  ],
  // Обработчики необработанных исключений с ротацией
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '1g',
      maxFiles: '30d',
      zippedArchive: true,
    }),
  ],
  // Обработчики необработанных отклоненных промисов с ротацией
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '1g',
      maxFiles: '30d',
      zippedArchive: true,
    }),
  ],
});

// В режиме разработки добавляем вывод в консоль с цветным форматированием
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

export default logger;

