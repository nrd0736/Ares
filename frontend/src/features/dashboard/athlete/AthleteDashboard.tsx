/**
 * Панель спортсмена
 * 
 * Функциональность:
 * - Панель для пользователей с ролью ATHLETE
 * - Просмотр личного портфолио
 * - Статистика выступлений
 * - История соревнований
 * - Календарь предстоящих соревнований
 * 
 * Страницы:
 * - Портфолио
 * - Статистика
 * - История соревнований
 * - Турнирные сетки
 * - Календарь
 * - Новости и документы
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../../../components/layout/MainLayout';
import { Portfolio } from './pages/Portfolio';
import { Statistics } from './pages/Statistics';
import { CompetitionsHistory } from './pages/CompetitionsHistory';
import { NewsFeed } from './pages/NewsFeed';
import { BracketsView } from './pages/BracketsView';
import { AthleteCalendar } from './pages/Calendar';
import { ProfilePage } from '../admin/pages/ProfilePage';
import {
  UserOutlined,
  BarChartOutlined,
  TrophyOutlined,
  FileTextOutlined,
  BarsOutlined,
  CalendarOutlined,
} from '@ant-design/icons';

const menuItems = [
  {
    key: '/athlete/news',
    label: 'Новости',
    icon: <FileTextOutlined />,
  },
  {
    key: '/athlete/portfolio',
    label: 'Портфолио',
    icon: <UserOutlined />,
  },
  {
    key: '/athlete/statistics',
    label: 'Статистика',
    icon: <BarChartOutlined />,
  },
  {
    key: '/athlete/competitions',
    label: 'Мои соревнования',
    icon: <TrophyOutlined />,
  },
  {
    key: '/athlete/brackets',
    label: 'Турнирные сетки',
    icon: <BarsOutlined />,
  },
  {
    key: '/athlete/calendar',
    label: 'Календарь',
    icon: <CalendarOutlined />,
  },
];

export const AthleteDashboard = () => {
  return (
    <MainLayout menuItems={menuItems}>
      <Routes>
        <Route path="/" element={<Navigate to="/athlete/portfolio" replace />} />
        <Route path="/news" element={<NewsFeed />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/statistics" element={<Statistics />} />
        <Route path="/competitions" element={<CompetitionsHistory />} />
        <Route path="/brackets" element={<BracketsView />} />
        <Route path="/calendar" element={<AthleteCalendar />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </MainLayout>
  );
};

