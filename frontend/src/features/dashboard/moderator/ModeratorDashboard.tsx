/**
 * Панель модератора
 * 
 * Функциональность:
 * - Панель для пользователей с ролью MODERATOR
 * - Ограниченный доступ к функциям администратора
 * - Фильтрация доступных разделов по настройкам модератора
 * - Модерация контента (команды, новости, соревнования)
 * 
 * Особенности:
 * - Доступ только к разрешенным разделам (allowedTabs)
 * - Использует те же страницы что и администратор
 * - Ограничения настраиваются администратором
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../../../components/layout/MainLayout';
import { UsersManagement } from '../admin/pages/UsersManagement';
import { TeamsManagement } from '../admin/pages/TeamsManagement';
import { CompetitionsManagement } from '../admin/pages/CompetitionsManagement';
import { InvitationsManagement } from '../admin/pages/InvitationsManagement';
import { NewsManagement } from '../admin/pages/NewsManagement';
import { StatisticsPage } from '../admin/pages/StatisticsPage';
import { ProfilePage } from '../admin/pages/ProfilePage';
import { BracketsManagement } from '../admin/pages/BracketsManagement';
import { ReferencesManagement } from '../admin/pages/ReferencesManagement';
import { NotificationsManagement } from '../admin/pages/NotificationsManagement';
import { TicketsManagement } from '../admin/pages/TicketsManagement';
import { TeamModeration } from '../admin/pages/TeamModeration';
import { CompetitionReports } from '../admin/pages/CompetitionReports';
import { CalendarManagement } from '../admin/pages/CalendarManagement';
import { LiveStreamsManagement } from '../admin/pages/LiveStreamsManagement';
import { OrganizationSettings } from '../admin/pages/OrganizationSettings';
import { BackupsManagement } from '../admin/pages/BackupsManagement';
import { LoggingManagement } from '../admin/pages/LoggingManagement';
import { DocumentsManagement } from '../admin/pages/DocumentsManagement';
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
  PlayCircleOutlined,
  SettingOutlined,
  DatabaseOutlined,
  FileSearchOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import { useEffect, useState } from 'react';
import apiClient from '../../../services/api-client';

// Маппинг ключей меню на tabKey для фильтрации
const menuKeyToTabKey: Record<string, string> = {
  '/moderator/users': 'users',
  '/moderator/teams': 'teams',
  '/moderator/competitions': 'competitions',
  '/moderator/invitations': 'invitations',
  '/moderator/brackets': 'brackets',
  '/moderator/calendar': 'calendar',
  '/moderator/news': 'news',
  '/moderator/statistics': 'statistics',
  '/moderator/references': 'references',
  '/moderator/notifications': 'notifications',
  '/moderator/tickets': 'tickets',
  '/moderator/team-moderation': 'team-moderation',
  '/moderator/reports': 'reports',
  '/moderator/live-streams': 'live-streams',
  '/moderator/organization-settings': 'organization-settings',
  '/moderator/backups': 'backups',
  '/moderator/logging': 'logging',
  '/moderator/documents': 'documents',
};

// Все возможные вкладки
const allMenuItems = [
  {
    key: '/moderator/users',
    label: 'Пользователи',
    icon: <UserOutlined />,
  },
  {
    key: '/moderator/teams',
    label: 'Команды',
    icon: <TeamOutlined />,
  },
  {
    key: '/moderator/competitions',
    label: 'Соревнования',
    icon: <TrophyOutlined />,
  },
  {
    key: '/moderator/invitations',
    label: 'Приглашения',
    icon: <MailOutlined />,
  },
  {
    key: '/moderator/brackets',
    label: 'Турнирные сетки',
    icon: <BarsOutlined />,
  },
  {
    key: '/moderator/calendar',
    label: 'Календарь соревнований',
    icon: <CalendarOutlined />,
  },
  {
    key: '/moderator/news',
    label: 'Новости',
    icon: <FileTextOutlined />,
  },
  {
    key: '/moderator/statistics',
    label: 'Статистика',
    icon: <BarChartOutlined />,
  },
  {
    key: '/moderator/references',
    label: 'Справочники',
    icon: <FileTextOutlined />,
  },
  {
    key: '/moderator/notifications',
    label: 'Уведомления',
    icon: <BellOutlined />,
  },
  {
    key: '/moderator/tickets',
    label: 'Обращения',
    icon: <CustomerServiceOutlined />,
  },
  {
    key: '/moderator/team-moderation',
    label: 'Модерация команд',
    icon: <CheckCircleOutlined />,
  },
  {
    key: '/moderator/reports',
    label: 'Отчёты',
    icon: <FilePdfOutlined />,
  },
  {
    key: '/moderator/live-streams',
    label: 'Прямые трансляции',
    icon: <PlayCircleOutlined />,
  },
  {
    key: '/moderator/organization-settings',
    label: 'Настройки кастомизации',
    icon: <SettingOutlined />,
  },
  {
    key: '/moderator/backups',
    label: 'Управление бэкапами',
    icon: <DatabaseOutlined />,
  },
  {
    key: '/moderator/logging',
    label: 'Логирование',
    icon: <FileSearchOutlined />,
  },
  {
    key: '/moderator/documents',
    label: 'Документы',
    icon: <FolderOutlined />,
  },
];

export const ModeratorDashboard = () => {
  const { user, loading: authLoading } = useSelector((state: RootState) => state.auth);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadModeratorData = async () => {
      // Ждем завершения загрузки авторизации
      if (authLoading) {
        return;
      }

      if (!user?.id) {
        setLoading(false);
        setMenuItems([]);
        return;
      }

      try {
        setLoading(true);
        const response = await apiClient.get(`/users/${user.id}`);
        const moderator = response.data.data.moderator;
        
        if (moderator && moderator.allowedTabs) {
          // Фильтруем меню по разрешенным вкладкам
          const allowedTabs = Array.isArray(moderator.allowedTabs) 
            ? moderator.allowedTabs 
            : (typeof moderator.allowedTabs === 'string' ? JSON.parse(moderator.allowedTabs) : []);
          
          const filteredMenu = allMenuItems.filter(item => {
            const tabKey = menuKeyToTabKey[item.key];
            const isAllowed = tabKey && allowedTabs.includes(tabKey);
            return isAllowed;
          });
          
          setMenuItems(filteredMenu);
        } else {
          // Если нет разрешенных вкладок, показываем пустое меню
          setMenuItems([]);
        }
      } catch (error) {
        // В случае ошибки показываем только профиль
        setMenuItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadModeratorData();
  }, [user?.id, authLoading]);

  if (authLoading || loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Загрузка...</div>;
  }

  return (
    <MainLayout menuItems={menuItems}>
      <Routes>
        <Route 
          path="/" 
          element={
            (() => {
              const redirectPath = menuItems.length > 0 
                ? menuItems[0].key.replace('/moderator/', '') 
                : 'profile';
              return <Navigate to={redirectPath} replace />;
            })()
          } 
        />
        {menuItems.some(item => menuKeyToTabKey[item.key] === 'users') && (
          <Route path="users" element={<UsersManagement />} />
        )}
        {menuItems.some(item => menuKeyToTabKey[item.key] === 'teams') && (
          <Route path="teams" element={<TeamsManagement />} />
        )}
        {menuItems.some(item => menuKeyToTabKey[item.key] === 'competitions') && (
          <Route path="competitions" element={<CompetitionsManagement />} />
        )}
        {menuItems.some(item => menuKeyToTabKey[item.key] === 'invitations') && (
          <Route path="invitations" element={<InvitationsManagement />} />
        )}
        {menuItems.some(item => menuKeyToTabKey[item.key] === 'brackets') && (
          <Route path="brackets" element={<BracketsManagement />} />
        )}
        {menuItems.some(item => menuKeyToTabKey[item.key] === 'calendar') && (
          <Route path="calendar" element={<CalendarManagement />} />
        )}
        {menuItems.some(item => menuKeyToTabKey[item.key] === 'news') && (
          <Route path="news" element={<NewsManagement />} />
        )}
        {menuItems.some(item => menuKeyToTabKey[item.key] === 'statistics') && (
          <Route path="statistics" element={<StatisticsPage />} />
        )}
        {menuItems.some(item => menuKeyToTabKey[item.key] === 'references') && (
          <Route path="references" element={<ReferencesManagement />} />
        )}
        {menuItems.some(item => menuKeyToTabKey[item.key] === 'notifications') && (
          <Route path="notifications" element={<NotificationsManagement />} />
        )}
        {menuItems.some(item => menuKeyToTabKey[item.key] === 'tickets') && (
          <Route path="tickets" element={<TicketsManagement />} />
        )}
        {menuItems.some(item => menuKeyToTabKey[item.key] === 'team-moderation') && (
          <Route path="team-moderation" element={<TeamModeration />} />
        )}
        {menuItems.some(item => menuKeyToTabKey[item.key] === 'reports') && (
          <Route path="reports" element={<CompetitionReports />} />
        )}
        {menuItems.some(item => menuKeyToTabKey[item.key] === 'live-streams') && (
          <Route path="live-streams" element={<LiveStreamsManagement />} />
        )}
        {menuItems.some(item => menuKeyToTabKey[item.key] === 'organization-settings') && (
          <Route path="organization-settings" element={<OrganizationSettings />} />
        )}
        {menuItems.some(item => menuKeyToTabKey[item.key] === 'backups') && (
          <Route path="backups" element={<BackupsManagement />} />
        )}
        {menuItems.some(item => menuKeyToTabKey[item.key] === 'logging') && (
          <Route path="logging" element={<LoggingManagement />} />
        )}
        {menuItems.some(item => menuKeyToTabKey[item.key] === 'documents') && (
          <Route path="documents" element={<DocumentsManagement />} />
        )}
        <Route path="profile" element={<ProfilePage />} />
      </Routes>
    </MainLayout>
  );
};

