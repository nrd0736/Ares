/**
 * Главный компонент приложения
 * 
 * Функциональность:
 * - Инициализация роутинга (React Router)
 * - Восстановление сессии при загрузке (проверка токена)
 * - Маршрутизация по ролям пользователей
 * - Защита приватных маршрутов
 * 
 * Маршруты:
 * - /login - страница входа
 * - /register - страница регистрации
 * - /admin/* - панель администратора
 * - /judge/* - панель судьи
 * - /coach/* - панель тренера
 * - /athlete/* - панель спортсмена
 * - /moderator/* - панель модератора
 * - /guest/* - гостевой доступ
 * - /kiosk - киоск режим для судей
 * 
 * Особенности:
 * - Автоматическая проверка токена при загрузке
 * - Редирект на логин при неавторизованном доступе
 * - Редирект на соответствующую панель по роли
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from './store/store';
import { setUser, setLoading, clearAuth } from './store/slices/auth-slice';
import { PrivateRoute } from './features/auth/components/PrivateRoute';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { AdminDashboard } from './features/dashboard/admin/AdminDashboard';
import { JudgeDashboard } from './features/dashboard/judge/JudgeDashboard';
import { CoachDashboard } from './features/dashboard/coach/CoachDashboard';
import { AthleteDashboard } from './features/dashboard/athlete/AthleteDashboard';
import { ModeratorDashboard } from './features/dashboard/moderator/ModeratorDashboard';
import { GuestPage } from './features/dashboard/guest/GuestPage';
import { CompetitionDetails } from './features/dashboard/guest/pages/CompetitionDetails';
import { KioskDisplay } from './features/dashboard/judge/pages/KioskDisplay';
import apiClient from './services/api-client';

function App() {
  const dispatch = useDispatch();
  const { loading, user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  // Восстанавливаем сессию при загрузке приложения (только один раз)
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('token');
      
      if (storedToken) {
        try {
          const response = await apiClient.get('/auth/me');
          
          if (response.data.success && response.data.data.user) {
            // Сохраняем токен при восстановлении сессии
            dispatch(setUser(response.data.data.user));
          } else {
            dispatch(clearAuth());
          }
        } catch (error: any) {
          // Токен невалидный или истек
          dispatch(clearAuth());
        }
      }
      // Всегда устанавливаем loading в false после проверки
      dispatch(setLoading(false));
    };

    restoreSession();
  }, [dispatch]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Загрузка...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<GuestPage />} />
        <Route path="/competition/:id" element={<CompetitionDetails />} />
        <Route path="/kiosk-display" element={<KioskDisplay />} />
        
        <Route
          path="/admin/*"
          element={
            <PrivateRoute allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/judge/*"
          element={
            <PrivateRoute allowedRoles={['JUDGE']}>
              <JudgeDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/coach/*"
          element={
            <PrivateRoute allowedRoles={['COACH']}>
              <CoachDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/athlete/*"
          element={
            <PrivateRoute allowedRoles={['ATHLETE']}>
              <AthleteDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/moderator/*"
          element={
            <PrivateRoute allowedRoles={['MODERATOR']}>
              <ModeratorDashboard />
            </PrivateRoute>
          }
        />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

