/**
 * Утилиты для генерации турнирных сеток
 * 
 * Функциональность:
 * - generateSingleElimination() - олимпийская система (single elimination)
 * - generateDoubleElimination() - система с нижней сеткой (double elimination)
 * - generateRoundRobin() - круговая система
 * 
 * Алгоритмы:
 * - Single Elimination: классическая олимпийская система
 * - Double Elimination: система с возможностью одного поражения
 * - Round Robin: каждый с каждым
 * 
 * Особенности:
 * - Автоматическое округление до степени двойки
 * - Обработка BYE (свободных слотов)
 * - Рекурсивная структура узлов
 */

import { BracketType } from '@prisma/client';
import { BracketNode } from '../types';
import logger from '../../../utils/logger';

export class BracketGenerator {
  /**
   * Генерация сетки single elimination (олимпийская система)
   */
  static generateSingleElimination(participantIds: string[]): BracketNode[] {
    try {

      // Если участников нет, создаем минимальную сетку (2 слота)
      if (participantIds.length === 0) {
        participantIds = [null as any, null as any];
      }

      // Если участник один, создаем сетку с одним участником и одним пустым слотом
      if (participantIds.length === 1) {
        participantIds = [participantIds[0], null as any];
      }

      // НЕ округляем до степени двойки - используем точное количество участников
      // Если количество чётное - используем как есть, если нечётное - добавляем один BYE
      const totalSlots = participantIds.length % 2 === 0 
        ? participantIds.length 
        : participantIds.length + 1;
      
      // Вычисляем количество раундов динамически
      let rounds = 0;
      let currentParticipants = totalSlots;
      while (currentParticipants > 1) {
        rounds++;
        currentParticipants = Math.ceil(currentParticipants / 2);
      }

      // Создаем массив слотов, гарантируя что в каждой паре есть хотя бы один участник
      const slots: (string | undefined)[] = new Array(totalSlots).fill(undefined);
      
      // Перемешиваем участников
      const shuffledParticipants = this.shuffleArray([...participantIds]);
      
      // Распределяем участников равномерно по парам
      // Заполняем пары последовательно, чтобы минимизировать BYE-матчи
      let participantIndex = 0;
      const pairCount = totalSlots / 2;
      
      // Заполняем пары по очереди: сначала первую пару полностью, потом вторую, и т.д.
      for (let pair = 0; pair < pairCount && participantIndex < shuffledParticipants.length; pair++) {
        // Первый слот пары (четный индекс)
        if (participantIndex < shuffledParticipants.length) {
          slots[pair * 2] = shuffledParticipants[participantIndex++];
        }
        // Второй слот пары (нечетный индекс)
        if (participantIndex < shuffledParticipants.length) {
          slots[pair * 2 + 1] = shuffledParticipants[participantIndex++];
        }
      }

      const bracket: BracketNode[] = [];
      let matchId = 0;

      // Генерируем первый раунд
      const firstRound: BracketNode[] = [];
      for (let i = 0; i < totalSlots / 2; i++) {
        const node: BracketNode = {
          id: `match-${matchId++}`,
          round: 1,
          position: i + 1,
          athlete1Id: slots[i * 2],
          athlete2Id: slots[i * 2 + 1],
        };
        firstRound.push(node);
      }

      bracket.push(...firstRound);

      // Генерируем последующие раунды (с пустыми слотами для будущих участников)
      // Количество матчей в каждом раунде вычисляется динамически
      let currentRound = firstRound;
      let currentRoundParticipants = firstRound.length; // Количество участников в текущем раунде
      
      for (let round = 2; round <= rounds; round++) {
        const nextRound: BracketNode[] = [];
        // Количество матчей в следующем раунде = округление вверх от половины участников текущего раунда
        const matchesInRound = Math.ceil(currentRoundParticipants / 2);
        const nextRoundParticipants = matchesInRound; // Количество участников в следующем раунде

        for (let i = 0; i < matchesInRound; i++) {
          // Собираем дочерние узлы, фильтруя undefined
          const child1 = currentRound[i * 2];
          const child2 = currentRound[i * 2 + 1];
          const children = [child1, child2].filter(child => child !== undefined);
          
          const node: BracketNode = {
            id: `match-${matchId++}`,
            round,
            position: i + 1,
            // Для будущих раундов athlete1Id и athlete2Id пустые - заполнятся после завершения предыдущих матчей
            athlete1Id: undefined,
            athlete2Id: undefined,
            children: children.length > 0 ? children : undefined,
          };
          nextRound.push(node);
        }

        bracket.push(...nextRound);
        currentRound = nextRound;
        currentRoundParticipants = nextRoundParticipants;
      }

      logger.info(`Сгенерирована single elimination сетка: ${rounds} раундов, ${bracket.length} матчей`);
      return bracket;
    } catch (error: any) {
      logger.error('Ошибка при генерации single elimination сетки', {
        error: error.message,
        participantsCount: participantIds.length,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Генерация сетки round robin (круговая система)
   */
  static generateRoundRobin(participantIds: string[]): BracketNode[] {
    try {

      const bracket: BracketNode[] = [];
      let matchId = 0;

      // Каждый играет с каждым
      for (let i = 0; i < participantIds.length; i++) {
        for (let j = i + 1; j < participantIds.length; j++) {
          const node: BracketNode = {
            id: `match-${matchId++}`,
            round: 1, // В round robin все матчи в одном раунде
            position: matchId,
            athlete1Id: participantIds[i],
            athlete2Id: participantIds[j],
          };
          bracket.push(node);
        }
      }

      logger.info(`Сгенерирована round robin сетка: ${bracket.length} матчей`);
      return bracket;
    } catch (error: any) {
      logger.error('Ошибка при генерации round robin сетки', {
        error: error.message,
        participantsCount: participantIds.length,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Генерация сетки double elimination (система с выбыванием через нижнюю сетку)
   */
  static generateDoubleElimination(participantIds: string[]): { upper: BracketNode[]; lower: BracketNode[] } {
    try {

      // Верхняя сетка (как single elimination)
      const upper = this.generateSingleElimination(participantIds);

      // Нижняя сетка (для проигравших)
      // Упрощенная версия - создаем базовую структуру
      const lower: BracketNode[] = [];
      const lowerRounds = Math.ceil(Math.log2(participantIds.length)) - 1;

      let matchId = upper.length;

      for (let round = 1; round <= lowerRounds; round++) {
        const matchesInRound = Math.pow(2, lowerRounds - round);
        for (let i = 0; i < matchesInRound; i++) {
          const node: BracketNode = {
            id: `match-${matchId++}`,
            round: round + 100, // Используем большие числа для нижней сетки
            position: i + 1,
          };
          lower.push(node);
        }
      }

      logger.info(`Сгенерирована double elimination сетка: верхняя ${upper.length} матчей, нижняя ${lower.length} матчей`);
      return { upper, lower };
    } catch (error: any) {
      logger.error('Ошибка при генерации double elimination сетки', {
        error: error.message,
        participantsCount: participantIds.length,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Перемешивание массива (Fisher-Yates)
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Обновление сетки после завершения матча
   */
  static updateBracketAfterMatch(
    bracket: BracketNode[],
    matchId: string,
    winnerId: string
  ): BracketNode[] {
    try {

      const updatedBracket = bracket.map((node) => {
        // Находим завершенный матч
        if (node.id === matchId) {
          return {
            ...node,
            winnerId,
            status: 'COMPLETED' as any,
          };
        }

        // Обновляем дочерние узлы
        if (node.children) {
          const updatedChildren = node.children.map((child) => {
            if (child.id === matchId) {
              return {
                ...child,
                winnerId,
                status: 'COMPLETED' as any,
              };
            }
            return child;
          });

          // Если оба дочерних матча завершены, определяем участников следующего раунда
          const completedChildren = updatedChildren.filter(
            (c) => c.winnerId && c.status === 'COMPLETED'
          );

          if (completedChildren.length === 2) {
            // Определяем, какой участник переходит в следующий раунд
            const winnerFromChildren = completedChildren.find(
              (c) => c.winnerId === winnerId
            );
            if (winnerFromChildren) {
              return {
                ...node,
                children: updatedChildren,
                athlete1Id: updatedChildren[0].winnerId,
                athlete2Id: updatedChildren[1].winnerId,
              };
            }
          }

          return {
            ...node,
            children: updatedChildren,
          };
        }

        return node;
      });

      return updatedBracket;
    } catch (error: any) {
      logger.error('Ошибка при обновлении сетки', {
        error: error.message,
        matchId,
        stack: error.stack,
      });
      throw error;
    }
  }
}

