import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { WinstonModule } from 'nest-winston';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { type Request, type Response, type NextFunction } from 'express';
import { AppModule } from './app.module';
import { createWinstonOptions } from './logger/logger.config';

async function bootstrap() {
  // Initialize Sentry as early as possible (production only)
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'production',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
      integrations: [nodeProfilingIntegration()],
    });
  }

  const logger = WinstonModule.createLogger(createWinstonOptions());
  const isProduction = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger,
  });

  // Security middleware - Helmet
  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com'],
              imgSrc: ["'self'", 'data:', 'https:'],
              scriptSrc: ["'self'"],
              connectSrc: [
                "'self'",
                'https://api.stripe.com',
                'https://nominatim.openstreetmap.org',
              ],
              frameSrc: ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com'],
            },
          }
        : false, // Disable CSP in development for easier debugging
      // Prevent clickjacking
      frameguard: { action: 'deny' },
      // Prevent MIME type sniffing
      noSniff: true,
      // XSS Protection
      xssFilter: true,
      // Hide X-Powered-By header
      hidePoweredBy: true,
      // HTTP Strict Transport Security
      hsts: isProduction
        ? {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
          }
        : false,
      // Referrer Policy
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      // Cross-Origin-Embedder-Policy
      crossOriginEmbedderPolicy: false, // Disabled for third-party integrations
      // Cross-Origin-Opener-Policy
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      // Cross-Origin-Resource-Policy
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Parse cookies for httpOnly refresh tokens
  app.use(cookieParser());

  // Trust proxy for secure cookies behind load balancer
  if (isProduction) {
    app.set('trust proxy', 1);
  }

  // Serve static files from frontend builds
  const adminDistPath = join(__dirname, '..', '..', 'frontend-admin', 'dist');
  const tenantDistPath = join(__dirname, '..', '..', 'frontend-tenant', 'out');

  // Serve tenant portal static files at /tenant
  app.useStaticAssets(tenantDistPath, { prefix: '/tenant' });

  // Serve admin portal static files at root
  app.useStaticAssets(adminDistPath);

  // Handle SPA routing for both apps
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      return next();
    }

    // Tenant portal routes
    if (req.path.startsWith('/tenant')) {
      // Remove /tenant prefix to get the actual page path
      const pagePath = req.path.replace('/tenant', '') || '/';
      // Try to serve the specific page, fallback to index
      const htmlPath = pagePath === '/' ? 'index.html' : `${pagePath.replace(/\/$/, '')}.html`;
      const fullPath = join(tenantDistPath, htmlPath);

      // Check if specific page exists, otherwise serve index for client-side routing
      res.sendFile(fullPath, (err: Error | null) => {
        if (err) {
          res.sendFile(join(tenantDistPath, 'index.html'));
        }
      });
      return;
    }

    // Admin portal routes (default)
    res.sendFile(join(adminDistPath, 'index.html'));
  });

  // Global validation pipe with strict settings
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      // Prevent deep object injection
      forbidUnknownValues: true,
      // Validate nested objects
      validationError: {
        target: false,
        value: false, // Don't include value in error response for security
      },
    }),
  );

  // CORS with strict settings
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3002',
  ];

  // Add Render production URLs if not in the list
  const renderUrls = [
    'https://propertymanager-1.onrender.com',
    'https://propertymaster.onrender.com',
  ];
  renderUrls.forEach((url) => {
    if (!allowedOrigins.includes(url)) {
      allowedOrigins.push(url);
    }
  });

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400, // 24 hours
  });

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation (disable in production if needed)
  if (!isProduction || process.env.ENABLE_SWAGGER === 'true') {
    const config = new DocumentBuilder()
      .setTitle('PropertyMaster API')
      .setDescription('World-Class Property Management System API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication & Authorization')
      .addTag('properties', 'Property Management')
      .addTag('units', 'Unit Management')
      .addTag('leases', 'Leasing & Tenants')
      .addTag('financial', 'Financial Core')
      .addTag('payments', 'Payment Processing')
      .addTag('operations', 'Work Orders & Maintenance')
      .addTag('vendors', 'Vendor Management')
      .addTag('documents', 'Document Management')
      .addTag('notifications', 'Notifications')
      .addTag('reports', 'Reports & Analytics')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.API_PORT || 3001;
  await app.listen(port);

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🏢  PropertyMaster API Server                               ║
║                                                               ║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(13)}                         ║
║   Port:        ${String(port).padEnd(13)}                         ║
║   Security:    Helmet enabled                                 ║
║   Docs:        http://localhost:${port}/api/docs                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
