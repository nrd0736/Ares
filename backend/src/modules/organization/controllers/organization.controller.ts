/**
 * Контроллер управления настройками организации
 * 
 * Функциональность:
 * - getOrganizationSettings() - получение настроек организации
 * - createOrganizationSettings() - создание настроек
 * - updateOrganizationSettings() - обновление настроек
 * 
 * Настройки включают название, описание, логотип, контактную информацию
 */

import { Response } from 'express';
import { AuthRequest } from '../../../types/express';
import { organizationService } from '../services/organization.service';

export class OrganizationController {
  async getOrganizationSettings(req: AuthRequest, res: Response) {
    try {
      const settings = await organizationService.getOrganizationSettings();
      res.json({
        success: true,
        data: settings,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении настроек организации',
      });
    }
  }

  async createOrganizationSettings(req: AuthRequest, res: Response) {
    try {
      const settings = await organizationService.createOrganizationSettings(req.body);
      res.status(201).json({
        success: true,
        data: settings,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при создании настроек организации',
      });
    }
  }

  async updateOrganizationSettings(req: AuthRequest, res: Response) {
    try {
      const settings = await organizationService.updateOrganizationSettings(req.body);
      res.json({
        success: true,
        data: settings,
      });
    } catch (error: any) {
      console.error('Ошибка при обновлении настроек организации:', error);
      res.status(400).json({
        success: false,
        message: error?.message || error?.toString() || 'Ошибка при обновлении настроек организации',
      });
    }
  }
}

export const organizationController = new OrganizationController();

