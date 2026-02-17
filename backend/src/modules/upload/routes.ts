/**
 * Модуль маршрутов загрузки файлов
 * 
 * Функциональность:
 * - POST /avatar/:userId - загрузка аватара для пользователя (ADMIN, MODERATOR)
 * - POST /avatar - загрузка своего аватара
 * - POST /team-logo/:teamId - загрузка логотипа команды
 * - POST /competition-icon/:competitionId - загрузка иконки соревнования (ADMIN, MODERATOR)
 * - POST /news-image - загрузка изображения для новости (ADMIN, MODERATOR)
 * - POST / - универсальная загрузка файла (ADMIN, MODERATOR)
 * 
 * Особенности:
 * - Валидация типов файлов
 * - Автоматическое сохранение в соответствующие директории
 * - Ограничение размера файлов
 */

import { Router } from 'express';
import { UploadController } from './controllers/upload.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { uploadAvatar, uploadTeamLogo, uploadCompetitionIcon, uploadNewsImage, uploadFile } from '../../middleware/upload';

const router = Router();
const uploadController = new UploadController();

// Загрузка аватара для конкретного пользователя (только для админов) - должен быть ПЕРВЫМ!
router.post(
  '/avatar/:userId',
  authenticate,
  authorize('ADMIN', 'MODERATOR'),
  uploadAvatar,
  uploadController.uploadAvatarForUser.bind(uploadController)
);

// Загрузка аватара пользователя (свой аватар)
router.post(
  '/avatar',
  authenticate,
  uploadAvatar,
  uploadController.uploadAvatar.bind(uploadController)
);

// Загрузка логотипа команды (только для админов и тренеров команды)
router.post(
  '/team-logo/:teamId',
  authenticate,
  uploadTeamLogo,
  uploadController.uploadTeamLogo.bind(uploadController)
);

// Загрузка иконки соревнования (только для админов)
router.post(
  '/competition-icon/:competitionId',
  authenticate,
  authorize('ADMIN', 'MODERATOR'),
  uploadCompetitionIcon,
  uploadController.uploadCompetitionIcon.bind(uploadController)
);

// Загрузка изображения для новости (только для админов)
router.post(
  '/news-image',
  authenticate,
  authorize('ADMIN', 'MODERATOR'),
  uploadNewsImage,
  uploadController.uploadNewsImage.bind(uploadController)
);

// Универсальная загрузка файла (только для админов)
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'MODERATOR'),
  uploadFile,
  uploadController.uploadFile.bind(uploadController)
);

export default router;

