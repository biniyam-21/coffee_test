import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'customer@akufada.local',
    description: 'Unique email address for login',
  })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @Length(5, 255)
  email!: string;

  @ApiProperty({
    example: 'Password123!',
    description:
      'Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character',
  })
  @IsString()
  @Length(8, 64)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password too weak: Must contain uppercase, lowercase, and a number or symbol',
  })
  password!: string;

  @ApiProperty({
    example: 'Abebe Bikila',
    description: 'Full display name of user',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  fullName!: string;

  @ApiPropertyOptional({
    example: '+251911223344',
    description: 'Optional phone number',
  })
  @IsOptional()
  @IsString()
  @Length(7, 30)
  phoneNumber?: string;
}
