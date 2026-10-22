import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RoleType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryUsersDto) {
    const { page = 1, limit = 20, role, isActive, search } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput = {
      ...(typeof isActive === 'boolean' ? { isActive } : {}),
      ...(role ? { roles: { some: { role: { name: role } } } } : {}),
      ...(search?.trim()
        ? {
            OR: [
              { fullName: { contains: search.trim(), mode: 'insensitive' } },
              { email: { contains: search.trim(), mode: 'insensitive' } },
              { phoneNumber: { contains: search.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          phoneNumber: true,
          isActive: true,
          createdAt: true,
          roles: { select: { role: { select: { name: true } } } },
        },
      }),
    ]);

    return {
      data: users.map((user) => ({
        ...user,
        roles: user.roles.map(({ role: userRole }) => userRole.name),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async updateUser(targetUserId: string, actorUserId: string, dto: UpdateUserAdminDto) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const target = await tx.user.findUnique({
            where: { id: targetUserId },
            select: {
              id: true,
              email: true,
              fullName: true,
              phoneNumber: true,
              isActive: true,
              createdAt: true,
              roles: { select: { role: { select: { id: true, name: true } } } },
            },
          });

          if (!target) throw new NotFoundException('User not found');

          const currentRoles = target.roles.map(({ role }) => role.name);
          const nextRoles = dto.roles ?? currentRoles;
          const nextIsActive = dto.isActive ?? target.isActive;
          const removesAdmin = currentRoles.includes(RoleType.ADMIN) && !nextRoles.includes(RoleType.ADMIN);
          const disablesAdmin = currentRoles.includes(RoleType.ADMIN) && !nextIsActive;

          if (target.id === actorUserId && (removesAdmin || disablesAdmin)) {
            throw new ForbiddenException('You cannot remove your own administrator access or disable your account');
          }

          if (removesAdmin || disablesAdmin) {
            const activeAdminCount = await tx.user.count({
              where: { isActive: true, roles: { some: { role: { name: RoleType.ADMIN } } } },
            });
            if (activeAdminCount <= 1) {
              throw new ConflictException('The last active administrator cannot be removed or disabled');
            }
          }

          const nextRoleRecords = dto.roles
            ? await tx.role.findMany({ where: { name: { in: dto.roles } }, select: { id: true, name: true } })
            : target.roles.map(({ role }) => role);
          if (nextRoleRecords.length !== nextRoles.length) {
            throw new ConflictException('One or more requested roles are not configured');
          }

          if (dto.roles) {
            await tx.userRole.deleteMany({ where: { userId: targetUserId } });
            await tx.userRole.createMany({
              data: nextRoleRecords.map((role) => ({ userId: targetUserId, roleId: role.id })),
            });
          }

          const updated = await tx.user.update({
            where: { id: targetUserId },
            data: {
              ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
              ...(dto.phoneNumber !== undefined ? { phoneNumber: dto.phoneNumber } : {}),
              ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
            },
            select: {
              id: true,
              email: true,
              fullName: true,
              phoneNumber: true,
              isActive: true,
              createdAt: true,
            },
          });

          await tx.auditEvent.create({
            data: {
              userId: actorUserId,
              action: 'USER_ADMIN_UPDATED',
              entityName: 'User',
              entityId: targetUserId,
              oldValues: { fullName: target.fullName, phoneNumber: target.phoneNumber, isActive: target.isActive, roles: currentRoles },
              newValues: { fullName: updated.fullName, phoneNumber: updated.phoneNumber, isActive: updated.isActive, roles: nextRoles },
            },
          });

          return { ...updated, roles: nextRoles };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('The account changed at the same time. Reload and try again.');
      }
      throw error;
    }
  }
}
