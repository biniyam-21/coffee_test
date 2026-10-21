import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { GlobalHttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { InstanceInterceptor } from '../src/common/interceptors/instance.interceptor';

describe('Health & Operational Endpoints (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: { isHealthy: jest.Mock };

  beforeAll(async () => {
    mockPrisma = {
      isHealthy: jest.fn().mockResolvedValue(true),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalHttpExceptionFilter());
    app.useGlobalInterceptors(new InstanceInterceptor());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/health/live', () => {
    it('should return 200 OK with instance headers and operational liveness', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.status).toBe('ok');
      expect(typeof response.body.instance).toBe('string');
      expect(typeof response.body.uptimeSeconds).toBe('number');

      // Verify custom architectural headers
      expect(response.headers['x-backend-instance']).toBeDefined();
      expect(response.headers['x-correlation-id']).toBeDefined();
    });
  });

  describe('GET /api/v1/health/ready', () => {
    it('should return 200 OK and connected database status when healthy', async () => {
      mockPrisma.isHealthy.mockResolvedValueOnce(true);

      const response = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.status).toBe('ok');
      expect(response.body.checks.process).toBe('up');
      expect(response.body.checks.database).toBe('connected');
    });

    it('should return 503 Service Unavailable when database probe fails', async () => {
      mockPrisma.isHealthy.mockResolvedValueOnce(false);

      const response = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(503);

      expect(response.body).toBeDefined();
      expect(response.body.status).toBe('degraded');
      expect(response.body.checks.database).toBe('disconnected');
    });
  });
});
