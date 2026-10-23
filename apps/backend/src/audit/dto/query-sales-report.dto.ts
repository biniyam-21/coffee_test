import { IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QuerySalesReportDto {
  @ApiPropertyOptional({
    example: '2026-10-01T00:00:00.000Z',
    description: 'Start date filter (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-10-26T23:59:59.999Z',
    description: 'End date filter (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
