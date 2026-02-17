/**
 * Модуль валидации загружаемых файлов
 * 
 * Функциональность:
 * - Проверка типов файлов по MIME-типу
 * - Проверка сигнатур файлов (magic bytes) для защиты от подмены расширения
 * - Валидация изображений (JPEG, PNG, GIF, WebP)
 * - Валидация документов (PDF, Word, Excel, TXT, CSV)
 * - Защита от path traversal атак
 * - Санитизация имен файлов
 * 
 * Безопасность:
 * - Двойная проверка: MIME-тип + магические байты
 * - Защита от загрузки вредоносных файлов с поддельным расширением
 */

import path from 'path';
import fs from 'fs';

// Разрешенные MIME-типы для изображений
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

// Разрешенные MIME-типы для документов
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

// Магические байты (file signatures) для проверки подлинности файла
// Это первые байты файла, которые однозначно определяют его формат
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [[0x50, 0x4B, 0x03, 0x04], [0x50, 0x4B, 0x05, 0x06], [0x50, 0x4B, 0x07, 0x08]],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [[0x50, 0x4B, 0x03, 0x04], [0x50, 0x4B, 0x05, 0x06], [0x50, 0x4B, 0x07, 0x08]],
  'application/msword': [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]],
  'application/vnd.ms-excel': [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]],
};

/**
 * Проверка магических байтов файла
 * Сравнивает первые байты файла с эталонными для данного типа
 */
function checkMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const magicBytes = MAGIC_BYTES[mimeType];
  if (!magicBytes) {
    return true; // Если нет эталона - пропускаем проверку
  }

  // Проверяем соответствие хотя бы одному шаблону
  return magicBytes.some(pattern => {
    if (buffer.length < pattern.length) {
      return false;
    }
    // Сравниваем каждый байт
    return pattern.every((byte, index) => buffer[index] === byte);
  });
}

/**
 * Валидация файлов изображений
 * 
 * Проверки:
 * 1. Чтение реального содержимого файла
 * 2. Определение типа по содержимому (библиотека file-type)
 * 3. Проверка что тип разрешен
 * 4. Проверка магических байтов
 * 5. Проверка что MIME-тип совпадает с заявленным
 */
export async function validateImageFile(file: Express.Multer.File): Promise<boolean> {
  try {
    // Читаем содержимое файла
    const buffer = fs.readFileSync(file.path);
    
    // Определяем реальный тип файла по его содержимому
    const fileTypeModule = await import('file-type');
    const fileType = await (fileTypeModule.default || fileTypeModule).fromBuffer(buffer);

    if (!fileType) {
      return false;
    }

    // Проверяем что тип файла разрешен
    if (!ALLOWED_IMAGE_TYPES.includes(fileType.mime)) {
      return false;
    }

    // Проверяем магические байты
    if (!checkMagicBytes(buffer, fileType.mime)) {
      return false;
    }

    // Проверяем что заявленный MIME-тип совпадает с реальным
    if (file.mimetype !== fileType.mime) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Определение MIME-типа по расширению файла
 * Используется как fallback если браузер не предоставил MIME-тип
 */
function getMimeTypeFromExtension(filename: string): string | null {
  const ext = path.extname(filename).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
  };
  return mimeMap[ext] || null;
}

/**
 * Валидация файлов документов (PDF, Word, Excel и т.д.)
 * 
 * Особенности:
 * - Документы сложнее проверять чем изображения
 * - Office файлы (.docx, .xlsx) это zip-архивы
 * - Старые Office файлы (.doc, .xls) это OLE-контейнеры
 * - Проверяем структуру файла, а не только расширение
 */
export async function validateDocumentFile(file: Express.Multer.File): Promise<boolean> {
  try {
    // Читаем содержимое файла
    const buffer = fs.readFileSync(file.path);
    
    // Пустой файл - отклоняем
    if (buffer.length === 0) {
      return false;
    }

    let declaredMimeType = file.mimetype;
    
    // Если MIME-тип не указан или универсальный - определяем по расширению
    if (!declaredMimeType || declaredMimeType === 'application/octet-stream') {
      const mimeFromExt = getMimeTypeFromExtension(file.originalname);
      if (mimeFromExt) {
        declaredMimeType = mimeFromExt;
      }
    }

    // Пытаемся определить реальный тип файла
    const fileTypeModule = await import('file-type');
    const fileType = await (fileTypeModule.default || fileTypeModule).fromBuffer(buffer);

    // Проверяем заявленный MIME-тип
    if (ALLOWED_DOCUMENT_TYPES.includes(declaredMimeType)) {
      // Проверка Office Open XML файлов (.docx, .xlsx)
      // Эти файлы являются ZIP-архивами
      if (declaredMimeType.includes('openxml')) {
        // Проверяем что файл действительно ZIP (по сигнатуре PK)
        const isZip = buffer[0] === 0x50 && buffer[1] === 0x4B && 
                     (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
                     (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08);
        if (!isZip) {
          return false;
        }
        return true;
      }

      // Проверка старых Office файлов (.doc, .xls)
      // Они используют формат OLE (Object Linking and Embedding)
      if (declaredMimeType === 'application/msword' || declaredMimeType === 'application/vnd.ms-excel') {
        const isOle = buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0;
        if (!isOle) {
          return false;
        }
        return true;
      }

      // Проверка PDF файлов
      if (declaredMimeType === 'application/pdf') {
        if (!checkMagicBytes(buffer, declaredMimeType)) {
          return false;
        }
        return true;
      }

      // Дополнительная проверка: если file-type определил ZIP, а мы ожидаем openxml - OK
      if (fileType && fileType.mime === 'application/zip' && declaredMimeType.includes('openxml')) {
        return true;
      }

      // Если удалось определить тип и он разрешен - проверяем магические байты
      if (fileType && ALLOWED_DOCUMENT_TYPES.includes(fileType.mime)) {
        if (!checkMagicBytes(buffer, fileType.mime)) {
          return false;
        }
        return true;
      }

      return true;
    }

    // Если заявленный тип не разрешен, проверяем реальный тип
    if (fileType && ALLOWED_DOCUMENT_TYPES.includes(fileType.mime)) {
      if (!checkMagicBytes(buffer, fileType.mime)) {
        return false;
      }
      return true;
    }

    // Если не удалось определить тип - разрешаем (для текстовых файлов)
    if (!fileType) {
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Проверка пути файла на безопасность
 * Защита от path traversal атак (например ../../../etc/passwd)
 * Проверяет что файл находится внутри разрешенной директории
 */
export function validateFilePath(filePath: string, allowedDir: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const resolvedAllowedDir = path.resolve(allowedDir);
  
  return resolvedPath.startsWith(resolvedAllowedDir);
}

/**
 * Санитизация имени файла
 * Удаляет потенциально опасные символы, оставляет только безопасные
 * Разрешены: буквы, цифры, точка, подчеркивание, дефис
 */
export function sanitizeFileName(fileName: string): string {
  const basename = path.basename(fileName);
  return basename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

