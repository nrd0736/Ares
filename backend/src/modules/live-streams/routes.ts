/**
 * Модуль маршрутов управления трансляциями
 * 
 * Функциональность:
 * - GET / - список всех трансляций (публичный)
 * - GET /:id - получение трансляции по ID (публичный)
 * - POST / - создание трансляции (ADMIN, MODERATOR)
 * - PUT /:id - обновление трансляции (ADMIN, MODERATOR)
 * - DELETE /:id - удаление трансляции (ADMIN, MODERATOR)
 * 
 * Особенности:
 * - Публичные маршруты для просмотра трансляций
 * - Поддержка различных платформ (YouTube, Twitch и т.д.)
 */

import { Router } from 'express';
import { LiveStreamsController } from './controllers/live-streams.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import {
  createLiveStreamSchema,
  updateLiveStreamSchema,
} from './types';

const router = Router();
const liveStreamsController = new LiveStreamsController();

// Публичные маршруты (для гостей)
router.get('/', liveStreamsController.getAllLiveStreams.bind(liveStreamsController));
router.get('/:id', liveStreamsController.getLiveStreamById.bind(liveStreamsController));

// Маршруты для админов и модераторов
router.use(authenticate);
router.use(authorize('ADMIN', 'MODERATOR'));

router.post(
  '/',
  validate(createLiveStreamSchema),
  liveStreamsController.createLiveStream.bind(liveStreamsController)
);

router.put(
  '/:id',
  validate(updateLiveStreamSchema),
  liveStreamsController.updateLiveStream.bind(liveStreamsController)
);

router.delete(
  '/:id',
  liveStreamsController.deleteLiveStream.bind(liveStreamsController)
);

export default router;

