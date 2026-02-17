/**
 * Модуль санитизации HTML контента
 * 
 * Функциональность:
 * - sanitizeHTML() - очистка HTML от потенциально опасных элементов
 * - sanitizeText() - экранирование текста для безопасного вывода
 * 
 * Безопасность:
 * - Удаление script, iframe, object, embed тегов
 * - Удаление опасных атрибутов (onclick, onerror и т.д.)
 * - Разрешение только безопасных тегов и атрибутов
 * - Использует DOMPurify для очистки
 * 
 * Используется для:
 * - Отображения пользовательского контента (новости, описания)
 * - Защиты от XSS атак
 */

import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre', 'span',
  'div', 'table', 'thead', 'tbody', 'tr', 'td', 'th'
];

const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel'
];

export function sanitizeHTML(html: string): string {
  if (!html) return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    ADD_ATTR: ['target', 'rel'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  });
}

export function sanitizeText(text: string): string {
  if (!text) return '';
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

