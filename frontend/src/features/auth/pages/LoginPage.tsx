/**
 * Страница входа в систему
 * 
 * Функциональность:
 * - Форма входа (email, password)
 * - Автоматический редирект на соответствующую панель по роли
 * - Загрузка названия организации
 * - Валидация полей формы
 * - Обработка ошибок входа
 * 
 * Особенности:
 * - Фоновая анимация
 * - Отображение логотипа и названия организации
 * - Ссылки на регистрацию и восстановление пароля
 */

import { useState, useEffect } from 'react';
import { Form, Input, Button, message, Typography } from 'antd';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { HomeOutlined, LoginOutlined } from '@ant-design/icons';
import { setCredentials } from '../../../store/slices/auth-slice';
import apiClient from '../../../services/api-client';
import { AresIcon } from '../../../components/AresIcon';
import { AresTitle } from '../../../components/AresTitle';
import { BackgroundAnimation } from '../../../components/BackgroundAnimation';

const { Title, Paragraph, Text } = Typography;

export const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    loadOrganizationName();
  }, []);

  const loadOrganizationName = async () => {
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

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', values);
      const { user, token } = response.data.data;
      
      dispatch(setCredentials({ user, token }));
      
      const roleRoutes: Record<string, string> = {
        ADMIN: '/admin',
        JUDGE: '/judge',
        COACH: '/coach',
        ATHLETE: '/athlete',
        MODERATOR: '/moderator',
      };
      
      message.success('Успешный вход в систему');
      navigate(roleRoutes[user.role] || '/');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflowX: 'hidden', width: '100%' }}>
      <BackgroundAnimation containerSelector=".auth-content" />
      <style>{`
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

        @keyframes footerFadeIn {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes iconFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        .auth-page-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(102, 7, 8, 0.1);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: slideInFromTop 0.6s ease-out;
          height: 90px;
          display: flex;
          align-items: center;
        }

        .auth-page-header:hover {
          border-bottom-color: rgba(102, 7, 8, 0.2);
        }

        .auth-page-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          height: 100%;
          position: relative;
          padding: 0;
          box-sizing: border-box;
        }

        .auth-page-header-left {
          display: flex;
          align-items: center;
          gap: 24px;
          flex-shrink: 0;
          padding-left: 48px;
        }

        .auth-page-header-logo {
          flex-shrink: 0;
          transition: transform 0.3s ease;
        }

        .auth-page-header-logo:hover {
          transform: scale(1.05);
        }

        .auth-page-header-organization {
          font-size: 16px;
          font-weight: 500;
          color: #666666;
          white-space: nowrap;
          transition: color 0.3s ease;
        }

        .auth-page-header-organization:hover {
          color: rgba(102, 7, 8, 0.9);
        }

        .auth-page-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
          margin-left: auto;
          padding-right: 48px;
        }

        .auth-page-header-actions .ant-btn {
          border-radius: 8px;
          height: 40px;
          font-weight: 500;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .auth-page-header-actions .ant-btn-text:hover {
          color: rgba(102, 7, 8, 0.9) !important;
          background: rgba(102, 7, 8, 0.06) !important;
        }

        @media (max-width: 1200px) {
          .auth-page-header-left {
            padding-left: 32px;
          }
          
          .auth-page-header-actions {
            padding-right: 32px;
          }
        }

        @media (max-width: 768px) {
          .auth-page-header {
            height: 80px;
          }

          .auth-page-header-left {
            padding-left: 16px;
            gap: 12px;
          }

          .auth-page-header-actions {
            padding-right: 16px;
          }

          .auth-page-header-organization {
            font-size: 14px;
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .auth-layout {
          min-height: 100vh;
          background: linear-gradient(135deg, rgba(245, 243, 244, 0.3) 0%, rgba(211, 211, 211, 0.3) 100%);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 24px;
          position: relative;
          z-index: 0;
        }

        .auth-content {
          width: 100%;
          max-width: 480px;
          animation: fadeInUp 0.6s ease-out;
        }

        .auth-card {
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 24px;
          padding: 48px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .auth-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(180deg, rgba(102, 7, 8, 0.6) 0%, rgba(164, 22, 26, 0.3) 100%);
          z-index: 1;
        }

        .auth-card::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(180deg, rgba(102, 7, 8, 0.6) 0%, rgba(164, 22, 26, 0.3) 100%);
          z-index: 1;
        }

        .auth-card:hover {
          box-shadow: 0 16px 48px rgba(102, 7, 8, 0.12);
          border-color: rgba(102, 7, 8, 0.2);
        }

        .auth-card:hover::before,
        .auth-card:hover::after {
          background: linear-gradient(180deg, rgba(102, 7, 8, 0.8) 0%, rgba(164, 22, 26, 0.5) 100%);
        }

        .auth-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .auth-logo {
          display: flex;
          justify-content: center;
        }

        .auth-title {
          font-size: clamp(24px, 3vw, 32px);
          font-weight: 700;
          color: #1a1a1a;
          line-height: 1.3;
          letter-spacing: -0.5px;
          margin: 0 0 8px 0;
        }

        .auth-subtitle {
          color: #4a4a4a;
          font-size: clamp(15px, 1.8vw, 17px);
          margin: 0;
        }

        .auth-form .ant-input,
        .auth-form .ant-input-affix-wrapper {
          border-radius: 12px;
          border: 1px solid rgba(102, 7, 8, 0.2);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .auth-form .ant-input:hover,
        .auth-form .ant-input-affix-wrapper:hover {
          border-color: rgba(102, 7, 8, 0.3);
        }

        .auth-form .ant-input:focus,
        .auth-form .ant-input-affix-wrapper:focus {
          border-color: rgba(102, 7, 8, 0.4);
          box-shadow: 0 0 0 2px rgba(102, 7, 8, 0.15);
        }

        .auth-form .ant-form-item-label > label {
          font-weight: 500;
          color: #1a1a1a;
          font-size: 14px;
        }

        .auth-form .ant-btn-primary,
        .auth-form .ant-btn-primary:not(:disabled):not(.ant-btn-disabled) {
          border-radius: 12px;
          height: 48px;
          font-weight: 600;
          font-size: 16px;
          background: #1a1a1a !important;
          border-color: #1a1a1a !important;
          color: #ffffff !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .auth-form .ant-btn-primary:hover:not(:disabled):not(.ant-btn-disabled),
        .auth-form .ant-btn-primary:focus:not(:disabled):not(.ant-btn-disabled) {
          background: #333333 !important;
          border-color: #333333 !important;
          color: #ffffff !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
        }

        .auth-form .ant-btn-primary:active:not(:disabled):not(.ant-btn-disabled) {
          background: #2a2a2a !important;
          border-color: #2a2a2a !important;
          color: #ffffff !important;
        }

        .auth-link {
          text-align: center;
          margin-top: 24px;
        }

        .auth-link-button,
        .auth-link-button:not(:disabled):not(.ant-btn-disabled) {
          padding: 0;
          color: rgba(102, 7, 8, 0.9) !important;
          font-size: 14px;
          transition: color 0.3s ease;
        }

        .auth-link-button:hover:not(:disabled):not(.ant-btn-disabled),
        .auth-link-button:focus:not(:disabled):not(.ant-btn-disabled) {
          color: rgba(102, 7, 8, 1) !important;
        }

        .auth-link .ant-btn-link {
          color: rgba(102, 7, 8, 0.9) !important;
        }

        .auth-link .ant-btn-link:hover,
        .auth-link .ant-btn-link:focus {
          color: rgba(102, 7, 8, 1) !important;
        }

        @media (max-width: 768px) {
          .auth-card {
            padding: 32px 24px;
            border-radius: 20px;
          }
        }

        .ares-footer {
          margin-top: auto;
          width: 100%;
          padding: 64px 48px;
          background: linear-gradient(135deg, rgba(11, 9, 10, 0.98) 0%, rgba(102, 7, 8, 0.98) 30%, rgba(164, 22, 26, 0.98) 70%, rgba(102, 7, 8, 0.98) 100%);
          position: relative;
          overflow: hidden;
          box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.2);
          animation: footerFadeIn 1s ease-out;
          flex-shrink: 0;
          box-sizing: border-box;
        }

        .ares-footer::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
        }

        .ares-footer::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.15) 0%, transparent 50%, rgba(0, 0, 0, 0.08) 100%);
          pointer-events: none;
        }

        .ares-footer-content {
          max-width: 900px;
          margin: 0 auto;
          text-align: center;
          position: relative;
          z-index: 1;
        }

        .ares-footer-icon {
          margin-bottom: 24px;
          display: flex;
          justify-content: center;
          align-items: center;
          animation: footerFadeIn 1s ease-out 0.2s backwards, iconFloat 3s ease-in-out infinite 1.2s;
        }

        .ares-footer-title {
          display: block;
          font-size: clamp(24px, 3vw, 32px);
          font-weight: 700;
          color: rgba(255, 255, 255, 0.98);
          margin-bottom: 20px;
          letter-spacing: -0.5px;
          line-height: 1.3;
          text-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
          animation: footerFadeIn 1s ease-out 0.4s backwards;
        }

        .ares-footer-description {
          font-size: clamp(15px, 1.8vw, 17px);
          line-height: 1.8;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
          animation: footerFadeIn 1s ease-out 0.6s backwards;
        }

        @media (max-width: 768px) {
          .ares-footer {
            padding: 48px 24px;
          }

          .ares-footer-icon {
            margin-bottom: 20px;
          }

          .ares-footer-title {
            margin-bottom: 16px;
            font-size: 24px;
          }

          .ares-footer-description {
            font-size: 15px;
            line-height: 1.7;
          }
        }
      `}</style>
      
      {/* Хедер */}
      <div className="auth-page-header">
        <div className="auth-page-header-content">
          <div className="auth-page-header-left">
            <div className="auth-page-header-logo">
              <AresTitle 
                size={36}
                iconColor="#1a1a1a"
                light
                style={{ fontSize: '22px' }}
                hideOrganizationName={true}
              />
            </div>
            {organizationName && (
              <div className="auth-page-header-organization">
                {organizationName}
              </div>
            )}
          </div>
          <div className="auth-page-header-actions">
            <Button 
              type="text" 
              icon={<HomeOutlined />}
              onClick={() => navigate('/')}
            >
              На главную
            </Button>
          </div>
        </div>
      </div>

      <div className="auth-layout" style={{ flex: 1 }}>
        <div className="auth-content">
          <div className="auth-card">
            <div className="auth-header">
              <div className="auth-logo">
                <AresIcon size={48} color="#1a1a1a" />
              </div>
              <div style={{ 
                fontSize: '28px',
                fontWeight: 700,
                color: '#1a1a1a',
                letterSpacing: '-0.5px',
                marginTop: 12,
                marginBottom: organizationName ? 8 : 16,
              }}>
                АРЕС
              </div>
              {organizationName && (
                <Text style={{
                  fontSize: '16px',
                  fontWeight: 500,
                  color: 'rgba(26, 26, 26, 0.6)',
                  display: 'block',
                  marginBottom: 16,
                }}>
                  {organizationName}
                </Text>
              )}
              <Title level={2} className="auth-title">
                Вход в систему
              </Title>
              <Paragraph className="auth-subtitle">
                Войдите в свой аккаунт для доступа к платформе
              </Paragraph>
            </div>

            <Form
              className="auth-form"
              name="login"
              onFinish={onFinish}
              layout="vertical"
              autoComplete="off"
              size="large"
            >
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: 'Введите email' },
                  { type: 'email', message: 'Некорректный email' },
                ]}
              >
                <Input placeholder="your@email.com" />
              </Form.Item>

              <Form.Item
                label="Пароль"
                name="password"
                rules={[{ required: true, message: 'Введите пароль' }]}
              >
                <Input.Password placeholder="Введите пароль" />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  block 
                  loading={loading}
                  icon={<LoginOutlined />}
                >
                  Войти
                </Button>
              </Form.Item>

              <div className="auth-link">
                <Button 
                  type="link" 
                  onClick={() => navigate('/register')}
                  className="auth-link-button"
                >
                  Нет аккаунта? Зарегистрироваться
                </Button>
              </div>
            </Form>
          </div>
        </div>
      </div>

      {/* Подвал */}
      <div className="ares-footer">
        <div className="ares-footer-content">
          <div className="ares-footer-icon">
            <AresIcon size={64} color="rgba(255, 255, 255, 0.95)" />
          </div>
          <Text strong className="ares-footer-title">
            Система АРЕС
          </Text>
          <Paragraph className="ares-footer-description">
            современный инструмент для организации спортивных соревнований, 
            который объединяет спортсменов, тренеров, судей и организаторов в едином 
            цифровом пространстве. Мы стремимся сделать процесс проведения соревнований 
            максимально удобным, прозрачным и справедливым, сохраняя дух честной борьбы 
            и спортивного мастерства.
          </Paragraph>
        </div>
      </div>
    </div>
  );
};
