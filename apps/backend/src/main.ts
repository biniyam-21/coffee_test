import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';
import { InstanceInterceptor } from './common/interceptors/instance.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Baseline browser protections for the JSON API. TLS is terminated at the gateway.
  app.use((_req: unknown, res: { setHeader: (name: string, value: string) => void }, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // Set global API version prefix according to Phase 1 contract (/api/v1)
  app.setGlobalPrefix('api/v1');

  // Register global validation pipe with strict whitelisting
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Register global RFC 7807 problem details exception filter
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // Register load-balancing demonstration instance header interceptor (X-Backend-Instance)
  app.useGlobalInterceptors(new InstanceInterceptor());

  // Enable CORS only for explicitly configured web origins. Native mobile requests are not browser CORS requests.
  const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: corsOrigins, credentials: false, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] });

  // OpenAPI / Swagger Documentation configured under /api/v1/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Coffee Shop Order Management System (Akufada) API')
    .setDescription(
      'REST API for customer authentication, menu catalog browsing, authoritative order placement, staff preparation, and admin inventory control.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/v1/docs', app, document);

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  await app.listen(port);

  logger.log(`Coffee Shop Backend API is running on port ${port} (Prefix: /api/v1)`);
  logger.log(`Instance identifier: ${process.env.INSTANCE_ID || 'api-node-1'}`);
}

bootstrap().catch((err) => {
  console.error('Fatal error during backend bootstrap:', err);
  process.exit(1);
});
