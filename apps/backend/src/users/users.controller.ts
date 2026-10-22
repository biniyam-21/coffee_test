import { Controller, Get, Param, Patch, Body, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoleType } from '@akufada/shared';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UsersService } from './users.service';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('User Administration')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleType.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Search users and inspect assigned roles (Admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated users without password or token data' })
  @ApiResponse({ status: 403, description: 'Administrator role required' })
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update profile, active state, or assigned roles (Admin only)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Updated account, with sensitive fields excluded' })
  @ApiResponse({ status: 403, description: 'Administrator role required; self-lockout is blocked' })
  @ApiResponse({ status: 409, description: 'Last active administrator cannot be removed' })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateUser(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateUserAdminDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.updateUser(id, actor.id, dto);
  }
}
