import {
  IsString,
  IsUUID,
  IsInt,
  Min,
  IsOptional,
  IsBoolean,
  IsUrl,
  Length,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({ example: 'Ethiopian Yirgacheffe Pour Over (Updated)' })
  @IsOptional()
  @IsString()
  @Length(2, 150)
  name?: string;

  @ApiPropertyOptional({ example: 'ethiopian-yirgacheffe-pour-over-updated' })
  @IsOptional()
  @IsString()
  @Length(2, 150)
  slug?: string;

  @ApiPropertyOptional({ example: 'Updated flavor profile and notes' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 475, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Price cannot be negative' })
  basePriceCents?: number;

  @ApiPropertyOptional({ example: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd' })
  @IsOptional()
  @IsUrl({}, { message: 'Must be a valid URL' })
  imageUrl?: string;

  @ApiPropertyOptional({ example: true, description: 'Operational availability status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
