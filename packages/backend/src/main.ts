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

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger,
  });

  // Parse cookies for httpOnly refresh tokens
  app.use(cookieParser());

  // Security headers with Helmet
  app.use(
    helmet({
      // Content Security Policy - allow Stripe, fonts, and inline styles for React
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://js.stripe.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          connectSrc: ["'self'", 'https://api.stripe.com', 'https://*.stripe.com'],
          frameSrc: ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com'],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
      // Prevent clickjacking
      frameguard: { action: 'deny' },
      // Hide X-Powered-By header
      hidePoweredBy: true,
      // Strict Transport Security (HTTPS only in production)
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      // Prevent MIME type sniffing
      noSniff: true,
      // XSS filter
      xssFilter: true,
      // Referrer policy
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  // Serve static files from frontend build
  const frontendDistPath = join(__dirname, '..', '..', 'frontend-admin', 'dist');
  app.useStaticAssets(frontendDistPath);

  // Serve index.html for all non-API routes (SPA routing)
  app.use((req: any, res: any, next: any) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(frontendDistPath, 'index.html'));
    } else {
      next();
    }
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
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
    .addTag('reports', 'Reports & Analytics')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.API_PORT || 3001;
  await app.listen(port);

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🏢  PropertyMaster API Server                              ║
║                                                               ║
║   Environment: ${process.env.NODE_ENV || 'development'}                                      ║
║   Port:        ${port}                                               ║
║   Docs:        http://localhost:${port}/api/docs                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
