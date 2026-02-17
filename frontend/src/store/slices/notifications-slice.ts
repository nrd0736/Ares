/**
 * Redux slice для управления уведомлениями
 * 
 * Функциональность:
 * - setNotifications() - установка списка уведомлений
 * - addNotification() - добавление нового уведомления
 * - markAsRead() - пометка уведомления как прочитанного
 * - markAllAsRead() - пометка всех уведомлений как прочитанных
 * - deleteNotification() - удаление уведомления
 * - setUnreadCount() - обновление счетчика непрочитанных
 * 
 * Состояние:
 * - notifications - список уведомлений
 * - unreadCount - количество непрочитанных
 * - loading - состояние загрузки
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  sentAt: string;
  sender?: {
    id: string;
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
    };
  };
}

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
}

const initialState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotifications: (state, action: PayloadAction<Notification[]>) => {
      state.notifications = action.payload;
      state.unreadCount = action.payload.filter((n) => !n.read).length;
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find((n) => n.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllAsRead: (state) => {
      state.notifications.forEach((n) => {
        n.read = true;
      });
      state.unreadCount = 0;
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find((n) => n.id === action.payload);
      if (notification && !notification.read) {
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const {
  setNotifications,
  addNotification,
  markAsRead,
  markAllAsRead,
  removeNotification,
  setUnreadCount,
  setLoading,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;

