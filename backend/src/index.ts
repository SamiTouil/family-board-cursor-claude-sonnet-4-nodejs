import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { initI18n } from './config/i18n';
import { csrfProtection, setCSRFCookie } from './middleware/csrf.middleware';
import { userRoutes } from './routes/user.routes';
import { authRoutes } from './routes/auth.routes';
import familyRoutes from './routes/family.routes';
import taskRoutes from './routes/task.routes';

import dayTemplateRoutes from './routes/day-template.routes';
import weekTemplateRoutes from './routes/week-template.routes';
import weekScheduleRoutes from './routes/week-schedule.routes';
import healthRoutes from './routes/health.routes';
import { errorHandler } from './middleware/error.middleware';
import { initializeWebSocket } from './services/websocket.service';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { prisma } from './lib/prisma';

const app = express();
const httpServer = createServer(app);
const PORT = process.env['PORT'] || 3001;

async function startServer(): Promise<void> {
  try {
    // Initialize i18n
    await initI18n();
    
    // Initialize token blacklist service
    TokenBlacklistService.initialize();

    // Initialize WebSocket
    initializeWebSocket(httpServer);

    // Security middleware
    app.use(helmet());
    
    // CORS configuration
    const allowedOrigins = process.env['ALLOWED_ORIGINS']
      ? process.env['ALLOWED_ORIGINS'].split(',')
      : ['http://localhost:5173', 'http://localhost:3001'];
    
    app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }));
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000'), // 15 minutes default
      max: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100'), // 100 requests default
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    
    // Apply rate limiting to all routes
    app.use('/api/', limiter);
    
    // Stricter rate limiting for auth routes
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 requests per window
      message: 'Too many authentication attempts, please try again later.',
      skipSuccessfulRequests: true,
    });
    
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth/signup', authLimiter);
    
    // Body parser and cookie parser
    app.use(express.json({ limit: '10mb' }));
    app.use(cookieParser());
    
    // CSRF Protection
    app.use(csrfProtection);
    
    // Set CSRF cookie on auth success
    app.use('/api/auth/login', (_req, res, next) => {
      const originalJson = res.json;
      res.json = function(data: Record<string, unknown>) {
        if (data?.success && data?.token) {
          setCSRFCookie(res);
        }
        return originalJson.call(this, data);
      };
      next();
    });

    // CSRF token endpoint
    app.get('/api/csrf-token', (_req, res) => {
      setCSRFCookie(res);
      res.json({ success: true, message: 'CSRF token set' });
    });
    
    // Routes
    app.use('/api', healthRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/families', familyRoutes);
    app.use('/api/tasks', taskRoutes);
    
    app.use('/api/families', dayTemplateRoutes);
    app.use('/api/families', weekTemplateRoutes);
    app.use('/api/families', weekScheduleRoutes);

    // Error handling
    app.use(errorHandler);

    // Start server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔌 WebSocket server ready for connections`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  await TokenBlacklistService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  await TokenBlacklistService.disconnect();
  process.exit(0);
});

startServer().catch(console.error); 