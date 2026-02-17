/**
 * Страница документов (гостевой доступ)
 * 
 * Функциональность:
 * - Просмотр публичных документов
 * - Организация по категориям
 * - Скачивание документов
 * - Публичный доступ
 */

import { useState, useEffect } from 'react';
import { Typography, Spin, Button, Tag } from 'antd';
import { FileOutlined, DownloadOutlined, FolderOutlined, FilePdfOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import { AresIcon } from '../../../../components/AresIcon';
import { BackgroundAnimation } from '../../../../components/BackgroundAnimation';

const { Title, Paragraph, Text } = Typography;

interface DocumentCategory {
  id: string;
  name: string;
  description?: string;
  order: number;
  documents: Document[];
}

interface Document {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType?: string;
  categoryId: string;
  order: number;
  isPublic: boolean;
  category?: {
    id: string;
    name: string;
  };
}

export const Documents = () => {
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/documents/categories');
      const categoriesWithPublicDocs = (response.data.data || []).map((cat: DocumentCategory) => ({
        ...cat,
        documents: (cat.documents || []).filter((doc: Document) => doc.isPublic),
      })).filter((cat: DocumentCategory) => cat.documents.length > 0);
      
      setCategories(categoriesWithPublicDocs);
    } catch (error: any) {
      console.error('Ошибка загрузки документов', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType?: string) => {
    if (mimeType?.includes('pdf')) {
      return <FilePdfOutlined style={{ fontSize: 24, color: 'rgba(239, 68, 68, 0.9)' }} />;
    }
    return <FileOutlined style={{ fontSize: 24, color: 'rgba(26, 26, 26, 0.6)' }} />;
  };

  const handleDownload = (doc: Document) => {
    const link = document.createElement('a');
    link.href = doc.fileUrl.startsWith('http') 
      ? doc.fileUrl 
      : `${window.location.origin}${doc.fileUrl}`;
    link.download = doc.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && categories.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', margin: 0, padding: 0, position: 'relative', width: '100%' }}>
      <BackgroundAnimation containerSelector=".documents-content-section" />
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

        .documents-content-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 48px;
        }

        .category-card {
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

        .category-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          z-index: 1;
        }

        .category-card[data-color-index="0"]::before {
          background: linear-gradient(180deg, rgba(102, 7, 8, 0.6) 0%, rgba(102, 7, 8, 0.3) 100%);
        }

        .category-card[data-color-index="1"]::before {
          background: linear-gradient(180deg, rgba(164, 22, 26, 0.6) 0%, rgba(164, 22, 26, 0.3) 100%);
        }

        .category-card[data-color-index="2"]::before {
          background: linear-gradient(180deg, rgba(186, 24, 27, 0.6) 0%, rgba(186, 24, 27, 0.3) 100%);
        }

        .category-card[data-color-index="3"]::before {
          background: linear-gradient(180deg, rgba(229, 56, 59, 0.6) 0%, rgba(229, 56, 59, 0.3) 100%);
        }

        .category-card[data-color-index="4"]::before {
          background: linear-gradient(180deg, rgba(11, 9, 10, 0.6) 0%, rgba(11, 9, 10, 0.3) 100%);
        }

        .category-card:hover {
          transform: translateY(-8px);
        }

        .category-card[data-color-index="0"]:hover {
          box-shadow: 0 16px 48px rgba(102, 7, 8, 0.15);
          border-color: rgba(102, 7, 8, 0.2);
        }

        .category-card[data-color-index="1"]:hover {
          box-shadow: 0 16px 48px rgba(164, 22, 26, 0.15);
          border-color: rgba(164, 22, 26, 0.2);
        }

        .category-card[data-color-index="2"]:hover {
          box-shadow: 0 16px 48px rgba(186, 24, 27, 0.15);
          border-color: rgba(186, 24, 27, 0.2);
        }

        .category-card[data-color-index="3"]:hover {
          box-shadow: 0 16px 48px rgba(229, 56, 59, 0.15);
          border-color: rgba(229, 56, 59, 0.2);
        }

        .category-card[data-color-index="4"]:hover {
          box-shadow: 0 16px 48px rgba(11, 9, 10, 0.15);
          border-color: rgba(11, 9, 10, 0.2);
        }

        .category-card[data-color-index="0"]:hover::before {
          background: linear-gradient(180deg, rgba(102, 7, 8, 0.8) 0%, rgba(102, 7, 8, 0.5) 100%);
        }

        .category-card[data-color-index="1"]:hover::before {
          background: linear-gradient(180deg, rgba(164, 22, 26, 0.8) 0%, rgba(164, 22, 26, 0.5) 100%);
        }

        .category-card[data-color-index="2"]:hover::before {
          background: linear-gradient(180deg, rgba(186, 24, 27, 0.8) 0%, rgba(186, 24, 27, 0.5) 100%);
        }

        .category-card[data-color-index="3"]:hover::before {
          background: linear-gradient(180deg, rgba(229, 56, 59, 0.8) 0%, rgba(229, 56, 59, 0.5) 100%);
        }

        .category-card[data-color-index="4"]:hover::before {
          background: linear-gradient(180deg, rgba(11, 9, 10, 0.8) 0%, rgba(11, 9, 10, 0.5) 100%);
        }

        .category-body {
          padding: 48px;
        }

        .category-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 24px;
          gap: 16px;
        }

        .category-title {
          font-size: clamp(24px, 3vw, 32px);
          font-weight: 700;
          color: #1a1a1a;
          line-height: 1.3;
          letter-spacing: -0.5px;
          margin: 0;
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .category-description {
          color: #4a4a4a;
          line-height: 1.9;
          font-size: clamp(15px, 1.8vw, 17px);
          margin: 0 0 32px 0;
        }

        .category-count-tag {
          font-weight: 500;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 13px;
        }

        .category-card[data-color-index="0"] .category-count-tag {
          background: rgba(102, 7, 8, 0.12);
          border-color: rgba(102, 7, 8, 0.3);
          color: rgba(102, 7, 8, 0.95);
        }

        .category-card[data-color-index="1"] .category-count-tag {
          background: rgba(164, 22, 26, 0.12);
          border-color: rgba(164, 22, 26, 0.3);
          color: rgba(164, 22, 26, 0.95);
        }

        .category-card[data-color-index="2"] .category-count-tag {
          background: rgba(186, 24, 27, 0.12);
          border-color: rgba(186, 24, 27, 0.3);
          color: rgba(186, 24, 27, 0.95);
        }

        .category-card[data-color-index="3"] .category-count-tag {
          background: rgba(229, 56, 59, 0.12);
          border-color: rgba(229, 56, 59, 0.3);
          color: rgba(229, 56, 59, 0.95);
        }

        .category-card[data-color-index="4"] .category-count-tag {
          background: rgba(11, 9, 10, 0.12);
          border-color: rgba(11, 9, 10, 0.3);
          color: rgba(11, 9, 10, 0.95);
        }

        .documents-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .document-item {
          display: flex;
          align-items: center;
          padding: 20px 24px;
          background: transparent;
        }

        .document-icon {
          margin-right: 16px;
          flex-shrink: 0;
        }

        .document-content {
          flex: 1;
          min-width: 0;
        }

        .document-title {
          font-size: 16px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .document-description {
          font-size: 14px;
          color: rgba(26, 26, 26, 0.6);
          line-height: 1.6;
          margin-bottom: 8px;
        }

        .document-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .document-size-tag {
          background: rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.08);
          color: rgba(26, 26, 26, 0.7);
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .document-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .download-button {
          border-radius: 8px;
          font-weight: 500;
          height: 40px;
          padding: 0 20px;
          background: linear-gradient(135deg, rgba(102, 7, 8, 0.95) 0%, rgba(164, 22, 26, 0.95) 100%);
          border-color: transparent;
        }

        .download-button:hover {
          background: linear-gradient(135deg, rgba(102, 7, 8, 1) 0%, rgba(164, 22, 26, 1) 100%);
          border-color: transparent;
          box-shadow: 0 4px 12px rgba(102, 7, 8, 0.3);
        }

        @media (max-width: 768px) {
          .documents-content-section {
            padding: 0 24px;
          }

          .category-card {
            border-radius: 20px;
            margin-bottom: 32px;
          }

          .category-body {
            padding: 32px 24px;
          }

          .category-header {
            flex-direction: column;
            gap: 12px;
          }

          .document-item {
            flex-direction: column;
            align-items: flex-start;
            padding: 16px;
          }

          .document-actions {
            width: 100%;
            margin-top: 12px;
          }

          .download-button {
            width: 100%;
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
      <div className="documents-content-section">
        {categories.length === 0 && !loading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            padding: '80px 24px',
          }}>
            <FilePdfOutlined style={{ fontSize: 64, color: 'rgba(26, 26, 26, 0.2)', marginBottom: 24 }} />
            <Title level={3} style={{ color: 'rgba(26, 26, 26, 0.5)', marginBottom: 8 }}>
              Документы пока не добавлены
            </Title>
            <Paragraph style={{ color: 'rgba(26, 26, 26, 0.4)', textAlign: 'center', maxWidth: 400 }}>
              Здесь будут отображаться все доступные документы, регламенты и материалы
            </Paragraph>
          </div>
        ) : (
          <>
            {categories.map((category, index) => (
              <div
                key={category.id}
                className="category-card"
                data-color-index={index % 5}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="category-body">
                  <div className="category-header">
                    <Title level={2} className="category-title">
                      <FolderOutlined style={{ color: 'rgba(139, 92, 246, 0.9)' }} />
                      {category.name}
                    </Title>
                    <Tag className="category-count-tag">
                      {category.documents.length} {category.documents.length === 1 ? 'документ' : 'документов'}
                    </Tag>
                  </div>

                  {category.description && (
                    <Paragraph className="category-description">
                      {category.description}
                    </Paragraph>
                  )}

                  <div className="documents-list">
                    {category.documents.map((document) => (
                      <div key={document.id} className="document-item">
                        <div className="document-icon">
                          {getFileIcon(document.mimeType)}
                        </div>
                        <div className="document-content">
                          <div className="document-title">
                            {document.title}
                          </div>
                          {document.description && (
                            <div className="document-description">
                              {document.description}
                            </div>
                          )}
                          <div className="document-meta">
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {document.fileName}
                            </Text>
                            <Tag className="document-size-tag">
                              {formatFileSize(document.fileSize)}
                            </Tag>
                          </div>
                        </div>
                        <div className="document-actions">
                          <Button
                            type="primary"
                            icon={<DownloadOutlined />}
                            onClick={() => handleDownload(document)}
                            className="download-button"
                          >
                            Скачать
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
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
