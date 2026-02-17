/**
 * Контроллер управления соревнованиями
 * 
 * Функциональность:
 * - getAllCompetitions() - список соревнований с фильтрацией
 * - getCompetitionById() - получение соревнования с полными данными
 * - createCompetition() - создание соревнования
 * - updateCompetition() - обновление соревнования
 * - deleteCompetition() - удаление соревнования
 * - changeStatus() - изменение статуса соревнования
 * - registerParticipant() - регистрация участника
 * - updateParticipantStatus() - изменение статуса участника
 * - getCompetitionParticipants() - список участников
 * - getJudges() - список судей соревнования
 * - addJudge() / removeJudge() - управление судьями
 * - getCoaches() - список тренеров
 * - addCoach() / removeCoach() - управление тренерами
 * - getJudgeCompetitions() - соревнования судьи
 * - getCoachCompetitions() - соревнования тренера
 * - getCompetitionStatistics() - статистика соревнования
 * - getCompetitionResults() - результаты соревнования
 * - createOrUpdateResult() - создание/обновление результата
 * - generateReport() - генерация отчета
 * 
 * Права доступа:
 * - Публичные операции доступны всем
 * - Администраторы и модераторы могут управлять соревнованиями
 * - Судьи могут изменять статусы участников
 */

import { Request, Response } from 'express';
import { CompetitionsService } from '../services/competitions.service';
import { CompetitionReportService } from '../services/report.service';
import { AuthRequest } from '../../../middleware/auth';
import logger from '../../../utils/logger';
import { CompetitionStatus, ParticipantStatus } from '@prisma/client';

const competitionsService = new CompetitionsService();
const reportService = new CompetitionReportService();

