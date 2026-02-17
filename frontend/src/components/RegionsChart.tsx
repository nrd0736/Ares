/**
 * Компонент графика статистики по регионам
 * 
 * Функциональность:
 * - Отображение статистики по регионам в виде столбчатой диаграммы
 * - Данные: количество спортсменов, команд, соревнований
 * - Интерактивность: подсветка при наведении
 * - Синхронизация выделения с блоком регионов на странице
 * 
 * Использует:
 * - Chart.js для построения графиков
 * - React Chart.js 2 для React интеграции
 */

import React, { useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface RegionData {
  name: string;
  athletes: number;
  teams: number;
  competitions: number;
}

interface RegionsChartProps {
  regions: RegionData[];
  hoveredRegion: string | null;
  onRegionHover: (regionId: string | null) => void;
}

// Темная приглушенная цветовая палитра для графика
const getColors = (index: number, isHovered: boolean) => {
  const colors = [
    { bg: 'rgba(70, 130, 180, 0.7)', border: 'rgba(70, 130, 180, 0.9)', hover: 'rgba(70, 130, 180, 0.85)' }, // Темный голубой
    { bg: 'rgba(160, 82, 45, 0.7)', border: 'rgba(160, 82, 45, 0.9)', hover: 'rgba(160, 82, 45, 0.85)' }, // Темный коричневый
    { bg: 'rgba(138, 43, 226, 0.7)', border: 'rgba(138, 43, 226, 0.9)', hover: 'rgba(138, 43, 226, 0.85)' }, // Темный фиолетовый
    { bg: 'rgba(85, 107, 47, 0.7)', border: 'rgba(85, 107, 47, 0.9)', hover: 'rgba(85, 107, 47, 0.85)' }, // Темный зеленый
    { bg: 'rgba(139, 69, 19, 0.7)', border: 'rgba(139, 69, 19, 0.9)', hover: 'rgba(139, 69, 19, 0.85)' }, // Темный коричневый 2
    { bg: 'rgba(47, 79, 79, 0.7)', border: 'rgba(47, 79, 79, 0.9)', hover: 'rgba(47, 79, 79, 0.85)' }, // Темный бирюзовый
    { bg: 'rgba(128, 128, 128, 0.7)', border: 'rgba(128, 128, 128, 0.9)', hover: 'rgba(128, 128, 128, 0.85)' }, // Темно-серый
    { bg: 'rgba(75, 0, 130, 0.7)', border: 'rgba(75, 0, 130, 0.9)', hover: 'rgba(75, 0, 130, 0.85)' }, // Темный индиго
    { bg: 'rgba(153, 50, 204, 0.7)', border: 'rgba(153, 50, 204, 0.9)', hover: 'rgba(153, 50, 204, 0.85)' }, // Темный фиолетовый 2
    { bg: 'rgba(34, 139, 34, 0.7)', border: 'rgba(34, 139, 34, 0.9)', hover: 'rgba(34, 139, 34, 0.85)' }, // Темный зеленый 2
    { bg: 'rgba(184, 134, 11, 0.7)', border: 'rgba(184, 134, 11, 0.9)', hover: 'rgba(184, 134, 11, 0.85)' }, // Темный золотой
    { bg: 'rgba(72, 61, 139, 0.7)', border: 'rgba(72, 61, 139, 0.9)', hover: 'rgba(72, 61, 139, 0.85)' }, // Темный сине-фиолетовый
  ];

  const color = colors[index % colors.length];
  return {
    bg: isHovered ? color.hover : color.bg,
    border: color.border,
  };
};

export const RegionsChart: React.FC<RegionsChartProps> = ({
  regions,
  hoveredRegion,
  onRegionHover,
}) => {
  const chartRef = useRef<any>(null);

  // Показываем топ-15 регионов по количеству спортсменов
  const displayRegions = [...regions]
    .filter(r => r.teams > 0 || r.athletes > 0)
    .sort((a, b) => b.athletes - a.athletes)
    .slice(0, 15);

  // Если нет данных
  if (displayRegions.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'rgba(26, 26, 26, 0.5)',
        fontSize: '16px',
      }}>
        Нет данных для отображения
      </div>
    );
  }


  // Данные для графика
  const chartData = {
    labels: displayRegions.map((r) => {
      // Сокращаем длинные названия для лучшего отображения
      const maxLength = displayRegions.length > 10 ? 12 : 18;
      if (r.name.length > maxLength) {
        return r.name.substring(0, maxLength) + '...';
      }
      return r.name;
    }),
    datasets: [
      {
        label: 'Спортсмены',
        data: displayRegions.map((r) => r.athletes),
        backgroundColor: displayRegions.map((_, index) => {
          const isHovered = hoveredRegion === displayRegions[index].name;
          return getColors(index, isHovered).bg;
        }),
        borderColor: displayRegions.map((_, index) => {
          return getColors(index, false).border;
        }),
        borderWidth: 2,
        borderRadius: {
          topLeft: 8,
          topRight: 8,
          bottomLeft: 8,
          bottomRight: 8,
        },
        borderSkipped: false,
        maxBarThickness: displayRegions.length > 10 ? 40 : 50,
      },
    ],
  };

  const chartOptions = {
    indexAxis: 'y' as const, // Горизонтальный график
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        left: 10,
        right: 20,
        top: 10,
        bottom: 10,
      },
    },
    animation: {
      duration: 1200,
      easing: 'easeInOutCubic' as const,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(26, 26, 26, 0.95)',
        titleColor: 'rgba(255, 255, 255, 0.95)',
        bodyColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        padding: 16,
        cornerRadius: 12,
        displayColors: true,
        titleFont: {
          size: 14,
          weight: '600' as const,
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          title: (context: any) => {
            const index = context[0].dataIndex;
            return displayRegions[index].name;
          },
          label: (context: any) => {
            const index = context.dataIndex;
            const region = displayRegions[index];
            return [
              `Спортсменов: ${region.athletes.toLocaleString()}`,
              `Команд: ${region.teams.toLocaleString()}`,
            ];
          },
          labelColor: (context: any) => {
            const index = context.dataIndex;
            const color = getColors(index, false).border;
            return {
              borderColor: color,
              backgroundColor: color,
            };
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.04)',
          drawBorder: false,
        },
        ticks: {
          color: 'rgba(26, 26, 26, 0.6)',
          font: {
            size: 12,
            weight: '500' as const,
          },
          callback: (value: any) => {
            if (value >= 1000) {
              return `${(value / 1000).toFixed(1)}k`;
            }
            return value;
          },
        },
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgba(26, 26, 26, 0.7)',
          font: {
            size: 13,
            weight: '500' as const,
          },
          padding: 8,
        },
      },
    },
    onHover: (event: any, activeElements: any[]) => {
      if (activeElements.length > 0) {
        const index = activeElements[0].index;
        onRegionHover(displayRegions[index].name);
      } else {
        onRegionHover(null);
      }
    },
  };

  // Динамически вычисляем высоту графика в зависимости от количества регионов
  const chartHeight = Math.max(400, displayRegions.length * 45);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: `${chartHeight}px`,
          minHeight: '400px',
        }}
      >
        <Bar 
          ref={chartRef} 
          data={chartData} 
          options={chartOptions}
        />
      </div>
    </div>
  );
};
