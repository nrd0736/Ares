/**
 * Страница регистрации команды (гостевой доступ)
 * 
 * Функциональность:
 * - Регистрация новой команды
 * - Выбор региона
 * - Ввод контактной информации
 * - Публичный доступ
 */

import { Form, Input, Select, Button, message, Typography } from 'antd';
import { TeamOutlined, SendOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import { useState, useEffect } from 'react';
import { AresIcon } from '../../../../components/AresIcon';
import { BackgroundAnimation } from '../../../../components/BackgroundAnimation';

const { Title, Paragraph, Text } = Typography;

interface Region {
  id: string;
  name: string;
  federalDistrict?: {
    name: string;
  };
}

interface Competition {
  id: string;
  name: string;
  status?: string;
  sport?: {
    name: string;
  };
  startDate: string;
}

export const TeamRegistrationForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loadingCompetitions, setLoadingCompetitions] = useState(false);

  useEffect(() => {
    loadRegions();
    loadCompetitions();
  }, []);

  const loadRegions = async () => {
    setLoadingRegions(true);
    try {
      const response = await apiClient.get('/references/regions');
      setRegions(response.data.data || []);
    } catch (error) {
      message.error('Ошибка загрузки регионов');
    } finally {
      setLoadingRegions(false);
    }
  };

  const loadCompetitions = async () => {
    setLoadingCompetitions(true);
    try {
      const response = await apiClient.get('/competitions?limit=1000');
      const allCompetitions = response.data.data.competitions || [];
      const availableCompetitions = allCompetitions.filter((comp: Competition) => {
        const status = comp.status || '';
        return status === 'UPCOMING' || status === 'REGISTRATION' || status === 'IN_PROGRESS';
      });
      setCompetitions(availableCompetitions);
    } catch (error) {
      console.error('Ошибка загрузки соревнований', error);
      message.error('Ошибка загрузки списка соревнований');
    } finally {
      setLoadingCompetitions(false);
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const { competitionId, ...teamData } = values;
      const teamDataWithCompetition = {
        ...teamData,
        contactInfo: competitionId 
          ? `${teamData.contactInfo || ''}\n\nЗаявка на соревнование: ${competitionId}`.trim()
          : teamData.contactInfo,
        status: 'PENDING',
      };
      
      await apiClient.post('/teams', teamDataWithCompetition);
      
      if (competitionId) {
        message.success('Заявка на регистрацию команды и участие в соревновании успешно отправлена. После одобрения команды администратором будет создана заявка на участие в соревновании.');
      } else {
        message.success('Заявка на регистрацию команды успешно отправлена. Она будет рассмотрена администратором.');
      }
      
      form.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при отправке заявки');
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

        .team-registration-form .ant-input,
        .team-registration-form .ant-input-affix-wrapper,
        .team-registration-form .ant-select-selector,
        .team-registration-form .ant-input-number {
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .team-registration-form .ant-input:focus,
        .team-registration-form .ant-input-affix-wrapper:focus,
        .team-registration-form .ant-select-focused .ant-select-selector {
          border-color: rgba(102, 7, 8, 0.4);
          box-shadow: 0 0 0 2px rgba(102, 7, 8, 0.15);
        }

        .team-registration-form .ant-form-item-label > label {
          font-weight: 500;
          color: #1a1a1a;
          font-size: 14px;
        }

        .team-registration-form .ant-btn-primary {
          border-radius: 12px;
          height: 48px;
          font-weight: 600;
          font-size: 16px;
          background: linear-gradient(135deg, rgba(102, 7, 8, 0.95) 0%, rgba(164, 22, 26, 0.95) 100%);
          border-color: transparent;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .team-registration-form .ant-btn-primary:hover {
          background: linear-gradient(135deg, rgba(102, 7, 8, 1) 0%, rgba(164, 22, 26, 1) 100%);
          border-color: transparent;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(102, 7, 8, 0.3);
        }

        .form-note {
          margin-top: 24px;
          padding: 20px;
          background: rgba(26, 26, 26, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 12px;
        }

        .form-note-text {
          margin: 0;
          font-size: 13px;
          color: rgba(26, 26, 26, 0.7);
          line-height: 1.6;
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
              <TeamOutlined style={{ color: 'rgba(26, 26, 26, 0.9)' }} />
              Регистрация команды
            </Title>
            <Paragraph className="form-description">
              Заполните форму для регистрации вашей команды. После отправки заявка будет рассмотрена администратором.
            </Paragraph>
          </div>

          <Form
            className="team-registration-form"
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              name="name"
              label="Название команды"
              rules={[{ required: true, message: 'Введите название команды' }]}
            >
              <Input placeholder="Название команды" size="large" />
            </Form.Item>

            <Form.Item
              name="regionId"
              label="Регион"
              rules={[{ required: true, message: 'Выберите регион' }]}
            >
              <Select
                placeholder="Выберите регион"
                loading={loadingRegions}
                showSearch
                size="large"
                filterOption={(input, option) =>
                  (option?.children as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {regions.map((region) => (
                  <Select.Option key={region.id} value={region.id}>
                    {region.name} {region.federalDistrict ? `(${region.federalDistrict.name})` : ''}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="address"
              label="Адрес"
            >
              <Input placeholder="Адрес команды" size="large" />
            </Form.Item>

            <Form.Item
              name="contactInfo"
              label="Контактная информация"
            >
              <Input.TextArea
                rows={3}
                placeholder="Телефон, email и другая контактная информация"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="description"
              label="Описание команды"
            >
              <Input.TextArea
                rows={4}
                placeholder="Краткое описание команды, история, достижения"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="competitionId"
              label="Соревнование (опционально)"
              help="Выберите соревнование, на участие в котором подается заявка"
            >
              <Select
                placeholder="Выберите соревнование (необязательно)"
                loading={loadingCompetitions}
                showSearch
                allowClear
                size="large"
                filterOption={(input, option) =>
                  (option?.children as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {competitions.map((comp) => (
                  <Select.Option key={comp.id} value={comp.id}>
                    {comp.name} {comp.sport ? `(${comp.sport.name})` : ''} -{' '}
                    {new Date(comp.startDate).toLocaleDateString('ru-RU')}
                  </Select.Option>
                ))}
              </Select>
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
                Отправить заявку
              </Button>
            </Form.Item>

            <div className="form-note">
              <Paragraph className="form-note-text">
                <Text strong>Примечание:</Text> После отправки заявки она будет рассмотрена администратором. 
                Вы получите уведомление о результате модерации.
              </Paragraph>
            </div>
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
