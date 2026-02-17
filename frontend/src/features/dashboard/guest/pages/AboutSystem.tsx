/**
 * Страница "О системе" (гостевой доступ)
 * 
 * Функциональность:
 * - Описание возможностей системы APEC
 * - Основные функции платформы
 * - Публичный доступ
 */

import { Typography, Divider } from 'antd';
import { AresIcon } from '../../../../components/AresIcon';
import { AresTitle } from '../../../../components/AresTitle';
import {
  TrophyOutlined,
  TeamOutlined,
  BarChartOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

export const AboutSystem = () => {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Большая иконка по центру */}
      <div style={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
        padding: '60px 0',
        animation: 'fadeIn 0.8s ease-out',
      }}>
        <AresIcon size={200} color="#1a1a1a" />
      </div>

      {/* Заголовок и описание */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: 64,
        padding: '0 20px',
      }}>
        <Title 
          level={1} 
          style={{ 
            color: '#1a1a1a',
            marginBottom: 24,
            fontSize: '48px',
            fontWeight: 700,
            letterSpacing: '-1px',
          }}
        >
          Арес
        </Title>
        <Paragraph 
          style={{ 
            fontSize: '20px',
            lineHeight: '1.9',
            color: '#4a4a4a',
            maxWidth: 800,
            margin: '0 auto',
            marginBottom: 0,
          }}
        >
          Древнегреческий бог войны, олицетворяющий силу, мужество и спортивный дух. 
          В мифологии он был покровителем воинов и атлетов, символизируя не только военную 
          доблесть, но и честную борьбу, стремление к победе и уважение к сопернику. 
          Именно эти качества мы воплотили в нашей платформе — системе, созданной для 
          честных соревнований и спортивного мастерства.
        </Paragraph>
      </div>

      <Divider style={{ margin: '48px 0', borderColor: 'rgba(0,0,0,0.08)' }} />

      {/* Возможности платформы - в виде сетки */}
      <div style={{ marginBottom: 48 }}>
        <Title 
          level={2} 
          style={{ 
            textAlign: 'center',
            color: '#1a1a1a',
            marginBottom: 48,
            fontSize: '36px',
            fontWeight: 700,
          }}
        >
          Возможности платформы
        </Title>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          marginBottom: 48,
        }}>
          {/* Карточка 1 */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.5)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0,0,0,0.05)',
              borderRadius: '20px',
              padding: '32px',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              fontSize: '56px',
              color: '#1a1a1a',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <TrophyOutlined />
            </div>
            <Title level={4} style={{ 
              color: '#1a1a1a', 
              marginBottom: 16,
              textAlign: 'center',
              fontSize: '22px',
            }}>
              Турниры и соревнования
            </Title>
            <Paragraph style={{ 
              color: '#4a4a4a', 
              fontSize: '15px', 
              marginBottom: 0,
              textAlign: 'center',
              lineHeight: '1.7',
            }}>
              Автоматическое создание турнирных сеток, управление соревнованиями любого уровня 
              и отслеживание результатов в реальном времени
            </Paragraph>
          </div>

          {/* Карточка 2 */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.5)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0,0,0,0.05)',
              borderRadius: '20px',
              padding: '32px',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              fontSize: '56px',
              color: '#1a1a1a',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <TeamOutlined />
            </div>
            <Title level={4} style={{ 
              color: '#1a1a1a', 
              marginBottom: 16,
              textAlign: 'center',
              fontSize: '22px',
            }}>
              Команды и спортсмены
            </Title>
            <Paragraph style={{ 
              color: '#4a4a4a', 
              fontSize: '15px', 
              marginBottom: 0,
              textAlign: 'center',
              lineHeight: '1.7',
            }}>
              Полное управление командами, профили спортсменов с историей выступлений 
              и достижениями, удобная подача заявок на участие
            </Paragraph>
          </div>

          {/* Карточка 3 */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.5)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0,0,0,0.05)',
              borderRadius: '20px',
              padding: '32px',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              fontSize: '56px',
              color: '#1a1a1a',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <BarChartOutlined />
            </div>
            <Title level={4} style={{ 
              color: '#1a1a1a', 
              marginBottom: 16,
              textAlign: 'center',
              fontSize: '22px',
            }}>
              Статистика и аналитика
            </Title>
            <Paragraph style={{ 
              color: '#4a4a4a', 
              fontSize: '15px', 
              marginBottom: 0,
              textAlign: 'center',
              lineHeight: '1.7',
            }}>
              Автоматический сбор данных, формирование рейтингов и детальная статистика 
              для анализа прогресса и планирования подготовки
            </Paragraph>
          </div>

          {/* Карточка 4 */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.5)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0,0,0,0.05)',
              borderRadius: '20px',
              padding: '32px',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              fontSize: '56px',
              color: '#1a1a1a',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <SafetyOutlined />
            </div>
            <Title level={4} style={{ 
              color: '#1a1a1a', 
              marginBottom: 16,
              textAlign: 'center',
              fontSize: '22px',
            }}>
              Прозрачность результатов
            </Title>
            <Paragraph style={{ 
              color: '#4a4a4a', 
              fontSize: '15px', 
              marginBottom: 0,
              textAlign: 'center',
              lineHeight: '1.7',
            }}>
              Все результаты фиксируются в системе, подтверждаются судьями в реальном времени 
              и доступны для проверки — максимальная честность соревнований
            </Paragraph>
          </div>

          {/* Карточка 5 */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.5)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0,0,0,0.05)',
              borderRadius: '20px',
              padding: '32px',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              fontSize: '56px',
              color: '#1a1a1a',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <ThunderboltOutlined />
            </div>
            <Title level={4} style={{ 
              color: '#1a1a1a', 
              marginBottom: 16,
              textAlign: 'center',
              fontSize: '22px',
            }}>
              Мгновенные обновления
            </Title>
            <Paragraph style={{ 
              color: '#4a4a4a', 
              fontSize: '15px', 
              marginBottom: 0,
              textAlign: 'center',
              lineHeight: '1.7',
            }}>
              Результаты обновляются в реальном времени, уведомления о важных событиях 
              и синхронизация данных между всеми участниками
            </Paragraph>
          </div>

          {/* Карточка 6 */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.5)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0,0,0,0.05)',
              borderRadius: '20px',
              padding: '32px',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              fontSize: '56px',
              color: '#1a1a1a',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <GlobalOutlined />
            </div>
            <Title level={4} style={{ 
              color: '#1a1a1a', 
              marginBottom: 16,
              textAlign: 'center',
              fontSize: '22px',
            }}>
              Единая экосистема
            </Title>
            <Paragraph style={{ 
              color: '#4a4a4a', 
              fontSize: '15px', 
              marginBottom: 0,
              textAlign: 'center',
              lineHeight: '1.7',
            }}>
              Объединение спортсменов, тренеров, судей и организаторов в едином цифровом 
              пространстве для эффективного взаимодействия
            </Paragraph>
          </div>
        </div>
      </div>

      <Divider style={{ margin: '48px 0', borderColor: 'rgba(0,0,0,0.08)' }} />

      {/* Заключение */}
      <div style={{ 
        textAlign: 'center',
        padding: '40px 20px',
        background: 'rgba(255, 255, 255, 0.4)',
        borderRadius: '20px',
        border: '1px solid rgba(0,0,0,0.05)',
      }}>
        <Paragraph 
          style={{ 
            fontSize: '19px',
            lineHeight: '1.9',
            color: '#4a4a4a',
            marginBottom: 0,
            maxWidth: 800,
            margin: '0 auto',
          }}
        >
          <Text strong style={{ color: '#1a1a1a', fontSize: '22px' }}>
            АРЕС
          </Text>
          {' '}— это современный инструмент для организации спортивных соревнований, 
          который объединяет спортсменов, тренеров, судей и организаторов в едином 
          цифровом пространстве. Мы стремимся сделать процесс проведения соревнований 
          максимально удобным, прозрачным и справедливым, сохраняя дух честной борьбы 
          и спортивного мастерства.
        </Paragraph>
      </div>
    </div>
  );
};
