import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RoleType } from '@akufada/shared';

@ApiTags('Inventory Management')
@Controller('admin/inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Roles(RoleType.STAFF, RoleType.ADMIN)
  @ApiOperation({ summary: 'View inventory balances and low-stock indicators (Staff and Admin)' })
  @ApiResponse({ status: 200, description: 'Inventory stock list' })
  @ApiResponse({ status: 403, description: 'Forbidden: Staff or Admin role required' })
  async getInventoryList() {
    return this.inventoryService.getInventoryList();
  }

  @Post('adjust')
  @Roles(RoleType.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Perform an atomic stock adjustment with audit logging (Admin only)' })
  @ApiResponse({ status: 200, description: 'Stock adjusted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid delta or negative stock violation' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin role required' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async adjustInventory(@Body() dto: AdjustInventoryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.inventoryService.adjustInventory(dto, user.id);
  }
}
