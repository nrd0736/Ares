/**
 * Страница регистрации
 * 
 * Функциональность:
 * - Регистрация нового пользователя
 * - Регистрация по приглашению (через токен)
 * - Расширенные поля для спортсменов (вес, разряд, тренер)
 * - Валидация всех полей
 * - Загрузка справочников (весовые категории, разряды)
 * 
 * Особенности:
 * - Поддержка регистрации спортсменов с указанием тренера
 * - Динамическая загрузка весовых категорий по виду спорта
 * - Автоматическое заполнение при регистрации по приглашению
 */

import { useState, useEffect } from 'react';
import { Form, Input, Button, message, Select, DatePicker, Radio, InputNumber, Typography } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HomeOutlined, UserAddOutlined } from '@ant-design/icons';
import apiClient from '../../../services/api-client';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { AresIcon } from '../../../components/AresIcon';
import { AresTitle } from '../../../components/AresTitle';
import { BackgroundAnimation } from '../../../components/BackgroundAnimation';

const { Title, Paragraph, Text } = Typography;

interface WeightCategory {
  id: string;
  name: string;
  sport: {
    name: string;
  };
}

interface SportsRank {
  id: string;
  name: string;
  description?: string;
  order: number;
}

export const RegisterPage = () => {
  const [loading, setLoading] = useState(false);
  const [weightCategories, setWeightCategories] = useState<WeightCategory[]>([]);
  const [loadingWeightCategories, setLoadingWeightCategories] = useState(false);
  const [sportsRanks, setSportsRanks] = useState<SportsRank[]>([]);
  const [loadingSportsRanks, setLoadingSportsRanks] = useState(false);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [isAthlete, setIsAthlete] = useState(false);

  useEffect(() => {
    loadOrganizationName();
    if (!token) {
      loadWeightCategories();
      loadSportsRanks();
    }
  }, [token]);

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

  const loadWeightCategories = async () => {
    setLoadingWeightCategories(true);
    try {
      const response = await apiClient.get('/references/sports');
      const allCategories: WeightCategory[] = [];
      for (const sport of response.data.data) {
        if (sport.weightCategories) {
          allCategories.push(...sport.weightCategories.map((cat: any) => ({
            ...cat,
            sport: { name: sport.name },
          })));
        }
      }
      setWeightCategories(allCategories);
    } catch (error) {
      console.error('Ошибка загрузки весовых категорий', error);
    } finally {
      setLoadingWeightCategories(false);
    }
  };

  const loadSportsRanks = async () => {
    setLoadingSportsRanks(true);
    try {
      const response = await apiClient.get('/references/sports-ranks');
      setSportsRanks(response.data.data || []);
    } catch (error) {
      console.error('Ошибка загрузки спортивных разрядов', error);
    } finally {
      setLoadingSportsRanks(false);
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      if (token) {
        await apiClient.post('/auth/register-by-invitation', {
          token,
          password: values.password,
          firstName: values.firstName,
          lastName: values.lastName,
          middleName: values.middleName,
          phone: values.phone,
        });
        message.success('Регистрация успешна! Теперь вы можете войти в систему.');
        navigate('/login');
      } else {
        const role = values.role || 'ATHLETE';
        const registerData: any = {
          email: values.email,
          password: values.password,
          firstName: values.firstName,
          lastName: values.lastName,
          middleName: values.middleName,
          phone: values.phone,
          role: role,
        };

        if (role === 'ATHLETE') {
          registerData.coachEmail = values.coachEmail;
          if (values.birthDate) {
            registerData.birthDate = dayjs(values.birthDate).toISOString();
          }
          if (values.gender) {
            registerData.gender = values.gender;
          }
          if (values.weightCategoryId) {
            registerData.weightCategoryId = values.weightCategoryId;
          }
          if (values.weight) {
            registerData.weight = values.weight;
          }
          if (values.sportsRankId) {
            registerData.sportsRankId = values.sportsRankId;
          }
        }

        const response = await apiClient.post('/auth/register', registerData);
        
        if (response.data.data.requiresApproval) {
          message.info(response.data.data.message || 'Ваш запрос отправлен тренеру на подтверждение. Вы получите уведомление после рассмотрения.');
          navigate('/login');
        } else {
          message.success('Регистрация успешна! Теперь вы можете войти в систему.');
          navigate('/login');
        }
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка регистрации');
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
          max-width: 600px;
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
        .auth-form .ant-input-affix-wrapper,
        .auth-form .ant-select-selector,
        .auth-form .ant-input-number,
        .auth-form .ant-picker {
          border-radius: 12px;
          border: 1px solid rgba(102, 7, 8, 0.2);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .auth-form .ant-input:hover,
        .auth-form .ant-input-affix-wrapper:hover,
        .auth-form .ant-select:hover .ant-select-selector,
        .auth-form .ant-input-number:hover,
        .auth-form .ant-picker:hover {
          border-color: rgba(102, 7, 8, 0.3);
        }

        .auth-form .ant-input:focus,
        .auth-form .ant-input-affix-wrapper:focus,
        .auth-form .ant-select-focused .ant-select-selector,
        .auth-form .ant-picker-focused {
          border-color: rgba(102, 7, 8, 0.4);
          box-shadow: 0 0 0 2px rgba(102, 7, 8, 0.15);
        }

        .auth-form .ant-form-item-label > label {
          font-weight: 500;
          color: #1a1a1a;
          font-size: 14px;
        }

        .auth-form .ant-radio-wrapper {
          color: rgba(26, 26, 26, 0.8);
        }

        .auth-form .ant-radio-wrapper:hover {
          color: rgba(102, 7, 8, 0.9);
        }

        .auth-form .ant-radio-checked .ant-radio-inner {
          border-color: rgba(102, 7, 8, 0.8) !important;
        }

        .auth-form .ant-radio-checked .ant-radio-inner::after {
          background-color: rgba(102, 7, 8, 0.9) !important;
        }

        .auth-form .ant-select-dropdown {
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(102, 7, 8, 0.15);
          border: 1px solid rgba(102, 7, 8, 0.2);
        }

        .auth-form .ant-select-item {
          border-radius: 8px;
          margin: 4px 8px;
          transition: all 0.2s ease;
        }

        .auth-form .ant-select-item:hover {
          background: rgba(102, 7, 8, 0.08) !important;
        }

        .auth-form .ant-select-item-option-selected {
          background: rgba(102, 7, 8, 0.12) !important;
          color: rgba(102, 7, 8, 0.95) !important;
          font-weight: 600;
        }

        .auth-form .ant-select-item-option-selected:hover {
          background: rgba(102, 7, 8, 0.15) !important;
        }

        .auth-form .ant-picker-dropdown {
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(102, 7, 8, 0.15);
          border: 1px solid rgba(102, 7, 8, 0.2);
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
                {token ? 'Регистрация по приглашению' : 'Регистрация спортсмена'}
              </Title>
              <Paragraph className="auth-subtitle">
                {token 
                  ? 'Завершите регистрацию, указав свои данные'
                  : 'Создайте аккаунт для участия в соревнованиях'}
              </Paragraph>
            </div>

            <Form
              form={form}
              className="auth-form"
              name="register"
              onFinish={onFinish}
              layout="vertical"
              autoComplete="off"
              size="large"
              onValuesChange={(changedValues) => {
                if (changedValues.role) {
                  setIsAthlete(changedValues.role === 'ATHLETE');
                }
              }}
            >
              <Form.Item
                label="Имя"
                name="firstName"
                rules={[{ required: true, message: 'Введите имя' }]}
              >
                <Input placeholder="Имя" />
              </Form.Item>

              <Form.Item
                label="Фамилия"
                name="lastName"
                rules={[{ required: true, message: 'Введите фамилию' }]}
              >
                <Input placeholder="Фамилия" />
              </Form.Item>

              <Form.Item
                label="Отчество"
                name="middleName"
              >
                <Input placeholder="Отчество (необязательно)" />
              </Form.Item>

              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: !token, message: 'Введите email' },
                  { type: 'email', message: 'Некорректный email' },
                ]}
              >
                <Input placeholder="your@email.com" disabled={!!token} />
              </Form.Item>

              <Form.Item
                label="Телефон"
                name="phone"
              >
                <Input placeholder="+7 (999) 123-45-67" />
              </Form.Item>

              {!token && (
                <>
                  <Form.Item
                    label="Email тренера"
                    name="coachEmail"
                    rules={[
                      { required: true, message: 'Введите email тренера' },
                      { type: 'email', message: 'Некорректный email' },
                    ]}
                    tooltip="Введите email тренера, который подтвердит вашу регистрацию"
                  >
                    <Input placeholder="coach@example.com" />
                  </Form.Item>

                  <Form.Item
                    label="Дата рождения"
                    name="birthDate"
                    rules={[{ required: true, message: 'Укажите дату рождения' }]}
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                      format="DD.MM.YYYY"
                      placeholder="Выберите дату рождения"
                    />
                  </Form.Item>

                  <Form.Item
                    label="Пол"
                    name="gender"
                    rules={[{ required: true, message: 'Выберите пол' }]}
                  >
                    <Radio.Group>
                      <Radio value="MALE">Мужской</Radio>
                      <Radio value="FEMALE">Женский</Radio>
                    </Radio.Group>
                  </Form.Item>

                  <Form.Item
                    label="Весовая категория"
                    name="weightCategoryId"
                  >
                    <Select
                      placeholder="Выберите весовую категорию"
                      loading={loadingWeightCategories}
                      showSearch
                      allowClear
                    >
                      {weightCategories.map((cat) => (
                        <Select.Option key={cat.id} value={cat.id}>
                          {cat.name} ({cat.sport.name})
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    label="Вес (кг)"
                    name="weight"
                  >
                    <InputNumber
                      min={0}
                      max={200}
                      step={0.1}
                      style={{ width: '100%' }}
                      placeholder="Введите вес"
                    />
                  </Form.Item>

                  <Form.Item
                    label="Спортивный разряд"
                    name="sportsRankId"
                  >
                    <Select
                      placeholder="Выберите спортивный разряд (необязательно)"
                      allowClear
                      showSearch
                      loading={loadingSportsRanks}
                      filterOption={(input, option) =>
                        (option?.children as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                      }
                    >
                      {sportsRanks.map((rank) => (
                        <Select.Option key={rank.id} value={rank.id}>
                          {rank.name} {rank.description ? `(${rank.description})` : ''}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </>
              )}

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
                  icon={<UserAddOutlined />}
                >
                  Зарегистрироваться
                </Button>
              </Form.Item>

              <div className="auth-link">
                <Button 
                  type="link" 
                  onClick={() => navigate('/login')}
                  className="auth-link-button"
                >
                  Уже есть аккаунт? Войти
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
