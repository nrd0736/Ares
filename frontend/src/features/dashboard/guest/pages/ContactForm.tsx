/**
 * Страница контактной формы (гостевой доступ)
 * 
 * Функциональность:
 * - Отправка обращения в службу поддержки
 * - Выбор категории обращения
 * - Публичный доступ (можно отправить без авторизации)
 */

import { Form, Input, Button, Select, message, Typography, Alert } from 'antd';
import { SendOutlined, InfoCircleOutlined, MailOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import { useState } from 'react';
import { AresIcon } from '../../../../components/AresIcon';
import { BackgroundAnimation } from '../../../../components/BackgroundAnimation';

const { Title, Paragraph, Text } = Typography;

export const ContactForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await apiClient.post('/tickets', values);
      message.success('Обращение успешно отправлено');
      form.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при отправке обращения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', margin: 0, padding: 0, position: 'relative', width: '100%' }}>
      <BackgroundAnimation containerSelector=".form-content-section" />
      <style>{`
        /* Кастомный скроллбар */
        ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(11, 9, 10, 0.3);
          border-radius: 5px;
        }

        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(102, 7, 8, 0.6) 0%, rgba(164, 22, 26, 0.6) 100%);
          border-radius: 5px;
          border: 2px solid rgba(11, 9, 10, 0.3);
        }

        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(102, 7, 8, 0.8) 0%, rgba(164, 22, 26, 0.8) 100%);
        }

        ::-webkit-scrollbar-thumb:active {
          background: linear-gradient(180deg, rgba(102, 7, 8, 1) 0%, rgba(164, 22, 26, 1) 100%);
        }

        /* Firefox */
        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(102, 7, 8, 0.6) rgba(11, 9, 10, 0.3);
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

        .form-content-section {
          max-width: 800px;
          margin: 0 auto;
          padding: 0 48px;
        }

        .form-card {
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 24px;
          padding: 48px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          animation: fadeInUp 0.6s ease-out;
          position: relative;
          overflow: hidden;
        }

        .form-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(180deg, rgba(102, 7, 8, 0.6) 0%, rgba(164, 22, 26, 0.3) 100%);
          z-index: 1;
        }

        .form-card:hover {
          box-shadow: 0 16px 48px rgba(102, 7, 8, 0.12);
          border-color: rgba(102, 7, 8, 0.2);
        }

        .form-card:hover::before {
          background: linear-gradient(180deg, rgba(102, 7, 8, 0.8) 0%, rgba(164, 22, 26, 0.5) 100%);
        }

        .form-header {
          margin-bottom: 32px;
        }

        .form-title {
          font-size: clamp(24px, 3vw, 32px);
          font-weight: 700;
          color: #1a1a1a;
          line-height: 1.3;
          letter-spacing: -0.5px;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .form-description {
          color: #4a4a4a;
          line-height: 1.7;
          font-size: clamp(15px, 1.8vw, 17px);
          margin: 16px 0 0 0;
        }

        .contact-form .ant-input,
        .contact-form .ant-input-affix-wrapper,
        .contact-form .ant-select-selector {
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .contact-form .ant-input:focus,
        .contact-form .ant-input-affix-wrapper:focus,
        .contact-form .ant-select-focused .ant-select-selector {
          border-color: rgba(102, 7, 8, 0.4);
          box-shadow: 0 0 0 2px rgba(102, 7, 8, 0.15);
        }

        .contact-form .ant-form-item-label > label {
          font-weight: 500;
          color: #1a1a1a;
          font-size: 14px;
        }

        .contact-form .ant-btn-primary {
          border-radius: 12px;
          height: 48px;
          font-weight: 600;
          font-size: 16px;
          background: linear-gradient(135deg, rgba(102, 7, 8, 0.95) 0%, rgba(164, 22, 26, 0.95) 100%);
          border-color: transparent;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .contact-form .ant-btn-primary:hover {
          background: linear-gradient(135deg, rgba(102, 7, 8, 1) 0%, rgba(164, 22, 26, 1) 100%);
          border-color: transparent;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(102, 7, 8, 0.3);
        }

        .info-alert {
          margin-bottom: 32px;
          border-radius: 12px;
          border: 1px solid rgba(26, 26, 26, 0.1);
          background: rgba(26, 26, 26, 0.02);
        }

        .info-alert .ant-alert-message {
          font-weight: 600;
          color: #1a1a1a;
        }

        .info-alert .ant-alert-description {
          color: #4a4a4a;
        }

        @media (max-width: 768px) {
          .form-content-section {
            padding: 0 24px;
          }

          .form-card {
            padding: 32px 24px;
            border-radius: 20px;
          }
        }

        .ares-footer {
          margin-top: 120px;
          width: 100vw;
          margin-left: calc(-50vw + 50%);
          margin-right: calc(-50vw + 50%);
          margin-bottom: -100px;
          padding: 64px 48px;
          padding-bottom: 64px;
          background: linear-gradient(135deg, rgba(11, 9, 10, 0.98) 0%, rgba(102, 7, 8, 0.98) 30%, rgba(164, 22, 26, 0.98) 70%, rgba(102, 7, 8, 0.98) 100%);
          position: relative;
          overflow: hidden;
          box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.2);
          animation: footerFadeIn 1s ease-out;
          flex-shrink: 0;
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
            margin-top: 0;
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
      <div style={{ flex: 1 }}>
      <div className="form-content-section">
        <div className="form-card">
          <div className="form-header">
            <Title level={2} className="form-title">
              <MailOutlined style={{ color: 'rgba(26, 26, 26, 0.9)' }} />
              Обратная связь
            </Title>
            <Paragraph className="form-description">
              Есть вопросы или предложения? Мы всегда готовы помочь и ответить на все ваши вопросы.
            </Paragraph>
          </div>

          <Alert
            message="Важно"
            description={
              <div>
                <Paragraph style={{ marginBottom: 8, margin: 0 }}>
                  Поскольку вы не зарегистрированы в системе, пожалуйста, укажите в тексте сообщения ваши контактные данные:
                </Paragraph>
                <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                  <li>Email адрес</li>
                  <li>Номер телефона</li>
                  <li>Любую другую информацию для связи</li>
                </ul>
              </div>
            }
            type="info"
            icon={<InfoCircleOutlined />}
            showIcon
            className="info-alert"
          />
          
          <Form
            className="contact-form"
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              name="category"
              label="Категория"
            >
              <Select placeholder="Выберите категорию" size="large">
                <Select.Option value="technical">Техническая поддержка</Select.Option>
                <Select.Option value="question">Вопрос</Select.Option>
                <Select.Option value="suggestion">Предложение</Select.Option>
                <Select.Option value="other">Другое</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="subject"
              label="Тема"
              rules={[{ required: true, message: 'Введите тему обращения' }]}
            >
              <Input placeholder="Тема обращения" size="large" />
            </Form.Item>

            <Form.Item
              name="message"
              label="Сообщение"
              rules={[{ required: true, message: 'Введите сообщение' }]}
              help="Не забудьте указать ваши контактные данные (email, телефон) в тексте сообщения"
            >
              <Input.TextArea
                rows={6}
                placeholder="Опишите ваш вопрос или проблему. Обязательно укажите ваши контактные данные (email, телефон) для связи."
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SendOutlined />}
                loading={loading}
                block
                size="large"
              >
                Отправить обращение
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
      </div>

      {/* Подвал - Система АРЕС */}
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