export class CompetitionsController {
  /**
   * Получить все соревнования
   */
  async getAllCompetitions(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const statusParam = req.query.status as string | undefined;
      const sportId = req.query.sportId as string | undefined;

      // Поддержка нескольких статусов через запятую (например: "UPCOMING,REGISTRATION")
      let status: CompetitionStatus | CompetitionStatus[] | undefined;
      if (statusParam) {
        const statusArray = statusParam.split(',').map(s => s.trim()).filter(s => s);
        if (statusArray.length === 1) {
          status = statusArray[0] as CompetitionStatus;
        } else if (statusArray.length > 1) {
          status = statusArray as CompetitionStatus[];
        }
      }

      const result = await competitionsService.getAllCompetitions(
        page,
        limit,
        status,
        sportId
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getAllCompetitions', {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении соревнований',
      });
    }
  }

  /**
   * Получить соревнование по ID
   */
  async getCompetitionById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const competition = await competitionsService.getCompetitionById(id);

      res.json({
        success: true,
        data: competition,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getCompetitionById', {
        error: error.message,
        competitionId: req.params.id,
      });
      res.status(error.message === 'Соревнование не найдено' ? 404 : 500).json({
        success: false,
        message: error.message || 'Ошибка при получении соревнования',
      });
    }
  }

  /**
   * Создать новое соревнование
   */
  async createCompetition(req: AuthRequest, res: Response) {
    try {
      const competition = await competitionsService.createCompetition(req.body);

      res.status(201).json({
        success: true,
        data: competition,
        message: 'Соревнование успешно создано',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере createCompetition', {
        error: error.message,
        competitionName: req.body.name,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при создании соревнования',
      });
    }
  }

  /**
   * Обновить соревнование
   */
  async updateCompetition(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const competition = await competitionsService.updateCompetition(id, req.body);

      res.json({
        success: true,
        data: competition,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере updateCompetition', {
        error: error.message,
        competitionId: req.params.id,
      });
      res.status(error.message === 'Соревнование не найдено' ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при обновлении соревнования',
      });
    }
  }

  /**
   * Удалить соревнование
   */
  async deleteCompetition(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const competition = await competitionsService.deleteCompetition(id);

      res.json({
        success: true,
        data: competition,
        message: 'Соревнование успешно отменено',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере deleteCompetition', {
        error: error.message,
        competitionId: req.params.id,
      });
      res.status(error.message === 'Соревнование не найдено' ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при удалении соревнования',
      });
    }
  }

  /**
   * Зарегистрировать участника
   */
  async registerParticipant(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const participant = await competitionsService.registerParticipant(id, req.body);

      res.status(201).json({
        success: true,
        data: participant,
        message: 'Участник успешно зарегистрирован',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере registerParticipant', {
        error: error.message,
        competitionId: req.params.id,
        athleteId: req.body.athleteId,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при регистрации участника',
      });
    }
  }

  /**
   * Обновить статус участника
   */
  async updateParticipantStatus(req: Request, res: Response) {
    try {
      const { competitionId, participantId } = req.params;
      const { status } = req.body;

      const participant = await competitionsService.updateParticipantStatus(
        competitionId,
        participantId,
        status
      );

      res.json({
        success: true,
        data: participant,
        message: `Статус участника изменен на ${status}`,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере updateParticipantStatus', {
        error: error.message,
        competitionId: req.params.competitionId,
        participantId: req.params.participantId,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при обновлении статуса участника',
      });
    }
  }

  /**
   * Получить статистику соревнований
   */
  async getStatistics(req: Request, res: Response) {
    try {
      const statistics = await competitionsService.getCompetitionsStatistics();

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getStatistics', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении статистики',
      });
    }
  }

  /**
   * Изменить статус соревнования
   */
  async changeStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const competition = await competitionsService.changeStatus(id, status);

      res.json({
        success: true,
        data: competition,
        message: `Статус соревнования изменен на ${status}`,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере changeStatus', {
        error: error.message,
        competitionId: req.params.id,
      });
      res.status(error.message === 'Соревнование не найдено' ? 404 : 400).json({
        success: false,
        message: error.message || 'Ошибка при изменении статуса',
      });
    }
  }

  /**
   * Создать или обновить результат участника
   */
  async createOrUpdateResult(req: Request, res: Response) {
    try {
      const { id } = req.params; // competitionId
      const result = await competitionsService.createOrUpdateResult(req.body);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Результат успешно сохранен',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере createOrUpdateResult', {
        error: error.message,
        competitionId: req.params.id,
        body: req.body,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при сохранении результата',
      });
    }
  }

  /**
   * Получить результаты соревнования
   */
  async getCompetitionResults(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const results = await competitionsService.getCompetitionResults(id);

      res.json({
        success: true,
        data: results,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getCompetitionResults', {
        error: error.message,
        competitionId: req.params.id,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении результатов',
      });
    }
  }

  /**
   * Добавить судью к соревнованию
   */
  async addJudge(req: AuthRequest, res: Response) {
    try {
      const { id: competitionId } = req.params;
      const { userId } = req.body;

      const result = await competitionsService.addJudgeToCompetition(competitionId, userId);

      res.json({
        success: true,
        data: result,
        message: 'Судья успешно добавлен к соревнованию',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере addJudge', {
        error: error.message,
        competitionId: req.params.id,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при добавлении судьи',
      });
    }
  }

  /**
   * Удалить судью из соревнования
   */
  async removeJudge(req: AuthRequest, res: Response) {
    try {
      const { id: competitionId, userId } = req.params;

      await competitionsService.removeJudgeFromCompetition(competitionId, userId);

      res.json({
        success: true,
        message: 'Судья успешно удален из соревнования',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере removeJudge', {
        error: error.message,
        competitionId: req.params.id,
        userId: req.params.userId,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при удалении судьи',
      });
    }
  }

  /**
   * Добавить тренера к соревнованию
   */
  async addCoach(req: AuthRequest, res: Response) {
    try {
      const { id: competitionId } = req.params;
      const { coachId } = req.body;

      const result = await competitionsService.addCoachToCompetition(competitionId, coachId);

      res.json({
        success: true,
        data: result,
        message: 'Тренер успешно добавлен к соревнованию',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере addCoach', {
        error: error.message,
        competitionId: req.params.id,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при добавлении тренера',
      });
    }
  }

  /**
   * Удалить тренера из соревнования
   */
  async removeCoach(req: AuthRequest, res: Response) {
    try {
      const { id: competitionId, coachId } = req.params;

      await competitionsService.removeCoachFromCompetition(competitionId, coachId);

      res.json({
        success: true,
        message: 'Тренер успешно удален из соревнования',
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере removeCoach', {
        error: error.message,
        competitionId: req.params.id,
        coachId: req.params.coachId,
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка при удалении тренера',
      });
    }
  }

  /**
   * Получить всех судей соревнования
   */
  async getJudges(req: Request, res: Response) {
    try {
      const { id: competitionId } = req.params;

      const judges = await competitionsService.getCompetitionJudges(competitionId);

      res.json({
        success: true,
        data: { judges },
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getJudges', {
        error: error.message,
        competitionId: req.params.id,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении судей',
      });
    }
  }

  /**
   * Получить всех тренеров соревнования
   */
  async getCoaches(req: Request, res: Response) {
    try {
      const { id: competitionId } = req.params;

      const coaches = await competitionsService.getCompetitionCoaches(competitionId);

      res.json({
        success: true,
        data: { coaches },
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getCoaches', {
        error: error.message,
        competitionId: req.params.id,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении тренеров',
      });
    }
  }

  /**
   * Генерация отчёта о соревновании в формате PDF
   */
  async generateReport(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Проверяем статус соревнования перед генерацией
      const competition = await competitionsService.getCompetitionById(id);
      
      if (competition.status !== 'COMPLETED') {
        return res.status(400).json({
          success: false,
          message: `Отчёт можно сгенерировать только для завершённых соревнований. Текущий статус: ${competition.status}`,
        });
      }

      const pdf = await reportService.generateReport(id);

      // Генерируем безопасное имя файла (только ASCII для основного имени, UTF-8 для альтернативного)
      const sanitizeFilename = (str: string) => {
        return str
          .replace(/[^a-zа-яё0-9\s-]/gi, '') // Удаляем все спецсимволы кроме пробелов и дефисов
          .replace(/\s+/g, '-') // Заменяем пробелы на дефисы
          .replace(/-+/g, '-') // Убираем множественные дефисы
          .replace(/^-|-$/g, '') // Убираем дефисы в начале и конце
          .substring(0, 100); // Ограничиваем длину
      };

      const sanitizeFilenameASCII = (str: string) => {
        // Транслитерация русских букв в латиницу для ASCII версии
        const translit: Record<string, string> = {
          'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
          'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
          'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
          'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
          'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
          'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
          'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
          'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
          'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
          'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
        };
        
        return str
          .split('')
          .map(char => translit[char] || (char.match(/[a-z0-9\s-]/i) ? char : ''))
          .join('')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .toLowerCase()
          .substring(0, 100);
      };

      const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const safeName = sanitizeFilename(competition.name) || 'competition';
      const safeNameASCII = sanitizeFilenameASCII(competition.name) || 'competition';
      const filename = `otchet-${safeName}-${dateStr}.pdf`;
      const filenameASCII = `otchet-${safeNameASCII}-${dateStr}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      // Используем только ASCII версию для совместимости
      // UTF-8 версию можно добавить через filename*, но для простоты используем только ASCII
      const contentDisposition = `attachment; filename="${filenameASCII}"`;
      res.setHeader('Content-Disposition', contentDisposition);
      res.setHeader('Content-Length', pdf.length.toString());
      res.send(pdf);
    } catch (error: any) {
      logger.error('Ошибка в контроллере generateReport', {
        error: error.message,
        competitionId: req.params.id,
        stack: error.stack,
      });
      res.status(error.message === 'Соревнование не найдено' ? 404 : 500).json({
        success: false,
        message: error.message || 'Ошибка при генерации отчёта',
      });
    }
  }

  /**
   * Получить детальную статистику соревнования
   */
  async getCompetitionStatistics(req: Request, res: Response) {
    try {
      const { id: competitionId } = req.params;
      const statistics = await competitionsService.getCompetitionStatistics(competitionId);

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getCompetitionStatistics', {
        error: error.message,
        competitionId: req.params.id,
      });
      res.status(error.message === 'Соревнование не найдено' ? 404 : 500).json({
        success: false,
        message: error.message || 'Ошибка при получении статистики соревнования',
      });
    }
  }

  /**
   * Получить соревнования для судьи
   */
  async getJudgeCompetitions(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Пользователь не авторизован',
        });
      }

      const competitions = await competitionsService.getCompetitionsByJudge(userId);

      res.json({
        success: true,
        data: { competitions },
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getJudgeCompetitions', {
        error: error.message,
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении соревнований судьи',
      });
    }
  }

  /**
   * Получить соревнования для тренера (где участвуют спортсмены его команды)
   */
  async getCoachCompetitions(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Пользователь не авторизован',
        });
      }

      const competitions = await competitionsService.getCompetitionsByCoach(userId);

      res.json({
        success: true,
        data: { competitions },
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getCoachCompetitions', {
        error: error.message,
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении соревнований тренера',
      });
    }
  }

  /**
   * Получить участников соревнования
   */
  async getCompetitionParticipants(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const participants = await competitionsService.getCompetitionParticipants(id);

      res.json({
        success: true,
        data: { participants },
      });
    } catch (error: any) {
      logger.error('Ошибка в контроллере getCompetitionParticipants', {
        error: error.message,
        competitionId: req.params.id,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при получении участников соревнования',
      });
    }
  }
}

