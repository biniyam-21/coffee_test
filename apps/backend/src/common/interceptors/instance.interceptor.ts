import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Response } from 'express';

@Injectable()
export class InstanceInterceptor implements NestInterceptor {
  private readonly instanceId: string;

  constructor() {
    this.instanceId = process.env.INSTANCE_ID || 'api-node-1';
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (response && typeof response.setHeader === 'function') {
      response.setHeader('X-Backend-Instance', this.instanceId);
    }

    return next.handle();
  }
}
