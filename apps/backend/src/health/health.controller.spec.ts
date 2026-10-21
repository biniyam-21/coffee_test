import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../database/prisma.service';
import { Response } from 'express';

describe('HealthController (Unit)', () => {
  let healthController: HealthController;
  let prismaService: { isHealthy: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      isHealthy: jest.fn().mockResolvedValue(true),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    healthController = app.get<HealthController>(HealthController);
  });

  describe('getLiveness', () => {
    it('should return status ok and instance information', () => {
      const result = healthController.getLiveness();
      expect(result.status).toBe('ok');
      expect(typeof result.instance).toBe('string');
      expect(typeof result.uptimeSeconds).toBe('number');
      expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });
  });

  describe('getReadiness', () => {
    it('should return 200 OK with connected database when healthy', async () => {
      const jsonMock = jest.fn();
      const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
      const mockRes = { status: statusMock } as unknown as Response;

      await healthController.getReadiness(mockRes);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ok',
          checks: {
            process: 'up',
            database: 'connected',
          },
        }),
      );
    });

    it('should return 503 Service Unavailable when database connection is degraded', async () => {
      prismaService.isHealthy.mockResolvedValue(false);

      const jsonMock = jest.fn();
      const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
      const mockRes = { status: statusMock } as unknown as Response;

      await healthController.getReadiness(mockRes);

      expect(statusMock).toHaveBeenCalledWith(503);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'degraded',
          checks: {
            process: 'up',
            database: 'disconnected',
          },
        }),
      );
    });
  });
});
