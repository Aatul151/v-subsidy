import logger from '../config/logger.js';

/**
 * Middleware to log all API requests
 * Logs method, URL, IP address, and response status
 */
export const requestLogger = (req, res, next) => {
  // Capture the start time
  const startTime = Date.now();

  // Log the incoming request
  logger.info(`${req.method} ${req.originalUrl} - IP: ${req.ip || req.connection.remoteAddress}`);

  // Override res.end to capture response status
  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    const duration = Date.now() - startTime;
    logger.info(`${req.method} ${req.originalUrl} - Status: ${res.statusCode} - ${duration}ms`);
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

