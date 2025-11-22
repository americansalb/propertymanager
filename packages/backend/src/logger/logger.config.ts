import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { WinstonModuleOptions } from 'nest-winston';

const isProd = process.env.NODE_ENV === 'production';

export const createWinstonOptions = (): WinstonModuleOptions => {
  const logDir = process.env.LOG_DIR || 'logs';

  const consoleTransport = new winston.transports.Console({
    level: isProd ? 'info' : 'debug',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
  });

  // Info-level rotating log (14-day retention)
  const infoFileTransport = new (winston.transports as any).DailyRotateFile({
    dirname: logDir,
    filename: 'app-info-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
  });

  // Error-level rotating log (30-day retention)
  const errorFileTransport = new (winston.transports as any).DailyRotateFile({
    dirname: logDir,
    filename: 'app-error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
  });

  return {
    defaultMeta: {
      service: 'propertymaster-backend',
      env: process.env.NODE_ENV || 'development',
    },
    transports: [consoleTransport, infoFileTransport, errorFileTransport],
  };
};
