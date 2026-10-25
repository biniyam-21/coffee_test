import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RoleType } from '@akufada/shared';

@ApiTags('Customer Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(RoleType.CUSTOMER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Place a new coffee shop order (Authoritative pricing, atomic inventory, idempotency protection)',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'Client UUID v4 token to prevent duplicate order submissions',
    required: false,
  })
  @ApiResponse({ status: 201, description: 'Order successfully confirmed' })
  @ApiResponse({ status: 400, description: 'Insufficient stock or invalid items' })
  @ApiResponse({ status: 409, description: 'Concurrent request conflict for idempotency key' })
  @ApiResponse({ status: 422, description: 'Idempotency key payload mismatch' })
  async createOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.ordersService.createOrder(user.id, dto, idempotencyKey);
  }

  @Get()
  @Roles(RoleType.CUSTOMER, RoleType.STAFF, RoleType.ADMIN)
  @ApiOperation({
    summary: 'List customer own orders or all café orders for staff/admin with pagination',
  })
  @ApiResponse({ status: 200, description: 'Paginated order history' })
  async findUserOrders(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryOrdersDto) {
    return this.ordersService.findUserOrders(user.id, query, user.roles);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve order details (Customer owns or Staff/Admin)' })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 403, description: 'Forbidden: Access denied to other customers orders' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findOrderById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.findOrderById(id, user.id, user.roles);
  }

  @Get(':id/track')
  @ApiOperation({ summary: 'Track real-time preparation status and chronological history' })
  @ApiResponse({ status: 200, description: 'Order tracking timeline' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async trackOrder(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.trackOrder(id, user.id, user.roles);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel order and refund reserved inventory before preparation begins' })
  @ApiResponse({ status: 200, description: 'Order cancelled and stock refunded' })
  @ApiResponse({ status: 400, description: 'Order cannot be cancelled in current status' })
  @ApiResponse({ status: 403, description: 'Forbidden: Access denied' })
  async cancelOrder(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelOrder(id, user.id, user.roles, dto.reason);
  }
}
