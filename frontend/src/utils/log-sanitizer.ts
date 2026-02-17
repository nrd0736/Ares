/**
 * Модуль санитизации персональных данных в логах frontend
 * 
 * Функциональность:
 * - Удаление чувствительных данных из логов (email, телефоны, пароли и т.д.)
 * - Рекурсивная обработка объектов и массивов
 * - Защита от утечки персональных данных через консоль браузера
 * 
 * Аналогичен backend версии, но адаптирован для браузера
 */

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

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

export function sanitizeLogData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    let sanitized = data;
    sanitized = sanitized.replace(EMAIL_REGEX, '[EMAIL_REDACTED]');
    sanitized = sanitized.replace(PHONE_REGEX, '[PHONE_REDACTED]');
    return sanitized;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeLogData(item));
  }

  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && EMAIL_REGEX.test(value)) {
        sanitized[key] = value.replace(EMAIL_REGEX, '[EMAIL_REDACTED]');
      } else if (typeof value === 'string' && PHONE_REGEX.test(value)) {
        sanitized[key] = value.replace(PHONE_REGEX, '[PHONE_REDACTED]');
      } else {
        sanitized[key] = sanitizeLogData(value);
      }
    }
    return sanitized;
  }

  return data;
}

export function sanitizeLogMessage(message: string): string {
  let sanitized = message;
  sanitized = sanitized.replace(EMAIL_REGEX, '[EMAIL_REDACTED]');
  sanitized = sanitized.replace(PHONE_REGEX, '[PHONE_REDACTED]');
  // Убираем эмодзи из сообщений
  sanitized = sanitized.replace(/[🔧📦✅❌🚀📝🌐💾⚠️▶️]/g, '').trim();
  return sanitized;
}
