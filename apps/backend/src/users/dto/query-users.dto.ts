import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RoleType } from '@akufada/shared';

export class QueryUsersDto {
  @ApiPropertyOptional({ description: 'Search name, email, or phone number', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: RoleType })
  @IsOptional()
  @IsEnum(RoleType)
  role?: RoleType;

  @ApiPropertyOptional({ description: 'Filter by account active state' })
  @IsOptional()
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
