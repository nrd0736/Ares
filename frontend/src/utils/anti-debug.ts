/**
 * Anti-Debug Protection for Frontend
 * Защита от отладки и модификации кода в браузере
 * 
 * ВНИМАНИЕ: Эти функции включаются ТОЛЬКО в production сборке
 */

class AntiDebug {
  private static instance: AntiDebug;
  private debugDetected = false;
  private checkInterval: number = 1000;
  private intervalId: NodeJS.Timeout | null = null;

  private constructor() {
    // Включаем защиту только в production (значение задаётся в коде, не через env)
    if (import.meta.env.PROD) {
      this.initialize();
    }
  }

  public static getInstance(): AntiDebug {
    if (!AntiDebug.instance) {
      AntiDebug.instance = new AntiDebug();
    }
    return AntiDebug.instance;
  }

  private initialize() {
    // Отключение DevTools
    this.disableDevTools();
    
    // Отключение правой кнопки мыши
    this.disableRightClick();
    
    // Отключение горячих клавиш разработчика
    this.disableDevHotkeys();
    
    // Периодическая проверка на отладку
    this.startDebugDetection();
    
    // Защита консоли
    this.protectConsole();
    
    console.log('🔐 Anti-Debug Protection: ENABLED');
  }

  /**
   * Отключение DevTools
   */
  private disableDevTools() {
    // Проверка открытия DevTools через изменение размера окна
    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      
      if (widthThreshold || heightThreshold) {
        this.handleDebugDetected('DevTools открыты');
      }
    };

    // Проверка через console.log timing
    const checkConsole = () => {
      const start = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const end = performance.now();
      
      if (end - start > 100) {
        this.handleDebugDetected('Debugger активен');
      }
    };

    this.intervalId = setInterval(() => {
      checkDevTools();
      checkConsole();
    }, this.checkInterval);
  }

  /**
   * Отключение правой кнопки мыши
   */
  private disableRightClick() {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      console.warn('⚠️  Правая кнопка мыши отключена');
      return false;
    });
  }

  /**
   * Отключение горячих клавиш разработчика
   */
  private disableDevHotkeys() {
    document.addEventListener('keydown', (e) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+C (Inspect Element)
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+U (View Source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+S (Save Page)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        return false;
      }
    });
  }

  /**
   * Защита консоли
   */
  private protectConsole() {
    // В production отключаем логи в консоль (задаётся в коде)
    if (import.meta.env.PROD) {
      const noop = () => {};
      window.console.log = noop;
      window.console.debug = noop;
      window.console.info = noop;
      window.console.warn = noop;
      // Оставляем console.error для критических ошибок
    }

    // Защита от изменения console
    Object.freeze(console);
  }

  /**
   * Обнаружение отладки через timing атаку
   */
  private startDebugDetection() {
    const detector = () => {
      const before = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const after = performance.now();
      
      // Если debugger занял больше 100ms, значит DevTools открыты
      if (after - before > 100) {
        this.handleDebugDetected('Debugger timing attack');
      }
    };

    setInterval(detector, 2000);
  }

  /**
   * Обработка обнаружения отладки
   */
  private handleDebugDetected(reason: string) {
    if (this.debugDetected) return;
    
    this.debugDetected = true;
    console.error('🚨 Debug detected:', reason);
    
    // Показываем предупреждение пользователю
    this.showWarning();
    
    // Опционально: можно отправить событие на backend
    this.reportDebugAttempt(reason);
    
    // Опционально: можно полностью заблокировать приложение
    // this.blockApplication();
  }

  /**
   * Показать предупреждение
   */
  private showWarning() {
    // Создаем overlay с предупреждением
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      font-family: Arial, sans-serif;
    `;
    
    overlay.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <h1 style="color: #ff4d4f; font-size: 48px; margin-bottom: 20px;">⚠️ ВНИМАНИЕ</h1>
        <p style="font-size: 24px; margin-bottom: 10px;">Обнаружена попытка отладки системы</p>
        <p style="font-size: 18px; color: #999;">Это действие зарегистрировано</p>
        <p style="font-size: 14px; color: #666; margin-top: 40px;">
          Система защищена от несанкционированного доступа<br/>
          Все попытки модификации фиксируются
        </p>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Блокируем на 5 секунд
    setTimeout(() => {
      overlay.remove();
      this.debugDetected = false;
    }, 5000);
  }

  /**
   * Отправить отчет о попытке отладки
   */
  private reportDebugAttempt(reason: string) {
    try {
      const data = {
        timestamp: new Date().toISOString(),
        reason,
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      // Отправляем beacon (не блокирует UI)
      navigator.sendBeacon('/api/security/debug-attempt', JSON.stringify(data));
    } catch (error) {
      // Игнорируем ошибки отправки
    }
  }

  /**
   * Полная блокировка приложения (опционально)
   */
  private blockApplication() {
    document.body.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: #000;
        color: #fff;
        font-family: Arial;
        text-align: center;
      ">
        <div>
          <h1 style="color: #ff4d4f; font-size: 48px;">🔒 ДОСТУП ЗАБЛОКИРОВАН</h1>
          <p style="font-size: 24px; margin-top: 20px;">
            Обнаружена попытка несанкционированного доступа
          </p>
          <p style="font-size: 16px; color: #999; margin-top: 40px;">
            Обратитесь к администратору системы
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Остановить защиту (для тестирования)
   */
  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// Автоматически инициализируем при импорте
const antiDebug = AntiDebug.getInstance();

export default antiDebug;

// Экспортируем для ручного управления (если нужно)
export { AntiDebug };
