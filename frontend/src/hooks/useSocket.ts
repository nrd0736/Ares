/**
 * React хуки для работы с Socket.IO
 * 
 * Функциональность:
 * - useSocket() - основной хук для подключения к Socket.IO
 * - useCompetitionSocket() - подписка на события конкретного соревнования
 * 
 * Особенности:
 * - Автоматическое подключение при авторизации
 * - Автоматическое отключение при размонтировании компонента
 * - Подписка на уведомления и новости
 * - Интеграция с Redux для уведомлений
 */

import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import socketService from '../services/socket-service';
import { RootState } from '../store/store';
import { useDispatch } from 'react-redux';
import { addNotification } from '../store/slices/notifications-slice';

/**
 * Хук для работы с Socket.IO
 * Автоматически подключается при авторизации пользователя
 */
export const useSocket = () => {
  const { token, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    if (isAuthenticated && token) {
      // Подключаемся к Socket.IO (не блокируем авторизацию при ошибках)
      try {
        socketService.connect(token);

        // Подписываемся на уведомления
        socketService.subscribeToNotifications('', (notification) => {
          dispatch(addNotification(notification));
        });

        // Подписываемся на новости
        socketService.subscribeToNews((news) => {
          // Можно добавить обработку новостей
          console.log('Новая новость:', news);
        });
      } catch (error) {
        // Игнорируем ошибки Socket.IO - они не должны блокировать работу приложения
        console.debug('Ошибка подключения Socket.IO (не критично)', error);
      }

      return () => {
        try {
          socketService.disconnect();
        } catch (error) {
          // Игнорируем ошибки при отключении
          console.debug('Ошибка отключения Socket.IO (не критично)', error);
        }
      };
    }
  }, [isAuthenticated, token, dispatch]);

  return {
    socket: socketService.getSocket(),
    isConnected: socketService.getConnectionStatus(),
  };
};

/**
 * Хук для подписки на события соревнования
 */
export const useCompetitionSocket = (competitionId: string | null) => {
  useEffect(() => {
    if (competitionId) {
      socketService.subscribeToCompetition(competitionId, (data) => {
        console.log('Обновление соревнования:', data);
      });

      return () => {
        if (competitionId) {
          socketService.unsubscribeFromCompetition(competitionId);
        }
      };
    }
  }, [competitionId]);
};

