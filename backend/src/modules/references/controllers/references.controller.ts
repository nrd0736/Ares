/**
 * Контроллер управления справочниками
 * 
 * Функциональность:
 * - Федеральные округа: CRUD операции
 * - Регионы: CRUD операции
 * - Виды спорта: CRUD операции
 * - Весовые категории: CRUD операции (привязаны к виду спорта)
 * - Спортивные разряды: CRUD операции
 * 
 * Права доступа:
 * - Публичные маршруты для просмотра справочников
 * - Управление только для ADMIN, MODERATOR
 * 
 * Справочники используются в:
 * - Командах (регион)
 * - Соревнованиях (вид спорта)
 * - Спортсменах (весовая категория, разряд)
 */

import { Request, Response } from 'express';
import { ReferencesService } from '../services/references.service';
import logger from '../../../utils/logger';

const referencesService = new ReferencesService();

export class ReferencesController {
  // ========== Федеральные округа ==========

  async getAllFederalDistricts(req: Request, res: Response) {
    try {
      const districts = await referencesService.getAllFederalDistricts();
      res.json({
        success: true,
        data: districts,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getAllFederalDistricts', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении федеральных округов',
      });
    }
  }

  async createFederalDistrict(req: Request, res: Response) {
    try {
      const district = await referencesService.createFederalDistrict(req.body);
      res.status(201).json({
        success: true,
        data: district,
        message: 'Федеральный округ успешно создан',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере createFederalDistrict', {
        error: error.message,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при создании федерального округа',
      });
    }
  }

  // ========== Регионы ==========

  async getAllRegions(req: Request, res: Response) {
    try {
      const federalDistrictId = req.query.federalDistrictId as string | undefined;
      const regions = await referencesService.getAllRegions(federalDistrictId);
      res.json({
        success: true,
        data: regions,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getAllRegions', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении регионов',
      });
    }
  }

  async createRegion(req: Request, res: Response) {
    try {
      const region = await referencesService.createRegion(req.body);
      res.status(201).json({
        success: true,
        data: region,
        message: 'Регион успешно создан',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере createRegion', {
        error: error.message,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при создании региона',
      });
    }
  }

  // ========== Виды спорта ==========

  async getAllSports(req: Request, res: Response) {
    try {
      const sports = await referencesService.getAllSports();
      res.json({
        success: true,
        data: sports,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getAllSports', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении видов спорта',
      });
    }
  }

