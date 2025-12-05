import express, { Express } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import { CacheService } from '../services/CacheService';
import { RegionalScheduler } from '../services/RegionalScheduler';
import {
  createApiRoutes,
  errorHandler,
  notFoundHandler,
  requestLogger,
  corsConfig,
} from './index';

/**
 * Create and configure Express application
 */
export function createApp(
  pool: Pool,
  cache: CacheService,
  aisStreamManager?: any,
  regionalScheduler?: RegionalScheduler
): Express {
  const app = express();

  // Middleware
  app.use(cors(corsConfig()));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // API routes
  app.use('/api', createApiRoutes(pool, cache, aisStreamManager, regionalScheduler));

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
