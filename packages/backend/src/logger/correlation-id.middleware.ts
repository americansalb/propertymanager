import { Injectable, type NestMiddleware } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { type Request, type Response, type NextFunction } from 'express';

const HEADER_NAME = 'x-correlation-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.header(HEADER_NAME);
    const correlationId = incoming || uuidv4();

    (req as any).correlationId = correlationId;
    res.setHeader(HEADER_NAME, correlationId);

    next();
  }
}
