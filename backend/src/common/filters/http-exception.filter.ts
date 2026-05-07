import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: unknown[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object') {
        message = (res as any).message || message;
        details = Array.isArray((res as any).message)
          ? (res as any).message
          : undefined;
      }
    }

    response.status(status).json({
      statusCode: status,
      message: Array.isArray(message) ? 'Validation failed' : message,
      ...(details && { details }),
    });
  }
}
