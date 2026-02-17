/**
 * Страница "О системе" (гостевой доступ)
 * 
 * Функциональность:
 * - Информация о системе APEC
 * - Описание возможностей платформы
 * - Статистика по регионам
 * - 3D модель логотипа
 * - Информация об организации
 * 
 * Особенности:
 * - Публичный доступ
 * - Интерактивные элементы (3D модель, графики)
 * - Карусель изображений
 */

import React, { useState, useEffect, useRef } from 'react';
import { Typography, Spin } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { AresIcon } from '../../../../components/AresIcon';
import { Model3D } from '../../../../components/Model3D';
import { RegionsChart } from '../../../../components/RegionsChart';
import { BackgroundAnimation } from '../../../../components/BackgroundAnimation';
import {
  TrophyOutlined,
  TeamOutlined,
  BarChartOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import logger from '../../../../utils/logger';
import { sanitizeHTML } from '../../../../utils/sanitize';

const { Title, Paragraph, Text } = Typography;

interface OrganizationSettings {
  id: string;
  name: string;
  description?: string | null;
  content?: string | null;
  logoUrl?: string | null;
  images: string[];
}

interface RegionStats {
  name: string;
  athletes: number;
  teams: number;
  competitions: number;
}

export const AboutPage = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const [statistics, setStatistics] = useState({
    totalAthletes: 0,
    totalTeams: 0,
    totalCompetitions: 0,
    totalRegions: 0,
    regions: [] as RegionStats[],
  });
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSettings();
    loadStatistics();
  }, []);

  // Анимация фона теперь в компоненте BackgroundAnimation

  const loadStatistics = async () => {
    try {
      const response = await apiClient.get('/teams/statistics/regions');
      setStatistics(response.data.data);
    } catch (error: any) {
      logger.error('Failed to load statistics', { error: error.message });
      // Fallback на пустые данные при ошибке
      setStatistics({
        totalAthletes: 0,
        totalTeams: 0,
        totalCompetitions: 0,
        totalRegions: 0,
        regions: [],
      });
    }
  };

  useEffect(() => {
    if (settings?.images && settings.images.length > 0) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % settings.images.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [settings?.images]);


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

  const getImageUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) {
      return url;
    }
    return `/uploads/${url}`;
  };

  const nextSlide = () => {
    if (settings?.images) {
      setCurrentSlide((prev) => (prev + 1) % settings.images.length);
    }
  };

  const prevSlide = () => {
    if (settings?.images) {
      setCurrentSlide((prev) => (prev - 1 + settings.images.length) % settings.images.length);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', margin: 0, padding: 0, position: 'relative', width: '100%' }}>
      {/* Canvas анимация фона */}
      <BackgroundAnimation containerSelector=".about-content-wrapper" />
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

        /* Контент должен быть поверх canvas */
        .about-content-wrapper {
          position: relative;
          z-index: 1;
          background: transparent;
        }
        
        /* Убеждаемся, что все контейнеры видны */
        .about-content-wrapper > * {
          position: relative;
          z-index: 1;
        }
        
        /* 3D модели должны быть видны */
        .ares-side-decoration {
          position: relative;
          z-index: 2;
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

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.2);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
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

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .org-hero-slider {
          width: 100vw;
          position: relative;
          left: 50%;
          right: 50%;
          margin-left: -50vw;
          margin-right: -50vw;
          height: 800px;
          overflow: hidden;
          margin-bottom: 80px;
          animation: fadeIn 0.8s ease-out;
          background: #000000;
        }

        .org-slider-container {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .org-slide {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          transition: opacity 1s cubic-bezier(0.4, 0, 0.2, 1), transform 1s cubic-bezier(0.4, 0, 0.2, 1);
          transform: scale(1.1);
          background: #000000;
        }

        .org-slide.active {
          opacity: 1;
          transform: scale(1);
          z-index: 1;
        }

        .org-slide-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #000000;
        }

        .org-slide-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.6) 100%);
          z-index: 2;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 80px;
          text-align: center;
        }

        .org-slide-content {
          max-width: 900px;
          animation: slideIn 0.8s ease-out 0.3s backwards;
        }

        .org-slide-title {
          font-size: clamp(36px, 6vw, 64px);
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 24px;
          letter-spacing: -1.5px;
          line-height: 1.1;
          text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .org-slide-description {
          font-size: clamp(18px, 3vw, 24px);
          color: rgba(255, 255, 255, 0.95);
          line-height: 1.6;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }

        .org-slider-controls {
          position: absolute;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .org-slider-button {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-size: 18px;
        }

        .org-slider-button:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: scale(1.1);
        }

        .org-slider-dots {
          display: flex;
          gap: 8px;
        }

        .org-slider-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .org-slider-dot.active {
          background: #ffffff;
          width: 24px;
          border-radius: 4px;
        }

        .about-section {
          animation: fadeInUp 0.6s ease-out;
          overflow: visible;
        }

        .about-section-delayed {
          animation: fadeInUp 0.6s ease-out 0.2s backwards;
        }

        .about-card {
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 24px;
          padding: 48px;
          margin-bottom: 0;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          animation: scaleIn 0.6s ease-out;
          position: relative;
          overflow: hidden;
        }

        .about-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(180deg, rgba(102, 7, 8, 0.5) 0%, rgba(164, 22, 26, 0.3) 100%);
          border-radius: 24px 0 0 24px;
          z-index: 1;
        }

        .about-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 48px rgba(102, 7, 8, 0.12);
          border-color: rgba(102, 7, 8, 0.15);
        }

        .about-card:hover::before {
          background: linear-gradient(180deg, rgba(102, 7, 8, 0.7) 0%, rgba(164, 22, 26, 0.5) 100%);
        }

        .ares-card-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          overflow: visible;
          padding: 0;
          max-width: 1400px;
        }

        .ares-card {
          position: relative;
          overflow: visible;
          flex: 1;
          max-width: 1000px;
          margin: 40px auto;
        }

        .about-card.ares-card::before {
          display: none;
        }

        .about-card.ares-card:hover::before {
          display: none;
        }

        .ares-side-decoration {
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          transform: translateY(-50%);
          opacity: 1;
          pointer-events: none;
          z-index: 2;
          width: 500px;
          height: 1800px;
          overflow: visible;
        }

        .ares-side-decoration-left {
          left: -460px;
          right: auto;
        }

        .ares-side-decoration-right {
          right: -460px;
          left: auto;
          transform: translateY(-50%) scaleX(-1);
        }

        .about-section {
          overflow: visible;
        }

        @media (max-width: 1400px) {
          .ares-side-decoration {
            display: none;
          }
        }

        .feature-card {
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-radius: 20px;
          padding: 40px 32px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }

        .feature-card::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(180deg, rgba(102, 7, 8, 0.4) 0%, rgba(102, 7, 8, 0.2) 100%);
          border-radius: 20px 0 0 20px;
        }

        .feature-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.5s ease;
        }

        .feature-card:hover::before {
          left: 100%;
        }

        .feature-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 16px 48px rgba(102, 7, 8, 0.15);
          border-color: rgba(102, 7, 8, 0.2);
        }

        .feature-card:hover::after {
          background: linear-gradient(180deg, rgba(102, 7, 8, 0.6) 0%, rgba(102, 7, 8, 0.4) 100%);
        }

        .feature-icon-wrapper svg {
          color: rgba(102, 7, 8, 0.8);
          transition: all 0.4s ease;
        }

        .feature-card:hover .feature-icon-wrapper svg {
          color: rgba(102, 7, 8, 1);
        }

        .org-content-section {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 48px;
          overflow: visible;
        }

        .org-full-description {
          background: linear-gradient(135deg, rgba(245, 243, 244, 0.95) 0%, rgba(255, 255, 255, 0.98) 100%);
          border: none;
          border-radius: 0;
          padding: 96px 120px;
          margin-top: 80px;
          font-size: clamp(17px, 2.2vw, 19px);
          line-height: 2.2;
          color: #1a1a1a;
          animation: fadeInUp 0.8s ease-out;
          white-space: pre-wrap;
          word-wrap: break-word;
          box-shadow: none;
          position: relative;
          overflow: visible;
          max-width: 1600px;
          width: 100%;
          margin-left: auto;
          margin-right: auto;
          border-top: 3px solid rgba(102, 7, 8, 0.2);
          border-bottom: 3px solid rgba(102, 7, 8, 0.2);
        }

        .org-full-description::before {
          display: none;
        }

        .org-full-description::after {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 120px;
          height: 3px;
          background: linear-gradient(90deg, transparent, rgba(102, 7, 8, 0.6), transparent);
        }

        .org-full-description p {
          margin-bottom: 2em;
          text-align: left;
          text-justify: none;
          color: #2a2a2a;
        }

        .org-full-description p:last-child {
          margin-bottom: 0;
        }

        .org-full-description h1,
        .org-full-description h2,
        .org-full-description h3,
        .org-full-description h4 {
          color: rgba(102, 7, 8, 0.95);
          font-weight: 700;
          margin-top: 2.5em;
          margin-bottom: 1.2em;
          line-height: 1.3;
          letter-spacing: -0.5px;
          position: relative;
          padding-left: 24px;
        }

        .org-full-description h1::before,
        .org-full-description h2::before,
        .org-full-description h3::before,
        .org-full-description h4::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 4px;
          height: 60%;
          background: linear-gradient(180deg, rgba(102, 7, 8, 0.8) 0%, rgba(164, 22, 26, 0.6) 100%);
          border-radius: 2px;
        }

        .org-full-description h1 {
          font-size: 2.2em;
        }

        .org-full-description h2 {
          font-size: 1.8em;
        }

        .org-full-description h3 {
          font-size: 1.5em;
        }

        .org-full-description h4 {
          font-size: 1.3em;
        }

        .org-full-description h1:first-child,
        .org-full-description h2:first-child,
        .org-full-description h3:first-child,
        .org-full-description h4:first-child {
          margin-top: 0;
        }

        .org-full-description ul,
        .org-full-description ol {
          margin: 2em 0;
          padding-left: 2.5em;
        }

        .org-full-description li {
          margin-bottom: 0.8em;
          line-height: 1.8;
        }

        .org-full-description blockquote {
          border-left: 4px solid rgba(102, 7, 8, 0.4);
          padding-left: 2.5em;
          margin: 2.5em 0;
          font-style: italic;
          color: #3a3a3a;
          background: linear-gradient(90deg, rgba(102, 7, 8, 0.03) 0%, transparent 100%);
          padding: 1.5em 2.5em;
          border-radius: 0;
        }

        .org-full-description strong {
          color: rgba(102, 7, 8, 0.9);
          font-weight: 600;
        }

        .org-full-description a {
          color: rgba(102, 7, 8, 0.9);
          text-decoration: underline;
          text-decoration-color: rgba(102, 7, 8, 0.3);
          transition: all 0.3s ease;
        }

        .org-full-description a:hover {
          color: rgba(164, 22, 26, 1);
          text-decoration-color: rgba(164, 22, 26, 0.5);
        }

        .org-full-description img {
          max-width: 100%;
          height: auto;
          border-radius: 12px;
          margin: 2em 0;
        }

        .section-divider {
          margin: 20px 0;
          border: none;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.1), transparent);
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
          .org-hero-slider {
            height: 650px;
            margin-bottom: 60px;
          }

          .org-slide-overlay {
            padding: 40px 24px;
          }

          .org-slider-controls {
            bottom: 24px;
          }

          .org-content-section {
            padding: 0 24px;
          }

          .org-content-section {
            padding: 0 24px;
          }

          .org-full-description {
            padding: 64px 32px;
            border-radius: 0;
            max-width: 100%;
          }

          .org-full-description p {
            text-align: left;
          }

          .about-card {
            padding: 32px 24px;
          }

          .feature-card {
            padding: 32px 24px;
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
      `}      </style>

      <div className="about-content-wrapper" style={{ flex: 1, position: 'relative', zIndex: 1 }}>
      {/* Слайдер с фотографиями организации */}
      {settings && settings.images && settings.images.length > 0 && (
        <div className="org-hero-slider">
          <div className="org-slider-container">
            {settings.images.map((imageUrl, index) => {
              const url = getImageUrl(imageUrl);
              if (!url) return null;
              return (
                <div
                  key={index}
                  className={`org-slide ${index === currentSlide ? 'active' : ''}`}
                >
                  <img
                    src={url}
                    alt={`${settings.name} - фото ${index + 1}`}
                    className="org-slide-image"
                  />
                </div>
              );
            })}
          </div>
          
          {settings.images.length > 1 && (
            <div className="org-slider-controls">
              <button className="org-slider-button" onClick={prevSlide}>
                <LeftOutlined />
              </button>
              <div className="org-slider-dots">
                {settings.images.map((_, index) => (
                  <div
                    key={index}
                    className={`org-slider-dot ${index === currentSlide ? 'active' : ''}`}
                    onClick={() => setCurrentSlide(index)}
                  />
                ))}
              </div>
              <button className="org-slider-button" onClick={nextSlide}>
                <RightOutlined />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="org-content-section">
        {/* Полное описание организации */}
        {settings && settings.content && (
          <div className="org-full-description">
            <div 
              dangerouslySetInnerHTML={{ __html: sanitizeHTML(settings.content) }}
              style={{
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
              }}
            />
          </div>
        )}

        {/* О системе - Иконка и описание */}
        <div className="about-section about-section-delayed" style={{ marginTop: settings?.content ? '20px' : '0' }}>
          <div className="ares-card-wrapper">
            {/* Декоративный элемент слева - 3D модель греческого воина */}
            <div className="ares-side-decoration ares-side-decoration-left">
              <Model3D
                modelPath="/source/model.glb"
                scale={2.2}
                position={[0, -2.5, 0]}
                rotation={[0, 0, 0]}
                autoRotate={true}
                targetRotation={isCardHovered ? 0 : null}
              />
            </div>

            <div 
              className="about-card ares-card"
              ref={cardRef}
              onMouseEnter={() => setIsCardHovered(true)}
              onMouseLeave={() => setIsCardHovered(false)}
            >
              <div style={{ 
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 48,
                padding: '40px 0',
              }}>
                <AresIcon size={160} color="#1a1a1a" />
              </div>

            <div style={{ 
              textAlign: 'center', 
              marginBottom: 48,
            }}>
              <Title 
                level={2} 
                style={{ 
                  color: '#1a1a1a',
                  marginBottom: 32,
                  fontSize: 'clamp(32px, 4vw, 42px)',
                  fontWeight: 700,
                  letterSpacing: '-1px',
                }}
              >
                АРЕС
              </Title>
              <Paragraph 
                style={{ 
                  fontSize: 'clamp(16px, 2vw, 19px)',
                  lineHeight: 1.9,
                  color: '#4a4a4a',
                  maxWidth: 900,
                  margin: '0 auto',
                }}
              >
                Древнегреческий бог войны, олицетворяющий силу, мужество и спортивный дух. 
                В мифологии он был покровителем воинов и атлетов, символизируя не только военную 
                доблесть, но и честную борьбу, стремление к победе и уважение к сопернику. 
                Именно эти качества мы воплотили в нашей платформе — системе, созданной для 
                честных соревнований и спортивного мастерства.
              </Paragraph>
            </div>
          </div>

          {/* Декоративный элемент справа - 3D модель греческого воина (зеркально) */}
          <div className="ares-side-decoration ares-side-decoration-right">
            <Model3D
              modelPath="/source/model.glb"
              scale={2.2}
              position={[0, -2.5, 0]}
              rotation={[0, 0, 0]}
              autoRotate={true}
              targetRotation={isCardHovered ? 0 : null}
            />
          </div>
          </div>
        </div>

        <div className="section-divider" />

        {/* Возможности платформы */}
        <div className="about-section about-section-delayed">
          <Title 
            level={2} 
            style={{ 
              textAlign: 'center',
              color: '#1a1a1a',
              marginBottom: 64,
              fontSize: 'clamp(28px, 4vw, 38px)',
              fontWeight: 700,
              letterSpacing: '-0.5px',
            }}
          >
            Возможности платформы
          </Title>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '32px',
            marginBottom: 64,
          }}>
            {[
              {
                icon: <TrophyOutlined />,
                title: 'Управление соревнованиями',
                description: 'Создание и настройка соревнований любого формата: олимпийская система, круговая, групповой этап. Автоматическая генерация сеток, расписание матчей и управление этапами турнира',
              },
              {
                icon: <TeamOutlined />,
                title: 'Регистрация участников',
                description: 'Централизованная система регистрации спортсменов и команд. Управление заявками, проверка документов, формирование списков участников и автоматическое распределение по группам',
              },
              {
                icon: <BarChartOutlined />,
                title: 'Ведение результатов',
                description: 'Ввод и фиксация результатов матчей и соревнований. Автоматический подсчет очков, формирование турнирных таблиц, определение победителей и призеров в реальном времени',
              },
              {
                icon: <SafetyOutlined />,
                title: 'Контроль и судейство',
                description: 'Система подтверждения результатов судьями, протоколирование соревнований, возможность оспаривания результатов и ведение истории всех изменений для обеспечения честности',
              },
              {
                icon: <ThunderboltOutlined />,
                title: 'Публикация и уведомления',
                description: 'Мгновенная публикация результатов на сайте, автоматические уведомления участникам о расписании и изменениях, экспорт данных и формирование отчетов для организаторов',
              },
              {
                icon: <GlobalOutlined />,
                title: 'Аналитика и рейтинги',
                description: 'Детальная статистика выступлений спортсменов и команд, формирование рейтингов, анализ динамики результатов и экспорт данных для дальнейшей обработки',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="feature-card"
                style={{
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                <div 
                  className="feature-icon-wrapper"
                  style={{
                    fontSize: '64px',
                    marginBottom: '24px',
                    textAlign: 'center',
                    transition: 'all 0.4s ease',
                  }}
                >
                  {feature.icon}
                </div>
                <Title level={4} style={{ 
                  color: '#1a1a1a', 
                  marginBottom: 16,
                  textAlign: 'center',
                  fontSize: 'clamp(18px, 2vw, 22px)',
                  fontWeight: 600,
                }}>
                  {feature.title}
                </Title>
                <Paragraph style={{ 
                  color: '#4a4a4a', 
                  fontSize: 'clamp(14px, 1.5vw, 15px)', 
                  marginBottom: 0,
                  textAlign: 'center',
                  lineHeight: 1.7,
                }}>
                  {feature.description}
                </Paragraph>
              </div>
            ))}
          </div>
        </div>

        {/* Статистика по регионам */}
        <div className="section-divider" />
        
        <div className="about-section about-section-delayed">
          <Title 
            level={2} 
            style={{ 
              textAlign: 'center',
              color: '#1a1a1a',
              marginBottom: 48,
              fontSize: 'clamp(28px, 4vw, 38px)',
              fontWeight: 700,
              letterSpacing: '-0.5px',
            }}
          >
            Статистика платформы
          </Title>

          {/* Общая статистика */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '24px',
            marginBottom: 64,
            maxWidth: 1000,
            margin: '0 auto 64px',
          }}>
            {[
              { label: 'Спортсменов', value: statistics.totalAthletes, suffix: '' },
              { label: 'Команд', value: statistics.totalTeams, suffix: '' },
              { label: 'Соревнований', value: statistics.totalCompetitions, suffix: '' },
              { label: 'Регионов', value: statistics.totalRegions, suffix: '' },
            ].map((stat, index) => (
              <div
                key={index}
                style={{
                  background: 'rgba(255, 255, 255, 0.6)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  borderRadius: '16px',
                  padding: '32px 24px',
                  textAlign: 'center',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  animation: `fadeInUp 0.6s ease-out ${index * 0.1}s backwards`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(102, 7, 8, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(102, 7, 8, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)';
                }}
              >
                <div style={{
                  fontSize: 'clamp(32px, 4vw, 48px)',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, rgba(102, 7, 8, 0.95) 0%, rgba(164, 22, 26, 0.95) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: 8,
                  lineHeight: 1,
                }}>
                  {stat.value.toLocaleString()}{stat.suffix}
                </div>
                <div style={{
                  fontSize: 'clamp(14px, 1.5vw, 16px)',
                  color: '#4a4a4a',
                  fontWeight: 500,
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* График статистики по регионам */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.5)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: '24px',
            padding: '48px',
            maxWidth: 1400,
            margin: '0 auto',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              width: '100%',
              minHeight: '400px',
              position: 'relative',
            }}>
              <RegionsChart
                regions={statistics.regions}
                hoveredRegion={hoveredRegion}
                onRegionHover={setHoveredRegion}
              />
            </div>
            <div style={{
              textAlign: 'center',
              marginTop: '16px',
              fontSize: '12px',
              color: 'rgba(74, 74, 74, 0.6)',
            }}>
              Показаны топ-15 регионов по количеству спортсменов
            </div>

            {/* Список регионов */}
            <div style={{
              marginTop: '48px',
              paddingTop: '32px',
              borderTop: '1px solid rgba(0, 0, 0, 0.08)',
            }}>
              <Title level={4} style={{
                color: '#1a1a1a',
                marginBottom: 24,
                fontSize: 'clamp(18px, 2vw, 22px)',
                fontWeight: 600,
              }}>
                По регионам
              </Title>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '16px',
              }}>
                {statistics.regions.slice(0, 15).map((region, index) => {
                  const maxAthletes = Math.max(...statistics.regions.map(r => r.athletes));
                  const percentage = (region.athletes / maxAthletes) * 100;
                  const isHovered = hoveredRegion === region.name;
                  
                  // Красные тона для подсветки при наведении на график
                  const redColors = [
                    { hover: 'rgba(102, 7, 8, 0.15)', border: 'rgba(102, 7, 8, 0.25)' },
                    { hover: 'rgba(164, 22, 26, 0.15)', border: 'rgba(164, 22, 26, 0.25)' },
                    { hover: 'rgba(186, 24, 27, 0.15)', border: 'rgba(186, 24, 27, 0.25)' },
                    { hover: 'rgba(229, 56, 59, 0.15)', border: 'rgba(229, 56, 59, 0.25)' },
                  ];
                  const redColor = redColors[index % redColors.length];
                    
                    return (
                      <div
                        key={index}
                        style={{
                          padding: '16px',
                          background: isHovered ? redColor.hover : 'rgba(211, 211, 211, 0.3)',
                          borderRadius: '12px',
                          border: `1px solid ${isHovered ? redColor.border : 'rgba(0, 0, 0, 0.08)'}`,
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={() => {
                          // Используем название региона напрямую для карты
                          setHoveredRegion(region.name);
                        }}
                        onMouseLeave={() => setHoveredRegion(null)}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 8,
                        }}>
                          <Text strong style={{
                            color: '#1a1a1a',
                            fontSize: '15px',
                            fontWeight: 600,
                          }}>
                            {region.name}
                          </Text>
                          <Text style={{
                            color: '#4a4a4a',
                            fontSize: '14px',
                            fontWeight: 600,
                          }}>
                            {region.athletes}
                          </Text>
                        </div>
                        <div style={{
                          height: '4px',
                          background: 'rgba(0, 0, 0, 0.1)',
                          borderRadius: '2px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${percentage}%`,
                            background: 'linear-gradient(90deg, rgba(26, 26, 26, 0.6) 0%, rgba(26, 26, 26, 0.8) 100%)',
                            borderRadius: '2px',
                            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
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
