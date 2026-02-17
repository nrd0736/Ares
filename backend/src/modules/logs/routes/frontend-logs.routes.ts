/**
 * Frontend Logs Routes
 * Endpoint для приема логов от frontend
 */

import { Router } from 'express';
import logger from '../../../utils/logger';

const router = Router();

/**
 * POST /api/logs/frontend
 * Receive logs from frontend
 */
router.post('/frontend', (req, res) => {
  try {
    const { timestamp, level, message, meta } = req.body;

    // Log to backend logger
    const logMessage = `[Frontend] ${message}`;
    switch (level) {
      case 'error':
        logger.error(logMessage, { frontend: true, meta });
        break;
      case 'warn':
        logger.warn(logMessage, { frontend: true, meta });
        break;
      case 'info':
        logger.info(logMessage, { frontend: true, meta });
        break;
      case 'debug':
        logger.debug(logMessage, { frontend: true, meta });
        break;
      default:
        logger.info(logMessage, { frontend: true, meta });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    // Don't log errors from frontend logging to prevent loops
    res.status(500).json({ success: false });
  }
});

export default router;
