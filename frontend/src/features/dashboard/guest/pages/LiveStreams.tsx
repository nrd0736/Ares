/**
 * Страница трансляций (гостевой доступ)
 * 
 * Функциональность:
 * - Просмотр всех трансляций
 * - Фильтрация по соревнованиям
 * - Встраивание видео с Rutube
 * - Публичный доступ
 */

import { useState, useEffect } from 'react';
import { Typography, Spin, Tag } from 'antd';
import { PlayCircleOutlined, CalendarOutlined, TrophyOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import dayjs from 'dayjs';
import { AresIcon } from '../../../../components/AresIcon';
import { BackgroundAnimation } from '../../../../components/BackgroundAnimation';

const { Title, Paragraph, Text } = Typography;

interface LiveStream {
  id: string;
  title: string;
  description?: string;
  rutubeUrl: string;
  competitionId?: string;
  competition?: {
    id: string;
    name: string;
  };
  isActive: boolean;
  scheduledTime?: string;
  createdAt: string;
}

export const LiveStreams = () => {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStreams();
  }, []);

  const loadStreams = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/live-streams');
      setStreams(response.data.data || []);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Ошибка загрузки трансляций', error);
      }
      setStreams([]);
    } finally {
      setLoading(false);
    }
  };

  const getRutubeVideoId = (url: string): string | null => {
    const patterns = [
      /rutube\.ru\/live\/video\/([a-f0-9]+)/i,
      /rutube\.ru\/video\/([a-f0-9]+)/i,
      /rutube\.ru\/play\/embed\/([a-f0-9]+)/i,
      /rutube\.ru\/embed\/([a-f0-9]+)/i,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  };

  const getEmbedUrl = (url: string): string | null => {
    const videoId = getRutubeVideoId(url);
    if (!videoId) return null;
    return `https://rutube.ru/play/embed/${videoId}/`;
  };

  const sortedStreams = [...streams].sort((a, b) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    if (a.scheduledTime && b.scheduledTime) {
      return dayjs(b.scheduledTime).valueOf() - dayjs(a.scheduledTime).valueOf();
    }
    return dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf();
  });

  if (loading && streams.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', margin: 0, padding: 0, position: 'relative', width: '100%' }}>
      <BackgroundAnimation containerSelector=".streams-content-section" />
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

        .streams-content-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 48px;
        }

        .stream-card {
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

        .stream-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          z-index: 1;
        }

        .stream-card[data-color-index="0"]::before {
          background: linear-gradient(180deg, rgba(102, 7, 8, 0.6) 0%, rgba(102, 7, 8, 0.3) 100%);
        }

        .stream-card[data-color-index="1"]::before {
          background: linear-gradient(180deg, rgba(164, 22, 26, 0.6) 0%, rgba(164, 22, 26, 0.3) 100%);
        }

        .stream-card[data-color-index="2"]::before {
          background: linear-gradient(180deg, rgba(186, 24, 27, 0.6) 0%, rgba(186, 24, 27, 0.3) 100%);
        }

        .stream-card[data-color-index="3"]::before {
          background: linear-gradient(180deg, rgba(229, 56, 59, 0.6) 0%, rgba(229, 56, 59, 0.3) 100%);
        }

        .stream-card[data-color-index="4"]::before {
          background: linear-gradient(180deg, rgba(11, 9, 10, 0.6) 0%, rgba(11, 9, 10, 0.3) 100%);
        }

        .stream-card:hover {
          transform: translateY(-8px);
        }

        .stream-card[data-color-index="0"]:hover {
          box-shadow: 0 16px 48px rgba(102, 7, 8, 0.15);
          border-color: rgba(102, 7, 8, 0.2);
        }

        .stream-card[data-color-index="1"]:hover {
          box-shadow: 0 16px 48px rgba(164, 22, 26, 0.15);
          border-color: rgba(164, 22, 26, 0.2);
        }

        .stream-card[data-color-index="2"]:hover {
          box-shadow: 0 16px 48px rgba(186, 24, 27, 0.15);
          border-color: rgba(186, 24, 27, 0.2);
        }

        .stream-card[data-color-index="3"]:hover {
          box-shadow: 0 16px 48px rgba(229, 56, 59, 0.15);
          border-color: rgba(229, 56, 59, 0.2);
        }

        .stream-card[data-color-index="4"]:hover {
          box-shadow: 0 16px 48px rgba(11, 9, 10, 0.15);
          border-color: rgba(11, 9, 10, 0.2);
        }

        .stream-card[data-color-index="0"]:hover::before {
          background: linear-gradient(180deg, rgba(102, 7, 8, 0.8) 0%, rgba(102, 7, 8, 0.5) 100%);
        }

        .stream-card[data-color-index="1"]:hover::before {
          background: linear-gradient(180deg, rgba(164, 22, 26, 0.8) 0%, rgba(164, 22, 26, 0.5) 100%);
        }

        .stream-card[data-color-index="2"]:hover::before {
          background: linear-gradient(180deg, rgba(186, 24, 27, 0.8) 0%, rgba(186, 24, 27, 0.5) 100%);
        }

        .stream-card[data-color-index="3"]:hover::before {
          background: linear-gradient(180deg, rgba(229, 56, 59, 0.8) 0%, rgba(229, 56, 59, 0.5) 100%);
        }

        .stream-card[data-color-index="4"]:hover::before {
          background: linear-gradient(180deg, rgba(11, 9, 10, 0.8) 0%, rgba(11, 9, 10, 0.5) 100%);
        }

        .stream-iframe-container {
          width: 100%;
          height: 0;
          padding-bottom: 56.25%;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, rgba(26, 26, 26, 0.05) 0%, rgba(26, 26, 26, 0.02) 100%);
        }

        .stream-iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
        }

        .stream-body {
          padding: 48px;
        }

        .stream-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 24px;
          gap: 16px;
        }

        .stream-title {
          font-size: clamp(24px, 3vw, 32px);
          font-weight: 700;
          color: #1a1a1a;
          line-height: 1.3;
          letter-spacing: -0.5px;
          margin: 0;
          flex: 1;
        }

        .stream-meta {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .stream-meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(26, 26, 26, 0.6);
          font-size: 14px;
        }

        .stream-meta-item svg {
          font-size: 16px;
        }

        .stream-card[data-color-index="0"] .stream-meta-item svg {
          color: rgba(102, 7, 8, 0.7);
        }

        .stream-card[data-color-index="1"] .stream-meta-item svg {
          color: rgba(164, 22, 26, 0.7);
        }

        .stream-card[data-color-index="2"] .stream-meta-item svg {
          color: rgba(186, 24, 27, 0.7);
        }

        .stream-card[data-color-index="3"] .stream-meta-item svg {
          color: rgba(229, 56, 59, 0.7);
        }

        .stream-card[data-color-index="4"] .stream-meta-item svg {
          color: rgba(11, 9, 10, 0.7);
        }

        .stream-description {
          color: #4a4a4a;
          line-height: 1.9;
          font-size: clamp(15px, 1.8vw, 17px);
          margin: 0;
        }

        .stream-live-tag {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.3);
          color: rgba(239, 68, 68, 0.9);
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 13px;
          animation: pulse 2s ease-in-out infinite;
        }

        .stream-competition-tag {
          font-weight: 500;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 13px;
        }

        .stream-card[data-color-index="0"] .stream-competition-tag {
          background: rgba(102, 7, 8, 0.12);
          border-color: rgba(102, 7, 8, 0.3);
          color: rgba(102, 7, 8, 0.95);
        }

        .stream-card[data-color-index="1"] .stream-competition-tag {
          background: rgba(164, 22, 26, 0.12);
          border-color: rgba(164, 22, 26, 0.3);
          color: rgba(164, 22, 26, 0.95);
        }

        .stream-card[data-color-index="2"] .stream-competition-tag {
          background: rgba(186, 24, 27, 0.12);
          border-color: rgba(186, 24, 27, 0.3);
          color: rgba(186, 24, 27, 0.95);
        }

        .stream-card[data-color-index="3"] .stream-competition-tag {
          background: rgba(229, 56, 59, 0.12);
          border-color: rgba(229, 56, 59, 0.3);
          color: rgba(229, 56, 59, 0.95);
        }

        .stream-card[data-color-index="4"] .stream-competition-tag {
          background: rgba(11, 9, 10, 0.12);
          border-color: rgba(11, 9, 10, 0.3);
          color: rgba(11, 9, 10, 0.95);
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        .stream-error-container {
          padding: 80px 40px;
          text-align: center;
          background: rgba(0, 0, 0, 0.02);
          border-radius: 12px;
          color: rgba(26, 26, 26, 0.5);
        }

        @media (max-width: 768px) {
          .streams-content-section {
            padding: 0 24px;
          }

          .stream-card {
            border-radius: 20px;
            margin-bottom: 32px;
          }

          .stream-body {
            padding: 32px 24px;
          }

          .stream-header {
            flex-direction: column;
            gap: 12px;
          }

          .stream-meta {
            gap: 16px;
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
      <div className="streams-content-section">
        {sortedStreams.length === 0 && !loading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            padding: '80px 24px',
          }}>
            <PlayCircleOutlined style={{ fontSize: 64, color: 'rgba(26, 26, 26, 0.2)', marginBottom: 24 }} />
            <Title level={3} style={{ color: 'rgba(26, 26, 26, 0.5)', marginBottom: 8 }}>
              Прямые трансляции пока не запланированы
            </Title>
            <Paragraph style={{ color: 'rgba(26, 26, 26, 0.4)', textAlign: 'center', maxWidth: 400 }}>
              Здесь будут отображаться прямые трансляции соревнований в реальном времени
            </Paragraph>
          </div>
        ) : (
          <>
            {sortedStreams.map((stream, index) => {
              const embedUrl = getEmbedUrl(stream.rutubeUrl);
              
              return (
                <div
                  key={stream.id}
                  className="stream-card"
                  data-color-index={index % 5}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {embedUrl ? (
                    <div className="stream-iframe-container">
                      <iframe
                        src={embedUrl}
                        className="stream-iframe"
                        allow="clipboard-write; autoplay"
                        webkitAllowFullScreen
                        mozallowfullscreen
                        allowFullScreen
                        title={stream.title}
                      />
                    </div>
                  ) : (
                    <div className="stream-error-container">
                      <PlayCircleOutlined style={{ fontSize: 48, marginBottom: 16, color: 'rgba(26, 26, 26, 0.3)' }} />
                      <div style={{ marginBottom: 8 }}>Неверный формат Rutube ссылки</div>
                      <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: 8 }}>
                        {stream.rutubeUrl}
                      </Text>
                      <a 
                        href={stream.rutubeUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                          color: 'rgba(26, 26, 26, 0.6)',
                          textDecoration: 'underline',
                          marginTop: 16,
                          display: 'inline-block'
                        }}
                      >
                        Открыть на Rutube →
                      </a>
                    </div>
                  )}

                  <div className="stream-body">
                    <div className="stream-header">
                      <Title level={2} className="stream-title">
                        {stream.title}
                      </Title>
                      {stream.isActive && (
                        <Tag className="stream-live-tag">
                          LIVE
                        </Tag>
                      )}
                    </div>

                    <div className="stream-meta">
                      {stream.competition && (
                        <div className="stream-meta-item">
                          <TrophyOutlined />
                          <span>{stream.competition.name}</span>
                        </div>
                      )}
                      {stream.scheduledTime && (
                        <div className="stream-meta-item">
                          <CalendarOutlined />
                          <span>
                            {dayjs(stream.scheduledTime).format('DD.MM.YYYY в HH:mm')}
                          </span>
                        </div>
                      )}
                    </div>

                    {stream.competition && (
                      <div style={{ marginBottom: 24 }}>
                        <Tag className="stream-competition-tag">
                          {stream.competition.name}
                        </Tag>
                      </div>
                    )}

                    {stream.description && (
                      <Paragraph className="stream-description">
                        {stream.description}
                      </Paragraph>
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
