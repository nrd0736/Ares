/**
 * Страница списка соревнований (гостевой доступ)
 * 
 * Функциональность:
 * - Просмотр всех соревнований
 * - Фильтрация по статусу и виду спорта
 * - Просмотр детальной информации о соревновании
 * - Просмотр результатов соревнований
 * 
 * Особенности:
 * - Публичный доступ без авторизации
 * - Карточки соревнований с основной информацией
 * - Переход к детальной странице соревнования
 */

import { useState, useEffect } from 'react';
import { Typography, Spin, Tag, Select } from 'antd';
import { TrophyOutlined, CalendarOutlined, EnvironmentOutlined, TeamOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import { getCompetitionIconUrl } from '../../../../utils/image-utils';
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

interface CompetitionResult {
  athlete: {
    id: string;
    user?: {
      profile?: {
        firstName: string;
        lastName: string;
        middleName?: string;
      };
    };
  };
  position: number | null;
}

export const CompetitionsList = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [resultsMap, setResultsMap] = useState<Map<string, CompetitionResult[]>>(new Map());

  useEffect(() => {
    loadCompetitions();
  }, [statusFilter]);

  useEffect(() => {
    const completedCompetitions = competitions.filter(c => c.status === 'COMPLETED');
    if (completedCompetitions.length > 0) {
      loadResultsForCompetitions(completedCompetitions.map(c => c.id));
    }
  }, [competitions]);

  const loadCompetitions = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter && statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      const response = await apiClient.get('/competitions', { params });
      setCompetitions(response.data.data.competitions);
    } catch (error) {
      console.error('Ошибка загрузки соревнований', error);
    } finally {
      setLoading(false);
    }
  };

  const loadResultsForCompetitions = async (competitionIds: string[]) => {
    try {
      const resultsPromises = competitionIds.map(async (id) => {
        try {
          const response = await apiClient.get(`/competitions/${id}/results`);
          return { competitionId: id, results: response.data.data || [] };
        } catch (error) {
          console.error(`Ошибка загрузки результатов для соревнования ${id}`, error);
          return { competitionId: id, results: [] };
        }
      });

      const results = await Promise.all(resultsPromises);
      const newMap = new Map<string, CompetitionResult[]>();
      results.forEach(({ competitionId, results }) => {
        newMap.set(competitionId, results);
      });
      setResultsMap(newMap);
    } catch (error) {
      console.error('Ошибка загрузки результатов', error);
    }
  };

  const getWinners = (competitionId: string): CompetitionResult[] => {
    const results = resultsMap.get(competitionId) || [];
    return results
      .filter(r => r.position !== null && r.position === 1)
      .sort((a, b) => (a.position || 999) - (b.position || 999));
  };

  const getAthleteName = (athlete: CompetitionResult['athlete']) => {
    if (!athlete.user?.profile) return 'Неизвестный спортсмен';
    const { firstName, lastName, middleName } = athlete.user.profile;
    return `${lastName} ${firstName} ${middleName || ''}`.trim();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      UPCOMING: 'blue',
      REGISTRATION: 'orange',
      IN_PROGRESS: 'green',
      COMPLETED: 'purple',
      CANCELLED: 'red',
    };
    return colors[status] || 'default';
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

  const getImageUrl = (url: string | null | undefined): string => {
    const defaultImage = 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&h=600&fit=crop';
    
    if (!url || typeof url !== 'string') {
      return defaultImage;
    }
    
    const iconUrl = getCompetitionIconUrl(url);
    if (iconUrl) {
      return iconUrl;
    }
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('/')) {
      return url;
    }
    return `/${url}`;
  };

  const cleanDescription = (description: string | undefined): string | null => {
    if (!description) return null;
    
    // Сохраняем оригинальное описание на случай, если после очистки оно станет пустым
    const original = description.trim();
    if (!original) return null;
    
    const unwantedTexts = [
      'Соревнование только началось. Участники зарегистрированы, но схватки еще не проводились.',
      'Соревнование только началось',
      'Участники зарегистрированы, но схватки еще не проводились',
      'Завершенное соревнование со всеми данными',
      'завершенное соревнование со всеми данными',
      'турнирные сетки, матчи, результаты',
      'турнирные сетки, матчи, результаты.',
      'Турнирные сетки, матчи, результаты',
      'Турнирные сетки, матчи, результаты.',
    ];
    
    let clean = description;
    unwantedTexts.forEach(text => {
      clean = clean.replace(new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
    });
    
    clean = clean
      .replace(/^[.,;:\s\-]+/g, '')
      .replace(/[.,;:\s\-]+$/g, '')
      .replace(/\.{2,}/g, '.')
      .replace(/[,;:]{2,}/g, ',')
      .replace(/\s{2,}/g, ' ')
      .trim();
    
    // Если после очистки описание стало слишком коротким (меньше 10 символов) или пустым,
    // но оригинальное описание было длиннее, возвращаем оригинал
    if (clean.length < 10 && original.length > clean.length) {
      return original;
    }
    
    // Если после очистки осталось что-то значимое, возвращаем очищенное
    return clean.length > 0 ? clean : original;
  };

  if (loading && competitions.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', margin: 0, padding: 0, position: 'relative', width: '100%' }}>
      <BackgroundAnimation containerSelector=".competitions-content-section" />
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

        .competitions-content-section {
          max-width: 1450px;
          width: 100%;
          margin-left: auto;
          margin-right: auto;
          padding: 0 48px;
          position: relative;
        }

        @media (min-width: 1400px) {
          .competitions-content-section {
            width: calc(100% + 250px);
            max-width: 1450px;
            margin-left: calc(50% - 725px);
            margin-right: auto;
            padding: 0 48px;
          }
        }

        @media (max-width: 1400px) {
          .competitions-content-section {
            width: 100%;
            margin-left: auto;
            margin-right: auto;
            max-width: 100%;
          }
        }

        .competition-card {
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 24px;
          padding: 0;
          margin-bottom: 48px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          animation: fadeInUp 0.6s ease-out backwards;
          overflow: hidden;
          position: relative;
        }

        .competition-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          z-index: 1;
        }

        .competition-card[data-color-index="0"]::before {
          background: linear-gradient(180deg, rgba(102, 7, 8, 0.6) 0%, rgba(102, 7, 8, 0.3) 100%);
        }

        .competition-card[data-color-index="1"]::before {
          background: linear-gradient(180deg, rgba(164, 22, 26, 0.6) 0%, rgba(164, 22, 26, 0.3) 100%);
        }

        .competition-card[data-color-index="2"]::before {
          background: linear-gradient(180deg, rgba(186, 24, 27, 0.6) 0%, rgba(186, 24, 27, 0.3) 100%);
        }

        .competition-card[data-color-index="3"]::before {
          background: linear-gradient(180deg, rgba(229, 56, 59, 0.6) 0%, rgba(229, 56, 59, 0.3) 100%);
        }

        .competition-card[data-color-index="4"]::before {
          background: linear-gradient(180deg, rgba(11, 9, 10, 0.6) 0%, rgba(11, 9, 10, 0.3) 100%);
        }

        .competition-card:hover {
          transform: translateY(-8px);
        }

        .competition-card[data-color-index="0"]:hover {
          box-shadow: 0 16px 48px rgba(102, 7, 8, 0.15);
          border-color: rgba(102, 7, 8, 0.2);
        }

        .competition-card[data-color-index="1"]:hover {
          box-shadow: 0 16px 48px rgba(164, 22, 26, 0.15);
          border-color: rgba(164, 22, 26, 0.2);
        }

        .competition-card[data-color-index="2"]:hover {
          box-shadow: 0 16px 48px rgba(186, 24, 27, 0.15);
          border-color: rgba(186, 24, 27, 0.2);
        }

        .competition-card[data-color-index="3"]:hover {
          box-shadow: 0 16px 48px rgba(229, 56, 59, 0.15);
          border-color: rgba(229, 56, 59, 0.2);
        }

        .competition-card[data-color-index="4"]:hover {
          box-shadow: 0 16px 48px rgba(11, 9, 10, 0.15);
          border-color: rgba(11, 9, 10, 0.2);
        }

        .competition-card[data-color-index="0"]:hover::before {
          background: linear-gradient(180deg, rgba(102, 7, 8, 0.8) 0%, rgba(102, 7, 8, 0.5) 100%);
        }

        .competition-card[data-color-index="1"]:hover::before {
          background: linear-gradient(180deg, rgba(164, 22, 26, 0.8) 0%, rgba(164, 22, 26, 0.5) 100%);
        }

        .competition-card[data-color-index="2"]:hover::before {
          background: linear-gradient(180deg, rgba(186, 24, 27, 0.8) 0%, rgba(186, 24, 27, 0.5) 100%);
        }

        .competition-card[data-color-index="3"]:hover::before {
          background: linear-gradient(180deg, rgba(229, 56, 59, 0.8) 0%, rgba(229, 56, 59, 0.5) 100%);
        }

        .competition-card[data-color-index="4"]:hover::before {
          background: linear-gradient(180deg, rgba(11, 9, 10, 0.8) 0%, rgba(11, 9, 10, 0.5) 100%);
        }

        .competition-image-container {
          width: 100%;
          height: 500px;
          overflow: hidden;
          position: relative;
          background: linear-gradient(135deg, rgba(26, 26, 26, 0.05) 0%, rgba(26, 26, 26, 0.02) 100%);
        }

        .competition-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .competition-card:hover .competition-image {
          transform: scale(1.05);
        }

        .competition-image-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 200px;
          background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.4) 100%);
          pointer-events: none;
        }

        .competition-body {
          padding: 48px;
        }

        .competition-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 24px;
          gap: 16px;
        }

        .competition-title {
          font-size: clamp(24px, 3vw, 32px);
          font-weight: 700;
          color: #1a1a1a;
          line-height: 1.3;
          letter-spacing: -0.5px;
          margin: 0;
          flex: 1;
        }

        .competition-meta {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .competition-meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(26, 26, 26, 0.6);
          font-size: 14px;
        }

        .competition-meta-item svg {
          font-size: 16px;
        }

        .competition-card[data-color-index="0"] .competition-meta-item svg {
          color: rgba(102, 7, 8, 0.7);
        }

        .competition-card[data-color-index="1"] .competition-meta-item svg {
          color: rgba(164, 22, 26, 0.7);
        }

        .competition-card[data-color-index="2"] .competition-meta-item svg {
          color: rgba(186, 24, 27, 0.7);
        }

        .competition-card[data-color-index="3"] .competition-meta-item svg {
          color: rgba(229, 56, 59, 0.7);
        }

        .competition-card[data-color-index="4"] .competition-meta-item svg {
          color: rgba(11, 9, 10, 0.7);
        }

        .competition-description {
          color: #4a4a4a;
          line-height: 1.9;
          font-size: clamp(15px, 1.8vw, 17px);
          margin: 0 0 24px 0;
        }

        .competition-status-tag {
          font-weight: 500;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 13px;
        }

        .competition-sport-tag {
          font-weight: 500;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 13px;
        }

        .competition-card[data-color-index="0"] .competition-sport-tag {
          background: rgba(102, 7, 8, 0.12);
          border-color: rgba(102, 7, 8, 0.3);
          color: rgba(102, 7, 8, 0.95);
        }

        .competition-card[data-color-index="1"] .competition-sport-tag {
          background: rgba(164, 22, 26, 0.12);
          border-color: rgba(164, 22, 26, 0.3);
          color: rgba(164, 22, 26, 0.95);
        }

        .competition-card[data-color-index="2"] .competition-sport-tag {
          background: rgba(186, 24, 27, 0.12);
          border-color: rgba(186, 24, 27, 0.3);
          color: rgba(186, 24, 27, 0.95);
        }

        .competition-card[data-color-index="3"] .competition-sport-tag {
          background: rgba(229, 56, 59, 0.12);
          border-color: rgba(229, 56, 59, 0.3);
          color: rgba(229, 56, 59, 0.95);
        }

        .competition-card[data-color-index="4"] .competition-sport-tag {
          background: rgba(11, 9, 10, 0.12);
          border-color: rgba(11, 9, 10, 0.3);
          color: rgba(11, 9, 10, 0.95);
        }

        .winners-section {
          margin-top: 32px;
          padding: 32px;
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(20px);
          border-radius: 16px;
          border: 1px solid rgba(0, 0, 0, 0.08);
        }

        .winners-title {
          font-size: clamp(18px, 2vw, 22px);
          font-weight: 600;
          margin-bottom: 24px;
          color: #1a1a1a;
          display: flex;
          align-items: center;
        }

        .winner-item {
          display: flex;
          align-items: center;
          padding: 20px 24px;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          margin-bottom: 12px;
          position: relative;
          overflow: hidden;
        }

        .winner-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(180deg, rgba(251, 191, 36, 0.8) 0%, rgba(245, 158, 11, 0.8) 100%);
        }

        .winner-item:hover {
          background: rgba(255, 255, 255, 1);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          transform: translateX(4px);
          border-color: rgba(0, 0, 0, 0.1);
        }

        .winner-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 16px;
          flex-shrink: 0;
        }

        .winner-icon svg {
          color: rgba(245, 158, 11, 0.9);
          font-size: 24px;
        }

        .winner-name {
          flex: 1;
          font-size: 16px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .winner-badge {
          padding: 6px 12px;
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          color: rgba(245, 158, 11, 0.9);
        }

        .filter-section {
          margin-bottom: 48px;
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }

        .filter-section .ant-select {
          border-radius: 12px;
        }

        .filter-section .ant-select-selector {
          border-color: rgba(102, 7, 8, 0.2) !important;
          border-radius: 12px !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        .filter-section .ant-select:hover .ant-select-selector {
          border-color: rgba(102, 7, 8, 0.4) !important;
        }

        .filter-section .ant-select-focused .ant-select-selector {
          border-color: rgba(102, 7, 8, 0.6) !important;
          box-shadow: 0 0 0 2px rgba(102, 7, 8, 0.15) !important;
        }

        .filter-section .ant-select-selection-item {
          color: rgba(26, 26, 26, 0.9) !important;
          font-weight: 500;
        }

        .filter-section .ant-select-arrow {
          color: rgba(102, 7, 8, 0.6) !important;
        }

        .filter-section .ant-select:hover .ant-select-arrow {
          color: rgba(102, 7, 8, 0.9) !important;
        }

        .filter-section .ant-select-dropdown {
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(102, 7, 8, 0.15);
          border: 1px solid rgba(102, 7, 8, 0.2);
        }

        .filter-section .ant-select-item {
          border-radius: 8px;
          margin: 4px 8px;
          transition: all 0.2s ease;
        }

        .filter-section .ant-select-item:hover {
          background: rgba(102, 7, 8, 0.08) !important;
        }

        .filter-section .ant-select-item-option-selected {
          background: rgba(102, 7, 8, 0.12) !important;
          color: rgba(102, 7, 8, 0.95) !important;
          font-weight: 600;
        }

        .filter-section .ant-select-item-option-selected:hover {
          background: rgba(102, 7, 8, 0.15) !important;
        }

        .section-divider {
          margin: 32px 0;
          border: none;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.1), transparent);
        }

        @media (max-width: 768px) {
          .competitions-content-section {
            padding: 0 24px;
          }

          .competition-card {
            border-radius: 20px;
            margin-bottom: 32px;
          }

          .competition-image-container {
            height: 350px;
          }

          .competition-body {
            padding: 32px 24px;
          }

          .competition-header {
            flex-direction: column;
            gap: 12px;
          }

          .competition-meta {
            gap: 16px;
          }

          .filter-section {
            margin-bottom: 32px;
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
      <div className="competitions-content-section">
        <div className="filter-section">
          <Select
            placeholder="Фильтр по статусу"
            value={statusFilter || 'ALL'}
            style={{ width: 200 }}
            onChange={(value) => setStatusFilter(value === 'ALL' ? undefined : value)}
            size="large"
          >
            <Select.Option value="ALL">Все</Select.Option>
            <Select.Option value="UPCOMING">Предстоящие</Select.Option>
            <Select.Option value="REGISTRATION">Регистрация</Select.Option>
            <Select.Option value="IN_PROGRESS">В процессе</Select.Option>
            <Select.Option value="COMPLETED">Завершенные</Select.Option>
          </Select>
        </div>

        {competitions.length === 0 && !loading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            padding: '80px 24px',
          }}>
            <TrophyOutlined style={{ fontSize: 64, color: 'rgba(26, 26, 26, 0.2)', marginBottom: 24 }} />
            <Title level={3} style={{ color: 'rgba(26, 26, 26, 0.5)', marginBottom: 8 }}>
              Соревнований пока нет
            </Title>
            <Paragraph style={{ color: 'rgba(26, 26, 26, 0.4)', textAlign: 'center', maxWidth: 400 }}>
              Здесь будут отображаться актуальные и предстоящие спортивные соревнования
            </Paragraph>
          </div>
        ) : (
          <>
            {competitions.map((competition, index) => {
              const imageUrl = getImageUrl(competition.iconUrl);
              const cleanDesc = cleanDescription(competition.description);
              const winners = competition.status === 'COMPLETED' ? getWinners(competition.id) : [];

              return (
                <div
                  key={competition.id}
                  className="competition-card"
                  data-color-index={index % 5}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="competition-image-container">
                    <img
                      src={imageUrl}
                      alt={competition.name}
                      className="competition-image"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&h=600&fit=crop';
                      }}
                    />
                    <div className="competition-image-overlay" />
                  </div>

                  <div className="competition-body">
                    <div className="competition-header">
                      <Title level={2} className="competition-title">
                        {competition.name}
                      </Title>
                      <Tag 
                        color={getStatusColor(competition.status)}
                        className="competition-status-tag"
                      >
                        {getStatusText(competition.status)}
                      </Tag>
                    </div>

                    <div className="competition-meta">
                      <div className="competition-meta-item">
                        <CalendarOutlined />
                        <span>
                          {new Date(competition.startDate).toLocaleDateString('ru-RU', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                          {competition.startDate !== competition.endDate && (
                            <> - {new Date(competition.endDate).toLocaleDateString('ru-RU', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}</>
                          )}
                        </span>
                      </div>
                      {competition.location && (
                        <div className="competition-meta-item">
                          <EnvironmentOutlined />
                          <span>{competition.location}</span>
                        </div>
                      )}
                      {competition._count?.participants && (
                        <div className="competition-meta-item">
                          <TeamOutlined />
                          <span>{competition._count.participants} участников</span>
                        </div>
                      )}
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <Tag className="competition-sport-tag">
                        {competition.sport.name}
                      </Tag>
                    </div>

                    {competition.description && (
                      <Paragraph className="competition-description">
                        {cleanDesc || competition.description}
                      </Paragraph>
                    )}

                    {winners.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 32 }}>
                        {winners.map((winner) => (
                          <div key={winner.athlete.id} className="winner-item">
                            <div className="winner-icon">
                              <TrophyOutlined />
                            </div>
                            <div className="winner-name">
                              {getAthleteName(winner.athlete)}
                            </div>
                            <div className="winner-badge">
                              {'1 место'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
