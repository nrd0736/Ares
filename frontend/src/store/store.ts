/**
 * Redux store конфигурация
 * 
 * Функциональность:
 * - Централизованное управление состоянием приложения
 * - Redux slices для различных доменов
 * 
 * Slices:
 * - auth - состояние аутентификации (пользователь, токен)
 * - notifications - уведомления пользователя
 * 
 * Используется для:
 * - Хранения данных пользователя
 * - Управления уведомлениями
 * - Глобального состояния приложения
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/auth-slice';
import notificationsReducer from './slices/notifications-slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    notifications: notificationsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

