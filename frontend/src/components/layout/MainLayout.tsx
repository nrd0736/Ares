/**
 * Главный layout компонент приложения
 * 
 * Функциональность:
 * - Боковая навигация (Sider) с меню
 * - Заголовок (Header) с уведомлениями и профилем
 * - Основной контент (Content)
 * - Управление уведомлениями
 * - Подключение Socket.IO для real-time обновлений
 * - Отображение названия организации
 * 
 * Особенности:
 * - Адаптивный дизайн (сворачивание сайдбара)
 * - Интеграция с Redux для состояния
 * - Real-time уведомления через Socket.IO
 */

import { Layout, Menu, Avatar, Badge, Dropdown, Button, Modal } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { logout } from '../../store/slices/auth-slice';
import { useSocket } from '../../hooks/useSocket';
import {
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { useState, useEffect } from 'react';
import apiClient from '../../services/api-client';
import { setNotifications, setUnreadCount, markAsRead } from '../../store/slices/notifications-slice';
import { getAvatarUrl } from '../../utils/image-utils';
import { AresTitle } from '../AresTitle';

const { Header, Sider, Content, Footer } = Layout;

interface MenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  children?: MenuItem[];
}

interface MainLayoutProps {
  children: React.ReactNode;
  menuItems?: MenuItem[];
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, menuItems = [] }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { notifications, unreadCount } = useSelector((state: RootState) => state.notifications);
  const [collapsed, setCollapsed] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<{
    title: string;
    message: string;
    sentAt: string;
  } | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);

  // Подключаем Socket.IO
  useSocket();

  // Загружаем название организации
  useEffect(() => {
    const loadOrgName = async () => {
      try {
        const response = await apiClient.get('/organization');
        const name = response.data.data?.name;
        if (name && name !== 'ARES Platform') {
          setOrganizationName(name);
        }
      } catch (error) {
        // Игнорируем ошибки
      }
    };
    loadOrgName();
  }, []);


  // Загружаем уведомления при монтировании
  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
      loadUnreadCount();
    }
  }, [isAuthenticated]);

  const loadNotifications = async () => {
    try {
      const response = await apiClient.get('/notifications?limit=10');
      dispatch(setNotifications(response.data.data.notifications));
    } catch (error) {
      console.error('Ошибка загрузки уведомлений', error);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await apiClient.get('/notifications/unread/count');
      dispatch(setUnreadCount(response.data.data.count));
    } catch (error) {
      console.error('Ошибка загрузки количества непрочитанных', error);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    // Переходим на главную страницу (для незарегистрированных пользователей)
    window.location.href = '/';
  };

  const handleMenuClick = (key: string) => {
    // Если нажата "Главная", переходим на первую страницу текущей панели
    if (key === '/' || key === 'home') {
      // Определяем текущую панель по пути
      const currentPath = location.pathname;
      if (currentPath.startsWith('/admin')) {
        navigate('/admin/users', { replace: true });
      } else if (currentPath.startsWith('/moderator')) {
        // Для модератора переходим на первую разрешенную вкладку
        // Это будет обработано в ModeratorDashboard
        navigate('/moderator', { replace: true });
      } else if (currentPath.startsWith('/judge')) {
        navigate('/judge/brackets', { replace: true });
      } else if (currentPath.startsWith('/coach')) {
        navigate('/coach/team', { replace: true });
      } else if (currentPath.startsWith('/athlete')) {
        navigate('/athlete/portfolio', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } else {
      navigate(key, { replace: false });
    }
  };

  const handleProfileClick = () => {
    // Определяем текущую панель и переходим на страницу профиля
    const currentPath = location.pathname;
    if (currentPath.startsWith('/admin')) {
      navigate('/admin/profile');
    } else if (currentPath.startsWith('/moderator')) {
      navigate('/moderator/profile');
    } else if (currentPath.startsWith('/judge')) {
      navigate('/judge/profile');
    } else if (currentPath.startsWith('/coach')) {
      navigate('/coach/profile');
    } else if (currentPath.startsWith('/athlete')) {
      navigate('/athlete/profile');
    }
  };

  const userMenuItems = [
    {
      key: 'profile',
      label: 'Профиль',
      icon: <UserOutlined />,
      onClick: handleProfileClick,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      label: 'Выйти',
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

  const handleNotificationClick = async (notificationId: string) => {
    const notification = notifications.find((n) => n.id === notificationId);
    if (notification) {
      // Открываем модальное окно с полным текстом уведомления
      setSelectedNotification({
        title: notification.title,
        message: notification.message,
        sentAt: notification.sentAt,
      });
      setNotificationModalVisible(true);

      // Отмечаем как прочитанное, если еще не прочитано
      if (!notification.read) {
        try {
          await apiClient.post(`/notifications/${notificationId}/read`);
          dispatch(markAsRead(notificationId));
          // Обновляем список уведомлений и счетчик
          await loadNotifications();
          await loadUnreadCount();
        } catch (error) {
          console.error('Ошибка при отметке уведомления как прочитанного', error);
        }
      }
    }
  };

  const notificationMenuItems = notifications.slice(0, 5).map((notification) => {
    // Обрезаем текст сообщения для предпросмотра
    const messagePreview = notification.message.length > 50 
      ? notification.message.substring(0, 50) + '...' 
      : notification.message;
    
    return {
      key: notification.id,
      label: (
        <div style={{ cursor: 'pointer', maxWidth: '300px' }}>
          <div style={{ fontWeight: notification.read ? 'normal' : 'bold', marginBottom: '4px' }}>
            {notification.title}
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            {messagePreview}
          </div>
          <div style={{ fontSize: '11px', color: '#999' }}>
            {new Date(notification.sentAt).toLocaleString('ru-RU')}
          </div>
        </div>
      ),
    };
  });

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={250}
      >
        <div
          style={{
            height: collapsed ? 64 : 'auto',
            minHeight: collapsed ? 64 : 80,
            display: 'flex',
            flexDirection: collapsed ? 'row' : 'column',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'center',
            padding: collapsed ? '0' : '12px 16px',
            color: 'white',
            fontSize: collapsed ? '16px' : '20px',
            fontWeight: 'bold',
            gap: collapsed ? '8px' : '4px',
            overflow: 'hidden',
            width: '100%',
          }}
        >
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            width: '100%',
            minWidth: 0,
          }}>
            <AresTitle 
              size={collapsed ? 24 : 28}
              iconColor="#ffffff"
              collapsed={collapsed}
              hideOrganizationName
              style={{ 
                width: '100%',
                maxWidth: '100%',
                overflow: 'hidden',
                justifyContent: 'center',
              }}
            />
          </div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={[
            {
              key: '/',
              label: 'Главная',
              icon: <HomeOutlined />,
            },
            ...menuItems,
          ]}
          onClick={({ key }) => handleMenuClick(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
              {user?.profile
                ? `${user.profile.lastName} ${user.profile.firstName} ${user.profile.middleName || ''}`.trim()
                : user?.email}
            </div>
            {organizationName && (
              <div style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#666666',
                letterSpacing: '-0.05px',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                paddingLeft: '16px',
                borderLeft: '1px solid #e8e8e8',
              }}>
                {organizationName}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'nowrap' }}>
            {user && (
              <div style={{
                padding: '4px 10px',
                background: '#f5f5f5',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#595959',
                textTransform: 'capitalize',
                whiteSpace: 'nowrap',
                border: '1px solid #e8e8e8',
              }}>
                {user.role === 'ADMIN' ? 'Администратор' : 
                 user.role === 'JUDGE' ? 'Судья' : 
                 user.role === 'COACH' ? 'Тренер' : 
                 user.role === 'ATHLETE' ? 'Спортсмен' : 
                 user.role === 'MODERATOR' ? 'Модератор' : 
                 user.role}
              </div>
            )}
            <Dropdown
              menu={{ 
                items: notificationMenuItems,
                onClick: ({ key }) => {
                  handleNotificationClick(key);
                }
              }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Badge count={unreadCount} size="small">
                <Button
                  type="text"
                  icon={<BellOutlined style={{ fontSize: '20px' }} />}
                  style={{ display: 'flex', alignItems: 'center' }}
                />
              </Badge>
            </Dropdown>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar
                style={{ cursor: 'pointer' }}
                icon={<UserOutlined />}
                src={getAvatarUrl(user?.profile?.avatarUrl)}
              />
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            background: '#fff',
            minHeight: 280,
          }}
        >
          {children}
        </Content>
        <Footer
          style={{
            textAlign: 'center',
            padding: '12px 24px',
            background: '#fafafa',
            borderTop: '1px solid #f0f0f0',
            color: '#999',
            fontSize: '12px',
            lineHeight: '20px',
          }}
        >
          APEC &copy; 2026 &mdash; Бакулин Никита Сергеевич. Все права защищены.
        </Footer>
      </Layout>
      <Modal
        title={selectedNotification?.title}
        open={notificationModalVisible}
        onCancel={() => {
          setNotificationModalVisible(false);
          setSelectedNotification(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setNotificationModalVisible(false);
            setSelectedNotification(null);
          }}>
            Закрыть
          </Button>
        ]}
        width={600}
      >
        {selectedNotification && (
          <div>
            <div style={{ 
              marginBottom: '16px', 
              padding: '12px', 
              background: '#f5f5f5', 
              borderRadius: '4px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {selectedNotification.message}
            </div>
            <div style={{ fontSize: '12px', color: '#999', textAlign: 'right' }}>
              {new Date(selectedNotification.sentAt).toLocaleString('ru-RU')}
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
};

