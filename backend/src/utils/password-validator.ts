/**
 * Модуль валидации паролей
 * 
 * Функциональность:
 * - Проверка надежности пароля (длина, символы, регистр)
 * - Определение силы пароля (слабый/средний/сильный)
 * - Возврат детальных ошибок для пользователя
 * 
 * Требования к паролю:
 * - Минимум 8 символов
 * - Максимум 128 символов
 * - Хотя бы одна заглавная буква
 * - Хотя бы одна строчная буква
 * - Хотя бы одна цифра
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Валидация пароля по заданным правилам
 * Возвращает список ошибок если пароль не соответствует требованиям
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Пароль должен содержать минимум 8 символов');
  }

  if (password.length > 128) {
    errors.push('Пароль не должен превышать 128 символов');
  }

  if (!/[A-ZА-Я]/.test(password)) {
    errors.push('Пароль должен содержать хотя бы одну заглавную букву');
  }

  if (!/[a-zа-я]/.test(password)) {
    errors.push('Пароль должен содержать хотя бы одну строчную букву');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Пароль должен содержать хотя бы одну цифру');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Определение силы пароля
 * 
 * Критерии:
 * - weak: меньше 8 символов или только базовые требования
 * - medium: 12+ символов, разные типы символов
 * - strong: 12+ символов, все типы символов включая спецсимволы
 */
export function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  if (password.length < 8) return 'weak';
  
  let strength = 0;
  
  // Начисляем баллы за различные критерии
  if (password.length >= 12) strength++; // Длина 12+
  if (/[A-ZА-Я]/.test(password)) strength++; // Заглавные буквы
  if (/[a-zа-я]/.test(password)) strength++; // Строчные буквы
  if (/[0-9]/.test(password)) strength++; // Цифры
  if (/[^A-Za-zА-Яа-я0-9]/.test(password)) strength++; // Спецсимволы
  
  // Определяем силу на основе баллов
  if (strength <= 2) return 'weak';
  if (strength <= 4) return 'medium';
  return 'strong';
}

