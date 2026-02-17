/**
 * Страница новостной ленты (спортсмен)
 * 
 * Функциональность:
 * - Просмотр новостей
 * - Пагинация
 * - Фильтрация по категориям
 */

import { useState, useEffect } from 'react';
import { Card, List, Tag, Pagination, Space } from 'antd';
import { FileTextOutlined, CalendarOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';

interface News {
  id: string;
  title: string;
  content: string;
  category?: string;
  createdAt: string;
  images?: string[];
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

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 600,
          margin: 0,
          color: '#262626'
        }}>
          Новостная лента
        </h1>
        <p style={{ color: '#6c757d', fontSize: '14px', fontWeight: 400 }}>
          Актуальные новости и события спортивного мира
        </p>
      </div>
      
      {news.length === 0 && !loading ? (
        <Card style={{ textAlign: 'center', padding: '48px' }}>
          <FileTextOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: 16 }} />
          <p style={{ color: '#8c8c8c', fontSize: '16px' }}>Новостей пока нет</p>
        </Card>
      ) : (
        <>
          <List
            loading={loading}
            dataSource={news}
            renderItem={(item) => {
              // Получаем первую фотографию или используем дефолтную
              // images может быть массивом строк, объектом или JSON строкой
              let imagesArray: string[] = [];
              if (item.images) {
                if (Array.isArray(item.images)) {
                  imagesArray = item.images.filter((img: any) => img && typeof img === 'string');
                } else if (typeof item.images === 'string') {
                  try {
                    const parsed = JSON.parse(item.images);
                    imagesArray = Array.isArray(parsed) ? parsed : [parsed];
                  } catch (e) {
                    // Если не JSON, возможно это одна строка
                    imagesArray = [item.images];
                  }
                } else if (typeof item.images === 'object') {
                  // Если это объект (Prisma может вернуть JSON как объект)
                  try {
                    const arr = Object.values(item.images);
                    imagesArray = arr.filter((img: any) => img && typeof img === 'string');
                  } catch (e) {
                    console.warn('Не удалось обработать images:', item.images);
                  }
                }
              }
              
              // Формируем правильный URL для изображения
              const getImageUrl = (url: string): string => {
                if (!url || typeof url !== 'string') return '';
                // Если это уже полный URL, возвращаем как есть
                if (url.startsWith('http://') || url.startsWith('https://')) {
                  return url;
                }
                // Если это путь от корня, используем его напрямую (Vite proxy обработает)
                if (url.startsWith('/')) {
                  return url;
                }
                // Иначе добавляем / в начало для относительных путей
                return `/${url}`;
              };
              
              const firstImage = imagesArray.length > 0 ? imagesArray[0] : null;
              const imageUrl = firstImage 
                ? getImageUrl(firstImage)
                : 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=400&fit=crop';
              
              return (
                <List.Item style={{ padding: '16px 0' }}>
                  <Card 
                    style={{ 
                      width: '100%',
                      border: '1px solid rgba(0,0,0,0.06)',
                      borderRadius: '16px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      transition: 'all 0.3s ease',
                    }}
                    hoverable
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                    }}
                  >
                    {/* Большая фотография */}
                    <div style={{ 
                      width: '100%', 
                      height: '400px', 
                      marginBottom: 16,
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: '#f0f0f0',
                    }}>
                      <img 
                        src={imageUrl} 
                        alt={item.title}
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover' 
                        }}
                        onError={(e) => {
                          // Если изображение не загрузилось, используем дефолтное
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=400&fit=crop';
                        }}
                      />
                    </div>
                    
                    <div style={{ marginBottom: 12 }}>
                      <Space style={{ marginBottom: 8 }}>
                        <span style={{ fontSize: '20px', fontWeight: 600 }}>{item.title}</span>
                        {item.category && (
                          <Tag 
                            color="purple"
                            style={{ borderRadius: '12px', padding: '2px 12px' }}
                          >
                            {item.category}
                          </Tag>
                        )}
                      </Space>
                      <div style={{ color: '#8c8c8c', fontSize: '14px' }}>
                        <Space>
                          <CalendarOutlined />
                          <span>{new Date(item.createdAt).toLocaleDateString('ru-RU', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}</span>
                          <span>•</span>
                          <span>
                            {item.author.profile.firstName} {item.author.profile.lastName}
                          </span>
                        </Space>
                      </div>
                    </div>
                    <div style={{ 
                      marginTop: 16, 
                      color: '#595959',
                      lineHeight: '1.6',
                      fontSize: '15px',
                    }}>
                      {item.content}
                    </div>
                  </Card>
                </List.Item>
              );
            }}
          />
          {pagination.total > 0 && (
            <Pagination
              current={pagination.current}
              pageSize={pagination.pageSize}
              total={pagination.total}
              onChange={(page) => setPagination({ ...pagination, current: page })}
              style={{ 
                marginTop: 32, 
                textAlign: 'center',
              }}
              showSizeChanger={false}
              showQuickJumper
            />
          )}
        </>
      )}
    </div>
  );
};
