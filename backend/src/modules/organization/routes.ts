/**
 * Модуль маршрутов управления настройками организации
 * 
 * Функциональность:
 * - GET / - получение настроек организации (публичный)
 * - POST / - создание настроек (ADMIN, MODERATOR)
 * - PUT / - обновление настроек (ADMIN, MODERATOR)
 * 
 * Настройки включают:
 * - Название организации
 * - Описание
 * - Логотип
 * - Контактная информация
 */

import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { organizationController } from './controllers/organization.controller';
import { createOrganizationSettingsSchema, updateOrganizationSettingsSchema } from './types';

const router = Router();

// Публичный endpoint для получения настроек организации (для гостевого интерфейса)
router.get('/', organizationController.getOrganizationSettings.bind(organizationController));

// Защищенные endpoints для администраторов и модераторов
router.use(authenticate);
router.use(authorize('ADMIN', 'MODERATOR'));

router.post(
  '/',
  validate(createOrganizationSettingsSchema),
  organizationController.createOrganizationSettings.bind(organizationController)
);

router.put(
  '/',
  validate(updateOrganizationSettingsSchema),
  organizationController.updateOrganizationSettings.bind(organizationController)
);

export default router;

