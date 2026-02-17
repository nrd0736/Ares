/**
 * Общие стили для всех компонентов гостевых страниц
 * 
 * Функциональность:
 * - Определяет общие CSS стили и анимации для гостевых страниц
 * - Keyframe анимации: fadeInUp, slideIn, scaleIn
 * - Стили для карточек контента, заголовков, пустых состояний
 * - Hover эффекты и переходы
 * 
 * Используется:
 * - На всех гостевых страницах для единообразного дизайна
 * - Обеспечивает плавные анимации и современный UI
 */

export const commonStyles = `
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
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
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
  
  .guest-content-card {
    background: #ffffff;
    border-radius: 16px;
    border: 1px solid rgba(0, 0, 0, 0.06);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    animation: fadeInUp 0.5s ease-out;
  }
  
  .guest-content-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    border-color: rgba(0, 0, 0, 0.1);
  }
  
  .guest-section-title {
    font-size: 24px;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 8px;
    letter-spacing: -0.3px;
  }
  
  .guest-section-subtitle {
    font-size: 14px;
    color: #8c8c8c;
    margin-bottom: 24px;
  }
  
  .guest-empty-state {
    text-align: center;
    padding: 60px 24px;
    background: #ffffff;
    border-radius: 16px;
    border: 1px solid rgba(0, 0, 0, 0.06);
  }
  
  .guest-empty-icon {
    font-size: 64px;
    color: #d9d9d9;
    margin-bottom: 16px;
    display: block;
  }
  
  .guest-empty-text {
    color: #8c8c8c;
    font-size: 16px;
  }
  
  .guest-image-container {
    width: 100%;
    border-radius: 12px;
    overflow: hidden;
    background: #f0f0f0;
    transition: transform 0.3s ease;
  }
  
  .guest-image-container:hover {
    transform: scale(1.02);
  }
  
  .guest-tag {
    border-radius: 12px;
    padding: 2px 12px;
    font-size: 12px;
  }
  
  .guest-loading {
    text-align: center;
    padding: 60px 24px;
  }
`;

