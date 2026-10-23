import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsInt,
  Min,
  IsOptional,
  IsUrl,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Category UUID' })
  @IsUUID('4')
  categoryId!: string;

  @ApiProperty({ example: 'Ethiopian Yirgacheffe Pour Over', description: 'Product title' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 150)
  name!: string;

  @ApiProperty({ example: 'ethiopian-yirgacheffe-pour-over', description: 'Unique URL slug' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 150)
  slug!: string;

  @ApiPropertyOptional({ example: 'Floral aroma with bright bergamot and jasmine notes.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 450,
    description: 'Product price in exact integer cents ($4.50 = 450)',
    minimum: 0,
  })
  @IsInt()
  @Min(0, { message: 'Price cannot be negative' })
  basePriceCents!: number;

  @ApiPropertyOptional({ example: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd' })
  @IsOptional()
  @IsUrl({}, { message: 'Must be a valid URL' })
  imageUrl?: string;

  @ApiPropertyOptional({ example: 50, default: 0, description: 'Initial inventory quantity' })
  @IsOptional()
  @IsInt()
  @Min(0)
  initialStock: number = 0;
}
