/**
 * Панель судьи
 * 
 * Функциональность:
 * - Панель для пользователей с ролью JUDGE
 * - Просмотр турнирных сеток
 * - Подтверждение результатов матчей
 * - Режим киоска для работы на соревнованиях
 * - Управление дисквалификациями
 * 
 * Страницы:
 * - Турнирные сетки
 * - Режим киоска (полноэкранный режим)
 * - Подтверждение результатов
 * - Статистика соревнований
 * - Календарь соревнований
 * - Уведомления и обращения
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../../../components/layout/MainLayout';
import { BracketsView } from './pages/BracketsView';
import { KioskMode } from './pages/KioskMode';
import { NewsFeed } from './pages/NewsFeed';
import { CompetitionStatistics } from './pages/CompetitionStatistics';
import { ResultConfirmation } from './pages/ResultConfirmation';
import { TicketsPage } from './pages/TicketsPage';
import { JudgeNotificationsPage } from './pages/JudgeNotificationsPage';
import { CompetitionCalendar } from './pages/CompetitionCalendar';
import { ProfilePage } from '../admin/pages/ProfilePage';
import {
  BarsOutlined,
  DesktopOutlined,
  FileTextOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  CustomerServiceOutlined,
  BellOutlined,
  CalendarOutlined,
} from '@ant-design/icons';

const menuItems = [
  {
    key: '/judge/news',
    label: 'Новости',
    icon: <FileTextOutlined />,
  },
  {
    key: '/judge/brackets',
    label: 'Турнирные сетки',
    icon: <BarsOutlined />,
  },
  {
    key: '/judge/kiosk',
    label: 'Режим киоска',
    icon: <DesktopOutlined />,
  },
  {
    key: '/judge/competition-statistics',
    label: 'Статистика соревнования',
    icon: <BarChartOutlined />,
  },
  {
    key: '/judge/result-confirmation',
    label: 'Подтверждение результатов',
    icon: <CheckCircleOutlined />,
  },
  {
    key: '/judge/tickets',
    label: 'Обращения',
    icon: <CustomerServiceOutlined />,
  },
  {
    key: '/judge/notifications',
    label: 'Уведомления',
    icon: <BellOutlined />,
  },
  {
    key: '/judge/calendar',
    label: 'Календарь соревнования',
    icon: <CalendarOutlined />,
  },
];

export const JudgeDashboard = () => {
  return (
    <MainLayout menuItems={menuItems}>
      <Routes>
        <Route path="/" element={<Navigate to="/judge/brackets" replace />} />
        <Route path="/news" element={<NewsFeed />} />
        <Route path="/brackets" element={<BracketsView />} />
        <Route path="/kiosk" element={<KioskMode />} />
        <Route path="/competition-statistics" element={<CompetitionStatistics />} />
        <Route path="/result-confirmation" element={<ResultConfirmation />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/notifications" element={<JudgeNotificationsPage />} />
        <Route path="/calendar" element={<CompetitionCalendar />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </MainLayout>
  );
};

