/**
 * Redux slice для управления состоянием аутентификации
 * 
 * Функциональность:
 * - setCredentials() - сохранение данных пользователя и токена
 * - logout() - выход из системы
 * - setLoading() - установка состояния загрузки
 * - setUser() - обновление данных пользователя
 * - clearAuth() - очистка данных аутентификации
 * 
 * Состояние:
 * - user - данные текущего пользователя
 * - token - JWT токен
 * - isAuthenticated - флаг авторизации
 * - loading - состояние загрузки (проверка токена)
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'JUDGE' | 'COACH' | 'ATHLETE' | 'MODERATOR' | 'GUEST';
  profile?: {
    firstName: string;
    lastName: string;
    middleName?: string;
    phone?: string;
    avatarUrl?: string;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'), // Проверяем наличие токена
  loading: true, // Начинаем с loading: true для проверки токена
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
      console.log('[Redux] setCredentials:', action.payload.user.email, action.payload.user.role);
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.loading = false; // Устанавливаем loading в false после авторизации
      localStorage.setItem('token', action.payload.token);
    },
    logout: (state) => {
      console.log('[Redux] logout вызван', new Error().stack);
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setUser: (state, action: PayloadAction<User>) => {
      console.log('[Redux] setUser:', action.payload.email, action.payload.role);
      state.user = action.payload;
      state.isAuthenticated = true;
      state.loading = false; // Устанавливаем loading в false после восстановления сессии
      // Сохраняем токен если он еще не сохранен
      if (!state.token) {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          state.token = storedToken;
        }
      }
    },
    clearAuth: (state) => {
      console.log('[Redux] clearAuth вызван', new Error().stack);
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false; // Устанавливаем loading в false при очистке
      localStorage.removeItem('token');
    },
  },
});

export const { setCredentials, logout, setLoading, setUser, clearAuth } = authSlice.actions;
export default authSlice.reducer;

