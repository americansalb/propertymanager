import { GlobalExceptionFilter } from './global-exception.filter';
import { ArgumentsHost, HttpException, HttpStatus, LoggerService } from '@nestjs/common';
import { Request, Response } from 'express';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockLogger: LoggerService;
  let mockArgumentsHost: ArgumentsHost;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Mock logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    // Mock request
    mockRequest = {
      url: '/api/v1/properties/123',
      method: 'PUT',
    };

    // Mock response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Mock ArgumentsHost
    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as unknown as ArgumentsHost;

    filter = new GlobalExceptionFilter(mockLogger);

    // Set development environment for tests
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('HttpException handling', () => {
    it('should handle NotFoundException (404)', () => {
      const exception = new HttpException('Property not found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Property not found',
          code: 'NOT_FOUND',
          statusCode: 404,
          correlationId: undefined,
          stack: expect.any(String),
        },
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'http.error',
          status: 404,
          code: 'NOT_FOUND',
        }),
        GlobalExceptionFilter.name,
      );
    });

    it('should handle validation errors (400) with multiple messages', () => {
      const exception = new HttpException(
        {
          message: ['name must be a string', 'postalCode must match pattern'],
          error: 'Bad Request',
          statusCode: 400,
        },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'name must be a string',
          code: 'BAD_REQUEST',
          statusCode: 400,
          correlationId: undefined,
          errors: ['name must be a string', 'postalCode must match pattern'],
          stack: expect.any(String),
        },
      });
    });

    it('should handle ForbiddenException (403)', () => {
      const exception = new HttpException(
        'You do not have access to this property',
        HttpStatus.FORBIDDEN,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'You do not have access to this property',
          code: 'FORBIDDEN',
          statusCode: 403,
          correlationId: undefined,
          stack: expect.any(String),
        },
      });
    });
  });

  describe('Prisma error handling', () => {
    it('should handle unique constraint violation (P2002)', () => {
      const prismaError = {
        code: 'P2002',
        meta: {
          target: ['email'],
        },
      };

      filter.catch(prismaError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'A record with this email already exists',
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
          statusCode: 409,
          correlationId: undefined,
        },
      });
    });

    it('should handle record not found (P2025)', () => {
      const prismaError = {
        code: 'P2025',
      };

      filter.catch(prismaError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Record not found',
          code: 'RECORD_NOT_FOUND',
          statusCode: 404,
          correlationId: undefined,
        },
      });
    });

    it('should handle foreign key violation (P2003)', () => {
      const prismaError = {
        code: 'P2003',
      };

      filter.catch(prismaError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Related record not found',
          code: 'FOREIGN_KEY_VIOLATION',
          statusCode: 400,
          correlationId: undefined,
        },
      });
    });

    it('should handle unknown Prisma error', () => {
      const prismaError = {
        code: 'P9999',
      };

      filter.catch(prismaError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Database error occurred',
          code: 'DATABASE_ERROR',
          statusCode: 500,
          correlationId: undefined,
        },
      });
    });
  });

  describe('Generic Error handling', () => {
    it('should handle generic Error', () => {
      const error = new Error('Something went wrong');

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Something went wrong',
          code: 'INTERNAL_SERVER_ERROR',
          statusCode: 500,
          correlationId: undefined,
          stack: expect.any(String),
        },
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'http.error',
          status: 500,
          code: 'INTERNAL_SERVER_ERROR',
        }),
        expect.any(String),
        GlobalExceptionFilter.name,
      );
    });

    it('should handle unknown exception type', () => {
      const unknown = 'some string error';

      filter.catch(unknown, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'An unexpected error occurred',
          code: 'UNKNOWN_ERROR',
          statusCode: 500,
          correlationId: undefined,
        },
      });
    });
  });

  describe('Correlation ID handling', () => {
    it('should include correlationId from request in error response', () => {
      (mockRequest as any).correlationId = 'test-correlation-id-123';
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Test error',
          code: 'BAD_REQUEST',
          statusCode: 400,
          correlationId: 'test-correlation-id-123',
          stack: expect.any(String),
        },
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: 'test-correlation-id-123',
        }),
        GlobalExceptionFilter.name,
      );
    });

    it('should include user context in logs when user is authenticated', () => {
      (mockRequest as any).user = {
        id: 'user-123',
        organizationId: 'org-456',
      };
      (mockRequest as any).correlationId = 'correlation-123';
      const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

      filter.catch(exception, mockArgumentsHost);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          organizationId: 'org-456',
          correlationId: 'correlation-123',
        }),
        GlobalExceptionFilter.name,
      );
    });
  });

  describe('Environment-specific behavior', () => {
    it('should include stack trace in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Dev error');

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            stack: expect.any(String),
          }),
        }),
      );
    });

    it('should not include stack trace in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Prod error');

      filter.catch(error, mockArgumentsHost);

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.error.stack).toBeUndefined();
    });
  });

  describe('Logging levels', () => {
    it('should log 4xx errors as warnings', () => {
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockArgumentsHost);

      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should log 5xx errors as errors', () => {
      const error = new Error('Internal error');

      filter.catch(error, mockArgumentsHost);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });
});
