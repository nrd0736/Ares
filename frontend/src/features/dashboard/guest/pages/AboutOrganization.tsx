/**
 * Страница об организации (гостевой доступ)
 * 
 * Функциональность:
 * - Информация об организации
 * - Описание деятельности
 * - Галерея изображений
 * - Публичный доступ
 */

import { useState, useEffect } from 'react';
import { Empty, Spin, Typography, Image } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import { sanitizeHTML } from '../../../../utils/sanitize';
import logger from '../../../../utils/logger';

const { Paragraph } = Typography;

interface OrganizationSettings {
  id: string;
  name: string;
  description?: string | null;
  content?: string | null;
  logoUrl?: string | null;
  images: string[];
}

export const AboutOrganization = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await apiClient.get('/organization');
      setSettings(response.data.data);
    } catch (error: any) {
      logger.error('Failed to load organization information', { error: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="guest-loading">
        <Spin size="large" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="guest-empty-state">
        <InfoCircleOutlined className="guest-empty-icon" />
        <p className="guest-empty-text">Информация об организации не найдена</p>
      </div>
    );
  }

  const getImageUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    // Если путь уже начинается с /uploads/, используем его как есть (Vite proxy обработает)
    if (url.startsWith('/uploads/')) {
      return url;
    }
    // Иначе добавляем /uploads/
    return `/uploads/${url}`;
  };

  return (
    <>
      <style>{`
        .org-logo-container {
          text-align: center;
          margin-bottom: 32px;
          animation: fadeInUp 0.6s ease-out;
        }
        
        .org-name-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          padding: 32px;
          margin-bottom: 24px;
          text-align: center;
          animation: fadeInUp 0.6s ease-out 0.1s backwards;
        }
        
        .org-name {
          font-size: 32px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 16px;
        }
        
        .org-description {
          font-size: 16px;
          color: #595959;
          line-height: 1.6;
        }
        
        .org-content-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          padding: 32px;
          margin-bottom: 24px;
          animation: fadeInUp 0.6s ease-out 0.2s backwards;
        }
        
        .org-content {
          font-size: 15px;
          line-height: 1.8;
          color: #4a4a4a;
        }
        
        .org-images-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          padding: 32px;
          animation: fadeInUp 0.6s ease-out 0.3s backwards;
        }
        
        .org-images-title {
          font-size: 20px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 24px;
        }
        
        .org-images-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 16px;
        }
        
        .org-image-item {
          width: 100%;
          height: 200px;
          object-fit: cover;
          border-radius: 12px;
          transition: transform 0.3s ease;
        }
        
        .org-image-item:hover {
          transform: scale(1.05);
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div>
        {/* Логотип и название */}
        {settings.logoUrl && (
          <div className="org-logo-container">
            <Image
              src={getImageUrl(settings.logoUrl)}
              alt={settings.name}
              style={{ maxWidth: 200, maxHeight: 200, objectFit: 'contain' }}
              preview={false}
            />
          </div>
        )}

        {/* Название организации */}
        <div className="org-name-card">
          <div className="org-name">{settings.name}</div>
          {settings.description && (
            <div className="org-description">{settings.description}</div>
          )}
        </div>

        {/* Основной контент */}
        {settings.content && (
          <div className="org-content-card">
            <div
              className="org-content"
              dangerouslySetInnerHTML={{ __html: sanitizeHTML(settings.content) }}
            />
          </div>
        )}

        {/* Фотографии */}
        {settings.images && settings.images.length > 0 && (
          <div className="org-images-card">
            <div className="org-images-title">Фотографии организации</div>
            <div className="org-images-grid">
              {settings.images.map((imageUrl, index) => {
                const url = getImageUrl(imageUrl);
                if (!url) return null;
                return (
                  <Image
                    key={index}
                    src={url}
                    alt={`Фото организации ${index + 1}`}
                    className="org-image-item"
                    preview={{
                      mask: 'Просмотр',
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {!settings.content && !settings.description && settings.images.length === 0 && (
          <div className="guest-empty-state">
            <InfoCircleOutlined className="guest-empty-icon" />
            <p className="guest-empty-text">Информация об организации пока не заполнена</p>
          </div>
        )}
      </div>
    </>
  );
};

