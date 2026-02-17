/**
 * Контроллер управления турнирными сетками
 * 
 * Функциональность:
 * - getBracketsByCompetition() - все сетки соревнования
 * - getBracketById() - получение сетки по ID
 * - getBracketMatches() - матчи сетки
 * - getMatchById() - получение матча
 * - createBracket() - создание сетки
 * - autoCreateBrackets() - автоматическое создание сеток для всех категорий
 * - updateMatchResult() - обновление результата матча
 * - confirmMatchResult() - подтверждение результата судьей
 * - approveMatchResult() - финализация результата
 * - createMatch() - создание матча вручную
 * - updateMatch() - обновление матча
 * - getMatchesRequiringConfirmation() - матчи требующие подтверждения
 * 
 * Права доступа:
 * - Публичные операции доступны всем
 * - Судьи могут подтверждать результаты
 * - Администраторы и модераторы могут управлять сетками
 */

import { Request, Response } from 'express';
import { BracketsService } from '../services/brackets.service';
import { AuthRequest } from '../../../middleware/auth';
import logger from '../../../utils/logger';
import { UpdateMatchDto } from '../types';

const bracketsService = new BracketsService();

export class BracketsController {
  /**
   * Получить все сетки соревнования
   */
  async getBracketsByCompetition(req: Request, res: Response) {
    try {
      const { competitionId } = req.params;
      const brackets = await bracketsService.getBracketsByCompetition(competitionId);

      res.json({
        success: true,
        data: brackets,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getBracketsByCompetition', {
        error: error.message,
        competitionId: req.params.competitionId,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении сеток',
      });
    }
  }

  /**
   * Получить сетку по ID
   */
  async getBracketById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const bracket = await bracketsService.getBracketById(id);

      res.json({
        success: true,
        data: bracket,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getBracketById', {
        error: error.message,
        bracketId: req.params.id,
      });
      res.status(error.message === 'Сетка не найдена' ? 404 : 500).json({
        success: false,
        message: error.message || 'Ошибка при получении сетки',
      });
    }
  }

  /**
   * Создать турнирную сетку
   */
  async createBracket(req: AuthRequest, res: Response) {
    try {
      const result = await bracketsService.createBracket(req.body);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Турнирная сетка успешно создана',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере createBracket', {
        error: error.message,
        competitionId: req.body.competitionId,
        type: req.body.type,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при создании турнирной сетки',
      });
    }
  }

  /**
   * Обновить результат матча
   */
  async updateMatchResult(req: AuthRequest, res: Response) {
    try {
      const { bracketId, matchId } = req.params;
      const match = await bracketsService.updateMatchResult(
        bracketId,
        matchId,
        req.body,
        req.user?.role
      );

      res.json({
        success: true,
        data: match,
        message: 'Результат матча успешно обновлен',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере updateMatchResult', {
        error: error.message,
        bracketId: req.params.bracketId,
        matchId: req.params.matchId,
      });
      res.status(error.message === 'Матч не найден' ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при обновлении результата матча',
      });
    }
  }

  /**
   * Автоматически создать сетки для всех весовых категорий соревнования
   */
  async autoCreateBrackets(req: AuthRequest, res: Response) {
    try {
      const { competitionId } = req.params;
      const result = await bracketsService.autoCreateBracketsForCompetition(competitionId);

      res.status(201).json({
        success: true,
        data: result,
        message: `Автоматически создано ${result.created} сеток для соревнования`,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере autoCreateBrackets', {
        error: error.message,
        competitionId: req.params.competitionId,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при автоматическом создании сеток',
      });
    }
  }

  /**
   * Создать матч вручную
   */
  async createMatch(req: AuthRequest, res: Response) {
    try {
      const { bracketId } = req.params;
      const result = await bracketsService.createMatch(bracketId, req.body);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Матч успешно создан',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере createMatch', {
        error: error.message,
        bracketId: req.params.bracketId,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при создании матча',
      });
    }
  }

  /**
   * Получить матчи сетки
   */
  async getBracketMatches(req: Request, res: Response) {
    try {
      const { bracketId } = req.params;
      const round = req.query.round ? parseInt(req.query.round as string) : undefined;

      const matches = await bracketsService.getBracketMatches(bracketId, round);

      res.json({
        success: true,
        data: matches,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getBracketMatches', {
        error: error.message,
        bracketId: req.params.bracketId,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении матчей',
      });
    }
  }

  /**
   * Подтвердить результат матча
   */
  async confirmMatchResult(req: AuthRequest, res: Response) {
    try {
      const { bracketId, matchId } = req.params;
      const { notes } = req.body;
      const judgeId = req.user?.id;

      if (!judgeId) {
        return res.status(401).json({
          success: false,
          message: 'Пользователь не авторизован',
        });
      }

      const match = await bracketsService.confirmMatchResult(bracketId, matchId, judgeId, notes);

      res.json({
        success: true,
        data: match,
        message: 'Результат матча успешно подтвержден',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере confirmMatchResult', {
        error: error.message,
        bracketId: req.params.bracketId,
        matchId: req.params.matchId,
        judgeId: req.user?.id,
      });
      res.status(error.message.includes('не найден') ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при подтверждении результата',
      });
    }
  }

  /**
   * Одобрить и финализировать результат матча (после подтверждения)
   */
  async approveMatchResult(req: AuthRequest, res: Response) {
    try {
      const { bracketId, matchId } = req.params;
      const judgeId = req.user?.id;

      if (!judgeId) {
        return res.status(401).json({
          success: false,
          message: 'Пользователь не авторизован',
        });
      }

      const match = await bracketsService.approveMatchResult(bracketId, matchId, judgeId);

      res.json({
        success: true,
        data: match,
        message: 'Результат матча успешно одобрен и финализирован',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере approveMatchResult', {
        error: error.message,
        bracketId: req.params.bracketId,
        matchId: req.params.matchId,
        judgeId: req.user?.id,
      });
      res.status(error.message.includes('не найден') || error.message.includes('Нет ожидающих') ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при одобрении результата',
      });
    }
  }

  /**
   * Получить матчи, требующие подтверждения
   */
  async getMatchesRequiringConfirmation(req: Request, res: Response) {
    try {
      const { competitionId } = req.params;
      const matches = await bracketsService.getMatchesRequiringConfirmation(competitionId);

      res.json({
        success: true,
        data: matches,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getMatchesRequiringConfirmation', {
        error: error.message,
        competitionId: req.params.competitionId,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении матчей',
      });
    }
  }

  /**
   * Получить матч по ID
   */
  async getMatchById(req: Request, res: Response) {
    try {
      const { matchId } = req.params;
      const match = await bracketsService.getMatchById(matchId);

      res.json({
        success: true,
        data: match,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getMatchById', {
        error: error.message,
        matchId: req.params.matchId,
      });
      res.status(error.message === 'Матч не найден' ? 404 : 500).json({
        success: false,
        message: error.message || 'Ошибка при получении матча',
      });
    }
  }

  /**
   * Обновить матч (включая расписание)
   */
  async updateMatch(req: AuthRequest, res: Response) {
    try {
      const { matchId } = req.params;
      const dto: UpdateMatchDto = req.body;
      
      const match = await bracketsService.updateMatch(matchId, dto);

      res.json({
        success: true,
        data: match,
        message: 'Матч успешно обновлен',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере updateMatch', {
        error: error.message,
        matchId: req.params.matchId,
      });
      res.status(error.message === 'Матч не найден' ? 404 : 500).json({
        success: false,
        message: error.message || 'Ошибка при обновлении матча',
      });
    }
  }
}

