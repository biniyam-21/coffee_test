import { IsNotEmpty, IsUUID, IsInt, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockMovementReason } from '@akufada/shared';

export class AdjustInventoryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Product UUID' })
  @IsUUID('4')
  productId!: string;

  @ApiProperty({
    example: 20,
    description:
      'Signed inventory quantity adjustment (positive for restock, negative for disposal/spoilage)',
  })
  @IsInt()
  @IsNotEmpty()
  quantityDelta!: number;

  @ApiProperty({
    enum: StockMovementReason,
    example: StockMovementReason.RESTOCK_PURCHASE,
    description: 'Business reason for inventory mutation',
  })
  @IsEnum(StockMovementReason, { message: 'Must be a valid stock movement reason' })
  reason!: StockMovementReason;

  @ApiPropertyOptional({ example: 'Received delivery batch #9921 from roastery' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  notes?: string;
}
