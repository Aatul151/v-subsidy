import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

let __dirname;

try {
  const __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
} catch (err) {
  // SEA executable fallback
  __dirname = process.cwd();
}

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development (includes error details)
const consoleFormat = winston.format.combine(
  winston.format((info) => {
    // Remove service metadata from console output
    delete info.service;
    return info;
  })(),
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }), // Capture stack traces
  winston.format.splat(), // Handle string interpolation
  winston.format.printf(
    ({ timestamp, level, message, error, stack, ...metadata }) => {
      let logMessage = `${timestamp} [${level}]: ${message || ''}`;

      // Add error message if present in metadata
      if (error) {
        logMessage += ` | ${error}`;
      }

      // Add other metadata if present (excluding common winston fields)
      const metaKeys = Object.keys(metadata).filter(
        key => !['service', 'timestamp', 'level', 'message', 'error', 'stack', 'splat'].includes(key)
      );

      if (metaKeys.length > 0) {
        logMessage += '\n  Details:';
        metaKeys.forEach(key => {
          const value = typeof metadata[key] === 'object'
            ? JSON.stringify(metadata[key], null, 2)
            : metadata[key];
          logMessage += `\n    ${key}: ${value}`;
        });
      }

      return logMessage;
    }
  )
);

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'node-mongo-api' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Always log to console (errors are important to see in all environments)
logger.add(
  new winston.transports.Console({
    format: consoleFormat,
    defaultMeta: {}, // Override defaultMeta for console to exclude service metadata
    // In production, only show errors and above; in development, show info and above
    level: process.env.NODE_ENV === 'production' ? 'error' : (process.env.LOG_LEVEL || 'info'),
  })
);

logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

export default logger;

