import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { RoleType } from '@akufada/shared';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ChapaPaymentService } from './chapa-payment.service';

@ApiTags('Payments')
@Controller()
export class PaymentController {
  constructor(private readonly chapa: ChapaPaymentService) {}

  @Post('payments/chapa/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify and process a Chapa webhook (HMAC signed)' })
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('chapa-signature') chapaSignature?: string,
    @Headers('x-chapa-signature') payloadSignature?: string,
  ) {
    return this.chapa.handleWebhook(req.rawBody, chapaSignature, payloadSignature);
  }

  @Get('payments/chapa/callback')
  @ApiOperation({ summary: 'Server-side Chapa callback; verifies transaction before updating order' })
  callback(@Query('tx_ref') txRef?: string, @Query('trx_ref') trxRef?: string) {
    return this.chapa.handleCallback(txRef || trxRef || '');
  }

  @Get('payments/chapa/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify the signed-in customer’s Chapa payment status' })
  verify(@CurrentUser() user: AuthenticatedUser, @Query('tx_ref') txRef: string) {
    return this.chapa.verifyForCustomer(user.id, txRef);
  }

  @Post('admin/payments/chapa/reconcile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reconcile aged pending Chapa payments (Admin only)' })
  reconcile(@Body('limit') limit?: number) {
    return this.chapa.reconcilePending(limit || 50);
  }
}
