/**
 * Компонент отображения названия организации
 * 
 * Функциональность:
 * - Автоматическая загрузка названия организации из API
 * - Отображение только если название отличается от дефолтного
 * - Настройка цветов для светлого/темного фона
 * 
 * Используется для:
 * - Отображения кастомного названия организации
 * - Персонализации интерфейса
 */

import { useState, useEffect } from 'react';
import { Typography } from 'antd';
import apiClient from '../services/api-client';

const { Text } = Typography;

interface OrganizationNameProps {
  style?: React.CSSProperties;
  className?: string;
  light?: boolean; // Для светлого фона
}

export const OrganizationName: React.FC<OrganizationNameProps> = ({ style, className, light = false }) => {
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

  if (loading || !organizationName) {
    return null;
  }

  const defaultColor = light ? '#8c8c8c' : 'rgba(255, 255, 255, 0.7)';

  return (
    <Text
      style={{
        fontSize: '12px',
        color: defaultColor,
        fontWeight: 'normal',
        display: 'block',
        marginTop: '4px',
        ...style,
      }}
      className={className}
    >
      {organizationName}
    </Text>
  );
};

