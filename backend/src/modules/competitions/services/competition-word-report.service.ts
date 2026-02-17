/**
 * Сервис генерации Word документов (.docx) для отчетов о соревнованиях
 * 
 * Функциональность:
 * - generateJudgesReport() - список судей с категориями и должностями
 * - generateTeamCompositionReport() - состав команд по весовым категориям и разрядам
 * - generateWinnersReport() - список победителей и призёров
 * - generateProtocolReport() - протокол хода соревнований
 * - generatePairsReport() - состав пар для соревнований
 * 
 * Технологии:
 * - Использует библиотеку docx для создания Word документов
 * - Форматирование таблиц, заголовков, текста
 * - Поддержка русского языка и дат
 * 
 * Форматы отчетов соответствуют официальным требованиям
 */

import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, 
  AlignmentType, WidthType, BorderStyle,
  PageOrientation, VerticalAlign, ShadingType, ImageRun } from 'docx';
import prisma from '../../../utils/database';
import logger from '../../../utils/logger';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

export class CompetitionWordReportService {

  /**
   * 1. Список судей
   */
  async generateJudgesReport(competitionId: string): Promise<Buffer> {
    try {
      logger.debug(`Генерация списка судей для соревнования: ${competitionId}`);
  
      // Упрощенный запрос согласно схеме Prisma
      const competition = await prisma.competition.findUnique({
        where: { id: competitionId },
        include: {
          sport: true,
          judges: {
            include: {
              user: {
                include: {
                  profile: true,
                  judgeProfile: {
                    include: {
                      region: {
                        include: {
                          federalDistrict: true
                        }
                      }
                    }
                  }
                },
              },
            },
            orderBy: {
              user: {
                profile: {
                  lastName: 'asc'
                }
              }
            }
          },
        },
      });
  
      if (!competition) {
        throw new Error('Соревнование не найдено');
      }
  
      const document = new Document({
        sections: [{
          properties: {
            page: {
              size: {
                width: 11906,
                height: 16838,
                orientation: PageOrientation.PORTRAIT
              },
              margin: {
                top: 1000,
                bottom: 1000,
                left: 1000,
                right: 1000,
              }
            }
          },
          children: this.createJudgesDocument(competition)
        }]
      });
  
      const buffer = await Packer.toBuffer(document);
      return buffer;
    } catch (error: any) {
      logger.error(`Ошибка при генерации списка судей для соревнования ${competitionId}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 2. Состав команд по весовым категориям и разрядам
   */
  async generateTeamCompositionReport(competitionId: string): Promise<Buffer> {
    try {
      logger.debug(`Генерация состава команд для соревнования: ${competitionId}`);

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
          brackets: {
            include: {
              weightCategory: true,
            }
          },
        },
      });

      if (!competition) {
        throw new Error('Соревнование не найдено');
      }

      // Рассчитываем возрастные группы из участников
      const ageGroups = this.calculateAgeGroupsFromParticipants(competition.participants, competition.startDate);
      
      const document = new Document({
        sections: [{
          properties: {
            page: {
              size: {
                width: 16838,
                height: 11906,
                orientation: PageOrientation.LANDSCAPE
              },
              margin: {
                top: 800,
                bottom: 800,
                left: 800,
                right: 800,
              }
            }
          },
          children: this.createTeamCompositionDocument(competition, ageGroups)
        }]
      });

      const buffer = await Packer.toBuffer(document);
      return buffer;
    } catch (error: any) {
      logger.error(`Ошибка при генерации состава команд для соревнования ${competitionId}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 3. Список победителей и призёров
   */
  async generateWinnersReport(competitionId: string): Promise<Buffer> {
    try {
      logger.debug(`Генерация списка победителей для соревнования: ${competitionId}`);

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
                      region: true,
                    },
                  },
                  weightCategory: true,
                  sportsRank: true,
                  coach: {
                    include: {
                      user: {
                        include: { profile: true },
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
                  results: {
                    include: {
                      athlete: {
                        include: {
                          user: {
                            include: { profile: true },
                          },
                          team: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!competition) {
        throw new Error('Соревнование не найдено');
      }

      const results = await this.getCompetitionResults(competitionId);
      
      // Рассчитываем возрастные группы
      const ageGroups = this.calculateAgeGroupsFromParticipants(competition.participants, competition.startDate);
      
      const document = new Document({
        sections: [{
          properties: {
            page: {
              size: {
                width: 11906,
                height: 16838,
                orientation: PageOrientation.PORTRAIT
              },
              margin: {
                top: 1000,
                bottom: 1000,
                left: 1000,
                right: 1000,
              }
            }
          },
          children: this.createWinnersDocument(competition, results, ageGroups)
        }]
      });

      const buffer = await Packer.toBuffer(document);
      return buffer;
    } catch (error: any) {
      logger.error(`Ошибка при генерации списка победителей для соревнования ${competitionId}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 5. Состав пар
   */
  async generatePairsReport(competitionId: string): Promise<Buffer> {
    try {
      logger.debug(`Генерация состава пар для соревнования: ${competitionId}`);

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
                  weightCategory: true,
                  sportsRank: true,
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
                          region: {
                            include: {
                              federalDistrict: true,
                            },
                          },
                        },
                      },
                    },
                  },
                  athlete2: {
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

      const document = new Document({
        sections: [{
          properties: {
            page: {
              size: {
                width: 11906,
                height: 16838,
                orientation: PageOrientation.PORTRAIT
              },
              margin: {
                top: 1000,
                bottom: 1000,
                left: 1000,
                right: 1000,
              }
            }
          },
          children: this.createPairsDocument(competition)
        }]
      });

      const buffer = await Packer.toBuffer(document);
      return buffer;
    } catch (error: any) {
      logger.error(`Ошибка при генерации состава пар для соревнования ${competitionId}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 4. Протокол хода соревнований
   */
  async generateProtocolReport(competitionId: string): Promise<Buffer> {
    try {
      logger.debug(`Генерация протокола для соревнования: ${competitionId}`);

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
                      region: true,
                    },
                  },
                  weightCategory: true,
                  sportsRank: true,
                  coach: {
                    include: {
                      user: {
                        include: { profile: true },
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
                      weightCategory: true,
                      coach: {
                        include: {
                          user: {
                            include: { profile: true },
                          },
                        },
                      },
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
                      weightCategory: true,
                      coach: {
                        include: {
                          user: {
                            include: { profile: true },
                          },
                        },
                      },
                    },
                  },
                  results: true,
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

      const results = await this.getCompetitionResults(competitionId);
      
      // Рассчитываем возрастные группы
      const ageGroups = this.calculateAgeGroupsFromParticipants(competition.participants, competition.startDate);
      
      // Генерируем содержимое документа
      const children = await this.createProtocolDocument(competition, results, ageGroups);
      
      // Проверяем, что children не пустой
      if (!children || children.length === 0) {
        throw new Error('Не удалось сгенерировать содержимое протокола');
      }
      
      // Создаём финальный документ с содержимым
      const document = new Document({
        sections: [{
          properties: {
            page: {
              size: {
                width: 11906,
                height: 16838,
                orientation: PageOrientation.PORTRAIT
              },
              margin: {
                top: 800,
                bottom: 800,
                left: 800,
                right: 800,
              }
            }
          },
          children: children
        }]
      });

      const buffer = await Packer.toBuffer(document);
      return buffer;
    } catch (error: any) {
      logger.error(`Ошибка при генерации протокола для соревнования ${competitionId}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Метод получения результатов
   */
  private async getCompetitionResults(competitionId: string) {
    try {
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

      const allResults: any[] = [];
      brackets.forEach((bracket) => {
        bracket.matches.forEach((match) => {
          match.results.forEach((result) => {
            allResults.push(result);
          });
        });
      });

      const athleteResults = new Map<string, any>();
      
      allResults.forEach((result) => {
        if (!result.athleteId || !result.athlete) {
          return;
        }
        
        const athleteId = result.athleteId;
        let existing = athleteResults.get(athleteId);
        
        if (!existing) {
          existing = {
            athleteId: result.athleteId,
            athlete: result.athlete,
            position: null,
            matchResults: [],
            matchIds: new Set<string>(),
          };
        }
        
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
        
        if (result.position !== null && result.position !== undefined) {
          if (existing.position === null || result.position < existing.position) {
            existing.position = result.position;
          }
        }
        
        athleteResults.set(athleteId, existing);
      });

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
   * Рассчёт возрастных групп из участников
   * Группировка всегда по 2 года: 8-9, 10-11, 12-13, 14-15... 24-25, 26-27, 28-29 и т.д.
   */
  private calculateAgeGroupsFromParticipants(participants: any[], competitionDate: Date): Map<string, any> {
    const ageGroups = new Map<string, any>();

    participants.forEach(participant => {
      if (!participant.athlete?.birthDate) return;
      
      const birthDate = new Date(participant.athlete.birthDate);
      const compDate = new Date(competitionDate);
      let age = compDate.getFullYear() - birthDate.getFullYear();
      
      const monthDiff = compDate.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && compDate.getDate() < birthDate.getDate())) {
        age--;
      }
      
      // Группируем всегда по 2 года для всех возрастов
      // Если возраст чётный: 12 -> 12-13, 14 -> 14-15, 24 -> 24-25
      // Если возраст нечётный: 13 -> 12-13, 15 -> 14-15, 25 -> 24-25
      let minAge: number;
      let maxAge: number;
      
      if (age % 2 === 0) {
        // Чётный возраст
        minAge = age;
        maxAge = age + 1;
      } else {
        // Нечётный возраст
        minAge = age - 1;
        maxAge = age;
      }
      
      // Минимальная группа 8-9 лет
      if (minAge < 8) {
        minAge = 8;
        maxAge = 9;
      }
      
      const ageGroupKey = `${minAge}-${maxAge}`;
      const ageGroupLabel = `${minAge}-${maxAge} лет`;
      
      if (!ageGroups.has(ageGroupKey)) {
        ageGroups.set(ageGroupKey, {
          label: ageGroupLabel,
          participants: []
        });
      }
      
      ageGroups.get(ageGroupKey).participants.push(participant);
    });

    return ageGroups;
  }

  /**
   * 1. Создание документа "Список судей"
   */
  private createJudgesDocument(competition: any): any[] {
    const children: any[] = [];

    // Заголовок соревнования из БД - жирный, крупный шрифт
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: competition.name.toUpperCase(),
            bold: true,
            size: 32, // 16pt
            font: 'Times New Roman'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    );

    // Вид спорта
    if (competition.sport) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `по дисциплине: ${competition.sport.name}`,
              size: 28, // 14pt
              font: 'Times New Roman'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        })
      );
    }

    // Дата соревнований
    const startDate = format(new Date(competition.startDate), 'dd.MM.yyyy', { locale: ru });
    const endDate = format(new Date(competition.endDate), 'dd.MM.yyyy', { locale: ru });
    const dateText = startDate === endDate ? startDate : `${startDate} - ${endDate}`;

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: dateText,
            size: 24, // 12pt
            font: 'Times New Roman'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );

    // Заголовок "Список судейской коллегии"
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Список судейской коллегии',
            bold: true,
            size: 28, // 14pt
            font: 'Times New Roman'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );

    // Таблица судей
    const tableRows: TableRow[] = [];

    // Заголовок таблицы - жирный шрифт, серый фон
    const headerRow = new TableRow({
      children: [
        this.createJudgeTableCell('№ п/п', true, 700),
        this.createJudgeTableCell('Фамилия Имя Отчество', true, 3000),
        this.createJudgeTableCell('Округ', true, 1500),
        this.createJudgeTableCell('Субъект РФ, город', true, 2500),
        this.createJudgeTableCell('Категория', true, 1000),
        this.createJudgeTableCell('Должность', true, 2000),
        this.createJudgeTableCell('Оценка', true, 800)
      ],
      tableHeader: true,
      height: { value: 600, rule: 'atLeast' }
    });
    tableRows.push(headerRow);

    // Данные судей
    competition.judges.forEach((judge: any, index: number) => {
      const profile = judge.user.profile;
      const fullName = `${profile.lastName} ${profile.firstName} ${profile.middleName || ''}`;
      
      // Получаем данные из JudgeProfile
      let district = '';
      let regionAndCity = '';
      
      if (judge.user.judgeProfile?.region) {
        // Округ
        district = judge.user.judgeProfile.region.federalDistrict?.name || '';
        // Субъект РФ
        regionAndCity = judge.user.judgeProfile.region.name || '';
        // Город
        if (judge.user.judgeProfile.city) {
          regionAndCity += `, ${judge.user.judgeProfile.city}`;
        }
      }
      
      // Получаем должность судьи из JudgeProfile
      const position = judge.user.judgeProfile?.position || '-';
      
      // Получаем категорию судьи (сначала из CompetitionJudge, потом из JudgeProfile)
      const category = judge.category || judge.user.judgeProfile?.category || '-';
      
      const row = new TableRow({
        children: [
          this.createJudgeTableCell((index + 1).toString(), false, 700),
          this.createJudgeTableCell(fullName.trim(), false, 3000),
          this.createJudgeTableCell(district || '-', false, 1500),
          this.createJudgeTableCell(regionAndCity || '-', false, 2500),
          this.createJudgeTableCell(category, false, 1000),
          this.createJudgeTableCell(position, false, 2000),
          this.createJudgeTableCell('', false, 800) // Оценка - заполняется вручную
        ],
        height: { value: 400, rule: 'atLeast' }
      });
      tableRows.push(row);
    });

    const judgesTable = new Table({
      rows: tableRows,
      width: {
        size: 100,
        type: WidthType.PERCENTAGE
      },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
        left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
        right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
        insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' }
      },
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    });

    children.push(judgesTable);

    // Подписи внизу документа
    children.push(
      new Paragraph({
        text: '',
        spacing: { before: 800, after: 400 }
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Главный судья, ВК ',
            size: 24,
            font: 'Times New Roman'
          }),
          new TextRun({
            text: '_____________________',
            size: 24,
            font: 'Times New Roman'
          })
        ],
        spacing: { after: 300 }
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Главный секретарь, ВК ',
            size: 24,
            font: 'Times New Roman'
          }),
          new TextRun({
            text: '_____________________',
            size: 24,
            font: 'Times New Roman'
          })
        ]
      })
    );

    return children;
  }

  /**
   * 2. Создание документа "Состав команд по весовым категориям и разрядам"
   */
  private createTeamCompositionDocument(competition: any, ageGroups: Map<string, any>): any[] {
    const children: any[] = [];

    // Заголовок соревнования - жирный, крупный шрифт
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: competition.name.toUpperCase(),
            bold: true,
            size: 32, // 16pt
            font: 'Times New Roman'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    );

    // Вид спорта
    if (competition.sport) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `по дисциплине: ${competition.sport.name}`,
              size: 28, // 14pt
              font: 'Times New Roman'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        })
      );
    }

    // Дата соревнований
    const startDate = format(new Date(competition.startDate), 'dd.MM.yyyy', { locale: ru });
    const endDate = format(new Date(competition.endDate), 'dd.MM.yyyy', { locale: ru });
    const dateText = startDate === endDate ? startDate : `${startDate} - ${endDate}`;

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: dateText,
            size: 24, // 12pt
            font: 'Times New Roman'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );

    // Заголовок "Состав команд по весовым категориям и разрядам"
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Состав команд по весовым категориям и разрядам',
            bold: true,
            size: 28, // 14pt
            font: 'Times New Roman'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );

    // Сортируем возрастные группы по возрастанию
    const sortedAgeGroups = Array.from(ageGroups.entries())
      .sort(([keyA], [keyB]) => {
        const minAgeA = parseInt(keyA.split('-')[0]);
        const minAgeB = parseInt(keyB.split('-')[0]);
        return minAgeA - minAgeB;
      });

    // Для каждой возрастной группы
    sortedAgeGroups.forEach(([_, ageGroupData]) => {
      if (ageGroupData.participants.length === 0) return;
      
      // Заголовок возрастной группы
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: ageGroupData.label,
              bold: true,
              size: 26, // 13pt
              font: 'Times New Roman'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 600, after: 400 }
        })
      );
      
      // Собираем все весовые категории для этой возрастной группы
      const weightCategories = new Set<string>();
      const participantsByTeamAndCategory = new Map<string, Map<string, { male: number, female: number, ranks: Map<string, { male: number, female: number }> }>>();
      const allTeams = new Set<string>();
      
      ageGroupData.participants.forEach((participant: any) => {
        const athlete = participant.athlete;
        if (!athlete || !athlete.team || !athlete.weightCategory) return;
        
        const teamName = athlete.team.name;
        const weightCategory = athlete.weightCategory.name;
        const gender = athlete.gender === 'FEMALE' ? 'female' : 'male';
        const rank = athlete.sportsRank?.name || 'без разряда';
        
        weightCategories.add(weightCategory);
        allTeams.add(teamName);
        
        if (!participantsByTeamAndCategory.has(teamName)) {
          participantsByTeamAndCategory.set(teamName, new Map());
        }
        
        const teamCategories = participantsByTeamAndCategory.get(teamName)!;
        if (!teamCategories.has(weightCategory)) {
          teamCategories.set(weightCategory, { 
            male: 0, 
            female: 0, 
            ranks: new Map<string, { male: number, female: number }>() 
          });
        }
        
        const categoryData = teamCategories.get(weightCategory)!;
        if (gender === 'male') {
          categoryData.male++;
        } else {
          categoryData.female++;
        }
        
        // Учитываем разряды с учетом пола
        if (!categoryData.ranks.has(rank)) {
          categoryData.ranks.set(rank, { male: 0, female: 0 });
        }
        const rankData = categoryData.ranks.get(rank)!;
        if (gender === 'male') {
          rankData.male++;
        } else {
          rankData.female++;
        }
      });
      
      // Сортируем весовые категории
      const sortedWeightCategories = Array.from(weightCategories).sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });
      
      // Сортируем команды по алфавиту
      const sortedTeams = Array.from(allTeams).sort();
      
      // Таблица 1: Состав по весовым категориям с разделением на юношей и девушек
      // В образце: пол наверху (Юноши/Девушки), категории снизу
      const table1Rows: TableRow[] = [];
      
      // Первая строка заголовка - основные столбцы и пол (Юноши/Девушки)
      const headerRow1Cells: TableCell[] = [
        this.createTeamTableCell('№ п/п', true, 600),
        this.createTeamTableCell('Команда', true, 3000)
      ];
      
      // "Юноши" - объединяем на все весовые категории
      if (sortedWeightCategories.length > 0) {
        headerRow1Cells.push(
          this.createTeamTableCell('Юноши', true, sortedWeightCategories.length * 1000, sortedWeightCategories.length)
        );
      }
      
      // "Девушки" - объединяем на все весовые категории
      if (sortedWeightCategories.length > 0) {
        headerRow1Cells.push(
          this.createTeamTableCell('Девушки', true, sortedWeightCategories.length * 1000, sortedWeightCategories.length)
        );
      }
      
      headerRow1Cells.push(
        this.createTeamTableCell('Всего', true, 1000)
      );
      
      table1Rows.push(new TableRow({
        children: headerRow1Cells,
        tableHeader: true,
        height: { value: 600, rule: 'atLeast' }
      }));
      
      // Вторая строка заголовка - весовые категории под каждым полом
      const headerRow2Cells: TableCell[] = [
        this.createTeamTableCell('', true, 600),
        this.createTeamTableCell('', true, 3000)
      ];
      
      // Весовые категории под "Юноши"
      sortedWeightCategories.forEach(category => {
        headerRow2Cells.push(
          this.createTeamTableCell(category, true, 1000)
        );
      });
      
      // Весовые категории под "Девушки"
      sortedWeightCategories.forEach(category => {
        headerRow2Cells.push(
          this.createTeamTableCell(category, true, 1000)
        );
      });
      
      headerRow2Cells.push(
        this.createTeamTableCell('', true, 1000)
      );
      
      table1Rows.push(new TableRow({
        children: headerRow2Cells,
        tableHeader: true,
        height: { value: 500, rule: 'atLeast' }
      }));
      
      // Данные по командам
      let teamIndex = 1;
      const totalsByCategoryMale = new Map<string, number>();
      const totalsByCategoryFemale = new Map<string, number>();
      
      sortedTeams.forEach(teamName => {
        const teamCategories = participantsByTeamAndCategory.get(teamName) || new Map();
        const rowCells: TableCell[] = [
          this.createTeamTableCell(teamIndex.toString(), false, 600),
          this.createTeamTableCell(teamName, false, 3000)
        ];
        
        let teamTotalMale = 0;
        let teamTotalFemale = 0;
        
        // Сначала все категории для ЮНОШЕЙ
        sortedWeightCategories.forEach(category => {
          const data = teamCategories.get(category);
          if (data) {
            const maleCount = data.male || 0;
            rowCells.push(this.createTeamTableCell(maleCount > 0 ? maleCount.toString() : '', false, 1000));
            teamTotalMale += maleCount;
            
            // Суммируем для итогов
            const currentMaleTotal = totalsByCategoryMale.get(category) || 0;
            totalsByCategoryMale.set(category, currentMaleTotal + maleCount);
          } else {
            rowCells.push(this.createTeamTableCell('', false, 1000));
          }
        });
        
        // Затем все категории для ДЕВУШЕК
        sortedWeightCategories.forEach(category => {
          const data = teamCategories.get(category);
          if (data) {
            const femaleCount = data.female || 0;
            rowCells.push(this.createTeamTableCell(femaleCount > 0 ? femaleCount.toString() : '', false, 1000));
            teamTotalFemale += femaleCount;
            
            // Суммируем для итогов
            const currentFemaleTotal = totalsByCategoryFemale.get(category) || 0;
            totalsByCategoryFemale.set(category, currentFemaleTotal + femaleCount);
          } else {
            rowCells.push(this.createTeamTableCell('', false, 1000));
          }
        });
        
        const teamTotal = teamTotalMale + teamTotalFemale;
        rowCells.push(this.createTeamTableCell(teamTotal.toString(), false, 1000));
        table1Rows.push(new TableRow({ 
          children: rowCells,
          height: { value: 400, rule: 'atLeast' }
        }));
        teamIndex++;
      });
      
      // Итоговая строка
      const totalRowCells: TableCell[] = [
        this.createTeamTableCell('', false, 600),
        this.createTeamTableCell('ВСЕГО', true, 3000)
      ];
      
      let grandTotalMale = 0;
      let grandTotalFemale = 0;
      
      // Сначала итоги для всех категорий ЮНОШЕЙ
      sortedWeightCategories.forEach(category => {
        const maleTotal = totalsByCategoryMale.get(category) || 0;
        totalRowCells.push(this.createTeamTableCell(maleTotal.toString(), true, 1000));
        grandTotalMale += maleTotal;
      });
      
      // Затем итоги для всех категорий ДЕВУШЕК
      sortedWeightCategories.forEach(category => {
        const femaleTotal = totalsByCategoryFemale.get(category) || 0;
        totalRowCells.push(this.createTeamTableCell(femaleTotal.toString(), true, 1000));
        grandTotalFemale += femaleTotal;
      });
      
      const grandTotal = grandTotalMale + grandTotalFemale;
      totalRowCells.push(this.createTeamTableCell(grandTotal.toString(), true, 1000));
      table1Rows.push(new TableRow({ 
        children: totalRowCells,
        height: { value: 500, rule: 'atLeast' }
      }));
      
      const table1 = new Table({
        rows: table1Rows,
        width: {
          size: 100,
          type: WidthType.PERCENTAGE
        },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
          left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
          right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
          insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' }
        },
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });
      
      children.push(table1);
      
      // Таблица 2: Состав по разрядам
      children.push(
        new Paragraph({
          text: '',
          spacing: { before: 600 }
        })
      );
      
      // Заголовок "Состав по разрядам"
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Состав по разрядам',
              bold: true,
              size: 20, // 13pt
              font: 'Times New Roman'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 400 }
        })
      );
      
      // Собираем все уникальные разряды с учетом пола
      const allRanks = new Set<string>();
      const ranksByCategory = new Map<string, Map<string, { male: number, female: number }>>();
      
      sortedWeightCategories.forEach(category => {
        ranksByCategory.set(category, new Map<string, { male: number, female: number }>());
      });
      
      // Заполняем данные по разрядам с учетом пола
      sortedTeams.forEach(teamName => {
        const teamCategories = participantsByTeamAndCategory.get(teamName);
        if (teamCategories) {
          teamCategories.forEach((data, category) => {
            const categoryRanks = ranksByCategory.get(category);
            if (categoryRanks) {
              data.ranks.forEach((rankData, rank) => {
                allRanks.add(rank);
                if (!categoryRanks.has(rank)) {
                  categoryRanks.set(rank, { male: 0, female: 0 });
                }
                const currentRankData = categoryRanks.get(rank)!;
                currentRankData.male += rankData.male;
                currentRankData.female += rankData.female;
              });
            }
          });
        }
      });
      
      // Сортируем разряды в определённом порядке
      const rankOrder = ['1 разряд', '2 разряд', '3 разряд', '1 юн. разряд', '2 юн. разряд', '3 юн. разряд', 'без разряда'];
      const sortedRanks = Array.from(allRanks).sort((a, b) => {
        const indexA = rankOrder.indexOf(a);
        const indexB = rankOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
      });
      
      // Таблица разрядов с разделением на юношей и девушек
      // В образце: пол наверху (Юноши/Девушки), категории снизу
      const table2Rows: TableRow[] = [];
      
      // Первая строка заголовка - основные столбцы и пол (Юноши/Девушки)
      const headerRow1Cells2: TableCell[] = [
        this.createTeamTableCell('Спортивный разряд (звание)', true, 2200)
      ];
      
      // "Юноши" - объединяем на все весовые категории
      if (sortedWeightCategories.length > 0) {
        headerRow1Cells2.push(
          this.createTeamTableCell('Юноши', true, sortedWeightCategories.length * 900, sortedWeightCategories.length)
        );
      }
      
      // "Девушки" - объединяем на все весовые категории
      if (sortedWeightCategories.length > 0) {
        headerRow1Cells2.push(
          this.createTeamTableCell('Девушки', true, sortedWeightCategories.length * 900, sortedWeightCategories.length)
        );
      }
      
      headerRow1Cells2.push(
        this.createTeamTableCell('Кол-во участников', true, 1000)
      );
      
      table2Rows.push(new TableRow({
        children: headerRow1Cells2,
        tableHeader: true,
        height: { value: 600, rule: 'atLeast' }
      }));
      
      // Вторая строка заголовка - весовые категории под каждым полом
      const headerRow2Cells2: TableCell[] = [
        this.createTeamTableCell('', true, 2200)
      ];
      
      // Весовые категории под "Юноши"
      sortedWeightCategories.forEach(category => {
        headerRow2Cells2.push(
          this.createTeamTableCell(category, true, 900)
        );
      });
      
      // Весовые категории под "Девушки"
      sortedWeightCategories.forEach(category => {
        headerRow2Cells2.push(
          this.createTeamTableCell(category, true, 900)
        );
      });
      
      headerRow2Cells2.push(
        this.createTeamTableCell('', true, 1000)
      );
      
      table2Rows.push(new TableRow({
        children: headerRow2Cells2,
        tableHeader: true,
        height: { value: 500, rule: 'atLeast' }
      }));
      
      // Данные по разрядам
      sortedRanks.forEach(rank => {
        const rowCells: TableCell[] = [
          this.createTeamTableCell(rank, false, 2200)
        ];
        
        let rankTotalMale = 0;
        let rankTotalFemale = 0;
        
        // Сначала все категории для ЮНОШЕЙ
        sortedWeightCategories.forEach(category => {
          const categoryRanks = ranksByCategory.get(category);
          const rankData = categoryRanks?.get(rank) || { male: 0, female: 0 };
          rowCells.push(this.createTeamTableCell(rankData.male > 0 ? rankData.male.toString() : '', false, 900));
          rankTotalMale += rankData.male;
        });
        
        // Затем все категории для ДЕВУШЕК
        sortedWeightCategories.forEach(category => {
          const categoryRanks = ranksByCategory.get(category);
          const rankData = categoryRanks?.get(rank) || { male: 0, female: 0 };
          rowCells.push(this.createTeamTableCell(rankData.female > 0 ? rankData.female.toString() : '', false, 900));
          rankTotalFemale += rankData.female;
        });
        
        const rankTotal = rankTotalMale + rankTotalFemale;
        rowCells.push(this.createTeamTableCell(rankTotal.toString(), false, 1000));
        table2Rows.push(new TableRow({ 
          children: rowCells,
          height: { value: 400, rule: 'atLeast' }
        }));
      });
      
      // Итоговая строка для разрядов
      const totalRowCells2: TableCell[] = [
        this.createTeamTableCell('ВСЕГО', true, 2200)
      ];
      
      let grandTotalMaleRanks = 0;
      let grandTotalFemaleRanks = 0;
      
      // Сначала итоги для всех категорий ЮНОШЕЙ
      sortedWeightCategories.forEach(category => {
        let categoryTotalMale = 0;
        const categoryRanks = ranksByCategory.get(category);
        if (categoryRanks) {
          categoryRanks.forEach(rankData => {
            categoryTotalMale += rankData.male;
          });
        }
        totalRowCells2.push(this.createTeamTableCell(categoryTotalMale.toString(), true, 900));
        grandTotalMaleRanks += categoryTotalMale;
      });
      
      // Затем итоги для всех категорий ДЕВУШЕК
      sortedWeightCategories.forEach(category => {
        let categoryTotalFemale = 0;
        const categoryRanks = ranksByCategory.get(category);
        if (categoryRanks) {
          categoryRanks.forEach(rankData => {
            categoryTotalFemale += rankData.female;
          });
        }
        totalRowCells2.push(this.createTeamTableCell(categoryTotalFemale.toString(), true, 900));
        grandTotalFemaleRanks += categoryTotalFemale;
      });
      
      const grandTotalRanks = grandTotalMaleRanks + grandTotalFemaleRanks;
      totalRowCells2.push(this.createTeamTableCell(grandTotalRanks.toString(), true, 1000));
      table2Rows.push(new TableRow({ 
        children: totalRowCells2,
        height: { value: 500, rule: 'atLeast' }
      }));
      
      const table2 = new Table({
        rows: table2Rows,
        width: {
          size: 100,
          type: WidthType.PERCENTAGE
        },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
          left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
          right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
          insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' }
        },
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });
      
      children.push(table2);
    });

    // Подписи внизу документа
    children.push(
      new Paragraph({
        text: '',
        spacing: { before: 800, after: 400 }
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Главный судья, ВК ',
            size: 24,
            font: 'Times New Roman'
          }),
          new TextRun({
            text: '_____________________',
            size: 24,
            font: 'Times New Roman'
          })
        ],
        spacing: { after: 300 }
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Главный секретарь, ВК ',
            size: 24,
            font: 'Times New Roman'
          }),
          new TextRun({
            text: '_____________________',
            size: 24,
            font: 'Times New Roman'
          })
        ]
      })
    );

    return children;
  }

  /**
   * 3. Создание документа "Список победителей и призёров"
   */
  private createWinnersDocument(competition: any, results: any[], ageGroups: Map<string, any>): any[] {
    const children: any[] = [];

    // Заголовок соревнования - жирный, крупный шрифт
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: competition.name.toUpperCase(),
            bold: true,
            size: 32, // 16pt
            font: 'Times New Roman'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    );

    // Вид спорта
    if (competition.sport) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `по дисциплине: ${competition.sport.name}`,
              size: 28, // 14pt
              font: 'Times New Roman'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        })
      );
    }

    // Дата соревнований
    const startDate = format(new Date(competition.startDate), 'dd.MM.yyyy', { locale: ru });
    const endDate = format(new Date(competition.endDate), 'dd.MM.yyyy', { locale: ru });
    const dateText = startDate === endDate ? startDate : `${startDate} - ${endDate}`;

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: dateText,
            size: 24, // 12pt
            font: 'Times New Roman'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );

    // Заголовок "Список победителей и призёров"
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Список победителей и призёров',
            bold: true,
            size: 28, // 14pt
            font: 'Times New Roman'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );

    // Сортируем возрастные группы по возрастанию
    const sortedAgeGroups = Array.from(ageGroups.entries())
      .sort(([keyA], [keyB]) => {
        const minAgeA = parseInt(keyA.split('-')[0]);
        const minAgeB = parseInt(keyB.split('-')[0]);
        return minAgeA - minAgeB;
      });

    // Для каждой возрастной группы
    sortedAgeGroups.forEach(([_, ageGroupData]) => {
      if (ageGroupData.participants.length === 0) return;
      
      // Заголовок возрастной группы
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: ageGroupData.label,
              bold: true,
              size: 26, // 13pt
              font: 'Times New Roman'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 600, after: 400 }
        })
      );
      
      // Группируем участников по весовым категориям
      const participantsByWeightCategory = new Map<string, any[]>();
      
      ageGroupData.participants.forEach((participant: any) => {
        const athlete = participant.athlete;
        if (!athlete || !athlete.weightCategory) return;
        
        const weightCategory = athlete.weightCategory.name;
        if (!participantsByWeightCategory.has(weightCategory)) {
          participantsByWeightCategory.set(weightCategory, []);
        }
        
        // Находим результат для этого участника
        const result = results.find(r => r.athleteId === athlete.id);
        const position = result?.position || 999;
        
        participantsByWeightCategory.get(weightCategory)!.push({
          ...participant,
          position,
          result
        });
      });
      
      // Сортируем весовые категории по весу
      const sortedWeightCategories = Array.from(participantsByWeightCategory.keys()).sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });
      
      // Для каждой весовой категории
      sortedWeightCategories.forEach(weightCategory => {
        const participants = participantsByWeightCategory.get(weightCategory)!;
        
        // Сортируем участников по местам (1, 2, 3)
        const sortedParticipants = participants.sort((a, b) => {
          if (a.position === b.position) return 0;
          if (a.position === null) return 1;
          if (b.position === null) return -1;
          return a.position - b.position;
        });
        
        // Выводим только первые 3 места
        const winners = sortedParticipants.filter(p => p.position !== null && p.position <= 3);
        if (winners.length === 0) return;
        
        // Заголовок весовой категории
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Весовая категория ${weightCategory}`,
                bold: true,
                size: 24, // 12pt
                font: 'Times New Roman'
              })
            ],
            spacing: { before: 400, after: 200 }
          })
        );
        
        // Создаём таблицу для победителей
        const winnersTableRows: TableRow[] = [];
        
        // Заголовок таблицы
        const headerRow = new TableRow({
          children: [
            this.createTeamTableCell('Место', true, 800),
            this.createTeamTableCell('Фамилия Имя Отчество', true, 2500),
            this.createTeamTableCell('Команда', true, 2000),
            this.createTeamTableCell('Разряд', true, 1000),
            this.createTeamTableCell('Дата рождения', true, 1200),
            this.createTeamTableCell('Тренер', true, 2000)
          ],
          tableHeader: true,
          height: { value: 600, rule: 'atLeast' }
        });
        winnersTableRows.push(headerRow);
        
        // Сортируем победителей по местам (1, 2, 3)
        const sortedWinners = winners.sort((a, b) => a.position - b.position);
        
        // Добавляем строки для каждого победителя
        sortedWinners.forEach(winner => {
          const athlete = winner.athlete;
          const profile = athlete.user.profile;
          const fullName = `${profile.lastName} ${profile.firstName} ${profile.middleName || ''}`;
          const birthDate = athlete.birthDate ? 
            format(new Date(athlete.birthDate), 'dd.MM.yyyy', { locale: ru }) : '';
          const teamName = athlete.team?.name || '-';
          const sportsRank = athlete.sportsRank?.name || 'б/р';
          const coach = athlete.coach ? 
            `${athlete.coach.user.profile.lastName} ${athlete.coach.user.profile.firstName.substring(0, 1)}.${athlete.coach.user.profile.middleName?.substring(0, 1) || ''}.` : '-';
          
          const dataRow = new TableRow({
            children: [
              this.createTeamTableCell(winner.position.toString(), false, 800),
              this.createTeamTableCell(fullName.trim(), false, 2500),
              this.createTeamTableCell(teamName, false, 2000),
              this.createTeamTableCell(sportsRank, false, 1000),
              this.createTeamTableCell(birthDate, false, 1200),
              this.createTeamTableCell(coach, false, 2000)
            ],
            height: { value: 400, rule: 'atLeast' }
          });
          winnersTableRows.push(dataRow);
        });
        
        // Создаём таблицу
        const winnersTable = new Table({
          rows: winnersTableRows,
          width: {
            size: 100,
            type: WidthType.PERCENTAGE
          },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
            bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
            left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
            right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' }
          },
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
          }
        });
        
        children.push(winnersTable);
        
        // Отступ после таблицы
        children.push(
          new Paragraph({
            text: '',
            spacing: { after: 400 }
          })
        );
      });
    });

