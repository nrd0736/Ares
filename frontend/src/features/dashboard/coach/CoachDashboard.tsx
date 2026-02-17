/**
 * Панель тренера
 * 
 * Функциональность:
 * - Панель для пользователей с ролью COACH
 * - Управление командой и спортсменами
 * - Подача заявок на соревнования
 * - Просмотр статистики команды
 * - Отправка уведомлений спортсменам
 * 
 * Страницы:
 * - Управление командой
 * - Заявки на соревнования
 * - Календарь выступлений
 * - Статистика команды
 * - Турнирные сетки
 * - Статистика соревнований
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../../../components/layout/MainLayout';
import { TeamManagement } from './pages/TeamManagement';
import { ApplicationsManagement } from './pages/ApplicationsManagement';
import { CompetitionCalendar } from './pages/CompetitionCalendar';
import { TeamStatistics } from './pages/TeamStatistics';
import { SendNotification } from './pages/SendNotification';
import { NewsFeed } from './pages/NewsFeed';
import { BracketsView } from './pages/BracketsView';
import { CompetitionStatistics } from './pages/CompetitionStatistics';
import { ProfilePage } from '../admin/pages/ProfilePage';
import {
  TeamOutlined,
  FileAddOutlined,
  CalendarOutlined,
  BarChartOutlined,
  BellOutlined,
  FileTextOutlined,
  BarsOutlined,
} from '@ant-design/icons';

const menuItems = [
  {
    key: '/coach/news',
    label: 'Новости',
    icon: <FileTextOutlined />,
  },
  {
    key: '/coach/team',
    label: 'Моя команда',
    icon: <TeamOutlined />,
  },
  {
    key: '/coach/applications',
    label: 'Заявки на соревнования',
    icon: <FileAddOutlined />,
  },
  {
    key: '/coach/calendar',
    label: 'Календарь выступлений',
    icon: <CalendarOutlined />,
  },
  {
    key: '/coach/brackets',
    label: 'Турнирные сетки',
    icon: <BarsOutlined />,
  },
  {
    key: '/coach/statistics',
    label: 'Статистика',
    icon: <BarChartOutlined />,
  },
  {
    key: '/coach/competition-statistics',
    label: 'Статистика соревнований',
    icon: <BarChartOutlined />,
  },
  {
    key: '/coach/notifications',
    label: 'Уведомления команде',
    icon: <BellOutlined />,
  },
];

export const CoachDashboard = () => {
  return (
    <MainLayout menuItems={menuItems}>
      <Routes>
        <Route path="/" element={<Navigate to="/coach/team" replace />} />
        <Route path="/news" element={<NewsFeed />} />
        <Route path="/team" element={<TeamManagement />} />
        <Route path="/applications" element={<ApplicationsManagement />} />
        <Route path="/calendar" element={<CompetitionCalendar />} />
        <Route path="/brackets" element={<BracketsView />} />
        <Route path="/statistics" element={<TeamStatistics />} />
        <Route path="/competition-statistics" element={<CompetitionStatistics />} />
        <Route path="/notifications" element={<SendNotification />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </MainLayout>
  );
};

