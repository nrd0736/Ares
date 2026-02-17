/**
 * Модуль загрузки файлов
 * 
 * Функциональность:
 * - Настройка Multer для обработки загрузки файлов
 * - Организация файлов по категориям (аватары, логотипы, документы и т.д.)
 * - Валидация типов файлов (изображения, документы)
 * - Санитизация имен файлов
 * - Защита от path traversal атак
 * - Ограничение размеров файлов
 * 
 * Структура папок:
 * uploads/
 *   ├── avatars/ - аватары пользователей
 *   ├── team-logos/ - логотипы команд
 *   ├── competition-icons/ - иконки соревнований
 *   ├── news-images/ - изображения новостей
 *   ├── organization/ - файлы организации
 *   └── documents/ - документы
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { config } from '../utils/config';
import { validateImageFile, validateDocumentFile, sanitizeFileName, validateFilePath } from '../utils/file-validator';

// Определяем пути к директориям для разных типов файлов
const uploadsDir = path.join(process.cwd(), config.uploadDir || './uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');
const teamLogosDir = path.join(uploadsDir, 'team-logos');
const competitionIconsDir = path.join(uploadsDir, 'competition-icons');
const newsImagesDir = path.join(uploadsDir, 'news-images');
const organizationDir = path.join(uploadsDir, 'organization');
const documentsDir = path.join(uploadsDir, 'documents');

// Создаем все необходимые директории при старте приложения
[uploadsDir, avatarsDir, teamLogosDir, competitionIconsDir, newsImagesDir, organizationDir, documentsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Настройка хранилища Multer
// Определяет куда и как сохранять файлы
const storage = multer.diskStorage({
  // Определение директории назначения на основе URL запроса
  destination: (req: Request, file: Express.Multer.File, cb) => {
    let uploadPath = uploadsDir;
    
    // Получаем полный URL запроса для определения типа файла
    const url = req.originalUrl || req.url || req.path;
    
    // Проверяем параметр folder из query string
    // Используется универсальным endpoint /upload
    const folder = (req.query as any)?.folder;
    
    // Определяем директорию на основе URL или query параметра
    if (folder === 'organization') {
      uploadPath = organizationDir;
    } else if (url.includes('/avatar')) {
      uploadPath = avatarsDir;
    } else if (url.includes('/team-logo')) {
      uploadPath = teamLogosDir;
    } else if (url.includes('/competition-icon')) {
      uploadPath = competitionIconsDir;
    } else if (url.includes('/news-image')) {
      uploadPath = newsImagesDir;
    } else if (url.includes('/document')) {
      uploadPath = documentsDir;
    }
    
    // Защита от path traversal атак
    // Проверяем что итоговый путь находится внутри uploads директории
    const resolvedPath = path.resolve(uploadPath);
    const resolvedUploadsDir = path.resolve(uploadsDir);
    
    if (!resolvedPath.startsWith(resolvedUploadsDir)) {
      cb(new Error('Недопустимый путь для загрузки'), '');
      return;
    }
    
    cb(null, uploadPath);
  },
  
  // Генерация уникального имени файла
  filename: (req: Request, file: Express.Multer.File, cb) => {
    // Санитизируем имя файла (удаляем опасные символы)
    const sanitizedName = sanitizeFileName(file.originalname);
    // Добавляем уникальный суффикс для предотвращения коллизий
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(sanitizedName);
    const name = path.basename(sanitizedName, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// Фильтр для изображений
// Разрешает только файлы изображений (аватары, логотипы, иконки)
const imageFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Разрешены только изображения (JPEG, PNG, GIF, WebP)'));
  }
};

// Фильтр для документов
// Разрешает любые типы файлов (PDF, Word, Excel, текст и т.д.)
const documentFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Для документов разрешаем любые файлы
  // Детальная проверка типа будет в валидаторе
  cb(null, true);
};

// Конфигурация Multer для изображений
// Ограничение: 10MB
export const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB по умолчанию
  },
});

// Конфигурация Multer для документов
// Ограничение: 50MB (больше чем для изображений)
export const uploadDocument = multer({
  storage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// Экспорт готовых middleware для разных типов загрузок

// Загрузка аватара пользователя
export const uploadAvatar = upload.single('avatar');

// Загрузка логотипа команды
export const uploadTeamLogo = upload.single('logo');

// Загрузка иконки соревнования
export const uploadCompetitionIcon = upload.single('icon');

// Загрузка изображения для новости
export const uploadNewsImage = upload.single('image');

// Универсальная загрузка файла (изображения)
export const uploadFile = upload.single('file');

// Загрузка документа (PDF, Word, Excel и т.д.)
export const uploadDocumentFile = uploadDocument.single('file');

