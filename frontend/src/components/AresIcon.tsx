/**
 * Компонент иконки приложения "АРЕС"
 * 
 * Функциональность:
 * - SVG иконка с щитом, мечом и греческой буквой Alpha
 * - Настраиваемый размер и цвет
 * - Градиентная заливка
 * 
 * Используется в:
 * - AresTitle компоненте
 * - Логотипе приложения
 */

import React from 'react';

interface AresIconProps {
  size?: number;
  color?: string;
  className?: string;
}

export const AresIcon: React.FC<AresIconProps> = ({ 
  size = 32, 
  color = '#1a1a1a',
  className 
}) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 100" 
      width={size} 
      height={size}
      className={className}
    >
      <defs>
        <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{stopColor: color, stopOpacity: 1}} />
          <stop offset="100%" style={{stopColor: color, stopOpacity: 0.7}} />
        </linearGradient>
        <linearGradient id="swordGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor: color, stopOpacity: 0.8}} />
          <stop offset="100%" style={{stopColor: color, stopOpacity: 1}} />
        </linearGradient>
      </defs>
      
      {/* Щит */}
      <path 
        d="M 50 10 L 25 20 L 25 50 Q 25 70 50 85 Q 75 70 75 50 L 75 20 Z" 
        fill="url(#shieldGradient)" 
        stroke={color} 
        strokeWidth="2"
      />
      
      {/* Меч */}
      <line 
        x1="50" y1="25" x2="50" y2="70" 
        stroke="url(#swordGradient)" 
        strokeWidth="3" 
        strokeLinecap="round"
      />
      <line 
        x1="50" y1="25" x2="45" y2="30" 
        stroke="url(#swordGradient)" 
        strokeWidth="2" 
        strokeLinecap="round"
      />
      <line 
        x1="50" y1="25" x2="55" y2="30" 
        stroke="url(#swordGradient)" 
        strokeWidth="2" 
        strokeLinecap="round"
      />
      <polygon 
        points="50,70 45,75 55,75" 
        fill="url(#swordGradient)"
      />
      
      {/* Греческая буква Alpha */}
      <text 
        x="50" 
        y="60" 
        fontFamily="Arial, sans-serif" 
        fontSize="24" 
        fontWeight="bold" 
        fill={color === '#ffffff' || color === '#fff' ? '#1a1a1a' : (color === '#1a1a1a' ? '#ffffff' : color)}
        textAnchor="middle" 
        opacity="0.9"
      >
        Α
      </text>
    </svg>
  );
};

