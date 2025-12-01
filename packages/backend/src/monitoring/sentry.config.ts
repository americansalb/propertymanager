import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { type Express } from 'express';

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export function initializeSentry(app?: Express): void {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.log('[Sentry] No SENTRY_DSN configured, skipping initialization');
    return;
  }

  const environment = process.env.NODE_ENV || 'development';
  const release = process.env.npm_package_version || '0.1.0';

  Sentry.init({
    dsn,
    environment,
    release: `propertymaster-backend@${release}`,

    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

    // Profiling
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,

    integrations: [
      // Add profiling integration
      nodeProfilingIntegration(),
    ],

    // Filter out sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
        delete event.request.headers['x-api-key'];
      }

      // Remove sensitive data from request body
      if (event.request?.data) {
        const data =
          typeof event.request.data === 'string'
            ? JSON.parse(event.request.data)
            : event.request.data;

        const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'apiKey'];
        sensitiveFields.forEach((field) => {
          if (data[field]) {
            data[field] = '[FILTERED]';
          }
        });

        event.request.data = typeof event.request.data === 'string' ? JSON.stringify(data) : data;
      }

      return event;
    },

    // Ignore specific errors
    ignoreErrors: [
      // Browser errors
      'ResizeObserver loop limit exceeded',
      'Network request failed',
      // Expected auth errors
      'UnauthorizedException',
      // Rate limiting
      'ThrottlerException',
    ],
  });

  console.log(`[Sentry] Initialized for environment: ${environment}`);
}

/**
 * Capture an exception to Sentry
 */
export function captureException(
  error: Error,
  context?: Record<string, unknown>,
): string | undefined {
  return Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message to Sentry
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>,
): string | undefined {
  return Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Set user context for Sentry
 */
export function setUser(user: {
  id: string;
  email?: string;
  organizationId?: string;
}): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    organizationId: user.organizationId,
  } as Sentry.User);
}

/**
 * Clear user context
 */
export function clearUser(): void {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
  });
}

/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(name: string, op: string): Sentry.Span | undefined {
  return Sentry.startInactiveSpan({
    name,
    op,
  });
}

export { Sentry };
