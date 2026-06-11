import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/database.js';
import logger from './config/logger.js';
import { setSocketIO } from './config/socket.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { requestLogger } from './middleware/requestLogger.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import formEntryRoutes from './routes/formEntryRoutes.js';
import formAccessRulesRoutes from './routes/formAccessRulesRoutes.js';
import formDefinitionRoutes from './routes/formDefinitionRoutes.js';
import moduleRoutes from './routes/moduleRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import fileUploadRoutes from './routes/fileUploadRoutes.js';
import { cleanupOldTempFiles } from './middleware/upload.js';

// Load env vars
dotenv.config();

// Connect to database
connectDB();

let __dirname;

try {
  const __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
} catch (err) {
  // SEA executable fallback
  __dirname = process.cwd();
}

const app = express();

// Trust proxy (important for rate limiting behind reverse proxy)
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : 0);

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: process.env.CORS_CREDENTIALS === 'true',
  optionsSuccessStatus: 200,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: process.env.BODY_PARSER_LIMIT || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.BODY_PARSER_LIMIT || '10mb' }));

// Request logging middleware (log all API calls)
app.use(requestLogger);

// Serve static files from media directory (for local storage)
app.use('/media', express.static(path.join(__dirname, 'media')));

// Apply rate limiting to all API routes
// app.use('/api/', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/form-entries', formEntryRoutes);
app.use('/api/form-access-rules', formAccessRulesRoutes);
app.use('/api/form-definitions', formDefinitionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/file-upload', fileUploadRoutes);

// Health check route
app.get('/', (req, res) => {
  logger.info('Health check endpoint accessed');
  res.json({
    success: true,
    message: 'Node.js MongoDB API Starter is running',
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {},
  });
});

const PORT = process.env.PORT || 3000;
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },
});

setSocketIO(io);

io.on('connection', (socket) => {
  logger.debug('Socket client connected', { id: socket.id });
  socket.on('disconnect', () => {
    logger.debug('Socket client disconnected', { id: socket.id });
  });
});

httpServer.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  
  // Cleanup old temp files on startup
  cleanupOldTempFiles(1).catch((err) => {
    logger.error('Error during initial temp file cleanup:', err);
  });

  // Set up periodic cleanup of old temp files (every hour, removes files older than 2 hours)
  const CLEANUP_INTERVAL_HOURS = parseInt(process.env.TEMP_FILE_CLEANUP_INTERVAL_HOURS || '2', 10);
  const CLEANUP_INTERVAL_MS = CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000;
  const TEMP_FILE_MAX_AGE_HOURS = parseInt(process.env.TEMP_FILE_MAX_AGE_HOURS || '1', 10);

  setInterval(() => {
    cleanupOldTempFiles(TEMP_FILE_MAX_AGE_HOURS).catch((err) => {
      logger.error('Error during periodic temp file cleanup:', err);
    });
  }, CLEANUP_INTERVAL_MS);

  logger.info(`Temp file cleanup scheduled: every ${CLEANUP_INTERVAL_HOURS} hour(s), deleting files older than ${TEMP_FILE_MAX_AGE_HOURS} hour(s)`);
});

