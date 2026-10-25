import { IsOptional, IsString, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelOrderDto {
  @ApiPropertyOptional({
    example: 'Changed mind before preparation started',
    description: 'Optional cancellation justification',
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  reason?: string;
}
