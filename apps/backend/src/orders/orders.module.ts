import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { StaffOrdersController } from './staff-orders.controller';
import { OrdersService } from './orders.service';
import { PrismaModule } from '../database/prisma.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [PrismaModule, PaymentModule],
  controllers: [OrdersController, StaffOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
