/**
 * Контроллер загрузки файлов
 * 
 * Функциональность:
 * - uploadAvatar() - загрузка аватара пользователя
 * - uploadAvatarForUser() - загрузка аватара для другого пользователя (ADMIN)
 * - uploadTeamLogo() - загрузка логотипа команды
 * - uploadCompetitionIcon() - загрузка иконки соревнования
 * - uploadNewsImage() - загрузка изображения для новости
 * - uploadFile() - универсальная загрузка файла
 * 
 * Особенности:
 * - Валидация типов файлов
 * - Проверка магических байтов
 * - Автоматическое сохранение в соответствующие директории
 */

import { Request, Response } from 'express';
import { UploadService } from '../services/upload.service';
import logger from '../../../utils/logger';
import { validateImageFile, validateDocumentFile } from '../../../utils/file-validator';
import fs from 'fs';

export class UploadController {
  private uploadService = new UploadService();

  /**
   * Загрузить аватар пользователя
   */
  async uploadAvatar(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Файл не загружен',
        });
      }

      const isValid = await validateImageFile(req.file);
      if (!isValid) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'Недопустимый формат файла',
        });
      }

      const userId = (req as any).user.id;
      const fileUrl = await this.uploadService.uploadAvatar(req.file, userId);

      res.json({
        success: true,
        data: {
          avatarUrl: fileUrl,
        },
      });
    } catch (error: any) {
      logger.error('Ошибка при загрузке аватара', {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при загрузке аватара',
      });
    }
  }

  /**
   * Загрузить логотип команды
   */
  async uploadTeamLogo(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Файл не загружен',
        });
      }

      const isValid = await validateImageFile(req.file);
      if (!isValid) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'Недопустимый формат файла',
        });
      }

      const { teamId } = req.params;
      const fileUrl = await this.uploadService.uploadTeamLogo(req.file, teamId);

      res.json({
        success: true,
        data: {
          logoUrl: fileUrl,
        },
      });
    } catch (error: any) {
      logger.error('Ошибка при загрузке логотипа команды', {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при загрузке логотипа',
      });
    }
  }

  /**
   * Загрузить иконку соревнования
   */
  async uploadCompetitionIcon(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Файл не загружен',
        });
      }

      const isValid = await validateImageFile(req.file);
      if (!isValid) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'Недопустимый формат файла',
        });
      }

      const { competitionId } = req.params;
      const fileUrl = await this.uploadService.uploadCompetitionIcon(req.file, competitionId);

      res.json({
        success: true,
        data: {
          iconUrl: fileUrl,
        },
      });
    } catch (error: any) {
      logger.error('Ошибка при загрузке иконки соревнования', {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при загрузке иконки',
      });
    }
  }

  /**
   * Загрузить изображение для новости
   */
  async uploadNewsImage(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Файл не загружен',
        });
      }

      const isValid = await validateImageFile(req.file);
      if (!isValid) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'Недопустимый формат файла',
        });
      }

      const fileUrl = await this.uploadService.uploadNewsImage(req.file);

      res.json({
        success: true,
        data: {
          url: fileUrl,
        },
      });
    } catch (error: any) {
      logger.error('Ошибка при загрузке изображения новости', {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при загрузке изображения',
      });
    }
  }

  /**
   * Загрузить аватар для конкретного пользователя (для админа)
   */
  async uploadAvatarForUser(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Файл не загружен',
        });
      }

      const isValid = await validateImageFile(req.file);
      if (!isValid) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'Недопустимый формат файла',
        });
      }

      const { userId } = req.params;
      if (!userId) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'ID пользователя не указан',
        });
      }

      const fileUrl = await this.uploadService.uploadAvatarForUser(req.file, userId);

      res.json({
        success: true,
        data: {
          avatarUrl: fileUrl,
        },
      });
    } catch (error: any) {
      logger.error('Ошибка при загрузке аватара администратором', {
        error: error.message,
        stack: error.stack,
        params: req.params,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при загрузке аватара',
      });
    }
  }

  /**
   * Универсальная загрузка файла
   */
  async uploadFile(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Файл не загружен',
        });
      }

      const isValid = await validateImageFile(req.file);
      if (!isValid) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'Недопустимый формат файла',
        });
      }

      const folder = (req.query as any)?.folder || (req.body as any)?.folder;
      const fileUrl = await this.uploadService.uploadFile(req.file, folder);

      res.json({
        success: true,
        data: {
          url: fileUrl,
        },
      });
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Ошибка при загрузке файла';
      logger.error(`Ошибка при загрузке файла: ${errorMessage}`);
      res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }
}

