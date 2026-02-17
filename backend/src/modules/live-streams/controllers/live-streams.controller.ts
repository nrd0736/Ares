/**
 * Контроллер управления трансляциями
 * 
 * Функциональность:
 * - getAllLiveStreams() - список всех трансляций
 * - getLiveStreamById() - получение трансляции по ID
 * - createLiveStream() - создание трансляции
 * - updateLiveStream() - обновление трансляции
 * - deleteLiveStream() - удаление трансляции
 * 
 * Права доступа:
 * - Публичные операции доступны всем
 * - Администраторы и модераторы могут управлять трансляциями
 */

import { Request, Response } from 'express';
import { LiveStreamsService } from '../services/live-streams.service';
import { AuthRequest } from '../../../middleware/auth';

const liveStreamsService = new LiveStreamsService();

export class LiveStreamsController {
  /**
   * Получить все трансляции (публичный доступ)
   */
  async getAllLiveStreams(req: Request, res: Response) {
    try {
      const streams = await liveStreamsService.getAllLiveStreams();
      res.json({
        success: true,
        data: streams,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении трансляций',
      });
    }
  }

  /**
   * Получить трансляцию по ID (публичный доступ)
   */
  async getLiveStreamById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const stream = await liveStreamsService.getLiveStreamById(id);
      res.json({
        success: true,
        data: stream,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'Трансляция не найдена',
      });
    }
  }

  /**
   * Создать трансляцию (только для админов)
   */
  async createLiveStream(req: AuthRequest, res: Response) {
    try {
      // После валидации данные находятся в req.body
      const stream = await liveStreamsService.createLiveStream(req.body);
      res.status(201).json({
        success: true,
        data: stream,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при создании трансляции',
      });
    }
  }

  /**
   * Обновить трансляцию (только для админов)
   */
  async updateLiveStream(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      // После валидации данные находятся в req.body
      const stream = await liveStreamsService.updateLiveStream(id, req.body);
      res.json({
        success: true,
        data: stream,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при обновлении трансляции',
      });
    }
  }

  /**
   * Удалить трансляцию (только для админов)
   */
  async deleteLiveStream(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await liveStreamsService.deleteLiveStream(id);
      res.json({
        success: true,
        message: 'Трансляция удалена',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при удалении трансляции',
      });
    }
  }
}

