/**
 * Компонент заголовка приложения "АРЕС"
 * 
 * Функциональность:
 * - Отображение логотипа и названия приложения
 * - Автоматическая загрузка названия организации из API
 * - Поддержка горизонтального и вертикального расположения
 * - Адаптация для свернутого сайдбара
 * - Настройка цветов для светлого/темного фона
 * 
 * Используется в:
 * - Сайдбаре навигации
 * - Заголовках страниц
 * - Страницах входа/регистрации
 */

import { useState, useEffect } from 'react';
import { AresIcon } from './AresIcon';
import apiClient from '../services/api-client';

interface AresTitleProps {
  size?: number; // Размер иконки
  iconColor?: string; // Цвет иконки
  showIcon?: boolean; // Показывать ли иконку
  collapsed?: boolean; // Свернутое состояние (для сайдбара)
  style?: React.CSSProperties;
  className?: string;
  light?: boolean; // Для светлого фона
  vertical?: boolean; // Вертикальное расположение (название организации снизу)
  hideOrganizationName?: boolean; // Скрыть название организации
  organizationNameFontSize?: number; // Кастомный размер шрифта для названия организации
}

export const AresTitle: React.FC<AresTitleProps> = ({ 
  size = 28, 
  iconColor = '#ffffff',
  showIcon = true,
  collapsed = false,
  style,
  className,
  light = false,
  vertical = false, // По умолчанию горизонтальное расположение
  hideOrganizationName = false, // По умолчанию показываем название организации
  organizationNameFontSize, // Кастомный размер шрифта
}) => {
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrganizationName();
  }, []);

  const loadOrganizationName = async () => {
    try {
      const response = await apiClient.get('/organization');
      const name = response.data.data?.name;
      if (name && name !== 'ARES Platform') {
        setOrganizationName(name);
      }
    } catch (error) {
      // Игнорируем ошибки, используем дефолтное значение
    } finally {
      setLoading(false);
    }
  };

  const textColor = light ? '#1a1a1a' : '#ffffff';
  const orgNameColor = light ? '#666666' : 'rgba(255, 255, 255, 0.85)';

  // Вычисляем размеры относительно базового размера
  let baseFontSize = collapsed ? 14 : 18;
  if (style?.fontSize) {
    if (typeof style.fontSize === 'number') {
      baseFontSize = style.fontSize;
    } else {
      const fontSizeStr = String(style.fontSize);
      const parsed = parseInt(fontSizeStr.replace('px', ''));
      if (!isNaN(parsed)) {
        baseFontSize = parsed;
      }
    }
  }
  
  const aresFontSize = baseFontSize;
  // Используем кастомный размер, если передан, иначе вычисляем автоматически
  const orgFontSize = organizationNameFontSize !== undefined 
    ? organizationNameFontSize 
    : Math.max(baseFontSize * 0.85, 13); // 85% от основного размера

  // Вертикальное расположение (для страниц входа/регистрации)
  if (vertical) {
    return (
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          ...style 
        }}
        className={className}
      >
        {/* Блок с иконкой и "АРЕС" */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}>
          {showIcon && <AresIcon size={size} color={iconColor} />}
          <span style={{ 
            fontSize: `${aresFontSize}px`,
            fontWeight: 700,
            color: textColor,
            letterSpacing: '-0.1px',
            whiteSpace: 'nowrap',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            lineHeight: '1',
          }}>
            АРЕС
          </span>
        </div>
        
        {/* Название организации снизу */}
        {!loading && organizationName && !hideOrganizationName && (
          <span style={{
            fontSize: `${orgFontSize}px`,
            fontWeight: 500,
            color: orgNameColor,
            letterSpacing: '-0.05px',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            lineHeight: '1.2',
            whiteSpace: 'nowrap',
          }}>
            {organizationName}
          </span>
        )}
      </div>
    );
  }

  // Горизонтальное расположение (по умолчанию)
  return (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: style?.justifyContent || 'flex-start', // Поддерживаем justifyContent из style
        gap: collapsed ? '6px' : '10px',
        flexWrap: 'nowrap', // Не переносим на новую строку
        minWidth: 0, // Позволяет сжиматься
        width: '100%',
        ...style 
      }}
      className={className}
    >
      {/* Блок с иконкой и "АРЕС" */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        flexShrink: 0, // Не сжимается
      }}>
        {showIcon && <AresIcon size={size} color={iconColor} />}
        <span style={{ 
          fontSize: `${aresFontSize}px`,
          fontWeight: 700,
          color: textColor,
          letterSpacing: '-0.1px',
          whiteSpace: 'nowrap',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          lineHeight: '1',
        }}>
          АРЕС
        </span>
      </div>
      
      {/* Название организации справа */}
      {!collapsed && !loading && organizationName && !hideOrganizationName && (
        <span style={{
          fontSize: `${orgFontSize}px`,
          fontWeight: 500,
          color: orgNameColor,
          letterSpacing: '-0.05px',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          lineHeight: '1.2',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: '1 1 auto', // Занимает оставшееся пространство, но может сжиматься
          minWidth: 0, // Позволяет сжиматься
          maxWidth: '100%',
        }}>
          {organizationName}
        </span>
      )}
    </div>
  );
};

