import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsString,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Product UUID' })
  @IsUUID('4', { message: 'productId must be a valid UUID v4' })
  productId!: string;

  @ApiProperty({ example: 2, minimum: 1, maximum: 20, description: 'Quantity of items to order' })
  @IsInt()
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(20, { message: 'Maximum 20 units allowed per item' })
  quantity!: number;
}

export class MockPaymentOptionsDto {
  @ApiPropertyOptional({ example: 'MOCK_GATEWAY' })
  @IsOptional()
  @IsIn(['MOCK_GATEWAY', 'CASH_ON_PICKUP', 'CHAPA'])
  provider?: string = 'MOCK_GATEWAY';

  @ApiPropertyOptional({
    example: 'SUCCESS',
    enum: ['SUCCESS', 'DECLINED', 'TIMEOUT'],
    description: 'Outcome to simulate against the mock payment provider',
  })
  @IsOptional()
  @IsIn(['SUCCESS', 'DECLINED', 'TIMEOUT'])
  simulateOutcome?: 'SUCCESS' | 'DECLINED' | 'TIMEOUT' = 'SUCCESS';
}

export class CreateOrderDto {
  @ApiProperty({
    type: [OrderItemDto],
    description: 'List of order items with product IDs and quantities',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Order must contain at least 1 item' })
  @ArrayMaxSize(20, { message: 'Order cannot exceed 20 unique line items' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiPropertyOptional({
    example: 'Extra hot, oat milk please',
    description: 'Special customer requests',
  })
  @IsOptional()
  @IsString()
  customerNotes?: string;

  @ApiPropertyOptional({ type: MockPaymentOptionsDto, description: 'Mock payment configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MockPaymentOptionsDto)
  payment?: MockPaymentOptionsDto;
}
