import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export interface CorrelatedRequest extends Request {
  correlationId?: string;
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: CorrelatedRequest, res: Response, next: NextFunction): void {
    const correlationHeader = req.headers['x-correlation-id'];
    const correlationId =
      (Array.isArray(correlationHeader) ? correlationHeader[0] : correlationHeader) || randomUUID();

    req.correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    next();
  }
}
