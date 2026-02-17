/**
 * Frontend Logger with Rotation
 * 
 * Циклическая система логирования для frontend
 * - Сохранение логов в localStorage
 * - Автоматическая ротация при превышении 10MB
 * - Отправка критических ошибок на backend
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: any;
}

const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB (localStorage limit consideration)
const LOG_STORAGE_KEY = 'ares_frontend_logs';
const LOG_ARCHIVE_KEY = 'ares_frontend_logs_archive';

class FrontendLogger {
  private logs: LogEntry[] = [];
  private maxSize = MAX_LOG_SIZE;

  constructor() {
    this.loadLogs();
  }

  /**
   * Load logs from localStorage
   */
  private loadLogs(): void {
    try {
      const stored = localStorage.getItem(LOG_STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load logs from storage:', error);
      this.logs = [];
    }
  }

  /**
   * Save logs to localStorage with rotation
   */
  private saveLogs(): void {
    try {
      const logsString = JSON.stringify(this.logs);
      const logsSize = new Blob([logsString]).size;

      // Check if rotation is needed
      if (logsSize > this.maxSize) {
        this.rotateLogs();
      }

      localStorage.setItem(LOG_STORAGE_KEY, logsString);
    } catch (error) {
      console.error('Failed to save logs to storage:', error);
      // If quota exceeded, force rotation
      this.rotateLogs();
      try {
        localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(this.logs));
      } catch (e) {
        console.error('Failed to save logs after rotation:', e);
      }
    }
  }

  /**
   * Rotate logs - move old logs to archive and keep only recent ones
   */
  private rotateLogs(): void {
    try {
      // Keep only last 100 entries
      const recentLogs = this.logs.slice(-100);
      const archivedLogs = this.logs.slice(0, -100);

      // Save archived logs (optional, can be sent to backend)
      if (archivedLogs.length > 0) {
        const existingArchive = localStorage.getItem(LOG_ARCHIVE_KEY);
        const archive = existingArchive ? JSON.parse(existingArchive) : [];
        archive.push(...archivedLogs.slice(-50)); // Keep last 50 archived
        localStorage.setItem(LOG_ARCHIVE_KEY, JSON.stringify(archive.slice(-50)));
      }

      this.logs = recentLogs;
      console.log(`[Logger] Rotated logs - kept ${recentLogs.length} recent entries`);
    } catch (error) {
      console.error('Failed to rotate logs:', error);
      // Emergency cleanup - clear all logs
      this.logs = [];
      localStorage.removeItem(LOG_STORAGE_KEY);
    }
  }

  /**
   * Add log entry
   */
  private addLog(level: LogLevel, message: string, meta?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta,
    };

    this.logs.push(entry);
    this.saveLogs();

    // Send critical errors to backend
    if (level === 'error') {
      this.sendToBackend(entry);
    }

    // Console output in development
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      consoleMethod(`[${level.toUpperCase()}]`, message, meta || '');
    }
  }

  /**
   * Send critical logs to backend
   */
  private async sendToBackend(entry: LogEntry): Promise<void> {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      await fetch(`${apiUrl}/logs/frontend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      }).catch(() => {
        // Silently fail if backend is unavailable
      });
    } catch (error) {
      // Silently fail - don't log to prevent infinite loop
    }
  }

  /**
   * Public logging methods
   */
  info(message: string, meta?: any): void {
    this.addLog('info', message, meta);
  }

  warn(message: string, meta?: any): void {
    this.addLog('warn', message, meta);
  }

  error(message: string, meta?: any): void {
    this.addLog('error', message, meta);
  }

  debug(message: string, meta?: any): void {
    this.addLog('debug', message, meta);
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    localStorage.removeItem(LOG_STORAGE_KEY);
    localStorage.removeItem(LOG_ARCHIVE_KEY);
    console.log('[Logger] All logs cleared');
  }

  /**
   * Export logs as text
   */
  exportLogs(): string {
    return this.logs.map(entry => 
      `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${entry.meta ? ' ' + JSON.stringify(entry.meta) : ''}`
    ).join('\n');
  }
}

// Create singleton instance
const logger = new FrontendLogger();

export default logger;
