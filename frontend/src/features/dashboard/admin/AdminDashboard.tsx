/**
 * Панель администратора
 * 
 * Функциональность:
 * - Главная панель для пользователей с ролью ADMIN
 * - Полный доступ ко всем функциям системы
 * - Управление пользователями, командами, соревнованиями
 * - Управление справочниками
 * - Системные настройки (бэкапы, логи, мониторинг)
 * - Генерация отчетов
 * 
 * Страницы:
 * - Управление пользователями, командами, соревнованиями
 * - Модерация команд
 * - Управление новостями, документами, трансляциями
 * - Статистика и отчеты
 * - Настройки организации
 * - Управление бэкапами и логами
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../../../components/layout/MainLayout';
import { UsersManagement } from './pages/UsersManagement';
import { TeamsManagement } from './pages/TeamsManagement';
import { CompetitionsManagement } from './pages/CompetitionsManagement';
import { InvitationsManagement } from './pages/InvitationsManagement';
import { NewsManagement } from './pages/NewsManagement';
import { StatisticsPage } from './pages/StatisticsPage';
import { ProfilePage } from './pages/ProfilePage';
import { BracketsManagement } from './pages/BracketsManagement';
import { ReferencesManagement } from './pages/ReferencesManagement';
import { NotificationsManagement } from './pages/NotificationsManagement';
import { TicketsManagement } from './pages/TicketsManagement';
import { TeamModeration } from './pages/TeamModeration';
import { CompetitionReports } from './pages/CompetitionReports';
import { CalendarManagement } from './pages/CalendarManagement';
import { LiveStreamsManagement } from './pages/LiveStreamsManagement';
import { OrganizationSettings } from './pages/OrganizationSettings';
import { BackupsManagement } from './pages/BackupsManagement';
import { LoggingManagement } from './pages/LoggingManagement';
import { DocumentsManagement } from './pages/DocumentsManagement';
import {
  UserOutlined,
  TeamOutlined,
  TrophyOutlined,
  BarsOutlined,
  FileTextOutlined,
  BarChartOutlined,
  MailOutlined,
  BellOutlined,
  FilePdfOutlined,
  CustomerServiceOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  BookOutlined,
  PlayCircleOutlined,
  SettingOutlined,
  DatabaseOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';

const menuItems = [
  {
    key: 'users-management',
    label: 'Управление пользователями',
    icon: <UserOutlined />,
    children: [
      {
        key: '/admin/users',
        label: 'Пользователи',
      },
      {
        key: '/admin/teams',
        label: 'Команды',
      },
      {
        key: '/admin/invitations',
        label: 'Приглашения',
      },
    ],
  },
  {
    key: 'competitions',
    label: 'Соревнования',
    icon: <TrophyOutlined />,
    children: [
      {
        key: '/admin/competitions',
        label: 'Соревнования',
      },
      {
        key: '/admin/brackets',
        label: 'Турнирные сетки',
      },
      {
        key: '/admin/calendar',
        label: 'Календарь соревнований',
      },
    ],
  },
  {
    key: 'content',
    label: 'Контент',
    icon: <FileTextOutlined />,
    children: [
      {
        key: '/admin/news',
        label: 'Новости',
      },
      {
        key: '/admin/live-streams',
        label: 'Прямые трансляции',
      },
      {
        key: '/admin/documents',
        label: 'Документы',
      },
    ],
  },
  {
    key: 'settings',
    label: 'Настройки',
    icon: <SettingOutlined />,
    children: [
      {
        key: '/admin/references',
        label: 'Справочники',
      },
      {
        key: '/admin/organization-settings',
        label: 'Настройки кастомизации',
      },
    ],
  },
  {
    key: 'administration',
    label: 'Администрирование',
    icon: <DatabaseOutlined />,
    children: [
      {
        key: '/admin/backups',
        label: 'Управление бэкапами',
      },
      {
        key: '/admin/logging',
        label: 'Логирование',
      },
    ],
  },
  {
    key: 'other',
    label: 'Другое',
    icon: <BarChartOutlined />,
    children: [
      {
        key: '/admin/statistics',
        label: 'Статистика',
      },
      {
        key: '/admin/notifications',
        label: 'Уведомления',
      },
      {
        key: '/admin/tickets',
        label: 'Обращения',
      },
      {
        key: '/admin/team-moderation',
        label: 'Модерация команд',
      },
      {
        key: '/admin/reports',
        label: 'Отчёты',
      },
    ],
  },
];

export const AdminDashboard = () => {
  return (
    <MainLayout menuItems={menuItems}>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/users" replace />} />
        <Route path="/users" element={<UsersManagement />} />
        <Route path="/teams" element={<TeamsManagement />} />
        <Route path="/competitions" element={<CompetitionsManagement />} />
        <Route path="/invitations" element={<InvitationsManagement />} />
        <Route path="/brackets" element={<BracketsManagement />} />
        <Route path="/calendar" element={<CalendarManagement />} />
        <Route path="/news" element={<NewsManagement />} />
        <Route path="/statistics" element={<StatisticsPage />} />
        <Route path="/references" element={<ReferencesManagement />} />
        <Route path="/notifications" element={<NotificationsManagement />} />
        <Route path="/tickets" element={<TicketsManagement />} />
        <Route path="/team-moderation" element={<TeamModeration />} />
        <Route path="/reports" element={<CompetitionReports />} />
        <Route path="/live-streams" element={<LiveStreamsManagement />} />
        <Route path="/organization-settings" element={<OrganizationSettings />} />
        <Route path="/backups" element={<BackupsManagement />} />
        <Route path="/logging" element={<LoggingManagement />} />
        <Route path="/documents" element={<DocumentsManagement />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </MainLayout>
  );
};

