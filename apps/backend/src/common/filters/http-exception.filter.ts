import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ApiErrorResponse } from '@akufada/shared';
import { CorrelatedRequest } from '../middleware/correlation-id.middleware';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<CorrelatedRequest>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;

    let message = 'Internal server error';
    let details: ApiErrorResponse['details'] = undefined;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      const resMsg = (exceptionResponse as Record<string, unknown>).message;
      if (Array.isArray(resMsg)) {
        message = 'Validation failed';
        details = resMsg.map((issue) => ({ issue: String(issue) }));
      } else {
        message = String(resMsg);
      }
    }

    const correlationId = request.correlationId || 'unknown';

    const errorBody: ApiErrorResponse = {
      statusCode: status,
      error: exception instanceof HttpException ? exception.name : 'InternalServerError',
      message,
      path: request.url,
      correlationId,
      timestamp: new Date().toISOString(),
      ...(details ? { details } : {}),
    };

    response.status(status).json(errorBody);
  }
}
