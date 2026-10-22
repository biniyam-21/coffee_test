import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'd820d935-8291-49b0-a36e-2144d2112e31',
    description: 'Active refresh token UUID',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
