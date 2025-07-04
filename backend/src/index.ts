import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { initI18n } from './config/i18n';
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
    app.use(cors());
    app.use(express.json());

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
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer().catch(console.error); 