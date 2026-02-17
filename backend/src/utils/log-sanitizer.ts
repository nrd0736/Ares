/**
 * Модуль санитизации персональных данных в логах
 * 
 * Функциональность:
 * - Удаление чувствительных данных из логов (email, телефоны, пароли и т.д.)
 * - Рекурсивная обработка объектов и массивов
 * - Защита от утечки персональных данных через системные логи
 * 
 * Важно: Все логи проходят через эту санитизацию перед записью
 */

// Список полей, которые содержат чувствительные данные
const SENSITIVE_FIELDS = [
  'email',
  'password',
  'passwordHash',
  'token',
  'secret',
  'apiKey',
  'authorization',
  'cookie',
  'session',
  'phone',
  'phoneNumber',
  'passport',
  'passportNumber',
  'creditCard',
  'cardNumber',
  'ssn',
  'socialSecurityNumber',
];

// Регулярные выражения для поиска email и телефонов в тексте
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

/**
 * Санитизация данных (объекты, массивы, строки)
 * Рекурсивно обходит структуру и заменяет чувствительные данные на [REDACTED]
 */
export function sanitizeLogData(data: any): any {
  // Пропускаем null и undefined
  if (data === null || data === undefined) {
    return data;
  }

  // Обработка строк: заменяем email и телефоны
  if (typeof data === 'string') {
    let sanitized = data;
    sanitized = sanitized.replace(EMAIL_REGEX, '[EMAIL_REDACTED]');
    sanitized = sanitized.replace(PHONE_REGEX, '[PHONE_REDACTED]');
    return sanitized;
  }

  // Обработка массивов: рекурсивно санитизируем каждый элемент
  if (Array.isArray(data)) {
    return data.map(item => sanitizeLogData(item));
  }

  // Обработка объектов: проверяем каждое поле
  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      // Если поле в списке чувствительных - заменяем значение
      if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } 
      // Если в строке найден email - заменяем
      else if (typeof value === 'string' && EMAIL_REGEX.test(value)) {
        sanitized[key] = value.replace(EMAIL_REGEX, '[EMAIL_REDACTED]');
      } 
      // Если в строке найден телефон - заменяем
      else if (typeof value === 'string' && PHONE_REGEX.test(value)) {
        sanitized[key] = value.replace(PHONE_REGEX, '[PHONE_REDACTED]');
      } 
      // Иначе рекурсивно обрабатываем значение
      else {
        sanitized[key] = sanitizeLogData(value);
      }
    }
    return sanitized;
  }

  // Для остальных типов (number, boolean и т.д.) возвращаем как есть
  return data;
}

/**
 * Санитизация текстовых сообщений логов
 * Заменяет email и телефоны в тексте сообщения
 */
export function sanitizeLogMessage(message: string): string {
  let sanitized = message;
  sanitized = sanitized.replace(EMAIL_REGEX, '[EMAIL_REDACTED]');
  sanitized = sanitized.replace(PHONE_REGEX, '[PHONE_REDACTED]');
  return sanitized;
}

