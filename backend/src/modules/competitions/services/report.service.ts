/**
 * Сервис генерации отчетов о соревнованиях
 * 
 * Функциональность:
 * - generateReport() - генерация полного PDF отчета о соревновании
 * - collectReportData() - сбор всех данных для отчета
 * - generatePDF() - создание PDF через Puppeteer
 * 
 * Отчет включает:
 * - Общую информацию о соревновании
 * - Список участников
 * - Результаты и победителей
 * - Статистику
 * 
 * Требования:
 * - Соревнование должно быть завершено (статус COMPLETED)
 * - Используется Puppeteer для генерации PDF из HTML
 */

import prisma from '../../../utils/database';
import logger from '../../../utils/logger';
import puppeteer from 'puppeteer';
import path from 'path';

export class CompetitionReportService {
  async generateReport(competitionId: string): Promise<Buffer> {
    try {
      logger.debug(`Генерация отчёта для соревнования: ${competitionId}`);

      // Проверяем, что соревнование завершено
      const competition = await prisma.competition.findUnique({
        where: { id: competitionId },
        select: { status: true, name: true },
      });

      if (!competition) {
        throw new Error('Соревнование не найдено');
      }

      if (competition.status !== 'COMPLETED') {
        throw new Error(`Отчёт можно сгенерировать только для завершённых соревнований. Текущий статус: ${competition.status}`);
      }

      // Собираем все данные о соревновании
      const reportData = await this.collectReportData(competitionId);

      // Генерируем HTML
      const html = this.generateHTML(reportData);

      // Конвертируем HTML в PDF
      const pdf = await this.htmlToPdf(html);

      logger.info(`Отчёт успешно сгенерирован для соревнования: ${competitionId}`);
      return pdf;
    } catch (error: any) {
      logger.error(`Ошибка при генерации отчёта для соревнования ${competitionId}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Сбор всех данных о соревновании
   */
  private async collectReportData(competitionId: string) {
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        sport: true,
        participants: {
          include: {
            athlete: {
              include: {
                user: {
                  include: { profile: true },
                },
                team: {
                  include: {
                    region: {
                      include: {
                        federalDistrict: true,
                      },
                    },
                  },
                },
                coach: {
                  include: {
                    user: {
                      include: { profile: true },
                    },
                  },
                },
                weightCategory: true,
                sportsRank: true,
              },
            },
          },
        },
        judges: {
          include: {
            user: {
              include: {
                profile: true,
                educationalOrganization: true,
              },
            },
          },
        },
        coaches: {
          include: {
            coach: {
              include: {
                user: {
                  include: { profile: true },
                },
                team: {
                  include: {
                    region: {
                      include: {
                        federalDistrict: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        brackets: {
          include: {
            weightCategory: true,
            matches: {
              include: {
                athlete1: {
                  include: {
                    user: {
                      include: { profile: true },
                    },
                    team: {
                      include: {
                        region: true,
                      },
                    },
                    sportsRank: true,
                  },
                },
                athlete2: {
                  include: {
                    user: {
                      include: { profile: true },
                    },
                    team: {
                      include: {
                        region: true,
                      },
                    },
                    sportsRank: true,
                  },
                },
              },
              orderBy: [
                { round: 'asc' },
                { position: 'asc' },
              ],
            },
          },
        },
      },
    });

    if (!competition) {
      throw new Error('Соревнование не найдено');
    }

    // Группируем участников по командам
    const teamsMap = new Map();
    const coachesMap = new Map();
    
    // Сначала собираем всех тренеров команды
    for (const coachRelation of competition.coaches) {
      const teamId = coachRelation.coach.team.id;
      if (!coachesMap.has(teamId)) {
        coachesMap.set(teamId, []);
      }
      coachesMap.get(teamId).push(coachRelation.coach);
    }
    
    for (const participant of competition.participants) {
      const team = participant.athlete.team;
      if (!teamsMap.has(team.id)) {
        teamsMap.set(team.id, {
          id: team.id,
          name: team.name,
          region: team.region,
          athletes: [],
          coaches: coachesMap.get(team.id) || [],
        });
      }
      const teamData = teamsMap.get(team.id);
      teamData.athletes.push({
        ...participant.athlete,
        participantStatus: participant.status,
      });
    }

    const teams = Array.from(teamsMap.values());

    // Статистика по регионам
    const regionsStats = new Map();
    for (const team of teams) {
      const regionName = team.region?.name || 'Не указан';
      if (!regionsStats.has(regionName)) {
        regionsStats.set(regionName, {
          name: regionName,
          federalDistrict: team.region?.federalDistrict?.name || 'Не указан',
          teamsCount: 0,
          athletesCount: 0,
        });
      }
      const stat = regionsStats.get(regionName);
      stat.teamsCount++;
      stat.athletesCount += team.athletes.length;
    }

    // Статистика соревнования
    const totalMatches = competition.brackets.reduce(
      (sum, bracket) => sum + bracket.matches.length,
      0
    );
    const completedMatches = competition.brackets.reduce(
      (sum, bracket) => sum + bracket.matches.filter((m: any) => m.status === 'COMPLETED').length,
      0
    );
    const totalParticipants = competition.participants.length;
    const activeParticipants = competition.participants.filter(
      (p) => p.status === 'CONFIRMED'
    ).length;

    // Получаем результаты соревнования
    const results = await this.getCompetitionResults(competitionId);

    return {
      competition,
      teams,
      regionsStats: Array.from(regionsStats.values()),
      results,
      statistics: {
        totalTeams: teams.length,
        totalParticipants,
        activeParticipants,
        totalBrackets: competition.brackets.length,
        totalMatches,
        completedMatches,
        totalJudges: competition.judges.length,
        totalCoaches: competition.coaches.length,
      },
    };
  }

  /**
   * Получить результаты соревнования (места и очки участников)
   */
  private async getCompetitionResults(competitionId: string) {
    try {
      // Получаем все матчи соревнования через сетки
      const brackets = await prisma.bracket.findMany({
        where: { competitionId },
        include: {
          matches: {
            include: {
              results: {
                include: {
                  athlete: {
                    include: {
                      user: {
                        include: { profile: true },
                      },
                      team: {
                        include: {
                          region: true,
                        },
                      },
                      weightCategory: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Собираем все результаты
      const allResults: any[] = [];
      brackets.forEach((bracket) => {
        bracket.matches.forEach((match) => {
          match.results.forEach((result) => {
            allResults.push(result);
          });
        });
      });

      // Группируем по спортсменам, собираем все результаты (очки за схватки) и лучшее место
      const athleteResults = new Map<string, any>();
      
      allResults.forEach((result) => {
        // Пропускаем результаты без athleteId или athlete
        if (!result.athleteId || !result.athlete) {
          return;
        }
        
        const athleteId = result.athleteId;
        let existing = athleteResults.get(athleteId);
        
        // Если записи еще нет, создаем новую
        if (!existing) {
          existing = {
            athleteId: result.athleteId,
            athlete: result.athlete,
            position: null,
            matchResults: [],
            matchIds: new Set<string>(),
          };
        }
        
        // Обрабатываем details (может быть объектом или строкой JSON)
        let detailsObj: any = null;
        try {
          if (result.details) {
            if (typeof result.details === 'string') {
              try {
                detailsObj = JSON.parse(result.details);
              } catch (e) {
                detailsObj = null;
              }
            } else if (typeof result.details === 'object') {
              detailsObj = result.details;
            }
          }
        } catch (e) {
          detailsObj = null;
        }
        
        // Добавляем очки за схватку, если они есть и этот матч еще не добавлен
        if (result.points !== null && result.points !== undefined && result.matchId && !existing.matchIds.has(result.matchId)) {
          let roundValue: number | null = null;
          if (detailsObj?.round !== null && detailsObj?.round !== undefined) {
            const roundNum = Number(detailsObj.round);
            if (!isNaN(roundNum) && roundNum > 0) {
              roundValue = roundNum;
            }
          }
          
          let opponentScoreValue: number | null = null;
          if (detailsObj?.opponentScore !== null && detailsObj?.opponentScore !== undefined) {
            const scoreNum = Number(detailsObj.opponentScore);
            if (!isNaN(scoreNum)) {
              opponentScoreValue = scoreNum;
            }
          }
          
          const pointsNum = Number(result.points);
          if (!isNaN(pointsNum)) {
            existing.matchResults.push({
              matchId: result.matchId,
              round: roundValue,
              points: pointsNum,
              opponentScore: opponentScoreValue,
            });
            existing.matchIds.add(result.matchId);
          }
        }
        
        // Определяем лучшее место (меньшее число = лучшее место)
        if (result.position !== null && result.position !== undefined) {
          if (existing.position === null || result.position < existing.position) {
            existing.position = result.position;
          }
        }
        
        athleteResults.set(athleteId, existing);
      });

      // Преобразуем Set в обычные объекты для возврата
      const processedResults = Array.from(athleteResults.values()).map((result: any) => {
        if (!Array.isArray(result.matchResults)) {
          result.matchResults = [];
        }
        
        result.matchResults.sort((a: any, b: any) => {
          const aRound = a?.round;
          const bRound = b?.round;
          if (aRound === null && bRound === null) return 0;
          if (aRound === null || aRound === undefined) return 1;
          if (bRound === null || bRound === undefined) return -1;
          return Number(aRound) - Number(bRound);
        });
        
        if (result.matchIds) {
          delete result.matchIds;
        }
        return result;
      });

      // Сортируем по месту
      const sortedResults = processedResults.sort((a, b) => {
        if (a.position === null && b.position === null) return 0;
        if (a.position === null) return 1;
        if (b.position === null) return -1;
        if (a.position !== b.position) return a.position - b.position;
        
        const aMatchResults = Array.isArray(a.matchResults) ? a.matchResults : [];
        const bMatchResults = Array.isArray(b.matchResults) ? b.matchResults : [];
        const aTotalPoints = aMatchResults.reduce((sum: number, mr: any) => {
          const points = mr?.points !== null && mr?.points !== undefined ? Number(mr.points) : 0;
          return sum + (isNaN(points) ? 0 : points);
        }, 0);
        const bTotalPoints = bMatchResults.reduce((sum: number, mr: any) => {
          const points = mr?.points !== null && mr?.points !== undefined ? Number(mr.points) : 0;
          return sum + (isNaN(points) ? 0 : points);
        }, 0);
        return bTotalPoints - aTotalPoints;
      });

      return sortedResults;
    } catch (error: any) {
      logger.error(`Ошибка при получении результатов соревнования ${competitionId}`, {
        error: error.message,
        stack: error.stack,
      });
      return [];
    }
  }

  /**
   * Генерация HTML шаблона отчёта
   */
  private generateHTML(data: any): string {
    const { competition, teams, regionsStats, statistics, results = [] } = data;

    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const getStatusText = (status: string) => {
      const statusMap: Record<string, string> = {
        UPCOMING: 'Предстоящее',
        REGISTRATION: 'Регистрация',
        IN_PROGRESS: 'В процессе',
        COMPLETED: 'Завершено',
        CANCELLED: 'Отменено',
      };
      return statusMap[status] || status;
    };

    const getParticipantStatusText = (status: string) => {
      const statusMap: Record<string, string> = {
        REGISTERED: 'Зарегистрирован',
        CONFIRMED: 'Подтверждён',
        DISQUALIFIED: 'Дисквалифицирован',
        WITHDRAWN: 'Снят',
      };
      return statusMap[status] || status;
    };

    // Функция для генерации столбчатой диаграммы (SVG)
    const generateBarChart = (data: Array<{name: string, value: number}>, xLabel: string, yLabel: string, width: number, height: number) => {
      if (!data || data.length === 0) return '<p style="text-align: center; color: #999; padding: 20px;">Нет данных</p>';
      
      // Сортируем данные по убыванию для лучшей визуализации
      const sortedData = [...data].sort((a, b) => b.value - a.value);
      const maxValue = Math.max(...sortedData.map(d => d.value), 1);
      const chartHeight = height - 80;
      const padding = 50;
      const availableWidth = width - padding * 2;
      const barSpacing = 8;
      const barWidth = Math.max(30, (availableWidth - (sortedData.length - 1) * barSpacing) / sortedData.length);
      
      let svg = `<svg width="${width}" height="${height}" style="background: #fff; border: 1px solid #e8e8e8; border-radius: 8px;">`;
      
      // Оси
      svg += `<line x1="${padding}" y1="${chartHeight}" x2="${width - padding}" y2="${chartHeight}" stroke="#1890ff" stroke-width="2"/>`;
      svg += `<line x1="${padding}" y1="20" x2="${padding}" y2="${chartHeight}" stroke="#1890ff" stroke-width="2"/>`;
      
      // Подписи осей
      svg += `<text x="${width / 2}" y="${height - 15}" text-anchor="middle" font-size="12" fill="#666" font-weight="500">${xLabel}</text>`;
      svg += `<text x="20" y="${chartHeight / 2 + 20}" text-anchor="middle" font-size="12" fill="#666" font-weight="500" transform="rotate(-90, 20, ${chartHeight / 2 + 20})">${yLabel}</text>`;
      
      // Столбцы
      sortedData.forEach((item, index) => {
        const barHeight = (item.value / maxValue) * chartHeight;
        const x = padding + index * (barWidth + barSpacing);
        const y = chartHeight - barHeight;
        
        // Используем градиент в цветовой гамме отчёта
        const gradientId = `gradient-${index}`;
        svg += `<defs>
          <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#40a9ff;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1890ff;stop-opacity:1" />
          </linearGradient>
        </defs>`;
        
        svg += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="url(#${gradientId})" stroke="#096dd9" stroke-width="1" rx="2"/>`;
        svg += `<text x="${x + barWidth / 2}" y="${y - 8}" text-anchor="middle" font-size="11" fill="#1890ff" font-weight="bold">${item.value}</text>`;
        
        // Подпись под столбцом (сокращённое название с переносом)
        const label = item.name.length > 12 ? item.name.substring(0, 12) + '...' : item.name;
        const labelY = chartHeight + 20;
        svg += `<text x="${x + barWidth / 2}" y="${labelY}" text-anchor="middle" font-size="10" fill="#666">${label}</text>`;
      });
      
      // Шкала значений
      const scaleSteps = 5;
      for (let i = 0; i <= scaleSteps; i++) {
        const value = (maxValue / scaleSteps) * i;
        const y = chartHeight - (i / scaleSteps) * chartHeight;
        svg += `<line x1="${padding - 5}" y1="${y}" x2="${padding}" y2="${y}" stroke="#d9d9d9" stroke-width="1"/>`;
        svg += `<text x="${padding - 10}" y="${y + 4}" text-anchor="end" font-size="10" fill="#666">${Math.round(value)}</text>`;
      }
      
      svg += '</svg>';
      return svg;
    };

