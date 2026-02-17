/**
 * Контроллер управления пользователями
 * 
 * Функциональность:
 * - getAllUsers() - получение списка пользователей с пагинацией и фильтрацией
 * - getUserById() - получение пользователя по ID
 * - createUser() - создание нового пользователя
 * - updateUser() - обновление данных пользователя
 * - deleteUser() - удаление пользователя
 * - deactivateUser() - деактивация пользователя
 * - updateProfile() - обновление собственного профиля
 * - changePassword() - смена пароля
 * - getStatistics() - статистика пользователей
 * - exportUsers() - экспорт пользователей
 * 
 * Автоматическое логирование всех действий через logAction helper
 */

import { Request, Response } from 'express';
import { UsersService } from '../services/users.service';
import { AuthRequest } from '../../../middleware/auth';
import logger from '../../../utils/logger';
import { logAction } from '../../logging/helpers/log-action.helper';

const usersService = new UsersService();

export class UsersController {
  /**
   * Получить всех пользователей
   */
  async getAllUsers(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const role = req.query.role as string | undefined;
      const search = req.query.search as string | undefined;

      const result = await usersService.getAllUsers(
        page,
        limit,
        role as any,
        search
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getAllUsers', {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении пользователей',
      });
    }
  }

  /**
   * Получить пользователя по ID
   */
  async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await usersService.getUserById(id);

      res.json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getUserById', {
        error: error.message,
        userId: req.params.id,
      });
      res.status(error.message === 'Пользователь не найден' ? 404 : 500).json({
        success: false,
        message: error.message || 'Ошибка при получении пользователя',
      });
    }
  }

  /**
   * Создать нового пользователя
   */
  async createUser(req: AuthRequest, res: Response) {
    try {
      const user = await usersService.createUser(req.body);

      // Логируем создание пользователя
      await logAction(req, 'CREATE', 'User', {
        entityId: user.id,
        entityName: user.profile
          ? `${user.profile.firstName} ${user.profile.lastName}`.trim()
          : user.email,
        changes: { new: { email: user.email, role: user.role } },
        description: `Создан пользователь: ${user.email}`,
      });

      res.status(201).json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере createUser', {
        error: error.message,
        email: req.body.email,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при создании пользователя',
      });
    }
  }

  /**
   * Обновить пользователя
   */
  async updateUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const oldUser = await usersService.getUserById(id);
      const user = await usersService.updateUser(id, req.body);

      // Логируем обновление пользователя
      await logAction(req, 'UPDATE', 'User', {
        entityId: user.id,
        entityName: user.profile
          ? `${user.profile.firstName} ${user.profile.lastName}`.trim()
          : user.email,
        changes: {
          old: { email: oldUser.email, role: oldUser.role },
          new: { email: user.email, role: user.role },
        },
        description: `Обновлен пользователь: ${user.email}`,
      });

      res.json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере updateUser', {
        error: error.message,
        userId: req.params.id,
      });
      res.status(error.message === 'Пользователь не найден' ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при обновлении пользователя',
      });
    }
  }

  /**
   * Деактивировать пользователя
   */
  async deactivateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await usersService.deactivateUser(id);

      res.json({
        success: true,
        data: user,
        message: 'Пользователь успешно деактивирован',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере deactivateUser', {
        error: error.message,
        userId: req.params.id,
      });
      res.status(error.message === 'Пользователь не найден' ? 404 : 500).json({
        success: false,
        message: error.message || 'Ошибка при деактивации пользователя',
      });
    }
  }

  /**
   * Удалить пользователя (полное удаление)
   */
  async deleteUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const oldUser = await usersService.getUserById(id);
      const result = await usersService.deleteUser(id);

      // Логируем удаление пользователя
      await logAction(req, 'DELETE', 'User', {
        entityId: oldUser.id,
        entityName: oldUser.profile
          ? `${oldUser.profile.firstName} ${oldUser.profile.lastName}`.trim()
          : oldUser.email,
        changes: { old: { email: oldUser.email, role: oldUser.role } },
        description: `Удален пользователь: ${oldUser.email}`,
      });

      res.json({
        success: true,
        data: result,
        message: 'Пользователь успешно удален',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере deleteUser', {
        error: error.message,
        userId: req.params.id,
      });
      res.status(error.message === 'Пользователь не найден' ? 404 : 500).json({
        success: false,
        message: error.message || 'Ошибка при удалении пользователя',
      });
    }
  }

  /**
   * Обновить профиль текущего пользователя
   */
  async updateProfile(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Требуется авторизация',
        });
      }

      const user = await usersService.updateProfile(req.user.id, req.body);

      res.json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере updateProfile', {
        error: error.message,
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при обновлении профиля',
      });
    }
  }

  /**
   * Сменить пароль
   */
  async changePassword(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Требуется авторизация',
        });
      }

      await usersService.changePassword(req.user.id, req.body);

      res.json({
        success: true,
        message: 'Пароль успешно изменен',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере changePassword', {
        error: error.message,
        userId: req.user?.id,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при смене пароля',
      });
    }
  }

  /**
   * Экспорт пользователей
   */
  async exportUsers(req: Request, res: Response) {
    try {
      const role = req.query.role as string | undefined;
      const userIds = req.query.userIds as string | undefined;
      
      // Если передан userIds, парсим его как массив
      const userIdsArray = userIds ? (Array.isArray(userIds) ? userIds : userIds.split(',')) : undefined;
      
      const data = await usersService.exportUsers(role as any, userIdsArray);

      res.json({
        success: true,
        data: {
          users: data,
        },
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере exportUsers', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при экспорте пользователей',
      });
    }
  }

  /**
   * Получить статистику пользователей
   */
  async getStatistics(req: Request, res: Response) {
    try {
      const statistics = await usersService.getUsersStatistics();

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getStatistics', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении статистики',
      });
    }
  }
}

