import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { InventoryConcurrencyService } from './inventory-concurrency.service';
import { IdempotencyService } from './idempotency.service';

@Global()
@Module({
  providers: [PrismaService, InventoryConcurrencyService, IdempotencyService],
  exports: [PrismaService, InventoryConcurrencyService, IdempotencyService],
})
export class PrismaModule {}
