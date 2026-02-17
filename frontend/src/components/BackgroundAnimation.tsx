/**
 * Компонент фоновой анимации
 * 
 * Функциональность:
 * - Canvas-based анимация точек и линий
 * - Интерактивность при наведении мыши
 * - Плавное движение точек
 * - Адаптация к размеру окна
 * 
 * Используется для:
 * - Декоративного фона на страницах входа/регистрации
 * - Создания динамичного визуального эффекта
 */

import { useEffect, useRef } from 'react';

interface BackgroundAnimationProps {
  containerSelector?: string;
}

export const BackgroundAnimation = ({ containerSelector }: BackgroundAnimationProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn('BackgroundAnimation: Canvas ref is null');
      return;
    }

    let width = window.innerWidth;
    let height = window.innerHeight;
    let points: any[] = [];
    let target = { x: width / 2, y: height / 2 };
    let hoverTarget: { x: number; y: number } | null = null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Утилита для вычисления расстояния
    const getDistance = (p1: any, p2: any) => {
      return Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
    };

    // Инициализация canvas
    const initCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      target = { x: width / 2, y: height / 2 };

      // Устанавливаем размеры canvas
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';

      // Создание точек - покрываем всю высоту документа, а не только viewport
      points = [];
      const docHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        height,
        window.innerHeight * 3 // Минимум 3 экрана для длинных страниц
      );
      const pointSpacingX = width / 20;
      const pointSpacingY = Math.max(docHeight / 20, height / 20);
      
      for (let x = 0; x < width; x += pointSpacingX) {
        for (let y = 0; y < docHeight; y += pointSpacingY) {
          const px = x + Math.random() * pointSpacingX;
          const py = y + Math.random() * pointSpacingY;
          const p = {
            x: px,
            originX: px,
            y: py,
            originY: py,
            active: 0,
            circle: null as any,
            closest: [] as any[],
          };
          points.push(p);
        }
      }

      // Находим 5 ближайших точек для каждой
      for (let i = 0; i < points.length; i++) {
        const closest: any[] = [];
        const p1 = points[i];
        for (let j = 0; j < points.length; j++) {
          const p2 = points[j];
          if (p1 !== p2) {
            if (closest.length < 5) {
              closest.push(p2);
            } else {
              // Находим самую дальнюю точку в closest
              let maxDist = 0;
              let maxIndex = 0;
              for (let k = 0; k < closest.length; k++) {
                const dist = getDistance(p1, closest[k]);
                if (dist > maxDist) {
                  maxDist = dist;
                  maxIndex = k;
                }
              }
              // Если p2 ближе, заменяем
              if (getDistance(p1, p2) < maxDist) {
                closest[maxIndex] = p2;
              }
            }
          }
        }
        p1.closest = closest;
      }

      // Создаем круги для точек
      for (let i = 0; i < points.length; i++) {
        const c = {
          pos: points[i],
          radius: 3.5 + Math.random() * 2.5, // Увеличили размер точек (было 2-4, стало 3.5-6)
          active: 0,
        };
        points[i].circle = c;
      }
    };

    const drawLines = (p: any) => {
      if (!p.active || p.active < 0.01) return;
      for (let i = 0; i < p.closest.length; i++) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.closest[i].x, p.closest[i].y);
        // Используем цвета из палитры - увеличиваем яркость линий
        const alpha = Math.max(p.active * 1.0, 0.01);
        ctx.strokeStyle = `rgba(102, 7, 8, ${alpha})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    };

    const drawCircle = (circle: any) => {
      if (!circle.active || circle.active < 0.01) return;
      ctx.beginPath();
      ctx.arc(circle.pos.x, circle.pos.y, circle.radius, 0, 2 * Math.PI, false);
      // Увеличиваем яркость точек
      const alpha = Math.max(circle.active * 0.8, 0.05);
      ctx.fillStyle = `rgba(164, 22, 26, ${alpha})`;
      ctx.fill();
    };

    const shiftPoint = (p: any) => {
      const duration = 1 + Math.random();
      const startX = p.x;
      const startY = p.y;
      const targetX = p.originX - 50 + Math.random() * 100;
      const targetY = p.originY - 50 + Math.random() * 100;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing функция (Circ.easeInOut)
        const ease = progress < 0.5
          ? 0.5 * (1 - Math.sqrt(1 - 4 * progress * progress))
          : 0.5 * (Math.sqrt(1 - 4 * (1 - progress) * (1 - progress)) + 1);

        p.x = startX + (targetX - startX) * ease;
        p.y = startY + (targetY - startY) * ease;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          shiftPoint(p);
        }
      };
      animate();
    };

    const animate = () => {
      // Анимация всегда активна на всей странице
      ctx.clearRect(0, 0, width, height);
      
      // Получаем текущую позицию скролла
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft || 0;
      
      // Используем hoverTarget если есть, иначе обычный target
      const currentTarget = hoverTarget || target;
      
      for (let i = 0; i < points.length; i++) {
        // Преобразуем координаты точки в координаты viewport
        const viewX = points[i].x - scrollLeft;
        const viewY = points[i].y - scrollTop;
        
        // Пропускаем точки, которые далеко за пределами видимой области
        if (viewX < -200 || viewX > width + 200 || viewY < -200 || viewY > height + 200) {
          continue;
        }
        
        const distance = getDistance(currentTarget, points[i]);
        if (distance < 4000) {
          // Близко к курсору - яркая подсветка
          points[i].active = 0.5;
          points[i].circle.active = 0.85;
        } else if (distance < 20000) {
          // Средняя дистанция - умеренная подсветка
          points[i].active = 0.2;
          points[i].circle.active = 0.5;
        } else if (distance < 40000) {
          // Дальняя дистанция - слабая подсветка
          points[i].active = 0.04;
          points[i].circle.active = 0.15;
        } else {
          // Минимальная активность для видимости - всегда показываем что-то
          points[i].active = 0.02;
          points[i].circle.active = 0.1;
        }

        // Временно используем viewport координаты для отрисовки
        const origX = points[i].x;
        const origY = points[i].y;
        points[i].x = viewX;
        points[i].y = viewY;
        
        // Обновляем координаты ближайших точек для линий
        const visibleClosest = points[i].closest
          .map((closestPoint: any) => ({
            ...closestPoint,
            viewX: closestPoint.x - scrollLeft,
            viewY: closestPoint.y - scrollTop,
          }))
          .filter((cp: any) => 
            cp.viewX >= -200 && cp.viewX <= width + 200 && 
            cp.viewY >= -200 && cp.viewY <= height + 200
          );
        
        const origClosest = points[i].closest;
        points[i].closest = visibleClosest.map((cp: any) => ({
          ...cp,
          x: cp.viewX,
          y: cp.viewY,
        }));

        drawLines(points[i]);
        drawCircle(points[i].circle);
        
        // Восстанавливаем оригинальные координаты
        points[i].x = origX;
        points[i].y = origY;
        points[i].closest = origClosest;
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    const mouseMove = (e: MouseEvent) => {
      // Используем pageX/pageY для учета скролла
      let posx = e.pageX || (e.clientX + (window.scrollX || window.pageXOffset || document.documentElement.scrollLeft));
      let posy = e.pageY || (e.clientY + (window.scrollY || window.pageYOffset || document.documentElement.scrollTop));
      target.x = posx;
      target.y = posy;
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      initCanvas();
    };

    // Функция для обработки hover на контейнерах
    const handleContainerHover = (e: MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft || 0;
      
      // Центр элемента
      hoverTarget = {
        x: rect.left + rect.width / 2 + scrollLeft,
        y: rect.top + rect.height / 2 + scrollTop,
      };
    };

    const handleContainerMove = (e: MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft || 0;
      
      // Позиция мыши относительно элемента
      hoverTarget = {
        x: rect.left + (e.clientX - rect.left) + scrollLeft,
        y: rect.top + (e.clientY - rect.top) + scrollTop,
      };
    };

    const handleContainerLeave = () => {
      hoverTarget = null;
    };

    // Инициализация
    initCanvas();
    animate();
    for (let i = 0; i < points.length; i++) {
      shiftPoint(points[i]);
    }

    // Слушатели событий
    if (!('ontouchstart' in window)) {
      window.addEventListener('mousemove', mouseMove);
    }
    window.addEventListener('resize', resize);

    // Добавляем обработчики на все интерактивные контейнеры
    const addHoverListeners = () => {
      let containers: Element[] = [];
      
      if (containerSelector) {
        // Если передан селектор контейнера, ищем все дочерние элементы внутри него
        const container = document.querySelector(containerSelector);
        if (container) {
          // Добавляем сам контейнер
          containers.push(container);
          
          // Добавляем все дочерние элементы, включая более специфичные селекторы для auth страниц
          const children = container.querySelectorAll(`
            [class*="card"],
            [class*="section"],
            [class*="slider"],
            [class*="description"],
            [class*="wrapper"],
            [class*="form"],
            [class*="content"],
            [class*="layout"],
            [class*="header"],
            [class*="auth"],
            .ant-card,
            .ant-form,
            div[class],
            section,
            article,
            main
          `);
          containers.push(...Array.from(children));
          
          // Для auth страниц также добавляем более специфичные элементы
          if (containerSelector.includes('auth')) {
            const authElements = container.querySelectorAll('.auth-card, .auth-layout, .auth-content, .auth-header, .auth-form');
            containers.push(...Array.from(authElements));
          }
        } else {
          const found = document.querySelectorAll(containerSelector);
          containers = Array.from(found);
        }
      } else {
        // Используем общий селектор по умолчанию
        const found = document.querySelectorAll(`
          [class*="card"],
          [class*="section"],
          [class*="slider"],
          [class*="description"],
          [class*="wrapper"],
          [class*="form"],
          .ant-card,
          .ant-form
        `);
        containers = Array.from(found);
      }
      
      // Удаляем дубликаты
      const uniqueContainers = Array.from(new Set(containers));
      
      uniqueContainers.forEach((container) => {
        container.addEventListener('mouseenter', handleContainerHover as EventListener);
        container.addEventListener('mousemove', handleContainerMove as EventListener);
        container.addEventListener('mouseleave', handleContainerLeave);
      });
    };

    // Добавляем обработчики после инициализации и при изменении DOM
    let observer: MutationObserver | null = null;
    const initHoverListeners = () => {
      addHoverListeners();
      // Используем MutationObserver для отслеживания изменений DOM
      observer = new MutationObserver(() => {
        addHoverListeners();
      });
      // Если передан containerSelector, используем его для observer, иначе используем body
      const wrapper = containerSelector 
        ? document.querySelector(containerSelector) || document.body
        : document.body;
      if (wrapper) {
        observer.observe(wrapper, { childList: true, subtree: true });
      }
      return observer;
    };

    // Небольшая задержка для инициализации DOM
    // Увеличиваем задержку для страниц входа/регистрации, так как они могут загружаться дольше
    const initDelay = containerSelector?.includes('auth') ? 500 : 300;
    setTimeout(() => {
      initHoverListeners();
      // Повторная инициализация через дополнительную задержку для auth страниц
      if (containerSelector?.includes('auth')) {
        setTimeout(() => {
          initHoverListeners();
        }, 500);
      }
    }, initDelay);

    // Очистка
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('mousemove', mouseMove);
      window.removeEventListener('resize', resize);
      
      // Удаляем обработчики с контейнеров
      let containers: Element[] = [];
      
      if (containerSelector) {
        const container = document.querySelector(containerSelector);
        if (container) {
          // Добавляем сам контейнер
          containers.push(container);
          
          // Добавляем все дочерние элементы, включая более специфичные селекторы для auth страниц
          const children = container.querySelectorAll(`
            [class*="card"],
            [class*="section"],
            [class*="slider"],
            [class*="description"],
            [class*="wrapper"],
            [class*="form"],
            [class*="content"],
            [class*="layout"],
            [class*="header"],
            [class*="auth"],
            .ant-card,
            .ant-form,
            div[class],
            section,
            article,
            main
          `);
          containers.push(...Array.from(children));
          
          // Для auth страниц также добавляем более специфичные элементы
          if (containerSelector.includes('auth')) {
            const authElements = container.querySelectorAll('.auth-card, .auth-layout, .auth-content, .auth-header, .auth-form');
            containers.push(...Array.from(authElements));
          }
        } else {
          const found = document.querySelectorAll(containerSelector);
          containers = Array.from(found);
        }
      } else {
        const found = document.querySelectorAll(`
          [class*="card"],
          [class*="section"],
          [class*="slider"],
          [class*="description"],
          [class*="wrapper"],
          [class*="form"],
          .ant-card,
          .ant-form
        `);
        containers = Array.from(found);
      }
      
      // Удаляем дубликаты
      const uniqueContainers = Array.from(new Set(containers));
      
      uniqueContainers.forEach((container) => {
        container.removeEventListener('mouseenter', handleContainerHover as EventListener);
        container.removeEventListener('mousemove', handleContainerMove as EventListener);
        container.removeEventListener('mouseleave', handleContainerLeave);
      });
      
      // Отключаем observer
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none',
        backgroundColor: 'transparent',
        display: 'block',
      }}
    />
  );
};

