import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { QueryAuditDto } from './dto/query-audit.dto';
import { QuerySalesReportDto } from './dto/query-sales-report.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleType } from '@akufada/shared';

@ApiTags('Administration & Reporting')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleType.ADMIN)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('audit-events')
  @ApiOperation({ summary: 'Query immutable administrative audit event trail (Admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated audit events' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin role required' })
  async findAuditEvents(@Query() query: QueryAuditDto) {
    return this.auditService.findAuditEvents(query);
  }

  @Get('reports/sales')
  @ApiOperation({ summary: 'Generate aggregated sales report and top selling items (Admin only)' })
  @ApiResponse({ status: 200, description: 'Aggregated sales metrics' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin role required' })
  async getSalesReport(@Query() query: QuerySalesReportDto) {
    return this.auditService.getSalesReport(query);
  }
}
