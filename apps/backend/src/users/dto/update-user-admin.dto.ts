import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
} from 'class-validator';
import { RoleType } from '@akufada/shared';

export class UpdateUserAdminDto {
  @ApiPropertyOptional({ example: 'Abebe Bikila', minLength: 2, maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  fullName?: string;

  @ApiPropertyOptional({ example: '+251911223344', nullable: true, maxLength: 30 })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @Length(7, 30)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  phoneNumber?: string | null;

  @ApiPropertyOptional({ description: 'Disable sign-in without deleting the user or order history' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: RoleType, isArray: true, minItems: 1 })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(RoleType, { each: true })
  roles?: RoleType[];
}
