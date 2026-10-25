import { IsEnum, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@akufada/shared';

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.IN_PREPARATION,
    description: 'Target order status in the preparation state machine',
  })
  @IsEnum(OrderStatus, { message: 'Must be a valid OrderStatus enum value' })
  @IsNotEmpty()
  status!: OrderStatus;

  @ApiPropertyOptional({
    example: 'Started brewing pour-over espresso shots',
    description: 'Barista or kitchen preparation notes',
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  notes?: string;
}
