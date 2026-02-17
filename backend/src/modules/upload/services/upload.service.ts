/**
 * Сервис загрузки файлов
 * 
 * Основная бизнес-логика:
 * - uploadAvatar() - загрузка аватара пользователя
 * - uploadTeamLogo() - загрузка логотипа команды
 * - uploadCompetitionIcon() - загрузка иконки соревнования
 * - uploadNewsImage() - загрузка изображения для новости
 * - uploadFile() - универсальная загрузка файла
 * 
 * Особенности:
 * - Автоматическое обновление записей в БД с URL файла
 * - Сохранение файлов в соответствующие директории
 * - Возврат URL для доступа к файлу
 */

// Multer file shape (from @types/multer; Express.Multer.File not available without express/multer)
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}
import prisma from '../../../utils/database';
import path from 'path';
import { config } from '../../../utils/config';
import logger from '../../../utils/logger';

export class UploadService {
  /**
   * Загрузить аватар пользователя
   */
  async uploadAvatar(file: MulterFile, userId: string): Promise<string> {
    try {
      // Формируем URL файла
      const fileUrl = `/uploads/avatars/${file.filename}`;

      // Обновляем профиль пользователя
      await prisma.userProfile.update({
        where: { userId },
        data: { avatarUrl: fileUrl },
      });

      logger.info(`Аватар загружен для пользователя ${userId}: ${fileUrl}`);
      return fileUrl;
    } catch (error: any) {
      logger.error('Ошибка при сохранении аватара', {
        error: error.message,
        userId,
      });
      throw new Error('Ошибка при сохранении аватара');
    }
  }

  /**
   * Загрузить логотип команды
   */
  async uploadTeamLogo(file: MulterFile, teamId: string): Promise<string> {
    try {
      // Формируем URL файла
      const fileUrl = `/uploads/team-logos/${file.filename}`;

      // Обновляем команду
      await prisma.team.update({
        where: { id: teamId },
        data: { logoUrl: fileUrl },
      });

      logger.info(`Логотип загружен для команды ${teamId}: ${fileUrl}`);
      return fileUrl;
    } catch (error: any) {
      logger.error('Ошибка при сохранении логотипа команды', {
        error: error.message,
        teamId,
      });
      throw new Error('Ошибка при сохранении логотипа');
    }
  }

  /**
   * Загрузить иконку соревнования
   */
  async uploadCompetitionIcon(file: MulterFile, competitionId: string): Promise<string> {
    try {
      // Формируем URL файла
      const fileUrl = `/uploads/competition-icons/${file.filename}`;

      // Обновляем соревнование
      await prisma.competition.update({
        where: { id: competitionId },
        data: { iconUrl: fileUrl },
      });

      logger.info(`Иконка загружена для соревнования ${competitionId}: ${fileUrl}`);
      return fileUrl;
    } catch (error: any) {
      logger.error('Ошибка при сохранении иконки соревнования', {
        error: error.message,
        competitionId,
      });
      throw new Error('Ошибка при сохранении иконки');
    }
  }

  /**
   * Загрузить изображение для новости
   */
  async uploadNewsImage(file: MulterFile): Promise<string> {
    try {
      // Формируем URL файла
      const fileUrl = `/uploads/news-images/${file.filename}`;

      logger.info(`Изображение новости загружено: ${fileUrl}`);
      return fileUrl;
    } catch (error: any) {
      logger.error('Ошибка при сохранении изображения новости', {
        error: error.message,
      });
      throw new Error('Ошибка при сохранении изображения');
    }
  }

  /**
   * Загрузить аватар для конкретного пользователя (для админа)
   */
  async uploadAvatarForUser(file: MulterFile, targetUserId: string): Promise<string> {
    try {
      // Проверяем, существует ли пользователь
      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: { profile: true },
      });

      if (!user) {
        throw new Error('Пользователь не найден');
      }

      // Формируем URL файла
      const fileUrl = `/uploads/avatars/${file.filename}`;

      // Если профиль существует, обновляем его
      if (user.profile) {
        await prisma.userProfile.update({
          where: { userId: targetUserId },
          data: { avatarUrl: fileUrl },
        });
      } else {
        // Если профиля нет, создаем его
        await prisma.userProfile.create({
          data: {
            userId: targetUserId,
            avatarUrl: fileUrl,
            firstName: '',
            lastName: '',
          },
        });
      }

      logger.info(`Аватар загружен администратором для пользователя ${targetUserId}: ${fileUrl}`);
      return fileUrl;
    } catch (error: any) {
      logger.error('Ошибка при сохранении аватара администратором', {
        error: error.message,
        stack: error.stack,
        targetUserId,
      });
      throw new Error(error.message || 'Ошибка при сохранении аватара');
    }
  }

  /**
   * Универсальная загрузка файла (для организации и других целей)
   */
  async uploadFile(file: MulterFile, folder?: string): Promise<string> {
    try {
      // Определяем путь в зависимости от папки
      let fileUrl: string;
      
      if (folder === 'organization') {
        fileUrl = `/uploads/organization/${file.filename}`;
      } else {
        // По умолчанию сохраняем в корень uploads
        fileUrl = `/uploads/${file.filename}`;
      }

      return fileUrl;
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Неизвестная ошибка';
      throw new Error(errorMessage);
    }
  }
}

