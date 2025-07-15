import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { initI18n } from './config/i18n';
import { userRoutes } from './routes/user.routes';
import { authRoutes } from './routes/auth.routes';
import { csrfRoutes } from './routes/csrf.routes';
import familyRoutes from './routes/family.routes';
import taskRoutes from './routes/task.routes';

import dayTemplateRoutes from './routes/day-template.routes';
import weekTemplateRoutes from './routes/week-template.routes';
import weekScheduleRoutes from './routes/week-schedule.routes';
import healthRoutes from './routes/health.routes';
import analyticsRoutes from './routes/analytics.routes';
import { errorHandler } from './middleware/error.middleware';
import { generateCSRFToken, validateCSRFToken } from './middleware/csrf.middleware';
import { initializeWebSocket } from './services/websocket.service';

const app = express();
const httpServer = createServer(app);
const prisma = new PrismaClient();
const PORT = process.env['PORT'] || 3001;

async function startServer(): Promise<void> {
  try {
    // Initialize i18n
    await initI18n();

    // Initialize WebSocket
    initializeWebSocket(httpServer);

    // Middleware
    app.use(helmet());
    
    // Configure CORS to allow both web and mobile clients
    const allowedOrigins = [
      process.env['FRONTEND_URL'] || 'http://localhost:3000',
      'http://localhost:8081', // Expo development
      'http://192.168.1.24:8081', // Expo on local network
      'exp://192.168.1.24:8081', // Expo client
      /^http:\/\/192\.168\.\d+\.\d+:8081$/, // Any local IP for Expo
      /^exp:\/\/\d+\.\d+\.\d+\.\d+:\d+$/, // Any Expo URL
    ];
    
    app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps)
        if (!origin) return callback(null, true);
        
        // Check if origin is in allowed list
        const isAllowed = allowedOrigins.some(allowed => {
          if (allowed instanceof RegExp) {
            return allowed.test(origin);
          }
          return allowed === origin;
        });
        
        if (isAllowed) {
          callback(null, true);
        } else {
          callback(new Error(`CORS policy: Origin ${origin} not allowed`));
        }
      },
      credentials: true, // Allow cookies to be sent
    }));
    app.use(cookieParser());
    app.use(express.json());

    // CSRF Protection - Generate tokens for all requests
    app.use(generateCSRFToken);

    // Routes
    app.use('/api', healthRoutes);
    app.use('/api/csrf', csrfRoutes);
    app.use('/api/auth', authRoutes);

    // Apply CSRF validation to protected routes
    app.use('/api/users', validateCSRFToken, userRoutes);
    app.use('/api/families', validateCSRFToken, familyRoutes);
    app.use('/api/tasks', validateCSRFToken, taskRoutes);

    app.use('/api/families', validateCSRFToken, dayTemplateRoutes);
    app.use('/api/families', validateCSRFToken, weekTemplateRoutes);
    app.use('/api/families', validateCSRFToken, weekScheduleRoutes);
    app.use('/api/analytics', validateCSRFToken, analyticsRoutes);

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
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer().catch(console.error); 