    // Подписи внизу документа
    children.push(
      new Paragraph({
        text: '',
        spacing: { before: 800, after: 400 }
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Главный судья, ВК ',
            size: 24,
            font: 'Times New Roman'
          }),
          new TextRun({
            text: '_____________________',
            size: 24,
            font: 'Times New Roman'
          })
        ],
        spacing: { after: 300 }
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Главный секретарь, ВК ',
            size: 24,
            font: 'Times New Roman'
          }),
          new TextRun({
            text: '_____________________',
            size: 24,
            font: 'Times New Roman'
          })
        ]
      })
    );

    return children;
  }

  /**
   * Генерация изображения турнирной сетки через puppeteer
   */
  private async generateBracketImage(bracket: any): Promise<{ buffer: Buffer; width: number; height: number } | null> {
    try {
      if (!bracket || !bracket.matches || bracket.matches.length === 0) {
        return null;
      }

      // Генерируем HTML для визуализации сетки
      const html = this.generateBracketHTML(bracket);

      // Используем puppeteer для рендеринга HTML в изображение
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      try {
        const page = await browser.newPage();
        // Устанавливаем большой размер viewport для лучшего рендеринга и качества
        await page.setViewport({ width: 2560, height: 1440 });
        await page.setContent(html, { 
          waitUntil: 'networkidle0',
          timeout: 30000 
        });
        
        // Ждём немного для полной загрузки и применения стилей
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Получаем реальные границы контента для правильной обрезки
        const contentBounds = await page.evaluate(() => {
          const element = document.querySelector('.bracket-tree-horizontal') as HTMLElement;
          if (element) {
            // Получаем размеры контейнера
            const containerRect = element.getBoundingClientRect();
            
            // Находим все видимые элементы внутри сетки (узлы, линии, заголовки)
            const allElements = element.querySelectorAll('div[style*="position: absolute"], svg[style*="position: absolute"]');
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            let hasElements = false;
            
            allElements.forEach((el: any) => {
              const rect = el.getBoundingClientRect();
              const style = window.getComputedStyle(el);
              // Учитываем только видимые элементы
              if (rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden') {
                // Используем координаты относительно контейнера
                const relativeX = rect.left - containerRect.left;
                const relativeY = rect.top - containerRect.top;
                const relativeRight = relativeX + rect.width;
                const relativeBottom = relativeY + rect.height;
                
                minX = Math.min(minX, relativeX);
                minY = Math.min(minY, relativeY);
                maxX = Math.max(maxX, relativeRight);
                maxY = Math.max(maxY, relativeBottom);
                hasElements = true;
              }
            });
            
            // Если не нашли элементы, используем размеры контейнера
            if (!hasElements || minX === Infinity) {
              return {
                x: 0,
                y: 0,
                width: Math.ceil(containerRect.width),
                height: Math.ceil(containerRect.height)
              };
            }
            
            // Добавляем небольшой отступ для красоты
            const padding = 20;
            const bounds = {
              x: Math.max(0, Math.floor(minX - padding)),
              y: Math.max(0, Math.floor(minY - padding)),
              width: Math.ceil(maxX - minX + padding * 2),
              height: Math.ceil(maxY - minY + padding * 2)
            };
            
            // Убеждаемся, что границы не выходят за пределы контейнера
            bounds.width = Math.min(bounds.width, Math.ceil(containerRect.width) - bounds.x);
            bounds.height = Math.min(bounds.height, Math.ceil(containerRect.height) - bounds.y);
            
            // Ограничиваем максимальные размеры
            bounds.width = Math.min(bounds.width, 2400);
            bounds.height = Math.min(bounds.height, 3000);
            
            return bounds;
          }
          return { x: 0, y: 0, width: 1920, height: 1080 };
        });
        
        logger.debug(`Границы контента для обрезки: x=${contentBounds.x}, y=${contentBounds.y}, width=${contentBounds.width}, height=${contentBounds.height}`);
        
        // Делаем скриншот с обрезкой по реальным границам контента
        // Используем fullPage: false чтобы не захватывать лишнее пространство
        const imageBuffer = await page.screenshot({
          type: 'png',
          clip: {
            x: contentBounds.x,
            y: contentBounds.y,
            width: contentBounds.width,
            height: contentBounds.height
          },
          omitBackground: false, // Сохраняем белый фон
          fullPage: false, // Не делаем скриншот всей страницы
        });

        // Возвращаем буфер и размеры изображения
        return {
          buffer: imageBuffer as Buffer,
          width: contentBounds.width,
          height: contentBounds.height
        };
      } finally {
        await browser.close();
      }
    } catch (error: any) {
      logger.error(`Ошибка при генерации изображения турнирной сетки`, {
        error: error.message,
        stack: error.stack,
      });
      return null as any;
    }
  }

  /**
   * Генерация HTML для визуализации турнирной сетки
   */
  private generateBracketHTML(bracket: any): string {
    if (!bracket.matches || bracket.matches.length === 0) {
      return '<html><body><p>Нет матчей в сетке</p></body></html>';
    }

    const getAthleteName = (athlete: any) => {
      if (!athlete || !athlete.user || !athlete.user.profile) return 'TBD';
      const profile = athlete.user.profile;
      const parts = [profile.lastName, profile.firstName, profile.middleName].filter(Boolean);
      return parts.join(' ').trim() || 'TBD';
    };

    const getAthleteRegion = (athlete: any) => {
      if (!athlete || !athlete.team || !athlete.team.region) return '';
      return athlete.team.region.name || '';
    };

    const getMatchWinner = (match: any) => {
      if (!match || !match.winnerId) return null;
      if (match.athlete1?.id === match.winnerId) return match.athlete1;
      if (match.athlete2?.id === match.winnerId) return match.athlete2;
      return null;
    };

    // Группируем матчи по раундам
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

    // Параметры (как в PDF отчёте, но с увеличенной шириной ячеек)
    const nodeWidth = 240; // Увеличено для лучшей читаемости
    const nodeHeight = 55;
    const horizontalGap = 200;
    const pairGap = 40; // Расстояние между участниками одного матча (увеличено для отступа между ячейками)
    const headerHeight = 60;
    const groupLabelWidth = 50;

    // Создаём карту спортсменов
    const athleteMap = new Map<string, { number: number; name: string; region: string }>();
    let participantNumber = 1;
    const firstRoundMatches = matchesByRound[1]?.sort((a, b) => a.position - b.position) || [];
    const totalPairs = firstRoundMatches.length;
    firstRoundMatches.forEach((match) => {
      if (match.athlete1 && !athleteMap.has(match.athlete1.id)) {
        athleteMap.set(match.athlete1.id, {
          number: participantNumber++,
          name: getAthleteName(match.athlete1),
          region: getAthleteRegion(match.athlete1),
        });
      }
      if (match.athlete2 && !athleteMap.has(match.athlete2.id)) {
        athleteMap.set(match.athlete2.id, {
          number: participantNumber++,
          name: getAthleteName(match.athlete2),
          region: getAthleteRegion(match.athlete2),
        });
      }
    });

    // Вычисляем позиции для каждого раунда (как в PDF отчёте)
    const pairCenters: Record<number, Record<number, number>> = {};
    const pairHeight = nodeHeight * 2 + pairGap; // Высота пары (2 узла + отступ)
    const pairSpacing = 50; // Отступ между парами (увеличен для отступа снизу ячеек)
    const groupAY = headerHeight + 40;
    const groupBY = headerHeight + 450; // Увеличено расстояние между группами A и B

    // Вычисляем позиции пар для каждого раунда (как в PDF отчёте)
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

    // Вычисляем динамическую высоту на основе количества пар в первом раунде (как в PDF отчёте)
    const halfPairs = Math.ceil(totalPairs / 2);
    const groupHeight = halfPairs * (pairHeight + pairSpacing) + 100; // +100 для отступов
    const totalHeight = headerHeight + groupHeight * 2 + 100; // Обе группы (A и B) + отступы
    const dynamicHeight = Math.max(600, totalHeight); // Минимум 600px

    // Используем более полную HTML-генерацию как в PDF отчёте
    // Создаём полную HTML структуру для puppeteer
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: #ffffff; }
    .bracket-tree-horizontal { position: relative; width: 100%; min-height: ${dynamicHeight}px; overflow: visible; background: #ffffff; }
  </style>
</head>
<body>
  <div class="bracket-tree-horizontal">`;

    // Заголовки раундов
    rounds.forEach((round, roundIndex) => {
      const xPosition = groupLabelWidth + roundIndex * (nodeWidth + horizontalGap);
      html += `
    <div style="position: absolute; left: ${xPosition}px; top: 0; width: ${nodeWidth}px; text-align: center; background: #f0f0f0; border: 1px solid #d9d9d9; border-radius: 4px; padding: 10px; font-weight: bold; font-size: 12px;">
      ${getRoundLabel(round)}
    </div>`;
    });

    // Заголовок победителя
    html += `
    <div style="position: absolute; left: ${groupLabelWidth + rounds.length * (nodeWidth + horizontalGap)}px; top: 0; width: ${nodeWidth}px; text-align: center; background: #f0f0f0; border: 1px solid #d9d9d9; border-radius: 4px; padding: 10px; font-weight: bold; font-size: 12px;">
      ПОБЕДИТЕЛЬ
    </div>`;

    // Метки групп
    html += `
    <div style="position: absolute; left: 0; top: ${groupAY}px; width: ${groupLabelWidth}px; text-align: center; font-size: 20px; font-weight: bold; color: #1890ff;">
      A
    </div>
    <div style="position: absolute; left: 0; top: ${groupBY}px; width: ${groupLabelWidth}px; text-align: center; font-size: 20px; font-weight: bold; color: #1890ff;">
      B
    </div>`;

    // Добавляем функцию getAthleteSportsRank для полноты
    const getAthleteSportsRank = (athlete: any) => {
      if (!athlete || !athlete.sportsRank) return '';
      return athlete.sportsRank.name || '';
    };

    // Создаём узлы для каждого раунда (используем более полную версию как в PDF)
    rounds.forEach((round, roundIndex) => {
      const matches = matchesByRound[round].sort((a, b) => a.position - b.position);
      const xPosition = groupLabelWidth + roundIndex * (nodeWidth + horizontalGap);

      matches.forEach((match) => {
        const matchPosition = match.position;
        const pairCenter = pairCenters[round][matchPosition];
        const baseMatchY = pairCenter - pairHeight / 2;

        let participant1 = null;
        let participant2 = null;

        if (match.athlete1 && match.athlete2) {
          participant1 = match.athlete1;
          participant2 = match.athlete2;
        } else if (round === 1) {
          participant1 = match.athlete1;
          participant2 = match.athlete2;
        } else {
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
          });
        }
        if (participant2 && !athleteMap.has(participant2.id)) {
          athleteMap.set(participant2.id, {
            number: participantNumber++,
            name: getAthleteName(participant2),
            region: getAthleteRegion(participant2),
          });
        }

        const winner = getMatchWinner(match);
        const athlete1Info = participant1 ? athleteMap.get(participant1.id) : null;
        const athlete2Info = participant2 ? athleteMap.get(participant2.id) : null;
        
        const isWinner1 = winner?.id === participant1?.id;
        const isWinner2 = winner?.id === participant2?.id;

        // Узел первого участника (полная версия как в PDF)
        if (participant1 && athlete1Info) {
          const athlete1Name = athlete1Info.name || '—';
          const athlete1Region = athlete1Info.region || '';
          const athlete1Number = athlete1Info.number || '';
          
          html += `
    <div style="position: absolute; left: ${xPosition}px; top: ${baseMatchY}px; width: ${nodeWidth}px; min-height: ${nodeHeight}px; display: flex; align-items: center; gap: 6px; padding: 8px 10px; border: ${isWinner1 ? '2px solid #1890ff' : '1px solid #d9d9d9'}; background: ${isWinner1 ? '#e6f7ff' : '#fff'}; border-radius: 4px; z-index: 2;">
      <div style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: #f0f0f0; border: 1px solid #d9d9d9; border-radius: 2px; font-size: 15px; font-weight: bold; flex-shrink: 0; margin-top: 2px;">
        ${athlete1Number}
      </div>
      <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; overflow: visible;">
        <div style="font-size: 15px; font-weight: ${isWinner1 ? 'bold' : '600'}; line-height: 1.5; word-wrap: break-word; overflow-wrap: break-word; hyphens: auto; overflow: visible; max-width: 100%;">
          ${athlete1Name}
        </div>
        ${athlete1Region ? `<div style="font-size: 12px; color: #8c8c8c; line-height: 1.4; word-wrap: break-word; overflow-wrap: break-word; hyphens: auto; overflow: visible; max-width: 100%;">
          ${athlete1Region}
        </div>` : ''}
      </div>
    </div>`;
        }

        // Узел второго участника (полная версия как в PDF)
        if (participant2 && athlete2Info) {
          const athlete2Name = athlete2Info.name || '—';
          const athlete2Region = athlete2Info.region || '';
          const athlete2Number = athlete2Info.number || '';
          
          html += `
    <div style="position: absolute; left: ${xPosition}px; top: ${baseMatchY + nodeHeight + pairGap}px; width: ${nodeWidth}px; min-height: ${nodeHeight}px; display: flex; align-items: center; gap: 6px; padding: 8px 10px; border: ${isWinner2 ? '2px solid #1890ff' : '1px solid #d9d9d9'}; background: ${isWinner2 ? '#e6f7ff' : '#fff'}; border-radius: 4px; z-index: 2;">
      <div style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: #f0f0f0; border: 1px solid #d9d9d9; border-radius: 2px; font-size: 15px; font-weight: bold; flex-shrink: 0; margin-top: 2px;">
        ${athlete2Number}
      </div>
      <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; overflow: visible;">
        <div style="font-size: 15px; font-weight: ${isWinner2 ? 'bold' : '600'}; line-height: 1.5; word-wrap: break-word; overflow-wrap: break-word; hyphens: auto; overflow: visible; max-width: 100%;">
          ${athlete2Name}
        </div>
        ${athlete2Region ? `<div style="font-size: 12px; color: #8c8c8c; line-height: 1.4; word-wrap: break-word; overflow-wrap: break-word; hyphens: auto; overflow: visible; max-width: 100%;">
          ${athlete2Region}
        </div>` : ''}
      </div>
    </div>`;
        }

        // Линии к следующему раунду (step-линии как в PDF отчёте)
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
            
            // Определяем целевой узел (к узлу победителя в следующем раунде, как в PDF отчёте)
            const nextPairCenter = pairCenters[nextRound]?.[nextMatchPosition];
            
            if (nextPairCenter !== undefined) {
              // Определяем целевой узел (к узлу победителя в следующем раунде, как в PDF отчёте)
              // Если есть победитель, линии идут к его узлу, иначе к пустому узлу
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
    </svg>`;
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
    </svg>`;
              }
            }
          }
        }
      });
    });

    // Узел финального победителя и линии к нему
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
      
      // Линии от финальных участников к победителю
      if (finalMatch && finalMatch.athlete1 && finalMatch.athlete2) {
        const finalMatchRoundIndex = rounds.length - 1;
        const finalMatchX = groupLabelWidth + finalMatchRoundIndex * (nodeWidth + horizontalGap);
        const finalPairCenter = pairCenters[finalRound]?.[finalMatch.position] || finalWinnerY;
        const athlete1Y = finalPairCenter - pairHeight / 2 + nodeHeight / 2;
        const athlete2Y = finalPairCenter - pairHeight / 2 + nodeHeight + pairGap + nodeHeight / 2;
        
        const finalLineX = finalMatchX + nodeWidth;
        const finalLineEndX = finalX;
        const finalLineLength = finalLineEndX - finalLineX;
        const targetY = finalWinnerY;
        
        // Линия от первого участника финала к победителю
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
    </svg>`;
        
        // Линия от второго участника финала к победителю
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
    </svg>`;
      }
      
      // Узел финального победителя
      const finalWinnerName = finalWinnerInfo.name || '—';
      const finalWinnerRegion = finalWinnerInfo.region || '';
      html += `
    <div style="position: absolute; left: ${finalX}px; top: ${finalWinnerY - nodeHeight / 2}px; width: ${nodeWidth}px; min-height: ${nodeHeight}px; height: auto; display: flex; align-items: center; justify-content: center; padding: 10px 12px; border: 2px solid #52c41a; background: #f6ffed; border-radius: 4px; font-weight: bold; z-index: 2; overflow: visible;">
      <div style="text-align: center; flex: 1; min-width: 0; overflow: visible;">
        <div style="font-size: 16px; font-weight: bold; line-height: 1.5; word-wrap: break-word; overflow-wrap: break-word; hyphens: auto; overflow: visible; max-width: 100%; margin-bottom: 5px;">
          ${finalWinnerName}
        </div>
        ${finalWinnerRegion ? `<div style="font-size: 13px; color: #8c8c8c; line-height: 1.4; word-wrap: break-word; overflow-wrap: break-word; hyphens: auto; overflow: visible; max-width: 100%;">
          ${finalWinnerRegion}
        </div>` : ''}
      </div>
    </div>`;
    }

    html += `
  </div>
</body>
</html>`;

    return html;
  }

  /**
   * 4. Создание документа "Протокол хода соревнований"
   */
  private async createProtocolDocument(competition: any, results: any[], ageGroups: Map<string, any>): Promise<any[]> {
    const children: any[] = [];

    // Заголовок соревнования - жирный, крупный шрифт
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: competition.name.toUpperCase(),
            bold: true,
            size: 32, // 16pt
            font: 'Times New Roman'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    );

    // Вид спорта
    if (competition.sport) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `по дисциплине: ${competition.sport.name}`,
              size: 28, // 14pt
              font: 'Times New Roman'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        })
      );
    }

    // Дата соревнований
    const startDate = format(new Date(competition.startDate), 'dd.MM.yyyy', { locale: ru });
    const endDate = format(new Date(competition.endDate), 'dd.MM.yyyy', { locale: ru });
    const dateText = startDate === endDate ? startDate : `${startDate} - ${endDate}`;

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: dateText,
            size: 24, // 12pt
            font: 'Times New Roman'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );

    // Заголовок "Протокол хода соревнований"
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Протокол хода соревнований',
            bold: true,
            size: 28, // 14pt
            font: 'Times New Roman'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );

    // Группируем brackets по весовым категориям
    const bracketsByWeightCategory = new Map<string, any[]>();
    
    if (competition.brackets && competition.brackets.length > 0) {
      competition.brackets.forEach((bracket: any) => {
        if (!bracket.weightCategory) return;
        const weightCategoryName = bracket.weightCategory.name;
        if (!bracketsByWeightCategory.has(weightCategoryName)) {
          bracketsByWeightCategory.set(weightCategoryName, []);
        }
        bracketsByWeightCategory.get(weightCategoryName)!.push(bracket);
      });
    }
    
    // Сортируем весовые категории по весу (из brackets)
    const sortedWeightCategories = Array.from(bracketsByWeightCategory.keys()).sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.match(/\d+/)?.[0] || '0');
      return numA - numB;
    });

    // Для каждой весовой категории
    for (const weightCategory of sortedWeightCategories) {
      const bracket = bracketsByWeightCategory.get(weightCategory)?.[0];
      
      if (!bracket) continue; // Пропускаем, если нет сетки

        // Заголовок: Весовая категория
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Весовая категория ${weightCategory}`,
                bold: true,
                size: 26, // 13pt
                font: 'Times New Roman'
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 600, after: 400 }
          })
        );

        // Изображение турнирной сетки
        if (bracket && bracket.matches && bracket.matches.length > 0) {
          try {
            const bracketImageResult = await this.generateBracketImage(bracket);
            if (bracketImageResult && bracketImageResult.buffer) {
              // Создаём временный файл для изображения
              const tempDir = path.join(process.cwd(), 'temp');
              if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
              }
              const tempImagePath = path.join(tempDir, `bracket-${bracket.id}-${Date.now()}.png`);
              fs.writeFileSync(tempImagePath, bracketImageResult.buffer);

              try {
                // Используем размеры из результата генерации
                const imageWidth = bracketImageResult.width;
                const imageHeight = bracketImageResult.height;
                
                // Читаем изображение
                const imageBuffer = fs.readFileSync(tempImagePath);
                
                // Добавляем изображение в документ используя ImageRun
                // ImageRun - правильный способ добавления изображений в docx
                try {
                  // ВАЖНО: ImageRun.transformation ожидает размеры в ПИКСЕЛЯХ, а не в EMU!
                  // Библиотека docx автоматически конвертирует пиксели в EMU
                  // Если передать размеры в EMU, они будут интерпретированы как пиксели и конвертированы ещё раз,
                  // что приведёт к огромным размерам (например, 5963 см вместо 16 см)
                  
                  // Устанавливаем целевые размеры в сантиметрах
                  const TARGET_WIDTH_CM = 16;  // Максимальная ширина в см
                  const TARGET_HEIGHT_CM = 24; // Максимальная высота в см
                  
                  // Рассчитываем пропорции изображения
                  const aspectRatio = imageWidth / imageHeight;
                  
                  // Определяем финальные размеры в сантиметрах с сохранением пропорций
                  let finalWidthCm: number;
                  let finalHeightCm: number;
                  
                  // Если изображение широкое (ширина > высоты)
                  if (aspectRatio > 1) {
                    // Масштабируем по ширине
                    finalWidthCm = TARGET_WIDTH_CM;
                    finalHeightCm = TARGET_WIDTH_CM / aspectRatio;
                    
                    // Если высота превышает максимум, масштабируем по высоте
                    if (finalHeightCm > TARGET_HEIGHT_CM) {
                      finalHeightCm = TARGET_HEIGHT_CM;
                      finalWidthCm = TARGET_HEIGHT_CM * aspectRatio;
                    }
                  } else {
                    // Если изображение высокое (высота >= ширины)
                    // Масштабируем по высоте
                    finalHeightCm = TARGET_HEIGHT_CM;
                    finalWidthCm = TARGET_HEIGHT_CM * aspectRatio;
                    
                    // Если ширина превышает максимум, масштабируем по ширине
                    if (finalWidthCm > TARGET_WIDTH_CM) {
                      finalWidthCm = TARGET_WIDTH_CM;
                      finalHeightCm = TARGET_WIDTH_CM / aspectRatio;
                    }
                  }
                  
                  // Убеждаемся, что размеры не превышают максимумы
                  finalWidthCm = Math.min(finalWidthCm, TARGET_WIDTH_CM);
                  finalHeightCm = Math.min(finalHeightCm, TARGET_HEIGHT_CM);
                  
                  // Конвертируем сантиметры в пиксели для передачи в ImageRun
                  // При стандартном разрешении 96 DPI: 1 дюйм = 96 пикселей, 1 см = 96/2.54 ≈ 37.8 пикселей
                  const CM_TO_PX = 37.8;
                  const finalWidthPx = Math.round(finalWidthCm * CM_TO_PX);
                  const finalHeightPx = Math.round(finalHeightCm * CM_TO_PX);
                  
                  // Проверяем, что размеры в разумных пределах
                  // Максимальная ширина: 16 см ≈ 605 пикселей
                  // Максимальная высота: 24 см ≈ 907 пикселей
                  if (finalWidthPx <= 0 || finalHeightPx <= 0 || finalWidthPx > 1000 || finalHeightPx > 1500) {
                    logger.error(`КРИТИЧЕСКАЯ ОШИБКА: Некорректные размеры в пикселях: ${finalWidthPx}x${finalHeightPx}px`);
                    throw new Error(`Некорректные размеры изображения: ${finalWidthPx}x${finalHeightPx}px`);
                  }
                  
                  logger.debug(`Размеры изображения: ${imageWidth}x${imageHeight}px, пропорция: ${aspectRatio.toFixed(2)}, размеры для Word: ${finalWidthPx}x${finalHeightPx}px (${finalWidthCm.toFixed(2)}x${finalHeightCm.toFixed(2)} см)`);
                  
                  // Создаём ImageRun с размерами в ПИКСЕЛЯХ
                  // Библиотека docx автоматически конвертирует пиксели в EMU
                  const image = new ImageRun({
                    data: imageBuffer,
                    transformation: {
                      width: finalWidthPx,
                      height: finalHeightPx,
                    },
                  } as import('docx').IImageOptions);

                  children.push(
                    new Paragraph({
                      children: [image],
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 200, after: 400 }
                    })
                  );
                } catch (imageError: any) {
                  logger.warn(`Не удалось добавить изображение сетки, используем текстовую заглушку`, {
                    error: imageError.message,
                  });
                  // Добавляем текстовую заглушку вместо изображения
                  children.push(
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: '[Турнирная сетка]',
                          italics: true,
                          size: 20,
                          font: 'Times New Roman'
                        })
                      ],
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 200, after: 400 }
                    })
                  );
                }
              } finally {
                // Удаляем временный файл
                try {
                  fs.unlinkSync(tempImagePath);
                } catch (e) {
                  // Игнорируем ошибки удаления
                }
              }
            }
          } catch (error: any) {
            logger.error(`Ошибка при добавлении изображения сетки`, {
              error: error.message,
            });
            // Продолжаем без изображения
          }
        }

        // Протокол личных результатов для этой весовой категории
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Протокол личных результатов',
                bold: true,
                size: 24, // 12pt
                font: 'Times New Roman'
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 300 }
          })
        );

        const resultsTableRows: TableRow[] = [];

        // Заголовок таблицы
        resultsTableRows.push(new TableRow({
          children: [
            this.createTeamTableCell('№п/п', true, 700),
            this.createTeamTableCell('Место', true, 700),
            this.createTeamTableCell('№ п/ж', true, 700),
            this.createTeamTableCell('Фамилия, имя, отчество', true, 2500),
            this.createTeamTableCell('Дата рождения', true, 1200),
            this.createTeamTableCell('Команда, муниципалитет', true, 2000),
            this.createTeamTableCell('Разряд', true, 1000),
            this.createTeamTableCell('Тренер', true, 1500)
          ],
          tableHeader: true,
          height: { value: 600, rule: 'atLeast' }
        }));

        // Собираем всех участников из турнирной сетки (bracket.matches)
        const bracketAthletes = new Map<string, any>();
        
        if (bracket && bracket.matches && bracket.matches.length > 0) {
          bracket.matches.forEach((match: any) => {
            // Добавляем athlete1, если он есть
            if (match.athlete1 && match.athlete1.id) {
              if (!bracketAthletes.has(match.athlete1.id)) {
                bracketAthletes.set(match.athlete1.id, match.athlete1);
              }
            }
            // Добавляем athlete2, если он есть
            if (match.athlete2 && match.athlete2.id) {
              if (!bracketAthletes.has(match.athlete2.id)) {
                bracketAthletes.set(match.athlete2.id, match.athlete2);
              }
            }
          });
        }
        
        // Преобразуем Map в массив и сортируем по результатам
        const athletesArray = Array.from(bracketAthletes.values());
        const sortedAthletes = athletesArray.sort((a: any, b: any) => {
          const resultA = results.find(r => r.athleteId === a.id);
          const resultB = results.find(r => r.athleteId === b.id);
          const positionA = resultA?.position || 999;
          const positionB = resultB?.position || 999;
          return positionA - positionB;
        });

        let participantIndex = 1;
        sortedAthletes.forEach((athlete: any) => {
          const profile = athlete.user?.profile;
          if (!profile) return; // Пропускаем, если нет профиля
          
          const fullName = `${profile.lastName} ${profile.firstName} ${profile.middleName || ''}`;
          const birthDate = athlete.birthDate ? 
            format(new Date(athlete.birthDate), 'dd.MM.yyyy', { locale: ru }) : '';
          const teamName = athlete.team?.name || '';
          const region = athlete.team?.region?.name || '';
          const teamWithRegion = region ? `${teamName}, ${region}` : teamName;
          const sportsRank = athlete.sportsRank?.name || 'б/р';
          const coach = athlete.coach ? 
            `${athlete.coach.user.profile.lastName} ${athlete.coach.user.profile.firstName.substring(0, 1)}.${athlete.coach.user.profile.middleName?.substring(0, 1) || ''}.` : '';
          
          const result = results.find(r => r.athleteId === athlete.id);
          const position = result?.position || '-';
          
          resultsTableRows.push(new TableRow({
            children: [
              this.createTeamTableCell(participantIndex.toString(), false, 700),
              this.createTeamTableCell(position.toString(), false, 700),
              this.createTeamTableCell(participantIndex.toString(), false, 700),
              this.createTeamTableCell(fullName.trim(), false, 2500),
              this.createTeamTableCell(birthDate, false, 1200),
              this.createTeamTableCell(teamWithRegion, false, 2000),
              this.createTeamTableCell(sportsRank, false, 1000),
              this.createTeamTableCell(coach, false, 1500)
            ],
            height: { value: 400, rule: 'atLeast' }
          }));
          
          participantIndex++;
        });

        const resultsTable = new Table({
          rows: resultsTableRows,
          width: {
            size: 100,
            type: WidthType.PERCENTAGE
          },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
            bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
            left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
            right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' }
          },
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
          }
        });

        children.push(resultsTable);

        // Отступ после таблицы
        children.push(
          new Paragraph({
            text: '',
            spacing: { after: 600 }
          })
        );
    }

    // Подписи внизу документа
    children.push(
      new Paragraph({
        text: '',
        spacing: { before: 800, after: 400 }
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Главный судья, ВК ',
            size: 24,
            font: 'Times New Roman'
          }),
          new TextRun({
            text: '_____________________',
            size: 24,
            font: 'Times New Roman'
          })
        ],
        spacing: { after: 300 }
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Главный секретарь, ВК ',
            size: 24,
            font: 'Times New Roman'
          }),
          new TextRun({
            text: '_____________________',
            size: 24,
            font: 'Times New Roman'
          })
        ]
      })
    );

    return children;
  }

  /**
   * Вспомогательный метод для создания ячейки таблицы
   */
  /**
   * Создание ячейки для таблицы судей с правильным форматированием
   */
  private createJudgeTableCell(text: string, isHeader: boolean, width?: number): TableCell {
    return new TableCell({
      children: [
        new Paragraph({
          children: [new TextRun({ 
            text, 
            bold: isHeader,
            size: isHeader ? 22 : 20, // 11pt для заголовка, 10pt для данных
            font: 'Times New Roman'
          })],
          alignment: AlignmentType.CENTER,
          spacing: {
            before: 50,
            after: 50
          }
        })
      ],
      width: width ? { size: width, type: WidthType.DXA } : undefined,
      verticalAlign: VerticalAlign.CENTER,
      shading: isHeader ? {
        fill: 'D9D9D9', // Светло-серый фон для заголовка
        type: ShadingType.CLEAR
      } : undefined,
      margins: {
        top: 50,
        bottom: 50,
        left: 100,
        right: 100
      }
    });
  }

  /**
   * 5. Создание документа "Состав пар"
   */
  private createPairsDocument(competition: any): any[] {
    const children: any[] = [];

    // Заголовок соревнования - жирный, крупный шрифт
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: competition.name.toUpperCase(),
            bold: true,
            size: 32, // 16pt
            font: 'Times New Roman'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    );

    // Вид спорта
    if (competition.sport) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `по дисциплине: ${competition.sport.name}`,
              size: 28, // 14pt
              font: 'Times New Roman'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        })
      );
    }

    // Дата соревнований
    const startDate = format(new Date(competition.startDate), 'dd.MM.yyyy', { locale: ru });
    const endDate = format(new Date(competition.endDate), 'dd.MM.yyyy', { locale: ru });
    const dateText = startDate === endDate ? startDate : `${startDate} - ${endDate}`;

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: dateText,
            size: 24, // 12pt
            font: 'Times New Roman'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );

    // Заголовок "Состав пар"
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Состав пар',
            bold: true,
            size: 28, // 14pt
            font: 'Times New Roman'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );

    // Группируем матчи по весовым категориям и раундам
    const matchesByWeightAndRound = new Map<string, Map<number, any[]>>();

    competition.brackets.forEach((bracket: any) => {
      if (!bracket.matches || bracket.matches.length === 0) return;

      const weightCategory = bracket.weightCategory?.name || 'Не указана';
      
      if (!matchesByWeightAndRound.has(weightCategory)) {
        matchesByWeightAndRound.set(weightCategory, new Map());
      }

      const roundsMap = matchesByWeightAndRound.get(weightCategory)!;
      
      // Группируем матчи по раундам
      bracket.matches.forEach((match: any) => {
        const round = match.round || 1;
        if (!roundsMap.has(round)) {
          roundsMap.set(round, []);
        }
        roundsMap.get(round)!.push(match);
      });
    });

    // Сортируем весовые категории
    const sortedWeightCategories = Array.from(matchesByWeightAndRound.keys()).sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.match(/\d+/)?.[0] || '0');
      return numA - numB;
    });

    // Создаём карту номеров участников из первого раунда для всех весовых категорий
    const athleteNumberMap = new Map<string, number>();
    
    // Сначала проходим по всем первым раундам, чтобы присвоить номера
    competition.brackets.forEach((bracket: any) => {
      if (!bracket.matches || bracket.matches.length === 0) return;
      
      const firstRoundMatches = bracket.matches
        .filter((match: any) => match.round === 1)
        .sort((a: any, b: any) => a.position - b.position);
      
      let currentNumber = 1;
      firstRoundMatches.forEach((match: any) => {
        if (match.athlete1Id && !athleteNumberMap.has(match.athlete1Id)) {
          athleteNumberMap.set(match.athlete1Id, currentNumber++);
        }
        if (match.athlete2Id && !athleteNumberMap.has(match.athlete2Id)) {
          athleteNumberMap.set(match.athlete2Id, currentNumber++);
        }
      });
    });

    // Функция для получения названия раунда
    const getRoundName = (round: number, maxRound: number): string => {
      if (round === maxRound) return 'Финал';
      if (round === maxRound - 1) return '1/2';
      if (round === maxRound - 2) return '1/4';
      if (round === maxRound - 3) return '1/8';
      if (round === maxRound - 4) return '1/16';
      return `${round} раунд`;
    };

    // Для каждой весовой категории
    sortedWeightCategories.forEach(weightCategory => {
      const roundsMap = matchesByWeightAndRound.get(weightCategory)!;
      
      if (!roundsMap || roundsMap.size === 0) return;

      // Заголовок весовой категории
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Весовая категория ${weightCategory}`,
              bold: true,
              size: 24, // 12pt
              font: 'Times New Roman'
            })
          ],
          spacing: { before: 400, after: 200 }
        })
      );

      // Создаём одну общую таблицу для всех раундов весовой категории
      const pairsTableRows: TableRow[] = [];

      // Заголовок таблицы
      const headerRow = new TableRow({
        children: [
          this.createTeamTableCell('№ пары', true, 1000),
          this.createTeamTableCell('ФИО', true, 2000),
          this.createTeamTableCell('Команда', true, 1500),
          this.createTeamTableCell('Код ФО', true, 1000),
          this.createTeamTableCell('—', true, 500),
          this.createTeamTableCell('ФИО', true, 2000),
          this.createTeamTableCell('Команда', true, 1500),
          this.createTeamTableCell('Код ФО', true, 1000),
        ],
        tableHeader: true,
        height: { value: 600, rule: 'atLeast' }
      });
      pairsTableRows.push(headerRow);

      // Определяем максимальный раунд для этой весовой категории
      const maxRound = Math.max(...Array.from(roundsMap.keys()));

      // Сортируем раунды по возрастанию
      const sortedRounds = Array.from(roundsMap.keys()).sort((a, b) => a - b);

      // Функция для получения информации об участнике
      const getAthleteInfo = (athlete: any) => {
        if (!athlete) {
          return {
            number: '-',
            fullName: '-',
            teamName: '-',
            federalDistrictCode: '-',
          };
        }

        const profile = athlete.user?.profile;
        const fullName = profile 
          ? `${profile.lastName || ''} ${profile.firstName || ''} ${profile.middleName || ''}`.trim()
          : '-';
        
        const teamName = athlete.team?.name || '-';
        const federalDistrictCode = athlete.team?.region?.federalDistrict?.code || '-';
        // Номер берётся из первого раунда
        const number = athleteNumberMap.get(athlete.id)?.toString() || '-';

        return { number, fullName, teamName, federalDistrictCode };
      };

      // Для каждого раунда добавляем пары в общую таблицу
      sortedRounds.forEach(round => {
        const matches = roundsMap.get(round)!;
        
        if (matches.length === 0) return;

        // Добавляем строки для каждой пары этого раунда
        matches.sort((a, b) => a.position - b.position).forEach((match) => {
          const athlete1 = match.athlete1;
          const athlete2 = match.athlete2;

          if (!athlete1 && !athlete2) return; // Пропускаем пустые матчи

          const athlete1Info = getAthleteInfo(athlete1);
          const athlete2Info = getAthleteInfo(athlete2);

          // Номер пары: номер первого участника — номер второго участника
          const pairNumber = athlete1Info.number !== '-' && athlete2Info.number !== '-'
            ? `${athlete1Info.number} — ${athlete2Info.number}`
            : athlete1Info.number !== '-' 
              ? athlete1Info.number
              : athlete2Info.number !== '-'
                ? athlete2Info.number
                : '-';

          const dataRow = new TableRow({
            children: [
              this.createTeamTableCell(pairNumber, false, 1000),
              this.createTeamTableCell(athlete1Info.fullName, false, 2000),
              this.createTeamTableCell(athlete1Info.teamName, false, 1500),
              this.createTeamTableCell(athlete1Info.federalDistrictCode, false, 1000),
              this.createTeamTableCell('—', false, 500),
              this.createTeamTableCell(athlete2Info.fullName, false, 2000),
              this.createTeamTableCell(athlete2Info.teamName, false, 1500),
              this.createTeamTableCell(athlete2Info.federalDistrictCode, false, 1000),
            ],
            height: { value: 400, rule: 'atLeast' }
          });
          pairsTableRows.push(dataRow);
        });
      });

      // Создаём одну таблицу для всей весовой категории
      const pairsTable = new Table({
        rows: pairsTableRows,
        width: {
          size: 100,
          type: WidthType.PERCENTAGE
        },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
          left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
          right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
          insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' }
        },
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });

      children.push(pairsTable);

      // Отступ после таблицы весовой категории
      children.push(
        new Paragraph({
          text: '',
          spacing: { after: 400 }
        })
      );
    });

    // Подписи внизу документа
    children.push(
      new Paragraph({
        text: '',
        spacing: { before: 800, after: 400 }
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Главный судья, ВК ',
            size: 24,
            font: 'Times New Roman'
          }),
          new TextRun({
            text: '_____________________',
            size: 24,
            font: 'Times New Roman'
          })
        ],
        spacing: { after: 300 }
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Главный секретарь, ВК ',
            size: 24,
            font: 'Times New Roman'
          }),
          new TextRun({
            text: '_____________________',
            size: 24,
            font: 'Times New Roman'
          })
        ]
      })
    );

    return children;
  }

  /**
   * Создание ячейки для таблицы состава команд с правильным форматированием
   * @param text - текст в ячейке
   * @param isHeader - является ли заголовком
   * @param width - ширина ячейки в DXA
   * @param columnSpan - количество объединяемых столбцов
   */
  private createTeamTableCell(text: string, isHeader: boolean, width?: number, columnSpan?: number): TableCell {
    return new TableCell({
      children: [
        new Paragraph({
          children: [new TextRun({ 
            text, 
            bold: isHeader,
            size: isHeader ? 22 : 20, // 11pt для заголовка, 10pt для данных
            font: 'Times New Roman'
          })],
          alignment: AlignmentType.CENTER,
          spacing: {
            before: 50,
            after: 50
          }
        })
      ],
      width: width ? { size: width, type: WidthType.DXA } : undefined,
      columnSpan: columnSpan,
      verticalAlign: VerticalAlign.CENTER,
      shading: isHeader ? {
        fill: 'D9D9D9', // Светло-серый фон для заголовка
        type: ShadingType.CLEAR
      } : undefined,
      margins: {
        top: 50,
        bottom: 50,
        left: 100,
        right: 100
      }
    });
  }

  /**
   * Создание ячейки для других таблиц (универсальная)
   */
  private createTableCell(text: string, isHeader: boolean, width?: number): TableCell {
    return new TableCell({
      children: [
        new Paragraph({
          children: [new TextRun({ 
            text, 
            bold: isHeader,
            size: isHeader ? 22 : 20,
            font: 'Times New Roman'
          })],
          alignment: AlignmentType.CENTER
        })
      ],
      width: width ? { size: width, type: WidthType.DXA } : undefined,
      verticalAlign: VerticalAlign.CENTER,
      shading: isHeader ? {
        fill: 'D9D9D9',
        type: ShadingType.CLEAR
      } : undefined
    });
  }

}