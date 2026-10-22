import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { RoleType } from '@akufada/shared';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  roles: RoleType[];
  createdAt?: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: UserResponse;
  tokens: AuthTokens;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: string;
  private readonly jwtExpiresInSeconds = 900; // 15 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    const jwtSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    if (!jwtSecret || jwtSecret.length < 32) throw new Error('JWT_ACCESS_SECRET must contain at least 32 characters');
    this.jwtSecret = jwtSecret;
  }

  /**
   * Registers a new user. Public registration strictly assigns CUSTOMER role.
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    // Customer role is guaranteed to exist from seed/migrations
    const customerRole = await this.prisma.role.findUnique({
      where: { name: RoleType.CUSTOMER },
    });

    if (!customerRole) {
      throw new NotFoundException('Default CUSTOMER role not found in system');
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    let user;
    try {
      user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          fullName: dto.fullName.trim(),
          phoneNumber: dto.phoneNumber?.trim() || null,
        },
      });

      await tx.userRole.create({
        data: {
          userId: newUser.id,
          roleId: customerRole.id,
        },
      });

      return newUser;
      });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }

    const tokens = await this.generateTokens(user.id, user.email, [RoleType.CUSTOMER]);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        roles: [RoleType.CUSTOMER],
      },
      tokens,
    };
  }

  /**
   * Authenticates user credentials and issues tokens.
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!user || !user.isActive) {
      // Use generic error message to prevent account enumeration
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const roles = user.roles.map((ur) => ur.role.name as RoleType);
    const tokens = await this.generateTokens(user.id, user.email, roles);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        roles,
      },
      tokens,
    };
  }

  /**
   * Rotates a refresh token with single-use revocation and replay attack protection.
   */
  async refreshTokens(dto: RefreshTokenDto): Promise<AuthTokens> {
    const tokenHash = this.hashToken(dto.refreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            roles: {
              include: { role: true },
            },
          },
        },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Replay attack mitigation: If a revoked token is presented, revoke ALL tokens for this user
    if (storedToken.isRevoked) {
      this.logger.warn(
        `Security Alert: Revoked refresh token reused for user ${storedToken.userId}. Invalidating all active sessions.`,
      );
      await this.prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId, isRevoked: false },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException('Session terminated due to token reuse detection');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    if (!storedToken.user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Single-use token rotation: Mark current token as revoked
    const rotation = await this.prisma.refreshToken.updateMany({
      where: { id: storedToken.id, isRevoked: false, expiresAt: { gt: new Date() } },
      data: { isRevoked: true },
    });
    if (rotation.count !== 1) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId, isRevoked: false },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException('Session terminated due to token reuse detection');
    }

    const roles = storedToken.user.roles.map((ur) => ur.role.name as RoleType);

    return this.generateTokens(storedToken.user.id, storedToken.user.email, roles);
  }

  /**
   * Logs out the user by revoking all active refresh tokens.
   */
  async logout(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  /**
   * Retrieves authenticated profile.
   */
  async getProfile(userId: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new NotFoundException('User profile not found or inactive');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      roles: user.roles.map((ur) => ur.role.name as RoleType),
      createdAt: user.createdAt,
    };
  }

  /**
   * Generates a signed JWT access token and records a cryptographically secure refresh token.
   */
  private async generateTokens(
    userId: string,
    email: string,
    roles: RoleType[],
  ): Promise<AuthTokens> {
    const payload = { sub: userId, email, roles };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: this.jwtExpiresInSeconds,
    });

    const rawRefreshToken = crypto.randomUUID();
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: this.jwtExpiresInSeconds,
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
