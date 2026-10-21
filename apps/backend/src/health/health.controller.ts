import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { HealthResponseDto } from '@akufada/shared';
import { PrismaService } from '../database/prisma.service';

@Controller('health')
export class HealthController {
  private readonly startupTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  getLiveness(): HealthResponseDto {
    const uptimeSeconds = Math.floor((Date.now() - this.startupTime) / 1000);
    return {
      status: 'ok',
      instance: process.env.INSTANCE_ID || 'api-node-1',
      uptimeSeconds,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get('ready')
  async getReadiness(@Res() res: Response) {
    const isDbConnected = await this.prisma.isHealthy();
    const status = isDbConnected ? 'ok' : 'degraded';
    const httpStatus = isDbConnected ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

    return res.status(httpStatus).json({
      status,
      instance: process.env.INSTANCE_ID || 'api-node-1',
      checks: {
        process: 'up',
        database: isDbConnected ? 'connected' : 'disconnected',
      },
      timestamp: new Date().toISOString(),
    });
  }
}
