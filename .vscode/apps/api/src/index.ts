// =============================================================================
// CREDIT DECISION LLM RAG PLATFORM - API SERVER
// =============================================================================

import 'reflect-metadata';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';
import { authMiddleware } from './middleware/auth';
import { validationMiddleware } from './middleware/validation';
import { requestLogger } from './middleware/request-logger';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { applicationsRouter } from './routes/applications';
import { documentsRouter } from './routes/documents';
import { decisionsRouter } from './routes/decisions';
import { riskAssessmentRouter } from './routes/risk-assessment';
import { llmRouter } from './routes/llm';
import { ragRouter } from './routes/rag';
import { auditRouter } from './routes/audit';
import { DatabaseService } from './services/database';
import { RedisService } from './services/redis';
import { AIService } from '@credit-decision/ai';

// =============================================================================
// APPLICATION SETUP
// =============================================================================

class Application {
  public app: express.Application;
  private server: any;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSwagger();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.security.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Compression
    this.app.use(compression());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.security.rateLimiting.windowMs,
      max: config.security.rateLimiting.maxRequests,
      message: {
        error: 'Too many requests from this IP, please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    if (config.app.environment !== 'test') {
      this.app.use(morgan('combined', {
        stream: { write: (message) => logger.info(message.trim()) }
      }));
    }

    // Custom request logger
    this.app.use(requestLogger);

    // Trust proxy (for load balancers)
    this.app.set('trust proxy', 1);
  }

  private setupRoutes(): void {
    // Health check (no auth required)
    this.app.use('/api/health', healthRouter);

    // Authentication routes (no auth required)
    this.app.use('/api/auth', authRouter);

    // Protected routes
    this.app.use('/api/users', authMiddleware, usersRouter);
    this.app.use('/api/applications', authMiddleware, applicationsRouter);
    this.app.use('/api/documents', authMiddleware, documentsRouter);
    this.app.use('/api/decisions', authMiddleware, decisionsRouter);
    this.app.use('/api/risk-assessment', authMiddleware, riskAssessmentRouter);
    this.app.use('/api/llm', authMiddleware, llmRouter);
    this.app.use('/api/rag', authMiddleware, ragRouter);
    this.app.use('/api/audit', authMiddleware, auditRouter);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Credit Decision LLM RAG Platform API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        environment: config.app.environment,
      });
    });
  }

  private setupSwagger(): void {
    const swaggerOptions = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'Credit Decision LLM RAG Platform API',
          version: '1.0.0',
          description: 'API for AI-powered credit decision platform with RAG capabilities',
          contact: {
            name: 'Platform Team',
            email: 'platform@yourcompany.com',
          },
        },
        servers: [
          {
            url: `http://localhost:${config.app.port}`,
            description: 'Development server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
      apis: ['./src/routes/*.ts', './src/models/*.ts'],
    };

    const specs = swaggerJsdoc(swaggerOptions);
    this.app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Credit Decision API Documentation',
    }));
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Initialize services
      await this.initializeServices();

      // Start server
      this.server = this.app.listen(config.app.port, () => {
        logger.info(`🚀 Server running on port ${config.app.port}`);
        logger.info(`📚 API Documentation: http://localhost:${config.app.port}/api/docs`);
        logger.info(`🏥 Health Check: http://localhost:${config.app.port}/api/health`);
        logger.info(`🌍 Environment: ${config.app.environment}`);
      });

      // Graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async initializeServices(): Promise<void> {
    logger.info('Initializing services...');

    try {
      // Initialize database
      await DatabaseService.getInstance().initialize();
      logger.info('✅ Database service initialized');

      // Initialize Redis
      await RedisService.getInstance().initialize();
      logger.info('✅ Redis service initialized');

      // Initialize AI services
      const aiService = new AIService({
        vectorDb: {
          type: config.vectorDb.type as 'chromadb',
          config: config.vectorDb.config,
        },
        embedding: {
          provider: 'openai',
          model: config.embedding.model,
          apiKey: config.llm.apiKey,
        },
        llm: {
          provider: config.llm.provider as 'openai',
          model: config.llm.model,
          apiKey: config.llm.apiKey,
          temperature: config.llm.temperature,
          maxTokens: config.llm.maxTokens,
        },
      });

      await aiService.initialize();
      logger.info('✅ AI services initialized');

      // Store AI service instance globally for access in routes
      (global as any).aiService = aiService;

    } catch (error) {
      logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      if (this.server) {
        this.server.close(async () => {
          logger.info('HTTP server closed');

          try {
            // Cleanup services
            await DatabaseService.getInstance().cleanup();
            await RedisService.getInstance().cleanup();
            
            if ((global as any).aiService) {
              await (global as any).aiService.cleanup();
            }

            logger.info('All services cleaned up');
            process.exit(0);
          } catch (error) {
            logger.error('Error during cleanup:', error);
            process.exit(1);
          }
        });
      } else {
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
  }

  public async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          logger.info('Server stopped');
          resolve();
        });
      });
    }
  }
}

// =============================================================================
// START APPLICATION
// =============================================================================

if (require.main === module) {
  const app = new Application();
  app.start().catch((error) => {
    logger.error('Failed to start application:', error);
    process.exit(1);
  });
}

export { Application };
