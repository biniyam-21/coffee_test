import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RoleType, OrderStatus } from '@akufada/shared';

@ApiTags('Staff Operations')
@Controller('staff/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleType.STAFF, RoleType.ADMIN)
@ApiBearerAuth()
export class StaffOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'View active kitchen order queue in FIFO order (Staff and Admin)' })
  @ApiQuery({
    name: 'status',
    enum: OrderStatus,
    required: false,
    description: 'Filter queue by specific order status',
  })
  @ApiResponse({ status: 200, description: 'Active kitchen order queue' })
  @ApiResponse({ status: 403, description: 'Forbidden: Staff or Admin role required' })
  async getStaffQueue(@Query('status') status?: OrderStatus) {
    return this.ordersService.findStaffQueue(status);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Transition order preparation status following strict state machine rules',
  })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid state machine transition' })
  @ApiResponse({ status: 403, description: 'Forbidden: Staff or Admin role required' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async updateOrderStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.updateOrderStatus(id, user.id, dto.status, dto.notes);
  }
}
