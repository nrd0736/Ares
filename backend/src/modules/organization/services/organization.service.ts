/**
 * Сервис управления настройками организации
 * 
 * Основная бизнес-логика:
 * - getOrganizationSettings() - получение настроек (создает дефолтные если нет)
 * - createOrganizationSettings() - создание настроек
 * - updateOrganizationSettings() - обновление настроек
 * 
 * Особенности:
 * - В системе только одна запись настроек организации
 * - Автоматическое создание дефолтных настроек при первом запросе
 */

import { PrismaClient } from '@prisma/client';
import { CreateOrganizationSettingsDto, UpdateOrganizationSettingsDto } from '../types';

const prisma = new PrismaClient();

export class OrganizationService {
  async getOrganizationSettings() {
    try {
      // Получаем первую (и единственную) запись настроек организации
      let settings = await prisma.organizationSettings.findFirst();

      // Если настроек нет, создаем дефолтные
      if (!settings) {
        settings = await prisma.organizationSettings.create({
          data: {
            name: 'ARES Platform',
            description: null,
            content: null,
            logoUrl: null,
            images: [],
          },
        });
      }

      return settings;
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Неизвестная ошибка';
      throw new Error(errorMessage);
    }
  }

  async createOrganizationSettings(data: CreateOrganizationSettingsDto) {
    try {
      // Проверяем, есть ли уже настройки
      const existing = await prisma.organizationSettings.findFirst();
      if (existing) {
        throw new Error('Настройки организации уже существуют. Используйте метод обновления.');
      }

      const settings = await prisma.organizationSettings.create({
        data: {
          name: data.name,
          description: data.description || null,
          content: data.content || null,
          logoUrl: data.logoUrl || null,
          images: data.images || [],
        },
      });

      return settings;
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Неизвестная ошибка';
      throw new Error(errorMessage);
    }
  }

  async updateOrganizationSettings(data: UpdateOrganizationSettingsDto) {
    try {
      // Получаем существующие настройки или создаем новые
      let settings = await prisma.organizationSettings.findFirst();

      if (!settings) {
        // Если настроек нет, создаем их
        settings = await prisma.organizationSettings.create({
          data: {
            name: data.name || 'ARES Platform',
            description: data.description ?? null,
            content: data.content ?? null,
            logoUrl: data.logoUrl ?? null,
            images: Array.isArray(data.images) ? data.images : [],
          },
        });
      } else {
        // Обновляем существующие настройки
        const updateData: any = {};
        
        if (data.name !== undefined) {
          updateData.name = data.name;
        }
        if (data.description !== undefined) {
          updateData.description = data.description;
        }
        if (data.content !== undefined) {
          updateData.content = data.content;
        }
        if (data.logoUrl !== undefined) {
          updateData.logoUrl = data.logoUrl;
        }
        if (data.images !== undefined) {
          updateData.images = Array.isArray(data.images) ? data.images : [];
        }

        settings = await prisma.organizationSettings.update({
          where: { id: settings.id },
          data: updateData,
        });
      }

      return settings;
    } catch (error: any) {
      let errorMessage = 'Неизвестная ошибка';
      
      if (error && typeof error === 'object') {
        if (error.message) {
          errorMessage = error.message;
        } else if (error.toString) {
          errorMessage = error.toString();
        }
      } else if (error) {
        errorMessage = String(error);
      }
      
      throw new Error(errorMessage);
    }
  }
}

export const organizationService = new OrganizationService();