    // Функция для генерации круговой диаграммы (SVG)
    const generatePieChart = (data: Array<{label: string, value: number, color: string}>, width: number, height: number) => {
      if (!data || data.length === 0) return '<p>Нет данных</p>';
      
      const total = data.reduce((sum, item) => sum + item.value, 0);
      if (total === 0) return '<p>Нет данных</p>';
      
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 2 - 40;
      
      let svg = `<svg width="${width}" height="${height}" style="background: #fff; border: 1px solid #e8e8e8; border-radius: 4px;">`;
      
      let currentAngle = -90; // Начинаем сверху
      
      data.forEach((item, index) => {
        const percentage = item.value / total;
        const angle = percentage * 360;
        const endAngle = currentAngle + angle;
        
        const x1 = centerX + radius * Math.cos((currentAngle * Math.PI) / 180);
        const y1 = centerY + radius * Math.sin((currentAngle * Math.PI) / 180);
        const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
        const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);
        
        const largeArcFlag = angle > 180 ? 1 : 0;
        
        svg += `<path d="M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z" fill="${item.color}" stroke="#fff" stroke-width="2"/>`;
        
        // Подпись
        const labelAngle = currentAngle + angle / 2;
        const labelX = centerX + (radius * 0.7) * Math.cos((labelAngle * Math.PI) / 180);
        const labelY = centerY + (radius * 0.7) * Math.sin((labelAngle * Math.PI) / 180);
        svg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="11" fill="#333" font-weight="bold">${Math.round(percentage * 100)}%</text>`;
        
        // Легенда
        const legendY = 20 + index * 25;
        svg += `<rect x="20" y="${legendY - 10}" width="15" height="15" fill="${item.color}"/>`;
        svg += `<text x="40" y="${legendY}" font-size="11" fill="#333">${item.label}: ${item.value}</text>`;
        
        currentAngle = endAngle;
      });
      
      // Центральный текст
      svg += `<text x="${centerX}" y="${centerY - 5}" text-anchor="middle" font-size="14" font-weight="bold" fill="#333">Всего</text>`;
      svg += `<text x="${centerX}" y="${centerY + 10}" text-anchor="middle" font-size="16" font-weight="bold" fill="#1890ff">${total}</text>`;
      
      svg += '</svg>';
      return svg;
    };

    // Функция для форматирования счёта
    const formatScore = (score: any, athlete1: any, athlete2: any) => {
      if (!score) return '';
      
      try {
        let scoreObj;
        if (typeof score === 'string') {
          scoreObj = JSON.parse(score);
        } else {
          scoreObj = score;
        }
        
        // Поддерживаем разные форматы: athlete1/athlete2 или athlete1Score/athlete2Score
        const athlete1Score = scoreObj.athlete1 !== undefined ? scoreObj.athlete1 : 
                              scoreObj.athlete1Score !== undefined ? scoreObj.athlete1Score : null;
        const athlete2Score = scoreObj.athlete2 !== undefined ? scoreObj.athlete2 : 
                              scoreObj.athlete2Score !== undefined ? scoreObj.athlete2Score : null;
        
        if (athlete1Score !== null && athlete2Score !== null) {
          const athlete1Name = athlete1 ? `${athlete1.user.profile.lastName} ${athlete1.user.profile.firstName.substring(0, 1)}.` : 'Атлет 1';
          const athlete2Name = athlete2 ? `${athlete2.user.profile.lastName} ${athlete2.user.profile.firstName.substring(0, 1)}.` : 'Атлет 2';
          return `${athlete1Name}: ${athlete1Score} - ${athlete2Name}: ${athlete2Score}`;
        } else if (athlete1Score !== null || athlete2Score !== null) {
          return `Счёт: ${athlete1Score !== null ? athlete1Score : '?'} : ${athlete2Score !== null ? athlete2Score : '?'}`;
        }
      } catch (e) {
        // Если не удалось распарсить, возвращаем как есть
      }
      
      return '';
    };

    // Функция для получения полного ФИО спортсмена
    const getAthleteName = (athlete: any) => {
      if (!athlete) return '—';
      const profile = athlete.user?.profile;
      if (!profile) return '—';
      const parts = [profile.lastName, profile.firstName, profile.middleName].filter(Boolean);
      return parts.join(' ').trim() || '—';
    };

    // Функция для получения региона спортсмена
    const getAthleteRegion = (athlete: any) => {
      if (!athlete) return '';
      return athlete.team?.region?.name || athlete.team?.name || '';
    };

    // Функция для получения спортивного разряда спортсмена
    const getAthleteSportsRank = (athlete: any) => {
      if (!athlete) return '';
      return athlete.sportsRank?.name || '';
    };

    // Функция для получения победителя матча
    const getMatchWinner = (match: any) => {
      if (!match || !match.winnerId) return null;
      if (match.athlete1?.id === match.winnerId) return match.athlete1;
      if (match.athlete2?.id === match.winnerId) return match.athlete2;
      return null;
    };

    // Функция для генерации визуализации турнирной сетки (горизонтальная структура как в интерфейсе)
    const generateBracketVisualization = (bracket: any) => {
      if (!bracket.matches || bracket.matches.length === 0) {
        return '<p style="text-align: center; color: #999; padding: 20px;">Нет матчей в сетке</p>';
      }

      // Группируем матчи по раундам и сортируем по позиции
      const matchesByRound: Record<number, any[]> = {};
      bracket.matches.forEach((match: any) => {
        const round = match.round || 0;
        if (!matchesByRound[round]) {
          matchesByRound[round] = [];
        }
        matchesByRound[round].push(match);
      });

      const rounds = Object.keys(matchesByRound)
        .map(Number)
        .sort((a, b) => a - b);
      const maxRound = rounds[rounds.length - 1];
      
      // Параметры (уменьшены для компактности)
      const nodeWidth = 160;
      const nodeHeight = 55;
      const horizontalGap = 200;
      const pairGap = 8; // Расстояние между участниками одного матча
      const headerHeight = 60;
      const groupLabelWidth = 50;
      
      // Вычисляем общую высоту сетки для первого раунда
      // Создаём карту спортсменов с номерами
      const athleteMap = new Map<string, { number: number; name: string; region: string; sportsRank?: string }>();
      let participantNumber = 1;
      const firstRoundMatches = matchesByRound[1]?.sort((a, b) => a.position - b.position) || [];
      const totalPairs = firstRoundMatches.length;
      firstRoundMatches.forEach((match) => {
        if (match.athlete1 && !athleteMap.has(match.athlete1.id)) {
          athleteMap.set(match.athlete1.id, {
            number: participantNumber++,
            name: getAthleteName(match.athlete1),
            region: getAthleteRegion(match.athlete1),
            sportsRank: getAthleteSportsRank(match.athlete1),
          });
        }
        if (match.athlete2 && !athleteMap.has(match.athlete2.id)) {
          athleteMap.set(match.athlete2.id, {
            number: participantNumber++,
            name: getAthleteName(match.athlete2),
            region: getAthleteRegion(match.athlete2),
            sportsRank: getAthleteSportsRank(match.athlete2),
          });
        }
      });

      // Вычисляем позиции для каждого раунда (как в generate-bracket-simple.ts)
      const pairCenters: Record<number, Record<number, number>> = {};
      const pairHeight = nodeHeight * 2 + pairGap; // Высота пары (2 узла + отступ)
      const pairSpacing = 30; // Отступ между парами (уменьшен)
      const groupAY = headerHeight + 40;
      const groupBY = headerHeight + 350;

      // Вычисляем позиции пар для каждого раунда (как в generate-bracket-simple.ts)
      rounds.forEach((round, roundIndex) => {
        const matches = matchesByRound[round].sort((a, b) => a.position - b.position);
        pairCenters[round] = {};
        
        matches.forEach((match) => {
          const matchPosition = match.position;
          const totalMatches = matches.length;
          const halfMatches = Math.floor(totalMatches / 2);
          const isGroupA = matchPosition <= halfMatches;
          const positionInGroup = isGroupA ? matchPosition - 1 : matchPosition - halfMatches - 1;
          const baseY = isGroupA ? groupAY : groupBY;
          
          let firstParticipantY: number;
          
          if (roundIndex === 0) {
            // Первый раунд - фиксированные позиции
            firstParticipantY = baseY + positionInGroup * (pairHeight + pairSpacing);
          } else {
            // Последующие раунды - позиция в ЦЕНТРЕ между двумя предыдущими парами
            const prevRound = round - 1;
            const prevMatch1Position = matchPosition * 2 - 1;
            const prevMatch2Position = matchPosition * 2;
            
            const prevPair1Center = pairCenters[prevRound]?.[prevMatch1Position];
            const prevPair2Center = pairCenters[prevRound]?.[prevMatch2Position];
            
            if (prevPair1Center !== undefined && prevPair2Center !== undefined) {
              // Центр новой пары = среднее между центрами двух предыдущих
              const newPairCenter = (prevPair1Center + prevPair2Center) / 2;
              firstParticipantY = newPairCenter - pairHeight / 2;
            } else if (prevPair1Center !== undefined) {
              firstParticipantY = prevPair1Center - pairHeight / 2;
            } else {
              firstParticipantY = baseY + positionInGroup * (pairHeight + pairSpacing);
            }
          }
          
          // Сохраняем центр этой пары для следующего раунда
          const pairCenter = firstParticipantY + pairHeight / 2;
          pairCenters[round][matchPosition] = pairCenter;
        });
      });

      const getRoundLabel = (round: number) => {
        if (round === maxRound) return 'ФИНАЛ';
        if (round === maxRound - 1) return '1/2';
        if (round === maxRound - 2) return '1/4';
        if (round === maxRound - 3) return '1/8';
        return `Раунд ${round}`;
      };

      // Вычисляем динамическую высоту на основе количества пар в первом раунде
      // pairHeight и pairSpacing уже объявлены выше
      const halfPairs = Math.ceil(totalPairs / 2);
      const groupHeight = halfPairs * (pairHeight + pairSpacing) + 100; // +100 для отступов
      const totalHeight = headerHeight + groupHeight * 2 + 100; // Обе группы (A и B) + отступы
      const dynamicHeight = Math.max(600, totalHeight); // Минимум 600px

      let html = `<div class="bracket-tree-horizontal" style="position: relative; width: 100%; min-height: ${dynamicHeight}px; overflow: visible; background: #fafafa;">`;
      
      // Заголовки раундов
      rounds.forEach((round, roundIndex) => {
        const xPosition = groupLabelWidth + roundIndex * (nodeWidth + horizontalGap);
        html += `
          <div style="position: absolute; left: ${xPosition}px; top: 0; width: ${nodeWidth}px; text-align: center; background: #f0f0f0; border: 1px solid #d9d9d9; border-radius: 4px; padding: 10px; font-weight: bold; font-size: 12px;">
            ${getRoundLabel(round)}
          </div>
        `;
      });
      
      // Заголовок победителя
      html += `
        <div style="position: absolute; left: ${groupLabelWidth + rounds.length * (nodeWidth + horizontalGap)}px; top: 0; width: ${nodeWidth}px; text-align: center; background: #f0f0f0; border: 1px solid #d9d9d9; border-radius: 4px; padding: 10px; font-weight: bold; font-size: 12px;">
          ПОБЕДИТЕЛЬ
        </div>
      `;
      
      // Метки групп A и B
      html += `
        <div style="position: absolute; left: 0; top: ${groupAY}px; width: ${groupLabelWidth}px; text-align: center; font-size: 20px; font-weight: bold; color: #1890ff;">
          A
        </div>
        <div style="position: absolute; left: 0; top: ${groupBY}px; width: ${groupLabelWidth}px; text-align: center; font-size: 20px; font-weight: bold; color: #1890ff;">
          B
        </div>
      `;

      // Создаём узлы для каждого раунда
      rounds.forEach((round, roundIndex) => {
        const matches = matchesByRound[round].sort((a, b) => a.position - b.position);
        const xPosition = groupLabelWidth + roundIndex * (nodeWidth + horizontalGap);
        
        matches.forEach((match) => {
          const matchPosition = match.position;
          const pairCenter = pairCenters[round][matchPosition];
          const baseMatchY = pairCenter - pairHeight / 2;
          
          // Получаем участников текущего матча
          let participant1 = null;
          let participant2 = null;
          
          // Сначала проверяем прямые данные в матче (для завершенных соревнований)
          if (match.athlete1 && match.athlete2) {
            participant1 = match.athlete1;
            participant2 = match.athlete2;
          } else if (round === 1) {
            participant1 = match.athlete1;
            participant2 = match.athlete2;
          } else {
            // Последующие раунды - берем победителей из предыдущего раунда
            const prevRoundMatches = matchesByRound[round - 1]?.sort((a, b) => a.position - b.position) || [];
            const prevMatch1 = prevRoundMatches.find(m => m.position === matchPosition * 2 - 1);
            const prevMatch2 = prevRoundMatches.find(m => m.position === matchPosition * 2);
            
            participant1 = prevMatch1 ? getMatchWinner(prevMatch1) : null;
            participant2 = prevMatch2 ? getMatchWinner(prevMatch2) : null;
          }
          
          // Добавляем участников в карту, если их еще нет
          if (participant1 && !athleteMap.has(participant1.id)) {
            athleteMap.set(participant1.id, {
              number: participantNumber++,
              name: getAthleteName(participant1),
              region: getAthleteRegion(participant1),
              sportsRank: getAthleteSportsRank(participant1),
            });
          }
          if (participant2 && !athleteMap.has(participant2.id)) {
            athleteMap.set(participant2.id, {
              number: participantNumber++,
              name: getAthleteName(participant2),
              region: getAthleteRegion(participant2),
              sportsRank: getAthleteSportsRank(participant2),
            });
          }
          
          const winner = getMatchWinner(match);
          const athlete1Info = participant1 ? athleteMap.get(participant1.id) : null;
          const athlete2Info = participant2 ? athleteMap.get(participant2.id) : null;
          
          const isWinner1 = winner?.id === participant1?.id;
          const isWinner2 = winner?.id === participant2?.id;
          
          // Узел первого участника
          const athlete1Name = athlete1Info?.name || '—';
          const athlete1Region = athlete1Info?.region || '';
          const athlete1SportsRank = athlete1Info?.sportsRank || '';
          const athlete1Number = athlete1Info?.number || '';
          
          html += `
            <div style="position: absolute; left: ${xPosition}px; top: ${baseMatchY}px; width: ${nodeWidth}px; min-height: ${nodeHeight}px; display: flex; align-items: center; gap: 6px; padding: 8px 10px; border: ${isWinner1 ? '2px solid #1890ff' : '1px solid #d9d9d9'}; background: ${isWinner1 ? '#e6f7ff' : '#fff'}; border-radius: 4px; z-index: 2;">
              <div style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; background: #f0f0f0; border: 1px solid #d9d9d9; border-radius: 2px; font-size: 11px; font-weight: bold; flex-shrink: 0;">
                ${athlete1Number}
              </div>
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 12px; font-weight: ${isWinner1 ? 'bold' : '500'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;">
                  ${athlete1Name}
                </div>
                <div style="font-size: 10px; color: #8c8c8c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;">
                  ${athlete1Region}
                </div>
                ${athlete1SportsRank ? `<div style="font-size: 10px; color: #8c8c8c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${athlete1SportsRank}</div>` : ''}
              </div>
            </div>
          `;
          
          // Узел второго участника
          const athlete2Name = athlete2Info?.name || '—';
          const athlete2Region = athlete2Info?.region || '';
          const athlete2SportsRank = athlete2Info?.sportsRank || '';
          const athlete2Number = athlete2Info?.number || '';
          
          html += `
            <div style="position: absolute; left: ${xPosition}px; top: ${baseMatchY + nodeHeight + pairGap}px; width: ${nodeWidth}px; min-height: ${nodeHeight}px; display: flex; align-items: center; gap: 6px; padding: 8px 10px; border: ${isWinner2 ? '2px solid #1890ff' : '1px solid #d9d9d9'}; background: ${isWinner2 ? '#e6f7ff' : '#fff'}; border-radius: 4px; z-index: 2;">
              <div style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; background: #f0f0f0; border: 1px solid #d9d9d9; border-radius: 2px; font-size: 11px; font-weight: bold; flex-shrink: 0;">
                ${athlete2Number}
              </div>
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 12px; font-weight: ${isWinner2 ? 'bold' : '500'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;">
                  ${athlete2Name}
                </div>
                <div style="font-size: 10px; color: #8c8c8c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;">
                  ${athlete2Region}
                </div>
                ${athlete2SportsRank ? `<div style="font-size: 10px; color: #8c8c8c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${athlete2SportsRank}</div>` : ''}
              </div>
            </div>
          `;
          
          // Линии к следующему раунду (step-линии как в админ-панели)
          // ВАЖНО: линии от ОБОИХ участников идут к ОДНОМУ целевому узлу (победителю следующего раунда)
          if (roundIndex < rounds.length - 1) {
            const nextRound = round + 1;
            const nextMatchPosition = Math.ceil(matchPosition / 2);
            const nextMatch = matchesByRound[nextRound]?.find(m => m.position === nextMatchPosition);
            
            if (nextMatch) {
              // Определяем позицию в следующем матче (pos1 или pos2)
              const targetPosition = matchPosition % 2 === 1 ? 'pos1' : 'pos2';
              
              // Определяем победителя текущего матча - он идёт в следующий раунд
              const winner = getMatchWinner(match);
              
              // Определяем целевой узел (к узлу победителя в следующем раунде, как в админ-панели)
              const nextPairCenter = pairCenters[nextRound]?.[nextMatchPosition];
              
              if (nextPairCenter !== undefined) {
                // Определяем целевой узел (к узлу победителя в следующем раунде, как в админ-панели)
                // Если есть победитель, линии идут к его узлу, иначе к пустому узлу
                const winner = getMatchWinner(match);
                let targetNodeY: number;
                
                if (winner && athleteMap.has(winner.id)) {
                  // Линии идут к узлу победителя в следующем раунде
                  // Победитель будет в позиции targetPosition следующего матча
                  if (targetPosition === 'pos1') {
                    targetNodeY = nextPairCenter - pairHeight / 2 + nodeHeight / 2;
                  } else {
                    targetNodeY = nextPairCenter - pairHeight / 2 + nodeHeight + pairGap + nodeHeight / 2;
                  }
                } else {
                  // Если нет победителя, линии идут к пустому узлу
                  if (targetPosition === 'pos1') {
                    targetNodeY = nextPairCenter - pairHeight / 2 + nodeHeight / 2;
                  } else {
                    targetNodeY = nextPairCenter - pairHeight / 2 + nodeHeight + pairGap + nodeHeight / 2;
                  }
                }
                
                const athlete1Y = baseMatchY + nodeHeight / 2;
                const athlete2Y = baseMatchY + nodeHeight + pairGap + nodeHeight / 2;
                const lineX = xPosition + nodeWidth;
                // Линия должна доходить до левого края следующего узла
                const nextXPosition = groupLabelWidth + (roundIndex + 1) * (nodeWidth + horizontalGap);
                const lineLength = nextXPosition - lineX; // Полная длина до следующего узла
                
                // Линия от первого участника к целевому узлу (step-линия)
                if (participant1) {
                  const startY = athlete1Y;
                  const endY = targetNodeY;
                  const minY = Math.min(startY, endY);
                  const maxY = Math.max(startY, endY);
                  const svgHeight = maxY - minY + 4;
                  const svgTop = minY - 2;
                  
                  html += `
                    <svg style="position: absolute; left: ${lineX}px; top: ${svgTop}px; width: ${lineLength}px; height: ${svgHeight}px; pointer-events: none; overflow: visible; z-index: 1;">
                      <path d="M 0 ${startY - svgTop} L ${lineLength / 2} ${startY - svgTop} L ${lineLength / 2} ${endY - svgTop} L ${lineLength} ${endY - svgTop}" 
                            stroke="#000" 
                            stroke-width="2" 
                            fill="none" 
                            stroke-linecap="round" 
                            stroke-linejoin="round"/>
                    </svg>
                  `;
                }
                
                // Линия от второго участника к тому же целевому узлу (step-линия)
                if (participant2) {
                  const startY = athlete2Y;
                  const endY = targetNodeY;
                  const minY = Math.min(startY, endY);
                  const maxY = Math.max(startY, endY);
                  const svgHeight = maxY - minY + 4;
                  const svgTop = minY - 2;
                  
                  html += `
                    <svg style="position: absolute; left: ${lineX}px; top: ${svgTop}px; width: ${lineLength}px; height: ${svgHeight}px; pointer-events: none; overflow: visible; z-index: 1;">
                      <path d="M 0 ${startY - svgTop} L ${lineLength / 2} ${startY - svgTop} L ${lineLength / 2} ${endY - svgTop} L ${lineLength} ${endY - svgTop}" 
                            stroke="#000" 
                            stroke-width="2" 
                            fill="none" 
                            stroke-linecap="round" 
                            stroke-linejoin="round"/>
                    </svg>
                  `;
                }
              }
            }
          }
        });
      });
      
      // Узел финального победителя
      const finalMatch = matchesByRound[maxRound]?.[0];
      const finalWinner = finalMatch ? getMatchWinner(finalMatch) : null;
      
      if (finalWinner && athleteMap.has(finalWinner.id)) {
        const finalWinnerInfo = athleteMap.get(finalWinner.id)!;
        const finalRound = maxRound;
        let finalWinnerY = headerHeight + 300; // Значение по умолчанию
        
        if (finalMatch && pairCenters[finalRound]?.[finalMatch.position]) {
          finalWinnerY = pairCenters[finalRound][finalMatch.position];
        } else if (rounds.length > 1) {
          // Если нет финального матча, центрируем между двумя полуфиналистами
          const semiFinalRound = finalRound - 1;
          const semiFinal1Center = pairCenters[semiFinalRound]?.[1];
          const semiFinal2Center = pairCenters[semiFinalRound]?.[2];
          if (semiFinal1Center !== undefined && semiFinal2Center !== undefined) {
            finalWinnerY = (semiFinal1Center + semiFinal2Center) / 2;
          }
        }
        
        const finalX = groupLabelWidth + rounds.length * (nodeWidth + horizontalGap);
        
        // Линии от финальных участников к победителю (как в админ-панели - к одному узлу)
        if (finalMatch && finalMatch.athlete1 && finalMatch.athlete2) {
          // Позиция финального матча
          const finalMatchRoundIndex = rounds.length - 1;
          const finalMatchX = groupLabelWidth + finalMatchRoundIndex * (nodeWidth + horizontalGap);
          const finalPairCenter = pairCenters[finalRound]?.[finalMatch.position] || finalWinnerY;
          const athlete1Y = finalPairCenter - pairHeight / 2 + nodeHeight / 2;
          const athlete2Y = finalPairCenter - pairHeight / 2 + nodeHeight + pairGap + nodeHeight / 2;
          
          // Начало линии - правый край финального матча
          const finalLineX = finalMatchX + nodeWidth;
          // Конец линии - левый край узла победителя
          const finalLineEndX = finalX;
          // Длина линии - от правого края финального матча до левого края узла победителя
          const finalLineLength = finalLineEndX - finalLineX;
          const targetY = finalWinnerY; // Узел финального победителя
          
          // Линия от первого участника финала к победителю (step-линия)
          const minY1 = Math.min(athlete1Y, targetY);
          const maxY1 = Math.max(athlete1Y, targetY);
          html += `
            <svg style="position: absolute; left: ${finalLineX}px; top: ${minY1 - 2}px; width: ${finalLineLength}px; height: ${maxY1 - minY1 + 4}px; pointer-events: none; overflow: visible; z-index: 1;">
              <path d="M 0 ${athlete1Y - minY1 + 2} L ${finalLineLength / 2} ${athlete1Y - minY1 + 2} L ${finalLineLength / 2} ${targetY - minY1 + 2} L ${finalLineLength} ${targetY - minY1 + 2}" 
                    stroke="#000" 
                    stroke-width="2" 
                    fill="none" 
                    stroke-linecap="round" 
                    stroke-linejoin="round"/>
            </svg>
          `;
          
          // Линия от второго участника финала к тому же узлу победителя (step-линия)
          const minY2 = Math.min(athlete2Y, targetY);
          const maxY2 = Math.max(athlete2Y, targetY);
          html += `
            <svg style="position: absolute; left: ${finalLineX}px; top: ${minY2 - 2}px; width: ${finalLineLength}px; height: ${maxY2 - minY2 + 4}px; pointer-events: none; overflow: visible; z-index: 1;">
              <path d="M 0 ${athlete2Y - minY2 + 2} L ${finalLineLength / 2} ${athlete2Y - minY2 + 2} L ${finalLineLength / 2} ${targetY - minY2 + 2} L ${finalLineLength} ${targetY - minY2 + 2}" 
                    stroke="#000" 
                    stroke-width="2" 
                    fill="none" 
                    stroke-linecap="round" 
                    stroke-linejoin="round"/>
            </svg>
          `;
        }
        
        // Узел финального победителя (центрируем по вертикали, как в админ-панели)
        const finalWinnerSportsRank = finalWinnerInfo.sportsRank || '';
        html += `
          <div style="position: absolute; left: ${finalX}px; top: ${finalWinnerY - nodeHeight / 2}px; width: ${nodeWidth}px; min-height: ${nodeHeight}px; display: flex; align-items: center; justify-content: center; padding: 10px 10px; border: 2px solid #52c41a; background: #f6ffed; border-radius: 4px; font-weight: bold; z-index: 2;">
            <div style="text-align: center; flex: 1; min-width: 0;">
              <div style="font-size: 13px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px;">
                ${finalWinnerInfo.name}
              </div>
              <div style="font-size: 10px; color: #8c8c8c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px;">
                ${finalWinnerInfo.region}
              </div>
              ${finalWinnerSportsRank ? `<div style="font-size: 10px; color: #8c8c8c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${finalWinnerSportsRank}</div>` : ''}
            </div>
          </div>
        `;
      }
      
      html += '</div>';
      return html;
    };

    return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Отчёт о соревновании: ${competition.name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            font-size: 12px;
            line-height: 1.6;
            color: #333;
            background: #fff;
        }
        
        .page {
            page-break-after: always;
            padding: 40px;
        }
        
        .page:last-child {
            page-break-after: avoid;
        }
        
        .page-landscape {
            page-break-before: always;
            page-break-after: always;
            padding: 15px;
            width: 297mm;
            height: auto;
        }
        
        @page landscape {
            size: A4 landscape;
        }
        
        .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 3px solid #1890ff;
        }
        
        .header-logo {
            margin-bottom: 15px;
        }
        
        .header-logo svg {
            width: 80px;
            height: 80px;
        }
        
        .header h1 {
            font-size: 28px;
            color: #1890ff;
            margin-bottom: 8px;
            margin-top: 10px;
        }
        
        .header .subtitle {
            font-size: 16px;
            color: #666;
            margin-bottom: 10px;
        }
        
        .header .generated-by {
            font-size: 11px;
            color: #999;
            margin-top: 10px;
            font-style: italic;
        }
        
        .section {
            margin-bottom: 20px;
        }
        
        .section-title {
            font-size: 20px;
            color: #1890ff;
            margin-bottom: 10px;
            margin-top: 10px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e8e8e8;
        }
        
        .section-title:first-child {
            margin-top: 0;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .info-item {
            padding: 10px;
            background: #f5f5f5;
            border-radius: 4px;
        }
        
        .info-label {
            font-weight: bold;
            color: #666;
            font-size: 11px;
            margin-bottom: 5px;
        }
        
        .info-value {
            font-size: 13px;
            color: #333;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 11px;
        }
        
        table th {
            background: #1890ff;
            color: #fff;
            padding: 10px;
            text-align: left;
            font-weight: bold;
        }
        
        table td {
            padding: 8px 10px;
            border-bottom: 1px solid #e8e8e8;
        }
        
        table tr:nth-child(even) {
            background: #f9f9f9;
        }
        
        .team-card {
            margin-bottom: 25px;
            padding: 15px;
            border: 1px solid #e8e8e8;
            border-radius: 4px;
            page-break-inside: avoid;
        }
        
        .team-header {
            font-size: 16px;
            font-weight: bold;
            color: #1890ff;
            margin-bottom: 10px;
        }
        
        .athlete-item {
            padding: 8px;
            margin: 5px 0;
            background: #f9f9f9;
            border-left: 3px solid #1890ff;
        }
        
        .bracket-section {
            margin-bottom: 20px;
            page-break-inside: avoid;
        }
        
        .bracket-tree {
            margin: 15px 0;
        }
        
        .bracket-round {
            margin-bottom: 20px;
        }
        
        .bracket-match {
            border: 1px solid #e8e8e8;
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 8px;
            background: #fff;
        }
        
        .match-item {
            padding: 8px;
            margin: 5px 0;
            background: #f9f9f9;
            border-radius: 4px;
        }
        
        .statistics-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .stat-card {
            padding: 15px;
            background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
            color: #fff;
            border-radius: 4px;
            text-align: center;
        }
        
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 12px;
            opacity: 0.9;
        }
        
        .stats-cards-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin: 30px 0;
        }
        
        .stat-card-modern {
            padding: 25px 20px;
            border-radius: 12px;
            text-align: center;
            color: #fff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: transform 0.2s;
        }
        
        .stat-card-icon {
            font-size: 32px;
            margin-bottom: 12px;
            opacity: 0.9;
        }
        
        .stat-card-value {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 8px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .stat-card-label {
            font-size: 13px;
            opacity: 0.95;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .charts-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-top: 40px;
        }
        
        .chart-wrapper {
            padding: 25px;
            background: #fff;
            border: 1px solid #e8e8e8;
            border-radius: 12px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.08);
        }
        
        .region-chart {
            margin: 20px 0;
        }
        
        .region-bar {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .region-name {
            width: 200px;
            font-weight: bold;
        }
        
        .region-bar-fill {
            height: 25px;
            background: #1890ff;
            color: #fff;
            display: flex;
            align-items: center;
            padding: 0 10px;
            border-radius: 4px;
            min-width: 50px;
        }
        
        .bracket-tree-horizontal {
            background: #fafafa;
            min-height: 600px;
        }
        
        @page {
            size: A4;
            margin: 20mm 15mm;
        }
        
        @page landscape {
            size: A4 landscape;
            margin: 15mm 20mm;
        }
        
        @media print {
            .page {
                page-break-after: always;
            }
            
            .page-landscape {
                page-break-after: always;
                page: landscape;
            }
        }
    </style>
</head>
<body>
    <!-- Страница 1: Информация о соревновании -->
    <div class="page">
        <div class="header">
            <div class="header-logo">
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="45" fill="#1890ff" opacity="0.1"/>
                    <path d="M50 20 L60 40 L80 45 L65 60 L68 80 L50 70 L32 80 L35 60 L20 45 L40 40 Z" fill="#1890ff"/>
                    <circle cx="50" cy="50" r="8" fill="#fff"/>
                </svg>
            </div>
            <h1>${competition.name}</h1>
            <div class="subtitle">Полный отчёт о соревновании</div>
            <div class="generated-by">Сгенерировано с помощью ARES Platform</div>
        </div>
        
        <div class="section">
            <h2 class="section-title">1. Информация о соревновании</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Название</div>
                    <div class="info-value">${competition.name}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Вид спорта</div>
                    <div class="info-value">${competition.sport.name}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Статус</div>
                    <div class="info-value">${getStatusText(competition.status)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Дата начала</div>
                    <div class="info-value">${formatDate(competition.startDate)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Дата окончания</div>
                    <div class="info-value">${formatDate(competition.endDate)}</div>
                </div>
                ${competition.location ? `
                <div class="info-item">
                    <div class="info-label">Место проведения</div>
                    <div class="info-value">${competition.location}</div>
                </div>
                ` : ''}
            </div>
            ${competition.description ? `
            <div class="info-item" style="margin-top: 15px;">
                <div class="info-label">Описание</div>
                <div class="info-value">${competition.description.replace(/\n/g, '<br>')}</div>
            </div>
            ` : ''}
        </div>
        
    </div>
    
    <!-- Страница 2: Статистика соревнования -->
    <div class="page" style="page-break-before: always;">
        <div class="section">
            <h2 class="section-title">2. Статистика соревнования</h2>
            
            <!-- Общая информация в красивых карточках -->
            <div class="stats-cards-grid">
                <div class="stat-card-modern" style="background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);">
                    <div class="stat-card-icon">👥</div>
                    <div class="stat-card-value">${statistics.totalTeams}</div>
                    <div class="stat-card-label">Команд</div>
                </div>
                <div class="stat-card-modern" style="background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);">
                    <div class="stat-card-icon">🏃</div>
                    <div class="stat-card-value">${statistics.totalParticipants}</div>
                    <div class="stat-card-label">Участников</div>
                </div>
                <div class="stat-card-modern" style="background: linear-gradient(135deg, #1890ff 0%, #69c0ff 100%);">
                    <div class="stat-card-icon">✅</div>
                    <div class="stat-card-value">${statistics.activeParticipants}</div>
                    <div class="stat-card-label">Активных</div>
                </div>
                <div class="stat-card-modern" style="background: linear-gradient(135deg, #096dd9 0%, #1890ff 100%);">
                    <div class="stat-card-icon">🏆</div>
                    <div class="stat-card-value">${statistics.totalBrackets}</div>
                    <div class="stat-card-label">Сеток</div>
                </div>
                <div class="stat-card-modern" style="background: linear-gradient(135deg, #40a9ff 0%, #1890ff 100%);">
                    <div class="stat-card-icon">⚔️</div>
                    <div class="stat-card-value">${statistics.totalMatches}</div>
                    <div class="stat-card-label">Матчей</div>
                </div>
                <div class="stat-card-modern" style="background: linear-gradient(135deg, #69c0ff 0%, #1890ff 100%);">
                    <div class="stat-card-icon">✓</div>
                    <div class="stat-card-value">${statistics.completedMatches}</div>
                    <div class="stat-card-label">Завершено</div>
                </div>
                <div class="stat-card-modern" style="background: linear-gradient(135deg, #1890ff 0%, #0050b3 100%);">
                    <div class="stat-card-icon">⚖️</div>
                    <div class="stat-card-value">${statistics.totalJudges}</div>
                    <div class="stat-card-label">Судей</div>
                </div>
                <div class="stat-card-modern" style="background: linear-gradient(135deg, #40a9ff 0%, #096dd9 100%);">
                    <div class="stat-card-icon">🎓</div>
                    <div class="stat-card-value">${statistics.totalCoaches}</div>
                    <div class="stat-card-label">Тренеров</div>
                </div>
            </div>
            
            <!-- Графики -->
            <div class="charts-container">
                <!-- График 1: Распределение участников по командам -->
                <div class="chart-wrapper">
                    <h3 style="font-size: 16px; color: #1890ff; margin-bottom: 20px; text-align: center; font-weight: bold;">Распределение участников по командам</h3>
                    ${generateBarChart(teams.map((t: any) => ({ name: t.name, value: t.athletes.length })), 'Команды', 'Участников', 500, 300)}
                </div>
            </div>
        </div>
    </div>
    
    <!-- Страница 2: Перечень команд и распределение по регионам -->
    <div class="page">
        <div class="section">
            <h2 class="section-title">3. Перечень участвующих команд</h2>
            <table>
                <thead>
                    <tr>
                        <th>№</th>
                        <th>Название команды</th>
                        <th>Регион</th>
                        <th>Федеральный округ</th>
                        <th>Количество спортсменов</th>
                    </tr>
                </thead>
                <tbody>
                    ${teams.map((team: any, index: number) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${team.name}</td>
                        <td>${team.region?.name || 'Не указан'}</td>
                        <td>${team.region?.federalDistrict?.name || 'Не указан'}</td>
                        <td>${team.athletes.length}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="section" style="page-break-before: always;">
            <h2 class="section-title">4. Распределение команд по регионам</h2>
            <table style="width: 100%; margin-top: 20px;">
                <thead>
                    <tr>
                        <th style="width: 50px;">№</th>
                        <th>Регион</th>
                        <th style="width: 150px; text-align: center;">Команд</th>
                        <th style="width: 150px; text-align: center;">Спортсменов</th>
                        <th style="width: 200px; text-align: center;">Федеральный округ</th>
                    </tr>
                </thead>
                <tbody>
                    ${regionsStats.map((region: any, index: number) => `
                    <tr>
                        <td style="text-align: center; font-weight: bold;">${index + 1}</td>
                        <td style="font-weight: 500;">${region.name}</td>
                        <td style="text-align: center;">
                            <span style="display: inline-block; padding: 4px 12px; background: #1890ff; color: #fff; border-radius: 12px; font-weight: bold;">${region.teamsCount}</span>
                        </td>
                        <td style="text-align: center;">
                            <span style="display: inline-block; padding: 4px 12px; background: #52c41a; color: #fff; border-radius: 12px; font-weight: bold;">${region.athletesCount}</span>
                        </td>
                        <td style="text-align: center; color: #666;">${region.federalDistrict}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
    
    <!-- Страницы 3+: Информация о командах -->
    ${teams.map((team: any, teamIndex: number) => `
    <div class="page" style="page-break-inside: avoid; page-break-after: auto;">
        <div class="section">
            <div class="team-card" style="page-break-inside: avoid; margin-top: 0;">
                <div class="team-header">${team.name}</div>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Регион</div>
                        <div class="info-value">${team.region?.name || 'Не указан'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Федеральный округ</div>
                        <div class="info-value">${team.region?.federalDistrict?.name || 'Не указан'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Количество спортсменов</div>
                        <div class="info-value">${team.athletes.length}</div>
                    </div>
                </div>
                
                ${team.coaches && team.coaches.length > 0 ? `
                <h3 style="margin-top: 20px; margin-bottom: 10px; font-size: 14px; color: #1890ff;">Тренеры команды:</h3>
                ${team.coaches.map((coach: any) => {
                  const profile = coach.user.profile;
                  return `
                  <div class="athlete-item" style="background: #e6f7ff; border-left-color: #52c41a;">
                    <strong>${profile.lastName} ${profile.firstName} ${profile.middleName || ''}</strong><br>
                    Email: ${coach.user.email}
                  </div>
                  `;
                }).join('')}
                ` : ''}
                
                <h3 style="margin-top: 20px; margin-bottom: 10px; font-size: 14px; color: #1890ff;">Спортсмены:</h3>
                ${team.athletes.map((athlete: any) => {
                  const profile = athlete.user.profile;
                  const birthDate = athlete.birthDate ? new Date(athlete.birthDate).toLocaleDateString('ru-RU') : 'Не указана';
                  return `
                  <div class="athlete-item">
                    <strong>${profile.lastName} ${profile.firstName} ${profile.middleName || ''}</strong><br>
                    Email: ${athlete.user.email}<br>
                    Дата рождения: ${birthDate}<br>
                    Пол: ${athlete.gender === 'MALE' ? 'Мужской' : 'Женский'}<br>
                    ${athlete.weightCategory ? `Весовая категория: ${athlete.weightCategory.name}<br>` : ''}
                    ${athlete.weight ? `Вес: ${athlete.weight} кг<br>` : ''}
                    ${athlete.sportsRank ? `Спортивный разряд: ${athlete.sportsRank.name}<br>` : ''}
                    Статус: ${getParticipantStatusText(athlete.participantStatus)}
                    ${athlete.coach ? `<br>Личный тренер: ${athlete.coach.user.profile.lastName} ${athlete.coach.user.profile.firstName}` : ''}
                  </div>
                  `;
                }).join('')}
            </div>
        </div>
    </div>
    `).join('')}
    
    <!-- Страница: Информация о судьях -->
    <div class="page">
        <div class="section">
            <h2 class="section-title">6. Информация о судьях соревнования</h2>
            <table>
                <thead>
                    <tr>
                        <th>№</th>
                        <th>ФИО</th>
                        <th>Email</th>
                        <th>Образовательная организация</th>
                    </tr>
                </thead>
                <tbody>
                    ${competition.judges.map((judge: any, index: number) => {
                      const profile = judge.user.profile;
                      return `
                      <tr>
                        <td>${index + 1}</td>
                        <td>${profile.lastName} ${profile.firstName} ${profile.middleName || ''}</td>
                        <td>${judge.user.email}</td>
                        <td>${judge.user.educationalOrganization?.name || 'Не указана'}</td>
                      </tr>
                      `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    </div>
    
    <!-- Страницы: Турнирные сетки -->
    ${competition.brackets.map((bracket: any, bracketIndex: number) => `
    <!-- Страница с визуализацией сетки (альбомная ориентация) -->
    <div class="page-landscape">
        <div class="section" style="display: flex; flex-direction: column;">
            <h2 class="section-title" style="margin-bottom: 15px;">7.${bracketIndex + 1} Турнирная сетка: ${bracket.weightCategory.name}</h2>
            <div class="bracket-section" style="overflow: visible;">
                <div style="width: 100%; overflow: visible; position: relative;">
                    ${generateBracketVisualization(bracket)}
                </div>
            </div>
        </div>
    </div>
    
    <!-- Страница с детальной информацией о матчах -->
    <div class="page">
        <div class="section">
            <h2 class="section-title">7.${bracketIndex + 1}.1 Детальная информация о матчах: ${bracket.weightCategory.name}</h2>
            <h3 style="margin-top: 10px; margin-bottom: 10px; font-size: 14px; color: #1890ff;">Матчи:</h3>
                ${bracket.matches.map((match: any) => {
                  const getFullName = (athlete: any) => {
                    if (!athlete) return 'TBD';
                    const profile = athlete.user?.profile;
                    if (!profile) return 'TBD';
                    const parts = [profile.lastName, profile.firstName, profile.middleName].filter(Boolean);
                    return parts.join(' ').trim() || 'TBD';
                  };
                  
                  const athlete1Name = getFullName(match.athlete1);
                  const athlete2Name = getFullName(match.athlete2);
                  
                  // Определяем победителя по winnerId
                  let winnerName = 'Не определён';
                  if (match.winnerId) {
                    if (match.athlete1 && match.athlete1.id === match.winnerId) {
                      winnerName = athlete1Name;
                    } else if (match.athlete2 && match.athlete2.id === match.winnerId) {
                      winnerName = athlete2Name;
                    }
                  }
                  
                  const matchStatus = match.status === 'COMPLETED' ? 'Завершён' : match.status === 'IN_PROGRESS' ? 'В процессе' : 'Запланирован';
                  const scoreText = formatScore(match.score, match.athlete1, match.athlete2);
                  
                  return `
                  <div class="match-item">
                    <strong>Раунд ${match.round}, Позиция ${match.position}</strong><br>
                    ${athlete1Name} vs ${athlete2Name}<br>
                    ${scoreText ? `Счёт: ${scoreText}<br>` : ''}
                    Победитель: ${winnerName}<br>
                    Статус: ${matchStatus}
                    ${match.scheduledTime ? `<br>Запланировано: ${new Date(match.scheduledTime).toLocaleString('ru-RU')}` : ''}
                  </div>
                  `;
                }).join('')}
            </div>
        </div>
    </div>
    `).join('')}
    
    <!-- Страница: Результаты и статистика -->
    <div class="page">
        <div class="section">
            <h2 class="section-title">8. Результаты соревнования</h2>
            <p style="margin-bottom: 15px;">Всего матчей: ${statistics.totalMatches}, Завершено: ${statistics.completedMatches}</p>
            ${competition.brackets.map((bracket: any, bracketIndex: number) => {
              const completedMatches = bracket.matches.filter((m: any) => m.status === 'COMPLETED');
              
              // Фильтруем результаты по весовой категории
              const categoryResults = (results || []).filter((r: any) => 
                r.athlete?.weightCategory?.id === bracket.weightCategory.id
              );
              
              // Сортируем результаты по месту
              const sortedResults = [...categoryResults].sort((a: any, b: any) => {
                if (a.position === null && b.position === null) return 0;
                if (a.position === null) return 1;
                if (b.position === null) return -1;
                return a.position - b.position;
              });
              
              return `
              <div class="bracket-section" style="margin-bottom: 30px; ${bracketIndex > 0 ? 'page-break-before: always;' : ''}">
                <h3 style="font-size: 16px; color: #1890ff; margin-bottom: 15px; font-weight: bold;">${bracket.weightCategory.name}</h3>
                <p style="margin-bottom: 15px; color: #666;">Завершено матчей: ${completedMatches.length} из ${bracket.matches.length}</p>
                
                ${sortedResults.length > 0 ? `
                  <table style="width: 100%; margin-top: 15px;">
                    <thead>
                      <tr>
                        <th style="width: 60px; text-align: center;">Место</th>
                        <th>Фамилия</th>
                        <th>Имя</th>
                        <th>Отчество</th>
                        <th>Команда</th>
                        <th>Регион</th>
                        <th style="width: 100px; text-align: center;">Очки</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${sortedResults.map((result: any, index: number) => {
                        const profile = result.athlete?.user?.profile;
                        const team = result.athlete?.team;
                        const position = result.position !== null && result.position !== undefined ? result.position : '-';
                        const totalPoints = (result.matchResults || []).reduce((sum: number, mr: any) => {
                          const points = mr?.points !== null && mr?.points !== undefined ? Number(mr.points) : 0;
                          return sum + (isNaN(points) ? 0 : points);
                        }, 0);
                        
                        return `
                          <tr style="background: ${position === 1 ? '#fffbe6' : position === 2 ? '#f0f0f0' : position === 3 ? '#fff7e6' : 'transparent'};">
                            <td style="text-align: center; font-weight: ${position <= 3 ? 'bold' : 'normal'}; color: ${position === 1 ? '#faad14' : position === 2 ? '#8c8c8c' : position === 3 ? '#fa8c16' : '#333'};">
                              ${position}
                            </td>
                            <td>${profile?.lastName || '-'}</td>
                            <td>${profile?.firstName || '-'}</td>
                            <td>${profile?.middleName || '-'}</td>
                            <td>${team?.name || '-'}</td>
                            <td>${team?.region?.name || '-'}</td>
                            <td style="text-align: center; font-weight: bold;">${totalPoints}</td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                ` : `
                  <p style="color: #999; font-style: italic; margin-top: 15px;">Результаты пока не определены</p>
                `}
              </div>
              `;
            }).join('')}
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Конвертация HTML в PDF с помощью Puppeteer
   */
  private async htmlToPdf(html: string): Promise<Buffer> {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(html, { 
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Ждём немного, чтобы все стили применились
      await new Promise(resolve => setTimeout(resolve, 1000));

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
        preferCSSPageSize: true, // Используем размеры из CSS @page
      });

      if (!pdf || pdf.length === 0) {
        throw new Error('Ошибка генерации PDF: пустой файл');
      }

      return Buffer.from(pdf);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

