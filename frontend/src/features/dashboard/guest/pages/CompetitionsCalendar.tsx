/**
 * Страница календаря соревнований (гостевой доступ)
 * 
 * Функциональность:
 * - Календарь всех соревнований
 * - Фильтрация по статусу
 * - Просмотр детальной информации о соревнованиях
 * - Публичный доступ
 */

import { useState, useEffect } from 'react';
import { Typography, Spin, Empty, Badge, Popover } from 'antd';
import { CalendarOutlined, TrophyOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { Calendar } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
import apiClient from '../../../../services/api-client';
import { AresIcon } from '../../../../components/AresIcon';
import { BackgroundAnimation } from '../../../../components/BackgroundAnimation';

const { Title, Paragraph, Text } = Typography;

interface Competition {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  location?: string;
  description?: string;
  iconUrl?: string;
  sport: {
    name: string;
  };
  _count?: {
    participants: number;
  };
}

dayjs.locale('ru');

export const CompetitionsCalendar = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);

  useEffect(() => {
    loadCompetitions();
  }, []);

  const loadCompetitions = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/competitions');
      setCompetitions(response.data.data.competitions || []);
    } catch (error) {
      console.error('Ошибка загрузки соревнований', error);
    } finally {
      setLoading(false);
    }
  };

  const getCompetitionsForDate = (date: Dayjs) => {
    return competitions.filter(comp => {
      const start = dayjs(comp.startDate);
      const end = dayjs(comp.endDate);
      return date.isSameOrAfter(start, 'day') && date.isSameOrBefore(end, 'day');
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      UPCOMING: 'rgba(102, 7, 8, 0.8)',
      REGISTRATION: 'rgba(164, 22, 26, 0.8)',
      IN_PROGRESS: 'rgba(186, 24, 27, 0.8)',
      COMPLETED: 'rgba(11, 9, 10, 0.6)',
      CANCELLED: 'rgba(229, 56, 59, 0.8)',
    };
    return colors[status] || 'rgba(102, 7, 8, 0.8)';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      UPCOMING: 'Предстоящее',
      REGISTRATION: 'Регистрация',
      IN_PROGRESS: 'В процессе',
      COMPLETED: 'Завершено',
      CANCELLED: 'Отменено',
    };
    return texts[status] || status;
  };

  const dateCellRender = (value: Dayjs) => {
    const competitionsForDate = getCompetitionsForDate(value);
    if (competitionsForDate.length === 0) {
      return null;
    }

    return (
      <div style={{ marginTop: 4 }}>
        {competitionsForDate.slice(0, 2).map((comp) => (
          <div
            key={comp.id}
            style={{
              fontSize: '11px',
              padding: '2px 4px',
              marginBottom: 2,
              borderRadius: 4,
              background: getStatusColor(comp.status),
              color: '#ffffff',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
            title={comp.name}
          >
            {comp.name}
          </div>
        ))}
        {competitionsForDate.length > 2 && (
          <div
            style={{
              fontSize: '11px',
              padding: '2px 4px',
              borderRadius: 4,
              background: 'rgba(102, 7, 8, 0.6)',
              color: '#ffffff',
              textAlign: 'center',
              cursor: 'pointer',
            }}
          >
            +{competitionsForDate.length - 2}
          </div>
        )}
      </div>
    );
  };

  const monthCellRender = (value: Dayjs) => {
    const competitionsForMonth = competitions.filter(comp => {
      const start = dayjs(comp.startDate);
      const end = dayjs(comp.endDate);
      return value.isSameOrAfter(start, 'month') && value.isSameOrBefore(end, 'month');
    });

    if (competitionsForMonth.length === 0) {
      return null;
    }

    return (
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <Badge count={competitionsForMonth.length} style={{ backgroundColor: 'rgba(102, 7, 8, 0.8)' }} />
      </div>
    );
  };

  const selectedDateCompetitions = selectedDate ? getCompetitionsForDate(selectedDate) : [];

  if (loading && competitions.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', margin: 0, padding: 0, position: 'relative', width: '100%' }}>
      <BackgroundAnimation containerSelector=".calendar-content-section" />
      <style>{`
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

        .calendar-content-section {
          max-width: 1450px;
          width: 100%;
          margin-left: auto;
          margin-right: auto;
          padding: 0 48px;
          position: relative;
        }

        @media (min-width: 1400px) {
          .calendar-content-section {
            width: calc(100% + 250px);
            max-width: 1450px;
            margin-left: calc(50% - 725px);
            margin-right: auto;
            padding: 0 48px;
          }
        }

        @media (max-width: 1400px) {
          .calendar-content-section {
            width: 100%;
            margin-left: auto;
            margin-right: auto;
            max-width: 100%;
          }
        }

        .calendar-wrapper {
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(102, 7, 8, 0.1);
          border-radius: 24px;
          padding: 48px;
          margin-bottom: 48px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          animation: fadeInUp 0.6s ease-out;
          position: relative;
          overflow: hidden;
        }

        .calendar-wrapper::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(180deg, rgba(102, 7, 8, 0.6) 0%, rgba(164, 22, 26, 0.3) 100%);
          z-index: 1;
        }

        .calendar-wrapper::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(180deg, rgba(102, 7, 8, 0.6) 0%, rgba(164, 22, 26, 0.3) 100%);
          z-index: 1;
        }

        .calendar-wrapper:hover {
          box-shadow: 0 16px 48px rgba(102, 7, 8, 0.12);
          border-color: rgba(102, 7, 8, 0.2);
        }

        .calendar-wrapper:hover::before,
        .calendar-wrapper:hover::after {
          background: linear-gradient(180deg, rgba(102, 7, 8, 0.8) 0%, rgba(164, 22, 26, 0.5) 100%);
        }

        .competitions-list {
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(102, 7, 8, 0.1);
          border-radius: 24px;
          padding: 48px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          animation: fadeInUp 0.6s ease-out 0.2s backwards;
          position: relative;
          overflow: hidden;
        }

        .competitions-list::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(180deg, rgba(102, 7, 8, 0.6) 0%, rgba(164, 22, 26, 0.3) 100%);
          z-index: 1;
        }

        .competitions-list::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(180deg, rgba(102, 7, 8, 0.6) 0%, rgba(164, 22, 26, 0.3) 100%);
          z-index: 1;
        }

        .competition-item {
          padding: 20px;
          margin-bottom: 16px;
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(102, 7, 8, 0.1);
          border-radius: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }

        .competition-item:hover {
          border-color: rgba(102, 7, 8, 0.3);
          box-shadow: 0 8px 24px rgba(102, 7, 8, 0.1);
          transform: translateY(-2px);
        }

        .competition-item-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .competition-item-title {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
          flex: 1;
        }

        .competition-item-meta {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 14px;
          color: rgba(26, 26, 26, 0.7);
        }

        .competition-item-meta svg {
          color: rgba(102, 7, 8, 0.7);
        }

        .competition-status-tag {
          padding: 4px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          border: none;
        }

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

        /* Стили для Ant Design Calendar - только для гостевого календаря */
        .guest-calendar-wrapper .ant-picker-calendar {
          background: transparent;
        }

        .guest-calendar-wrapper .ant-picker-calendar-header {
          padding: 16px 0;
        }

        .guest-calendar-wrapper .ant-picker-calendar-date {
          border: 1px solid rgba(102, 7, 8, 0.1);
        }

        .guest-calendar-wrapper .ant-picker-calendar-date:hover {
          border-color: rgba(102, 7, 8, 0.3);
        }

        .guest-calendar-wrapper .ant-picker-calendar-date-selected {
          background: rgba(102, 7, 8, 0.1);
          border-color: rgba(102, 7, 8, 0.4);
        }

        .guest-calendar-wrapper .ant-picker-calendar-date-selected .ant-picker-calendar-date-value {
          color: rgba(102, 7, 8, 0.95);
          font-weight: 600;
        }

        .guest-calendar-wrapper .ant-picker-calendar-date-today {
          border-color: rgba(102, 7, 8, 0.5);
        }

        .guest-calendar-wrapper .ant-picker-calendar-date-today .ant-picker-calendar-date-value {
          color: rgba(102, 7, 8, 0.95);
          font-weight: 600;
        }

        .guest-calendar-wrapper .ant-picker-calendar-month-select,
        .guest-calendar-wrapper .ant-picker-calendar-year-select {
          color: rgba(26, 26, 26, 0.8);
        }

        .guest-calendar-wrapper .ant-picker-calendar-month-select:hover,
        .guest-calendar-wrapper .ant-picker-calendar-year-select:hover {
          color: rgba(102, 7, 8, 0.9);
        }

        .guest-calendar-wrapper .ant-picker-calendar-prev-month-btn,
        .guest-calendar-wrapper .ant-picker-calendar-next-month-btn {
          color: rgba(26, 26, 26, 0.6);
        }

        .guest-calendar-wrapper .ant-picker-calendar-prev-month-btn:hover,
        .guest-calendar-wrapper .ant-picker-calendar-next-month-btn:hover {
          color: rgba(102, 7, 8, 0.9);
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
          .calendar-content-section {
            padding: 0 24px;
          }

          .calendar-wrapper,
          .competitions-list {
            padding: 32px 24px;
            border-radius: 20px;
          }

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
      <div className="calendar-content-section">
        {competitions.length === 0 && !loading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            padding: '80px 24px',
          }}>
            <CalendarOutlined style={{ fontSize: 64, color: 'rgba(26, 26, 26, 0.2)', marginBottom: 24 }} />
            <Title level={3} style={{ color: 'rgba(26, 26, 26, 0.5)', marginBottom: 8 }}>
              Соревнований пока нет
            </Title>
            <Paragraph style={{ color: 'rgba(26, 26, 26, 0.4)', textAlign: 'center', maxWidth: 400 }}>
              Здесь будет отображаться календарь соревнований
            </Paragraph>
          </div>
        ) : (
          <>
            <div className="calendar-wrapper guest-calendar-wrapper">
              <Calendar
                dateCellRender={dateCellRender}
                monthCellRender={monthCellRender}
                onSelect={(date) => setSelectedDate(date)}
                locale={{
                  lang: {
                    locale: 'ru',
                    month: 'месяц',
                    year: 'год',
                    today: 'Сегодня',
                    now: 'Сейчас',
                    backToToday: 'Вернуться к сегодня',
                    ok: 'ОК',
                    timeSelect: 'Выбрать время',
                    dateSelect: 'Выбрать дату',
                    weekSelect: 'Выбрать неделю',
                    monthSelect: 'Выбрать месяц',
                    yearSelect: 'Выбрать год',
                    decadeSelect: 'Выбрать десятилетие',
                    yearFormat: 'YYYY',
                    dateFormat: 'D/M/YYYY',
                    dayFormat: 'D',
                    dateTimeFormat: 'D/M/YYYY HH:mm:ss',
                    monthFormat: 'MMMM',
                    monthBeforeYear: true,
                    previousMonth: 'Предыдущий месяц (PageUp)',
                    nextMonth: 'Следующий месяц (PageDown)',
                    previousYear: 'Предыдущий год (Control + left)',
                    nextYear: 'Следующий год (Control + right)',
                    previousDecade: 'Предыдущее десятилетие',
                    nextDecade: 'Следующее десятилетие',
                    previousCentury: 'Предыдущий век',
                    nextCentury: 'Следующий век',
                  },
                }}
              />
            </div>

            {selectedDate && selectedDateCompetitions.length > 0 && (
              <div className="competitions-list">
                <Title level={4} style={{ marginBottom: 24, color: '#1a1a1a' }}>
                  Соревнования на {selectedDate.format('D MMMM YYYY')}
                </Title>
                {selectedDateCompetitions.map((comp) => (
                  <div key={comp.id} className="competition-item">
                    <div className="competition-item-header">
                      <TrophyOutlined style={{ color: 'rgba(102, 7, 8, 0.8)', fontSize: 20 }} />
                      <Text strong className="competition-item-title">
                        {comp.name}
                      </Text>
                      <Badge
                        className="competition-status-tag"
                        style={{
                          backgroundColor: getStatusColor(comp.status),
                          color: '#ffffff',
                        }}
                      >
                        {getStatusText(comp.status)}
                      </Badge>
                    </div>
                    <div className="competition-item-meta">
                      <span>
                        <CalendarOutlined /> {dayjs(comp.startDate).format('D MMMM YYYY')} - {dayjs(comp.endDate).format('D MMMM YYYY')}
                      </span>
                      {comp.location && (
                        <span>
                          <EnvironmentOutlined /> {comp.location}
                        </span>
                      )}
                      <span>
                        <TrophyOutlined /> {comp.sport.name}
                      </span>
                    </div>
                    {comp.description && (
                      <Paragraph style={{ marginTop: 12, marginBottom: 0, color: 'rgba(26, 26, 26, 0.7)' }}>
                        {comp.description}
                      </Paragraph>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
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

