import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { RoleType } from '@akufada/shared';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (
    roles: RoleType[] | undefined,
    user?: Partial<AuthenticatedUser>,
  ): ExecutionContext => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);

    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow access if no roles are required on route', () => {
    const context = createMockContext(undefined, { roles: [RoleType.CUSTOMER] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user is not authenticated on protected route', () => {
    const context = createMockContext([RoleType.STAFF], undefined);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow access if user has one of the required roles', () => {
    const context = createMockContext([RoleType.STAFF, RoleType.ADMIN], {
      id: 'u-1',
      roles: [RoleType.STAFF],
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should reject customer attempting staff or admin operations', () => {
    const context = createMockContext([RoleType.STAFF, RoleType.ADMIN], {
      id: 'u-1',
      roles: [RoleType.CUSTOMER],
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
