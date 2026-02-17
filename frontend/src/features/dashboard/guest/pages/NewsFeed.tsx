/**
 * Страница новостной ленты (гостевой доступ)
 * 
 * Функциональность:
 * - Просмотр всех новостей
 * - Пагинация новостей
 * - Фильтрация по категориям
 * - Просмотр детальной информации о новости
 * 
 * Особенности:
 * - Публичный доступ без авторизации
 * - Отображение изображений новостей
 * - Санитизация HTML контента для безопасности
 */

import { useState, useEffect } from 'react';
import { Typography, Spin, Tag, Pagination, Empty } from 'antd';
import { CalendarOutlined, UserOutlined, FileTextOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import { AresIcon } from '../../../../components/AresIcon';
import { BackgroundAnimation } from '../../../../components/BackgroundAnimation';

const { Title, Paragraph, Text } = Typography;

interface News {
  id: string;
  title: string;
  content: string;
  category?: string;
  createdAt: string;
  images?: string[] | string;
  author: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}

export const NewsFeed = () => {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  useEffect(() => {
    loadNews();
  }, [pagination.current]);

  const loadNews = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(
        `/news?page=${pagination.current}&limit=${pagination.pageSize}`
      );
      setNews(response.data.data.news);
      setPagination({
        ...pagination,
        total: response.data.data.pagination.total,
      });
    } catch (error) {
      console.error('Ошибка загрузки новостей', error);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (url: string | null | undefined): string => {
    // Дефолтное изображение для новостей без фото
    const defaultImage = 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&h=600&fit=crop';
    
    if (!url || typeof url !== 'string') {
      return defaultImage;
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('/')) {
      return url;
    }
    return `/${url}`;
  };

  const parseImages = (images: any): string[] => {
    if (!images) return [];
    if (Array.isArray(images)) {
      return images.filter((img: any) => img && typeof img === 'string');
    }
    if (typeof images === 'string') {
      try {
        const parsed = JSON.parse(images);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [images];
      }
    }
    if (typeof images === 'object') {
      try {
        const arr = Object.values(images);
        return arr.filter((img: any) => img && typeof img === 'string') as string[];
      } catch {
        return [];
      }
    }
    return [];
  };

  if (loading && news.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', margin: 0, padding: 0, position: 'relative', width: '100%' }}>
      <BackgroundAnimation containerSelector=".news-content-section" />
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

        .news-content-section {
          max-width: 1450px;
          width: 100%;
          margin-left: auto;
          margin-right: auto;
          padding: 0 48px;
          position: relative;
        }

        @media (min-width: 1400px) {
          .news-content-section {
            width: calc(100% + 250px);
            max-width: 1450px;
            margin-left: calc(50% - 725px);
            margin-right: auto;
            padding: 0 48px;
          }
        }

        @media (max-width: 1400px) {
          .news-content-section {
            width: 100%;
            margin-left: auto;
            margin-right: auto;
            max-width: 100%;
          }
        }

        .news-card {
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

        .news-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          z-index: 1;
        }

        .news-card[data-color-index="0"]::before {
          background: linear-gradient(180deg, rgba(102, 7, 8, 0.6) 0%, rgba(102, 7, 8, 0.3) 100%);
        }

        .news-card[data-color-index="1"]::before {
          background: linear-gradient(180deg, rgba(164, 22, 26, 0.6) 0%, rgba(164, 22, 26, 0.3) 100%);
        }

        .news-card[data-color-index="2"]::before {
          background: linear-gradient(180deg, rgba(186, 24, 27, 0.6) 0%, rgba(186, 24, 27, 0.3) 100%);
        }

        .news-card[data-color-index="3"]::before {
          background: linear-gradient(180deg, rgba(229, 56, 59, 0.6) 0%, rgba(229, 56, 59, 0.3) 100%);
        }

        .news-card[data-color-index="4"]::before {
          background: linear-gradient(180deg, rgba(11, 9, 10, 0.6) 0%, rgba(11, 9, 10, 0.3) 100%);
        }

        .news-card:hover {
          transform: translateY(-8px);
        }

        .news-card[data-color-index="0"]:hover {
          box-shadow: 0 16px 48px rgba(102, 7, 8, 0.15);
          border-color: rgba(102, 7, 8, 0.2);
        }

        .news-card[data-color-index="1"]:hover {
          box-shadow: 0 16px 48px rgba(164, 22, 26, 0.15);
          border-color: rgba(164, 22, 26, 0.2);
        }

        .news-card[data-color-index="2"]:hover {
          box-shadow: 0 16px 48px rgba(186, 24, 27, 0.15);
          border-color: rgba(186, 24, 27, 0.2);
        }

        .news-card[data-color-index="3"]:hover {
          box-shadow: 0 16px 48px rgba(229, 56, 59, 0.15);
          border-color: rgba(229, 56, 59, 0.2);
        }

        .news-card[data-color-index="4"]:hover {
          box-shadow: 0 16px 48px rgba(11, 9, 10, 0.15);
          border-color: rgba(11, 9, 10, 0.2);
        }

        .news-card[data-color-index="0"]:hover::before {
          background: linear-gradient(180deg, rgba(102, 7, 8, 0.8) 0%, rgba(102, 7, 8, 0.5) 100%);
        }

        .news-card[data-color-index="1"]:hover::before {
          background: linear-gradient(180deg, rgba(164, 22, 26, 0.8) 0%, rgba(164, 22, 26, 0.5) 100%);
        }

        .news-card[data-color-index="2"]:hover::before {
          background: linear-gradient(180deg, rgba(186, 24, 27, 0.8) 0%, rgba(186, 24, 27, 0.5) 100%);
        }

        .news-card[data-color-index="3"]:hover::before {
          background: linear-gradient(180deg, rgba(229, 56, 59, 0.8) 0%, rgba(229, 56, 59, 0.5) 100%);
        }

        .news-card[data-color-index="4"]:hover::before {
          background: linear-gradient(180deg, rgba(11, 9, 10, 0.8) 0%, rgba(11, 9, 10, 0.5) 100%);
        }

        .news-image-container {
          width: 100%;
          height: 500px;
          overflow: hidden;
          position: relative;
          background: linear-gradient(135deg, rgba(26, 26, 26, 0.05) 0%, rgba(26, 26, 26, 0.02) 100%);
        }

        .news-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .news-card:hover .news-image {
          transform: scale(1.05);
        }

        .news-image-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 200px;
          background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.4) 100%);
          pointer-events: none;
        }

        .news-body {
          padding: 48px;
        }

        .news-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 24px;
          gap: 16px;
        }

        .news-title {
          font-size: clamp(24px, 3vw, 32px);
          font-weight: 700;
          color: #1a1a1a;
          line-height: 1.3;
          letter-spacing: -0.5px;
          margin: 0;
          flex: 1;
        }

        .news-meta {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .news-meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(26, 26, 26, 0.6);
          font-size: 14px;
        }

        .news-meta-item svg {
          font-size: 16px;
        }

        .news-card[data-color-index="0"] .news-meta-item svg {
          color: rgba(102, 7, 8, 0.7);
        }

        .news-card[data-color-index="1"] .news-meta-item svg {
          color: rgba(164, 22, 26, 0.7);
        }

        .news-card[data-color-index="2"] .news-meta-item svg {
          color: rgba(186, 24, 27, 0.7);
        }

        .news-card[data-color-index="3"] .news-meta-item svg {
          color: rgba(229, 56, 59, 0.7);
        }

        .news-card[data-color-index="4"] .news-meta-item svg {
          color: rgba(11, 9, 10, 0.7);
        }

        .news-content {
          color: #4a4a4a;
          line-height: 1.9;
          font-size: clamp(15px, 1.8vw, 17px);
          margin: 0;
        }

        .news-category-tag {
          font-weight: 500;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 13px;
        }

        .news-card[data-color-index="0"] .news-category-tag {
          background: rgba(102, 7, 8, 0.12);
          border-color: rgba(102, 7, 8, 0.3);
          color: rgba(102, 7, 8, 0.95);
        }

        .news-card[data-color-index="1"] .news-category-tag {
          background: rgba(164, 22, 26, 0.12);
          border-color: rgba(164, 22, 26, 0.3);
          color: rgba(164, 22, 26, 0.95);
        }

        .news-card[data-color-index="2"] .news-category-tag {
          background: rgba(186, 24, 27, 0.12);
          border-color: rgba(186, 24, 27, 0.3);
          color: rgba(186, 24, 27, 0.95);
        }

        .news-card[data-color-index="3"] .news-category-tag {
          background: rgba(229, 56, 59, 0.12);
          border-color: rgba(229, 56, 59, 0.3);
          color: rgba(229, 56, 59, 0.95);
        }

        .news-card[data-color-index="4"] .news-category-tag {
          background: rgba(11, 9, 10, 0.12);
          border-color: rgba(11, 9, 10, 0.3);
          color: rgba(11, 9, 10, 0.95);
        }

        .section-divider {
          margin: 32px 0;
          border: none;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.1), transparent);
        }

        @media (max-width: 768px) {
          .news-content-section {
            padding: 0 24px;
          }

          .news-card {
            border-radius: 20px;
            margin-bottom: 32px;
          }

          .news-image-container {
            height: 350px;
          }

          .news-body {
            padding: 32px 24px;
          }

          .news-header {
            flex-direction: column;
            gap: 12px;
          }

          .news-meta {
            gap: 16px;
          }
        }

        .news-content-section .ant-pagination {
          margin-top: 64px;
          margin-bottom: 48px;
        }

        .news-content-section .ant-pagination .ant-pagination-item {
          border-color: rgba(102, 7, 8, 0.2);
        }

        .news-content-section .ant-pagination .ant-pagination-item a {
          color: rgba(26, 26, 26, 0.8);
        }

        .news-content-section .ant-pagination .ant-pagination-item:hover {
          border-color: rgba(102, 7, 8, 0.4);
        }

        .news-content-section .ant-pagination .ant-pagination-item:hover a {
          color: rgba(102, 7, 8, 0.9);
        }

        .news-content-section .ant-pagination .ant-pagination-item-active {
          border-color: rgba(102, 7, 8, 0.6);
          background: rgba(102, 7, 8, 0.1);
        }

        .news-content-section .ant-pagination .ant-pagination-item-active a {
          color: rgba(102, 7, 8, 1);
          font-weight: 600;
        }

        .news-content-section .ant-pagination .ant-pagination-prev,
        .news-content-section .ant-pagination .ant-pagination-next {
          border-color: rgba(102, 7, 8, 0.2);
        }

        .news-content-section .ant-pagination .ant-pagination-prev:hover,
        .news-content-section .ant-pagination .ant-pagination-next:hover {
          border-color: rgba(102, 7, 8, 0.4);
        }

        .news-content-section .ant-pagination .ant-pagination-prev:hover .ant-pagination-item-link,
        .news-content-section .ant-pagination .ant-pagination-next:hover .ant-pagination-item-link {
          color: rgba(102, 7, 8, 0.9);
        }

        .news-content-section .ant-pagination .ant-pagination-prev .ant-pagination-item-link,
        .news-content-section .ant-pagination .ant-pagination-next .ant-pagination-item-link {
          color: rgba(26, 26, 26, 0.8);
        }

        .news-content-section .ant-pagination .ant-pagination-jump-prev .ant-pagination-item-link-icon,
        .news-content-section .ant-pagination .ant-pagination-jump-next .ant-pagination-item-link-icon {
          color: rgba(102, 7, 8, 0.6);
        }

        .news-content-section .ant-pagination .ant-pagination-options .ant-select-selector {
          border-color: rgba(102, 7, 8, 0.2);
        }

        .news-content-section .ant-pagination .ant-pagination-options .ant-select:hover .ant-select-selector {
          border-color: rgba(102, 7, 8, 0.4);
        }

        .news-content-section .ant-pagination .ant-pagination-options .ant-select-focused .ant-select-selector {
          border-color: rgba(102, 7, 8, 0.6);
          box-shadow: 0 0 0 2px rgba(102, 7, 8, 0.15);
        }

        .news-content-section .ant-pagination .ant-pagination-total-text {
          color: rgba(26, 26, 26, 0.7);
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
      <div className="news-content-section">
        {news.length === 0 && !loading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            padding: '80px 24px',
          }}>
            <FileTextOutlined style={{ fontSize: 64, color: 'rgba(26, 26, 26, 0.2)', marginBottom: 24 }} />
            <Title level={3} style={{ color: 'rgba(26, 26, 26, 0.5)', marginBottom: 8 }}>
              Новостей пока нет
            </Title>
            <Paragraph style={{ color: 'rgba(26, 26, 26, 0.4)', textAlign: 'center', maxWidth: 400 }}>
              Здесь будут отображаться последние новости и события платформы
            </Paragraph>
          </div>
        ) : (
          <>
            {news.map((item, index) => {
              const imagesArray = parseImages(item.images);
              const firstImage = imagesArray.length > 0 ? imagesArray[0] : null;
              const imageUrl = getImageUrl(firstImage);

              return (
                <div
                  key={item.id}
                  className="news-card"
                  data-color-index={index % 5}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="news-image-container">
                    <img
                      src={imageUrl}
                      alt={item.title}
                      className="news-image"
                      onError={(e) => {
                        // Если даже дефолтное изображение не загрузилось, используем другой вариант
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&h=600&fit=crop';
                      }}
                    />
                    <div className="news-image-overlay" />
                  </div>

                  <div className="news-body">
                    <div className="news-header">
                      <Title level={2} className="news-title">
                        {item.title}
                      </Title>
                      {item.category && (
                        <Tag className="news-category-tag">
                          {item.category}
                        </Tag>
                      )}
                    </div>

                    <div className="news-meta">
                      <div className="news-meta-item">
                        <CalendarOutlined />
                        <span>
                          {new Date(item.createdAt).toLocaleDateString('ru-RU', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="news-meta-item">
                        <UserOutlined />
                        <span>
                          {item.author.profile.firstName} {item.author.profile.lastName}
                        </span>
                      </div>
                    </div>

                    <Paragraph className="news-content">
                      {item.content}
                    </Paragraph>
                  </div>
                </div>
              );
            })}

            {pagination.total > 0 && (
              <div style={{ marginTop: 64, marginBottom: 48 }}>
                <Pagination
                  current={pagination.current}
                  pageSize={pagination.pageSize}
                  total={pagination.total}
                  onChange={(page) => setPagination({ ...pagination, current: page })}
                  style={{
                    textAlign: 'center',
                  }}
                  showSizeChanger={false}
                  showQuickJumper
                  showTotal={(total, range) =>
                    `${range[0]}-${range[1]} из ${total} новостей`
                  }
                />
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
