/**
 * Сервис управления справочниками
 * 
 * Основная бизнес-логика:
 * - Федеральные округа: CRUD операции
 * - Регионы: CRUD операции (связь с федеральными округами)
 * - Виды спорта: CRUD операции
 * - Весовые категории: CRUD операции (привязаны к виду спорта)
 * - Спортивные разряды: CRUD операции
 * 
 * Особенности:
 * - Иерархическая структура: Федеральные округа -> Регионы
 * - Связь весовых категорий с видами спорта
 * - Используются в других модулях как справочники
 */

import prisma from '../../../utils/database';
import logger from '../../../utils/logger';
import {
  CreateFederalDistrictDto,
  CreateRegionDto,
  CreateSportDto,
  CreateWeightCategoryDto,
  CreateSportsRankDto,
} from '../types';

export class ReferencesService {
  // ========== Федеральные округа ==========

  async getAllFederalDistricts() {
    try {
      const districts = await prisma.federalDistrict.findMany({
        include: {
          regions: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      logger.debug(`Получено ${districts.length} федеральных округов`);
      return districts;
    } catch (error: any) {
      logger.error('Ошибка при получении федеральных округов', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async createFederalDistrict(dto: CreateFederalDistrictDto) {
    try {
      logger.debug(`Создание федерального округа: ${dto.name}`);

      // Проверяем уникальность кода
      const existing = await prisma.federalDistrict.findUnique({
        where: { code: dto.code },
      });

      if (existing) {
        logger.warn(`Попытка создать федеральный округ с существующим кодом: ${dto.code}`);
        throw new Error('Федеральный округ с таким кодом уже существует');
      }

      const district = await prisma.federalDistrict.create({
        data: dto,
      });

      logger.info(`Создан федеральный округ: ${district.name} (ID: ${district.id})`);
      return district;
    } catch (error: any) {
      logger.error('Ошибка при создании федерального округа', {
        error: error.message,
        name: dto.name,
        stack: error.stack,
      });
      throw error;
    }
  }

  // ========== Регионы ==========

  async getAllRegions(federalDistrictId?: string) {
    try {
      const where = federalDistrictId ? { federalDistrictId } : {};

      const regions = await prisma.region.findMany({
        where,
        include: {
          federalDistrict: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      logger.debug(`Получено ${regions.length} регионов`);
      return regions;
    } catch (error: any) {
      logger.error('Ошибка при получении регионов', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async createRegion(dto: CreateRegionDto) {
    try {
      logger.debug(`Создание региона: ${dto.name}`);

      // Проверяем существование федерального округа
      const district = await prisma.federalDistrict.findUnique({
        where: { id: dto.federalDistrictId },
      });

      if (!district) {
        logger.warn(`Попытка создать регион с несуществующим федеральным округом: ${dto.federalDistrictId}`);
        throw new Error('Федеральный округ не найден');
      }

      // Проверяем уникальность кода
      const existing = await prisma.region.findUnique({
        where: { code: dto.code },
      });

      if (existing) {
        logger.warn(`Попытка создать регион с существующим кодом: ${dto.code}`);
        throw new Error('Регион с таким кодом уже существует');
      }

      const region = await prisma.region.create({
        data: dto,
        include: {
          federalDistrict: true,
        },
      });

      logger.info(`Создан регион: ${region.name} (ID: ${region.id})`);
      return region;
    } catch (error: any) {
      logger.error('Ошибка при создании региона', {
        error: error.message,
        name: dto.name,
        stack: error.stack,
      });
      throw error;
    }
  }

  // ========== Виды спорта ==========

  async getAllSports() {
    try {
      const sports = await prisma.sport.findMany({
        include: {
          weightCategories: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      logger.debug(`Получено ${sports.length} видов спорта`);
      return sports;
    } catch (error: any) {
      logger.error('Ошибка при получении видов спорта', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async getSportById(id: string) {
    try {
      const sport = await prisma.sport.findUnique({
        where: { id },
        include: {
          weightCategories: {
            orderBy: {
              minWeight: 'asc',
            },
          },
        },
      });

      if (!sport) {
        logger.warn(`Вид спорта с ID ${id} не найден`);
        throw new Error('Вид спорта не найден');
      }

      return sport;
    } catch (error: any) {
      logger.error(`Ошибка при получении вида спорта ${id}`, {
        error: error.message,
      });
      throw error;
    }
  }

  async createSport(dto: CreateSportDto) {
    try {
      logger.debug(`Создание вида спорта: ${dto.name}`);

      const sport = await prisma.sport.create({
        data: dto,
      });

      logger.info(`Создан вид спорта: ${sport.name} (ID: ${sport.id})`);
      return sport;
    } catch (error: any) {
      logger.error('Ошибка при создании вида спорта', {
        error: error.message,
        name: dto.name,
        stack: error.stack,
      });
      throw error;
    }
  }

  // ========== Весовые категории ==========

  async getWeightCategoriesBySport(sportId: string) {
    try {
      const categories = await prisma.weightCategory.findMany({
        where: { sportId },
        orderBy: {
          minWeight: 'asc',
        },
      });

      logger.debug(`Получено ${categories.length} весовых категорий для вида спорта ${sportId}`);
      return categories;
    } catch (error: any) {
      logger.error('Ошибка при получении весовых категорий', {
        error: error.message,
        sportId,
        stack: error.stack,
      });
      throw error;
    }
  }

  async createWeightCategory(dto: CreateWeightCategoryDto) {
    try {
      logger.debug(`Создание весовой категории: ${dto.name}`);

      // Проверяем существование вида спорта
      const sport = await prisma.sport.findUnique({
        where: { id: dto.sportId },
      });

      if (!sport) {
        logger.warn(`Попытка создать весовую категорию с несуществующим видом спорта: ${dto.sportId}`);
        throw new Error('Вид спорта не найден');
      }

      // Проверяем корректность весов
      if (dto.minWeight && dto.maxWeight && dto.minWeight >= dto.maxWeight) {
        logger.warn(`Некорректные веса: min ${dto.minWeight}, max ${dto.maxWeight}`);
        throw new Error('Минимальный вес должен быть меньше максимального');
      }

      const category = await prisma.weightCategory.create({
        data: dto,
        include: {
          sport: true,
        },
      });

      logger.info(`Создана весовая категория: ${category.name} (ID: ${category.id})`);
      return category;
    } catch (error: any) {
      logger.error('Ошибка при создании весовой категории', {
        error: error.message,
        name: dto.name,
        stack: error.stack,
      });
      throw error;
    }
  }

  // ========== Обновление и удаление ==========

  async updateFederalDistrict(id: string, dto: Partial<CreateFederalDistrictDto>) {
    try {
      const existing = await prisma.federalDistrict.findUnique({ where: { id } });
      if (!existing) {
        throw new Error('Федеральный округ не найден');
      }

      // Проверяем уникальность кода, если он изменяется
      if (dto.code && dto.code !== existing.code) {
        const codeExists = await prisma.federalDistrict.findUnique({
          where: { code: dto.code },
        });
        if (codeExists) {
          throw new Error('Федеральный округ с таким кодом уже существует');
        }
      }

      const updated = await prisma.federalDistrict.update({
        where: { id },
        data: dto,
      });

      logger.info(`Обновлен федеральный округ: ${updated.name} (ID: ${id})`);
      return updated;
    } catch (error: any) {
      logger.error(`Ошибка при обновлении федерального округа ${id}`, {
        error: error.message,
      });
      throw error;
    }
  }

  async deleteFederalDistrict(id: string) {
    try {
      const existing = await prisma.federalDistrict.findUnique({
        where: { id },
        include: { regions: true },
      });

      if (!existing) {
        throw new Error('Федеральный округ не найден');
      }

      if (existing.regions.length > 0) {
        throw new Error('Невозможно удалить федеральный округ, так как к нему привязаны регионы');
      }

      await prisma.federalDistrict.delete({ where: { id } });
      logger.info(`Удален федеральный округ: ${existing.name} (ID: ${id})`);
      return { message: 'Федеральный округ успешно удален' };
    } catch (error: any) {
      logger.error(`Ошибка при удалении федерального округа ${id}`, {
        error: error.message,
      });
      throw error;
    }
  }

  async updateRegion(id: string, dto: Partial<CreateRegionDto>) {
    try {
      const existing = await prisma.region.findUnique({ where: { id } });
      if (!existing) {
        throw new Error('Регион не найден');
      }

      // Проверяем существование федерального округа, если он изменяется
      if (dto.federalDistrictId) {
        const district = await prisma.federalDistrict.findUnique({
          where: { id: dto.federalDistrictId },
        });
        if (!district) {
          throw new Error('Федеральный округ не найден');
        }
      }

      // Проверяем уникальность кода, если он изменяется
      if (dto.code && dto.code !== existing.code) {
        const codeExists = await prisma.region.findUnique({
          where: { code: dto.code },
        });
        if (codeExists) {
          throw new Error('Регион с таким кодом уже существует');
        }
      }

      const updated = await prisma.region.update({
        where: { id },
        data: dto,
        include: { federalDistrict: true },
      });

      logger.info(`Обновлен регион: ${updated.name} (ID: ${id})`);
      return updated;
    } catch (error: any) {
      logger.error(`Ошибка при обновлении региона ${id}`, {
        error: error.message,
      });
      throw error;
    }
  }

  async deleteRegion(id: string) {
    try {
      const existing = await prisma.region.findUnique({
        where: { id },
        include: { teams: true },
      });

      if (!existing) {
        throw new Error('Регион не найден');
      }

      if (existing.teams.length > 0) {
        throw new Error('Невозможно удалить регион, так как к нему привязаны команды');
      }

      await prisma.region.delete({ where: { id } });
      logger.info(`Удален регион: ${existing.name} (ID: ${id})`);
      return { message: 'Регион успешно удален' };
    } catch (error: any) {
      logger.error(`Ошибка при удалении региона ${id}`, {
        error: error.message,
      });
      throw error;
    }
  }

  async updateSport(id: string, dto: Partial<CreateSportDto>) {
    try {
      const existing = await prisma.sport.findUnique({ where: { id } });
      if (!existing) {
        throw new Error('Вид спорта не найден');
      }

      const updated = await prisma.sport.update({
        where: { id },
        data: dto,
      });

      logger.info(`Обновлен вид спорта: ${updated.name} (ID: ${id})`);
      return updated;
    } catch (error: any) {
      logger.error(`Ошибка при обновлении вида спорта ${id}`, {
        error: error.message,
      });
      throw error;
    }
  }

  async deleteSport(id: string) {
    try {
      const existing = await prisma.sport.findUnique({
        where: { id },
        include: {
          competitions: true,
          weightCategories: true,
        },
      });

      if (!existing) {
        throw new Error('Вид спорта не найден');
      }

      if (existing.competitions.length > 0) {
        throw new Error('Невозможно удалить вид спорта, так как к нему привязаны соревнования');
      }

      // Удаляем весовые категории, если они есть
      if (existing.weightCategories.length > 0) {
        await prisma.weightCategory.deleteMany({
          where: { sportId: id },
        });
      }

      await prisma.sport.delete({ where: { id } });
      logger.info(`Удален вид спорта: ${existing.name} (ID: ${id})`);
      return { message: 'Вид спорта успешно удален' };
    } catch (error: any) {
      logger.error(`Ошибка при удалении вида спорта ${id}`, {
        error: error.message,
      });
      throw error;
    }
  }

  async updateWeightCategory(id: string, dto: Partial<CreateWeightCategoryDto>) {
    try {
      const existing = await prisma.weightCategory.findUnique({ where: { id } });
      if (!existing) {
        throw new Error('Весовая категория не найдена');
      }

      // Проверяем существование вида спорта, если он изменяется
      if (dto.sportId) {
        const sport = await prisma.sport.findUnique({
          where: { id: dto.sportId },
        });
        if (!sport) {
          throw new Error('Вид спорта не найден');
        }
      }

      // Проверяем корректность весов
      const minWeight = dto.minWeight !== undefined ? dto.minWeight : existing.minWeight;
      const maxWeight = dto.maxWeight !== undefined ? dto.maxWeight : existing.maxWeight;
      if (minWeight && maxWeight && minWeight >= maxWeight) {
        throw new Error('Минимальный вес должен быть меньше максимального');
      }

      const updated = await prisma.weightCategory.update({
        where: { id },
        data: dto,
        include: { sport: true },
      });

      logger.info(`Обновлена весовая категория: ${updated.name} (ID: ${id})`);
      return updated;
    } catch (error: any) {
      logger.error(`Ошибка при обновлении весовой категории ${id}`, {
        error: error.message,
      });
      throw error;
    }
  }

  async deleteWeightCategory(id: string) {
    try {
      const existing = await prisma.weightCategory.findUnique({
        where: { id },
        include: {
          athletes: true,
          brackets: true,
        },
      });

      if (!existing) {
        throw new Error('Весовая категория не найдена');
      }

      if (existing.athletes.length > 0 || existing.brackets.length > 0) {
        throw new Error('Невозможно удалить весовую категорию, так как к ней привязаны спортсмены или турнирные сетки');
      }

      await prisma.weightCategory.delete({ where: { id } });
      logger.info(`Удалена весовая категория: ${existing.name} (ID: ${id})`);
      return { message: 'Весовая категория успешно удалена' };
    } catch (error: any) {
      logger.error(`Ошибка при удалении весовой категории ${id}`, {
        error: error.message,
      });
      throw error;
    }
  }

  // ========== Спортивные разряды ==========

  async getAllSportsRanks() {
    try {
      const ranks = await prisma.sportsRank.findMany({
        orderBy: {
          order: 'asc',
        },
      });

      logger.debug(`Получено ${ranks.length} спортивных разрядов`);
      return ranks;
    } catch (error: any) {
      logger.error('Ошибка при получении спортивных разрядов', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async createSportsRank(dto: CreateSportsRankDto) {
    try {
      logger.debug(`Создание спортивного разряда: ${dto.name}`);

      // Проверяем уникальность названия
      const existing = await prisma.sportsRank.findUnique({
        where: { name: dto.name },
      });

      if (existing) {
        logger.warn(`Попытка создать спортивный разряд с существующим названием: ${dto.name}`);
        throw new Error('Спортивный разряд с таким названием уже существует');
      }

      const rank = await prisma.sportsRank.create({
        data: {
          name: dto.name,
          description: dto.description,
          order: dto.order ?? 0,
        },
      });

      logger.info(`Создан спортивный разряд: ${rank.name} (ID: ${rank.id})`);
      return rank;
    } catch (error: any) {
      logger.error('Ошибка при создании спортивного разряда', {
        error: error.message,
        name: dto.name,
        stack: error.stack,
      });
      throw error;
    }
  }

  async updateSportsRank(id: string, dto: Partial<CreateSportsRankDto>) {
    try {
      logger.debug(`Обновление спортивного разряда: ${id}`);

      const existing = await prisma.sportsRank.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new Error('Спортивный разряд не найден');
      }

      // Проверяем уникальность названия, если оно изменяется
      if (dto.name && dto.name !== existing.name) {
        const duplicate = await prisma.sportsRank.findUnique({
          where: { name: dto.name },
        });

        if (duplicate) {
          throw new Error('Спортивный разряд с таким названием уже существует');
        }
      }

      const updated = await prisma.sportsRank.update({
        where: { id },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.order !== undefined && { order: dto.order }),
        },
      });

      logger.info(`Обновлен спортивный разряд: ${updated.name} (ID: ${id})`);
      return updated;
    } catch (error: any) {
      logger.error(`Ошибка при обновлении спортивного разряда ${id}`, {
        error: error.message,
      });
      throw error;
    }
  }

  async deleteSportsRank(id: string) {
    try {
      logger.debug(`Удаление спортивного разряда: ${id}`);

      const existing = await prisma.sportsRank.findUnique({
        where: { id },
        include: {
          athletes: true,
          athleteRegistrationRequests: true,
        },
      });

      if (!existing) {
        throw new Error('Спортивный разряд не найден');
      }

      if (existing.athletes.length > 0 || existing.athleteRegistrationRequests.length > 0) {
        throw new Error('Невозможно удалить спортивный разряд, так как к нему привязаны спортсмены или заявки на регистрацию');
      }

      await prisma.sportsRank.delete({ where: { id } });
      logger.info(`Удален спортивный разряд: ${existing.name} (ID: ${id})`);
      return { message: 'Спортивный разряд успешно удален' };
    } catch (error: any) {
      logger.error(`Ошибка при удалении спортивного разряда ${id}`, {
        error: error.message,
      });
      throw error;
    }
  }
}

