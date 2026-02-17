/**
 * Гостевой интерфейс (публичный доступ)
 * 
 * Функциональность:
 * - Публичный доступ без авторизации
 * - Просмотр новостей, соревнований, документов
 * - Регистрация команды
 * - Просмотр трансляций
 * - Контактная форма
 * 
 * Страницы:
 * - О системе и организации
 * - Новости
 * - Соревнования (список, календарь, детали)
 * - Документы
 * - Трансляции
 * - Регистрация команды
 * - Контактная форма
 */

import { useState, useEffect } from 'react';
import { Layout, Button, Space, Typography, Dropdown } from 'antd';
import { NewsFeed } from './pages/NewsFeed';
import { CompetitionsList } from './pages/CompetitionsList';
import { ContactForm } from './pages/ContactForm';
import { TeamRegistrationForm } from './pages/TeamRegistrationForm';
import { LiveStreams } from './pages/LiveStreams';
import { useNavigate } from 'react-router-dom';
import {
  FileTextOutlined,
  TrophyOutlined,
  MailOutlined,
  LoginOutlined,
  UserAddOutlined,
  TeamOutlined,
  InfoCircleOutlined,
  PlayCircleOutlined,
  FilePdfOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { AresTitle } from '../../../components/AresTitle';
import { AboutPage } from './pages/AboutPage';
import { Documents } from './pages/Documents';
import { CompetitionsCalendar } from './pages/CompetitionsCalendar';
import apiClient from '../../../services/api-client';

const { Content, Header, Footer } = Layout;
const { Title, Paragraph } = Typography;

interface ServiceItem {
  key: string;
  title: string;
  shortDescription: string;
  heroTitle: string;
  heroDescription: string;
  icon: React.ReactNode;
  component: React.ReactNode;
  color: string;
}

export const GuestPage = () => {
  const navigate = useNavigate();
  const [selectedService, setSelectedService] = useState<string>('about');
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [organizationDescription, setOrganizationDescription] = useState<string | null>(null);
  const [organizationLogo, setOrganizationLogo] = useState<string | null>(null);

  useEffect(() => {
    loadOrganizationData();
  }, []);

  const loadOrganizationData = async () => {
    try {
      const response = await apiClient.get('/organization');
      const data = response.data.data;
      if (data) {
        if (data.name && data.name !== 'ARES Platform') {
          setOrganizationName(data.name);
        }
        if (data.description) {
          setOrganizationDescription(data.description);
        }
        if (data.logoUrl) {
          setOrganizationLogo(data.logoUrl);
        }
      }
    } catch (error) {
      // Игнорируем ошибки
    }
  };

  const getImageUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) {
      return url;
    }
    return `/uploads/${url}`;
  };

  const services: ServiceItem[] = [
    {
      key: 'about',
      title: 'О нас',
      shortDescription: 'О платформе и организации',
      heroTitle: organizationName || 'О нас',
      heroDescription: organizationDescription || 'Узнайте больше о нашей организации и возможностях платформы',
      icon: <InfoCircleOutlined />,
      component: <AboutPage />,
      color: '#1a1a1a',
    },
    {
      key: 'news',
      title: 'Новости',
      shortDescription: 'Актуальные события',
      heroTitle: 'Новости и события',
      heroDescription: 'Будьте в курсе всех важных событий, результатов соревнований и новостей из мира спорта',
      icon: <FileTextOutlined />,
      component: <NewsFeed />,
      color: '#1a1a1a',
    },
    {
      key: 'competitions',
      title: 'Соревнования',
      shortDescription: 'Список соревнований',
      heroTitle: 'Соревнования',
      heroDescription: 'Просматривайте расписание соревнований, следите за результатами и узнавайте о предстоящих событиях',
      icon: <TrophyOutlined />,
      component: <CompetitionsList />,
      color: '#1a1a1a',
    },
    {
      key: 'calendar',
      title: 'Календарь',
      shortDescription: 'Календарь соревнований',
      heroTitle: 'Календарь соревнований',
      heroDescription: 'Просматривайте все соревнования в удобном календарном формате. Выберите дату, чтобы увидеть запланированные события',
      icon: <CalendarOutlined />,
      component: <CompetitionsCalendar />,
      color: '#1a1a1a',
    },
    {
      key: 'live-streams',
      title: 'Прямые трансляции',
      shortDescription: 'Смотрите в прямом эфире',
      heroTitle: 'Прямые трансляции',
      heroDescription: 'Не пропустите ни одного важного момента — смотрите соревнования в прямом эфире в высоком качестве',
      icon: <PlayCircleOutlined />,
      component: <LiveStreams />,
      color: '#1a1a1a',
    },
    {
      key: 'documents',
      title: 'Документы',
      shortDescription: 'Полезные материалы',
      heroTitle: 'Документы',
      heroDescription: 'Найдите все необходимые документы, регламенты, правила и другие важные материалы',
      icon: <FilePdfOutlined />,
      component: <Documents />,
      color: '#1a1a1a',
    },
    {
      key: 'team-registration',
      title: 'Регистрация команды',
      shortDescription: 'Подайте заявку',
      heroTitle: 'Регистрация команды',
      heroDescription: 'Зарегистрируйте свою команду для участия в соревнованиях. Заполните форму и мы свяжемся с вами',
      icon: <TeamOutlined />,
      component: <TeamRegistrationForm />,
      color: '#1a1a1a',
    },
    {
      key: 'contact',
      title: 'Обратная связь',
      shortDescription: 'Свяжитесь с нами',
      heroTitle: 'Обратная связь',
      heroDescription: 'Есть вопросы или предложения? Мы всегда готовы помочь и ответить на все ваши вопросы',
      icon: <MailOutlined />,
      component: <ContactForm />,
      color: '#1a1a1a',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    setSelectedService(key);
    // Прокрутка к началу контента
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectedServiceData = services.find(s => s.key === selectedService) || services[0];

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideInFromTop {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes subtleFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        
        .guest-layout {
          min-height: 100vh;
          background: #ffffff;
          position: relative;
          overflow-x: hidden;
          overflow-y: visible;
        }

        /* Кастомный скроллбар */
        .guest-layout ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        .guest-layout ::-webkit-scrollbar-track {
          background: rgba(11, 9, 10, 0.3);
          border-radius: 5px;
        }

        .guest-layout ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(102, 7, 8, 0.6) 0%, rgba(164, 22, 26, 0.6) 100%);
          border-radius: 5px;
          border: 2px solid rgba(11, 9, 10, 0.3);
        }

        .guest-layout ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(102, 7, 8, 0.8) 0%, rgba(164, 22, 26, 0.8) 100%);
        }

        .guest-layout ::-webkit-scrollbar-thumb:active {
          background: linear-gradient(180deg, rgba(102, 7, 8, 1) 0%, rgba(164, 22, 26, 1) 100%);
        }

        /* Firefox */
        .guest-layout {
          scrollbar-width: thin;
          scrollbar-color: rgba(102, 7, 8, 0.6) rgba(11, 9, 10, 0.3);
        }
        
        .guest-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(102, 7, 8, 0.1);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: slideInFromTop 0.6s ease-out;
          overflow: visible;
          height: 90px;
          display: flex;
          align-items: center;
        }

        .guest-header:hover {
          border-bottom-color: rgba(102, 7, 8, 0.2);
        }
        
        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          height: 100%;
          position: relative;
        }
        
        .header-left-section {
          display: flex;
          align-items: center;
          gap: 24px;
          flex-shrink: 0;
          padding-left: 48px;
          z-index: 2;
        }

        .header-logo {
          flex-shrink: 0;
          transition: transform 0.3s ease;
        }

        .header-logo:hover {
          transform: scale(1.05);
        }

        .header-organization-name {
          font-size: 16px;
          font-weight: 500;
          color: #666666;
          white-space: nowrap;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          letter-spacing: -0.02em;
          transition: color 0.3s ease;
        }

        .header-organization-name:hover {
          color: rgba(102, 7, 8, 0.9);
        }
        
        .nav-menu {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10;
          width: auto;
          max-width: calc(100vw - 500px);
          overflow: visible;
          pointer-events: auto;
          height: 100%;
          gap: 0;
          flex-wrap: nowrap;
        }
        
        .nav-menu-item {
          display: inline-flex;
          visibility: visible;
          opacity: 1;
          margin: 0;
          padding: 0 16px;
          border-radius: 0;
          transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          font-size: 14px;
          font-weight: 400;
          height: 48px;
          line-height: 48px;
          color: #666666;
          border-bottom: none;
          position: relative;
          white-space: nowrap;
          flex-shrink: 0;
          align-items: center;
          background: transparent;
          cursor: pointer;
          user-select: none;
        }
        
        .nav-menu-item::after {
          content: '';
          position: absolute;
          bottom: -21px;
          left: 0;
          width: 0;
          height: 2px;
          background: linear-gradient(90deg, rgba(102, 7, 8, 0.8) 0%, rgba(164, 22, 26, 0.8) 100%);
          transition: width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        
        .nav-menu-item:hover {
          color: rgba(102, 7, 8, 0.9);
          background: transparent;
        }

        .nav-menu-item:hover::after {
          width: 100%;
        }
        
        .nav-menu-item-selected {
          background: transparent;
          color: rgba(102, 7, 8, 0.95);
          font-weight: 600;
        }

        .nav-menu-item-selected::after {
          width: 100%;
          background: linear-gradient(90deg, rgba(102, 7, 8, 1) 0%, rgba(164, 22, 26, 1) 100%);
        }
        
        .nav-menu-item .anticon {
          font-size: 14px;
          margin-right: 4px;
          transition: all 0.3s ease;
          color: rgba(102, 7, 8, 0.6);
        }

        .nav-menu-item:hover .anticon {
          transform: scale(1.1);
          color: rgba(102, 7, 8, 0.9);
        }

        .nav-menu-item-selected .anticon {
          color: rgba(102, 7, 8, 0.95);
        }
        
        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
          margin-left: auto;
          padding-right: 48px;
          z-index: 2;
        }

        .header-actions .ant-btn {
          border-radius: 8px;
          font-weight: 500;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          height: 40px;
          padding: 0 20px;
        }

        .header-actions .ant-btn-text {
          color: #666666;
        }

        .header-actions .ant-btn-text:hover {
          color: rgba(102, 7, 8, 0.9);
          background: rgba(102, 7, 8, 0.06);
        }

        .header-actions .ant-btn-primary,
        .header-actions .ant-btn-primary:not(:disabled):not(.ant-btn-disabled) {
          background: linear-gradient(135deg, rgba(102, 7, 8, 0.95) 0%, rgba(164, 22, 26, 0.95) 100%) !important;
          border-color: transparent !important;
          color: #ffffff !important;
        }

        .header-actions .ant-btn-primary:hover:not(:disabled):not(.ant-btn-disabled),
        .header-actions .ant-btn-primary:focus:not(:disabled):not(.ant-btn-disabled) {
          background: linear-gradient(135deg, rgba(102, 7, 8, 1) 0%, rgba(164, 22, 26, 1) 100%) !important;
          border-color: transparent !important;
          color: #ffffff !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(102, 7, 8, 0.3) !important;
        }

        .header-actions .ant-btn-primary:active:not(:disabled):not(.ant-btn-disabled) {
          background: linear-gradient(135deg, rgba(102, 7, 8, 0.9) 0%, rgba(164, 22, 26, 0.9) 100%) !important;
          border-color: transparent !important;
          color: #ffffff !important;
        }
        
        .mobile-menu-button {
          display: none;
          color: rgba(102, 7, 8, 0.8);
          transition: all 0.3s ease;
        }

        .mobile-menu-button:hover {
          color: rgba(102, 7, 8, 1);
          background: rgba(102, 7, 8, 0.06);
        }
        
        .mobile-menu {
          display: none;
        }

        .mobile-menu .ant-dropdown-menu {
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(102, 7, 8, 0.15);
          border: 1px solid rgba(102, 7, 8, 0.2);
        }

        .mobile-menu .ant-dropdown-menu-item {
          transition: all 0.2s ease;
        }

        .mobile-menu .ant-dropdown-menu-item:hover {
          background: rgba(102, 7, 8, 0.08);
        }

        .mobile-menu .ant-dropdown-menu-item-selected {
          background: rgba(102, 7, 8, 0.12);
          color: rgba(102, 7, 8, 0.95);
          font-weight: 600;
        }

        .mobile-menu .ant-dropdown-menu-item-selected:hover {
          background: rgba(102, 7, 8, 0.15);
        }

        .mobile-menu .ant-dropdown-menu-item .anticon {
          color: rgba(102, 7, 8, 0.7);
        }

        .mobile-menu .ant-dropdown-menu-item-selected .anticon {
          color: rgba(102, 7, 8, 0.95);
        }
        
        .hero-section {
          position: relative;
          z-index: 1;
          padding: 120px 0 80px;
          text-align: center;
          animation: fadeInUp 0.8s ease-out;
        }

        .hero-logo {
          margin-bottom: 32px;
          animation: fadeInUp 0.8s ease-out 0.2s backwards;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .hero-logo img {
          max-width: 200px;
          max-height: 200px;
          object-fit: contain;
          display: block;
          margin: 0 auto;
        }
        
        .hero-title {
          font-size: clamp(40px, 6vw, 64px);
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 32px;
          line-height: 1.1;
          letter-spacing: -2px;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .hero-subtitle {
          font-size: clamp(16px, 2.5vw, 22px);
          color: #666666;
          margin-bottom: 0;
          max-width: 720px;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.7;
          font-weight: 400;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .content-section {
          position: relative;
          z-index: 1;
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 48px 100px;
          animation: fadeIn 0.8s ease-out 0.2s backwards;
          overflow: visible;
        }
        
        @media (max-width: 1200px) {
          .header-left-section {
            padding-left: 32px;
          }
          
          .header-actions {
            padding-right: 32px;
          }
          
          .nav-menu {
            display: none;
          }
          
          .mobile-menu-button {
            display: block;
          }
          
          .mobile-menu {
            display: block;
          }

          .content-section {
            padding: 0 32px 80px;
          }
        }
        
        @media (max-width: 768px) {
          .header-content {
            height: 80px;
          }

          .header-left-section {
            padding-left: 16px;
            gap: 12px;
          }

          .header-actions {
            padding-right: 16px;
          }

          .header-organization-name {
            font-size: 14px;
          }

          .hero-section {
            padding: 80px 0 60px;
          }
          
          .hero-title {
            margin-bottom: 24px;
          }
          
          .hero-subtitle {
            padding: 0 16px;
          }
          
          .content-section {
            padding: 0 24px 60px;
          }

          .header-actions {
            padding-left: 8px;
            gap: 8px;
          }

          .header-actions .ant-btn {
            height: 36px;
            padding: 0 12px;
            font-size: 13px;
          }
        }
      `}</style>
      <Layout className="guest-layout">
        <Header className="guest-header">
          <div className="header-content">
            <div className="header-left-section">
              <div className="header-logo">
                <AresTitle 
                  size={36}
                  iconColor="#1a1a1a"
                  light
                  style={{ fontSize: '22px' }}
                  hideOrganizationName={true}
                />
              </div>
              {organizationName && (
                <div className="header-organization-name">
                  {organizationName}
                </div>
              )}
            </div>
            <div className="nav-menu">
              {services.map(service => (
                <div
                  key={service.key}
                  className={`nav-menu-item ${selectedService === service.key ? 'nav-menu-item-selected' : ''}`}
                  onClick={() => handleMenuClick({ key: service.key })}
                >
                  {service.icon}
                  <span style={{ marginLeft: 6 }}>{service.title}</span>
                </div>
              ))}
            </div>
            <Dropdown
              menu={{
                items: services.map(service => ({
                  key: service.key,
                  label: (
                    <Space>
                      {service.icon}
                      <span>{service.title}</span>
                    </Space>
                  ),
                  onClick: () => handleMenuClick({ key: service.key }),
                })),
                selectedKeys: [selectedService],
              }}
              trigger={['click']}
              className="mobile-menu"
            >
              <Button 
                type="text"
                className="mobile-menu-button"
                style={{ fontSize: '16px' }}
              >
                ☰
              </Button>
            </Dropdown>
            <div className="header-actions">
              <Button 
                type="text" 
                icon={<LoginOutlined />}
                onClick={() => navigate('/login')}
              >
                Войти
              </Button>
              <Button 
                type="primary"
                icon={<UserAddOutlined />}
                onClick={() => navigate('/register')}
              >
                Регистрация
              </Button>
            </div>
          </div>
        </Header>
        <Content>
          <div className="hero-section">
            {selectedService === 'about' && organizationLogo && (
              <div className="hero-logo">
                <img
                  src={getImageUrl(organizationLogo) || ''}
                  alt={organizationName || 'Логотип организации'}
                />
              </div>
            )}
            <Title className="hero-title">
              {selectedService === 'about' && organizationName 
                ? organizationName 
                : selectedServiceData.heroTitle}
            </Title>
            <Paragraph className="hero-subtitle">
              {selectedService === 'about' && organizationDescription 
                ? organizationDescription 
                : selectedServiceData.heroDescription}
            </Paragraph>
          </div>
          
          <div className="content-section">
            {selectedServiceData.component}
          </div>
        </Content>
        <Footer
          style={{
            textAlign: 'center',
            padding: '20px 48px',
            background: '#1a1a1a',
            color: 'rgba(255,255,255,0.45)',
            fontSize: '13px',
            lineHeight: '22px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          APEC &copy; 2026 &mdash; Бакулин Никита Сергеевич. Все права защищены.
        </Footer>
      </Layout>
    </>
  );
};