  async getSportById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sport = await referencesService.getSportById(id);
      res.json({
        success: true,
        data: sport,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getSportById', {
        error: error.message,
        sportId: req.params.id,
      });
      res.status(error.message === 'Вид спорта не найден' ? 404 : 500).json({
        success: false,
        message: error.message || 'Ошибка при получении вида спорта',
      });
    }
  }

  async createSport(req: Request, res: Response) {
    try {
      const sport = await referencesService.createSport(req.body);
      res.status(201).json({
        success: true,
        data: sport,
        message: 'Вид спорта успешно создан',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере createSport', {
        error: error.message,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при создании вида спорта',
      });
    }
  }

  // ========== Весовые категории ==========

  async getWeightCategoriesBySport(req: Request, res: Response) {
    try {
      const { sportId } = req.params;
      const categories = await referencesService.getWeightCategoriesBySport(sportId);
      res.json({
        success: true,
        data: categories,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getWeightCategoriesBySport', {
        error: error.message,
        sportId: req.params.sportId,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении весовых категорий',
      });
    }
  }

  async createWeightCategory(req: Request, res: Response) {
    try {
      const category = await referencesService.createWeightCategory(req.body);
      res.status(201).json({
        success: true,
        data: category,
        message: 'Весовая категория успешно создана',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере createWeightCategory', {
        error: error.message,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при создании весовой категории',
      });
    }
  }

  // ========== Обновление и удаление ==========

  async updateFederalDistrict(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const district = await referencesService.updateFederalDistrict(id, req.body);
      res.json({
        success: true,
        data: district,
        message: 'Федеральный округ успешно обновлен',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере updateFederalDistrict', {
        error: error.message,
        id: req.params.id,
      });
      res.status(error.message === 'Федеральный округ не найден' ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при обновлении федерального округа',
      });
    }
  }

  async deleteFederalDistrict(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await referencesService.deleteFederalDistrict(id);
      res.json({
        success: true,
        message: 'Федеральный округ успешно удален',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере deleteFederalDistrict', {
        error: error.message,
        id: req.params.id,
      });
      res.status(error.message === 'Федеральный округ не найден' ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при удалении федерального округа',
      });
    }
  }

  async updateRegion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const region = await referencesService.updateRegion(id, req.body);
      res.json({
        success: true,
        data: region,
        message: 'Регион успешно обновлен',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере updateRegion', {
        error: error.message,
        id: req.params.id,
      });
      res.status(error.message === 'Регион не найден' ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при обновлении региона',
      });
    }
  }

  async deleteRegion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await referencesService.deleteRegion(id);
      res.json({
        success: true,
        message: 'Регион успешно удален',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере deleteRegion', {
        error: error.message,
        id: req.params.id,
      });
      res.status(error.message === 'Регион не найден' ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при удалении региона',
      });
    }
  }

  async updateSport(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sport = await referencesService.updateSport(id, req.body);
      res.json({
        success: true,
        data: sport,
        message: 'Вид спорта успешно обновлен',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере updateSport', {
        error: error.message,
        id: req.params.id,
      });
      res.status(error.message === 'Вид спорта не найден' ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при обновлении вида спорта',
      });
    }
  }

  async deleteSport(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await referencesService.deleteSport(id);
      res.json({
        success: true,
        message: 'Вид спорта успешно удален',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере deleteSport', {
        error: error.message,
        id: req.params.id,
      });
      res.status(error.message === 'Вид спорта не найден' ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при удалении вида спорта',
      });
    }
  }

  async updateWeightCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const category = await referencesService.updateWeightCategory(id, req.body);
      res.json({
        success: true,
        data: category,
        message: 'Весовая категория успешно обновлена',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере updateWeightCategory', {
        error: error.message,
        id: req.params.id,
      });
      res.status(error.message === 'Весовая категория не найдена' ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при обновлении весовой категории',
      });
    }
  }

  async deleteWeightCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await referencesService.deleteWeightCategory(id);
      res.json({
        success: true,
        message: 'Весовая категория успешно удалена',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере deleteWeightCategory', {
        error: error.message,
        id: req.params.id,
      });
      res.status(error.message === 'Весовая категория не найдена' ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при удалении весовой категории',
      });
    }
  }

  // ========== Спортивные разряды ==========

  async getAllSportsRanks(req: Request, res: Response) {
    try {
      const ranks = await referencesService.getAllSportsRanks();
      res.json({
        success: true,
        data: ranks,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getAllSportsRanks', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении спортивных разрядов',
      });
    }
  }

  async createSportsRank(req: Request, res: Response) {
    try {
      const rank = await referencesService.createSportsRank(req.body);
      res.status(201).json({
        success: true,
        data: rank,
        message: 'Спортивный разряд успешно создан',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере createSportsRank', {
        error: error.message,
      });
      res.status(error.message.includes('уже существует') ? 400 : 500).json({
        success: false,
        message: error.message || 'Ошибка при создании спортивного разряда',
      });
    }
  }

  async updateSportsRank(req: Request, res: Response) {
    try {
      const rank = await referencesService.updateSportsRank(req.params.id, req.body);
      res.json({
        success: true,
        data: rank,
        message: 'Спортивный разряд успешно обновлен',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере updateSportsRank', {
        error: error.message,
        id: req.params.id,
      });
      res.status(error.message === 'Спортивный разряд не найден' ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при обновлении спортивного разряда',
      });
    }
  }

  async deleteSportsRank(req: Request, res: Response) {
    try {
      const result = await referencesService.deleteSportsRank(req.params.id);
      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере deleteSportsRank', {
        error: error.message,
        id: req.params.id,
      });
      res.status(error.message === 'Спортивный разряд не найден' ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при удалении спортивного разряда',
      });
    }
  }
}

