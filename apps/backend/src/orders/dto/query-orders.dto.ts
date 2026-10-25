import { IsOptional, IsEnum, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@akufada/shared';

export class QueryOrdersDto {
  @ApiPropertyOptional({
    enum: OrderStatus,
    description: 'Filter orders by status',
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    description: 'Search across order number, customer name, email, or phone',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter orders by payment status (e.g. SUCCESS, PENDING, FAILED, REFUNDED)',
  })
  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @ApiPropertyOptional({
    description: 'Filter orders by payment method/provider (e.g. MOCK_GATEWAY, CASH, CARD, TELEBIRR)',
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'Start date boundary (ISO string)',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date boundary (ISO string)',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
