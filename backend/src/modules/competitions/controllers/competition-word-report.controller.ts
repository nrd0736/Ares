/**
 * Контроллер генерации Word отчетов о соревнованиях
 * 
 * Функциональность:
 * - generateJudgesReport - список судей соревнования
 * - generateTeamCompositionReport - состав команд по весовым категориям и разрядам
 * - generateWinnersReport - список победителей и призёров
 * - generateProtocolReport - протокол хода соревнований
 * - generatePairsReport - состав пар
 * 
 * Все отчеты генерируются в формате .docx
 * Доступ: ADMIN, MODERATOR
 */

import { Request, Response } from 'express';
import { CompetitionWordReportService } from '../services/competition-word-report.service';
import logger from '../../../utils/logger';

export class CompetitionWordReportController {
  private reportService: CompetitionWordReportService;

  constructor() {
    this.reportService = new CompetitionWordReportService();
  }

  /**
   * 1. Список судей
   */
  generateJudgesReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({ error: 'ID соревнования обязателен' });
        return;
      }

      const buffer = await this.reportService.generateJudgesReport(id);

      const filename = `список-судей-${id}.docx`;
      const encodedFilename = encodeURIComponent(filename)
        .replace(/['()]/g, escape)
        .replace(/%2C/g, ',')
        .replace(/%20/g, '_');
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"`);
      
      res.send(buffer);
    } catch (error: any) {
      logger.error('Ошибка при генерации списка судей', {
        error: error.message,
        stack: error.stack,
      });
      
      if (error.message.includes('не найдено')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Ошибка при генерации отчёта' });
      }
    }
  };

  /**
   * 2. Состав команд по весовым категориям и разрядам
   */
  generateTeamCompositionReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({ error: 'ID соревнования обязателен' });
        return;
      }

      const buffer = await this.reportService.generateTeamCompositionReport(id);
      
      const filename = `состав-команд-${id}.docx`;
      const encodedFilename = encodeURIComponent(filename)
        .replace(/['()]/g, escape)
        .replace(/%2C/g, ',')
        .replace(/%20/g, '_');

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"`);
      
      res.send(buffer);
    } catch (error: any) {
      logger.error('Ошибка при генерации состава команд', {
        error: error.message,
        stack: error.stack,
      });
      
      if (error.message.includes('не найдено')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Ошибка при генерации отчёта' });
      }
    }
  };

  /**
   * 3. Список победителей и призёров
   */
  generateWinnersReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({ error: 'ID соревнования обязателен' });
        return;
      }

      const buffer = await this.reportService.generateWinnersReport(id);

      const filename = `победители-${id}.docx`;
      const encodedFilename = encodeURIComponent(filename)
        .replace(/['()]/g, escape)
        .replace(/%2C/g, ',')
        .replace(/%20/g, '_');

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"`);
      
      res.send(buffer);
    } catch (error: any) {
      logger.error('Ошибка при генерации списка победителей', {
        error: error.message,
        stack: error.stack,
      });
      
      if (error.message.includes('не найдено')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Ошибка при генерации отчёта' });
      }
    }
  };

  /**
   * 5. Состав пар
   */
  generatePairsReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({ error: 'ID соревнования обязателен' });
        return;
      }

      const buffer = await this.reportService.generatePairsReport(id);

      const filename = `состав-пар-${id}.docx`;
      const encodedFilename = encodeURIComponent(filename)
        .replace(/['()]/g, escape)
        .replace(/%2C/g, ',')
        .replace(/%20/g, '_');

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"`);
      
      res.send(buffer);
    } catch (error: any) {
      logger.error('Ошибка при генерации состава пар', {
        error: error.message,
        stack: error.stack,
      });
      
      if (error.message.includes('не найдено')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Ошибка при генерации отчёта' });
      }
    }
  };

  /**
   * 4. Протокол хода соревнований
   */
  generateProtocolReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({ error: 'ID соревнования обязателен' });
        return;
      }

      const buffer = await this.reportService.generateProtocolReport(id);

      const filename = `протокол-${id}.docx`;
      const encodedFilename = encodeURIComponent(filename)
        .replace(/['()]/g, escape)
        .replace(/%2C/g, ',')
        .replace(/%20/g, '_');

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"`);
      
      res.send(buffer);
    } catch (error: any) {
      logger.error('Ошибка при генерации протокола', {
        error: error.message,
        stack: error.stack,
      });
      
      if (error.message.includes('не найдено')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Ошибка при генерации отчёта' });
      }
    }
  };
}