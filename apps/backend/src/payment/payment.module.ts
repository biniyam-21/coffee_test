import { Module } from '@nestjs/common';
import { PaymentClientService } from './payment-client.service';
import { ChapaPaymentService } from './chapa-payment.service';
import { PaymentController } from './payment.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentController],
  providers: [PaymentClientService, ChapaPaymentService],
  exports: [PaymentClientService, ChapaPaymentService],
})
export class PaymentModule {}
