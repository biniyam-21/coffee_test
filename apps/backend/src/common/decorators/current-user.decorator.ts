import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RoleType } from '@akufada/shared';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  roles: RoleType[];
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    return data && user ? user[data] : user;
  },
);
