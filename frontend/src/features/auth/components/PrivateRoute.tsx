/**
 * Компонент защиты приватных маршрутов
 * 
 * Функциональность:
 * - Проверка аутентификации пользователя
 * - Проверка роли пользователя
 * - Редирект на логин если не авторизован
 * - Редирект на главную если нет доступа
 * 
 * Использование:
 * <PrivateRoute allowedRoles={['ADMIN', 'MODERATOR']}>
 *   <Component />
 * </PrivateRoute>
 */

import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useSelector((state: RootState) => state.auth);

  // Ждем завершения проверки сессии
  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Загрузка...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Проверяем роль (с учетом возможных вариантов написания)
  const userRole = user.role?.toUpperCase();
  const hasAccess = allowedRoles.some(role => role.toUpperCase() === userRole);

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

