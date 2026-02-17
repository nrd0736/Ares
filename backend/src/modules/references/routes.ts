/**
 * Модуль маршрутов управления справочниками
 * 
 * Функциональность:
 * - Федеральные округа: GET, POST, PUT, DELETE (публичный просмотр)
 * - Регионы: GET, POST, PUT, DELETE (публичный просмотр)
 * - Виды спорта: GET, POST, PUT, DELETE (публичный просмотр)
 * - Весовые категории: GET по виду спорта, POST, PUT, DELETE (публичный просмотр)
 * - Спортивные разряды: GET, POST, PUT, DELETE (публичный просмотр)
 * 
 * Особенности:
 * - Публичные маршруты для просмотра справочников
 * - Управление только для ADMIN, MODERATOR
 * - Справочники используются в других модулях (команды, соревнования, спортсмены)
 */

import { Router } from 'express';
import { ReferencesController } from './controllers/references.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import {
  createFederalDistrictSchema,
  createRegionSchema,
  createSportSchema,
  createWeightCategorySchema,
  createSportsRankSchema,
  updateFederalDistrictSchema,
  updateRegionSchema,
  updateSportSchema,
  updateWeightCategorySchema,
  updateSportsRankSchema,
} from './types';

const router = Router();
const referencesController = new ReferencesController();

// ========== Федеральные округа ==========
// Публичные маршруты
router.get('/federal-districts', referencesController.getAllFederalDistricts.bind(referencesController));

// Маршруты для админов
router.post(
  '/federal-districts',
  authenticate,
  authorize('ADMIN', 'MODERATOR'),
  validate(createFederalDistrictSchema),
  referencesController.createFederalDistrict.bind(referencesController)
);
router.put(
  '/federal-districts/:id',
  authenticate,
  authorize('ADMIN', 'MODERATOR'),
  validate(updateFederalDistrictSchema),
  referencesController.updateFederalDistrict.bind(referencesController)
);
router.delete(
  '/federal-districts/:id',
  authenticate,
  authorize('ADMIN', 'MODERATOR'),
  referencesController.deleteFederalDistrict.bind(referencesController)
);

// ========== Регионы ==========
// Публичные маршруты
router.get('/regions', referencesController.getAllRegions.bind(referencesController));

// Маршруты для админов
router.post(
  '/regions',
  authenticate,
  authorize('ADMIN', 'MODERATOR'),
  validate(createRegionSchema),
  referencesController.createRegion.bind(referencesController)
);
router.put(
  '/regions/:id',
  authenticate,
  authorize('ADMIN', 'MODERATOR'),
  validate(updateRegionSchema),
  referencesController.updateRegion.bind(referencesController)
);
router.delete(
  '/regions/:id',
  authenticate,
  authorize('ADMIN', 'MODERATOR'),
  referencesController.deleteRegion.bind(referencesController)
);

// ========== Виды спорта ==========
// Публичные маршруты
router.get('/sports', referencesController.getAllSports.bind(referencesController));
router.get('/sports/:id', referencesController.getSportById.bind(referencesController));

// Маршруты для админов
router.post(
  '/sports',
  authenticate,
  authorize('ADMIN', 'MODERATOR'),
  validate(createSportSchema),
  referencesController.createSport.bind(referencesController)
);
router.put(
  '/sports/:id',
  authenticate,
  authorize('ADMIN', 'MODERATOR'),
  validate(updateSportSchema),
  referencesController.updateSport.bind(referencesController)
);
router.delete(
  '/sports/:id',
  authenticate,
  authorize('ADMIN', 'MODERATOR'),
  referencesController.deleteSport.bind(referencesController)
);

// ========== Весовые категории ==========
// Публичные маршруты
router.get('/sports/:sportId/weight-categories', referencesController.getWeightCategoriesBySport.bind(referencesController));

// Маршруты для админов
router.post(
  '/weight-categories',
  authenticate,
  authorize('ADMIN', 'MODERATOR'),
  validate(createWeightCategorySchema),
  referencesController.createWeightCategory.bind(referencesController)
);
router.put(
  '/weight-categories/:id',
  authenticate,
  authorize('ADMIN', 'MODERATOR'),
  validate(updateWeightCategorySchema),
  referencesController.updateWeightCategory.bind(referencesController)
);
router.delete(
  '/weight-categories/:id',
  authenticate,
  authorize('ADMIN', 'MODERATOR'),
  referencesController.deleteWeightCategory.bind(referencesController)
);

// ========== Спортивные разряды ==========
// Публичные маршруты
router.get('/sports-ranks', referencesController.getAllSportsRanks.bind(referencesController));

// Маршруты для админов
router.post(
  '/sports-ranks',
  authenticate,
  authorize('ADMIN', 'MODERATOR'),
  validate(createSportsRankSchema),
  referencesController.createSportsRank.bind(referencesController)
);
router.put(
  '/sports-ranks/:id',
  authenticate,
  authorize('ADMIN', 'MODERATOR'),
  validate(updateSportsRankSchema),
  referencesController.updateSportsRank.bind(referencesController)
);
router.delete(
  '/sports-ranks/:id',
  authenticate,
  authorize('ADMIN', 'MODERATOR'),
  referencesController.deleteSportsRank.bind(referencesController)
);

export default router;

