import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { RoleType } from '@akufada/shared';

interface MockAuthPrisma {
  user: { findUnique: jest.Mock; create: jest.Mock };
  role: { findUnique: jest.Mock };
  userRole: { create: jest.Mock };
  refreshToken: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  $transaction: jest.Mock;
}

interface MockJwtService {
  sign: jest.Mock;
}

interface MockConfigService {
  get: jest.Mock;
}

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: MockAuthPrisma;
  let mockJwt: MockJwtService;
  let mockConfig: MockConfigService;

  beforeEach(async () => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      role: {
        findUnique: jest.fn(),
      },
      userRole: {
        create: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(mockPrisma)),
    };

    mockJwt = {
      sign: jest.fn().mockReturnValue('mock.jwt.token'),
    };

    mockConfig = {
      get: jest.fn().mockReturnValue('test-jwt-secret-key-32chars-minimum'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new customer with hashed password and CUSTOMER role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.role.findUnique.mockResolvedValue({ id: 1, name: RoleType.CUSTOMER });
      mockPrisma.user.create.mockResolvedValue({
        id: 'u-1',
        email: 'newuser@akufada.local',
        fullName: 'New Customer',
        phoneNumber: '+251911223344',
      });
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

      const result = await service.register({
        email: 'NewUser@akufada.local',
        password: 'Password123!',
        fullName: 'New Customer',
        phoneNumber: '+251911223344',
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'newuser@akufada.local' },
      });
      expect(mockPrisma.userRole.create).toHaveBeenCalledWith({
        data: { userId: 'u-1', roleId: 1 },
      });
      expect(result.user.roles).toEqual([RoleType.CUSTOMER]);
      expect(result.tokens.accessToken).toBe('mock.jwt.token');
    });

    it('should reject registration if email is already taken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u-existing' });

      await expect(
        service.register({
          email: 'existing@akufada.local',
          password: 'Password123!',
          fullName: 'Duplicate User',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should authenticate valid credentials and issue tokens', async () => {
      const passwordHash = await bcrypt.hash('Password123!', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        email: 'valid@akufada.local',
        passwordHash,
        fullName: 'Valid User',
        isActive: true,
        roles: [{ role: { name: RoleType.CUSTOMER } }],
      });
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

      const result = await service.login({
        email: 'valid@akufada.local',
        password: 'Password123!',
      });

      expect(result.user.email).toBe('valid@akufada.local');
      expect(result.tokens.accessToken).toBe('mock.jwt.token');
    });

    it('should reject login with invalid password using generic error', async () => {
      const passwordHash = await bcrypt.hash('DifferentPassword!', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        email: 'valid@akufada.local',
        passwordHash,
        isActive: true,
      });

      await expect(
        service.login({
          email: 'valid@akufada.local',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject login if account is inactive', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        email: 'inactive@akufada.local',
        isActive: false,
      });

      await expect(
        service.login({
          email: 'inactive@akufada.local',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('should rotate active refresh token and return new tokens', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'u-1',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 100000),
        user: {
          id: 'u-1',
          email: 'test@akufada.local',
          isActive: true,
          roles: [{ role: { name: RoleType.CUSTOMER } }],
        },
      });
      mockPrisma.refreshToken.update.mockResolvedValue({});
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const tokens = await service.refreshTokens({ refreshToken: 'valid-uuid' });

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id: 'rt-1', isRevoked: false, expiresAt: { gt: expect.any(Date) } },
        data: { isRevoked: true },
      });
      expect(tokens.accessToken).toBe('mock.jwt.token');
    });

    it('should detect replay attack on revoked token and revoke all sessions', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'u-1',
        isRevoked: true, // Already revoked!
        expiresAt: new Date(Date.now() + 100000),
        user: { id: 'u-1' },
      });

      await expect(service.refreshTokens({ refreshToken: 'stolen-uuid' })).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u-1', isRevoked: false },
        data: { isRevoked: true },
      });
    });
  });

  describe('logout', () => {
    it('should revoke all active refresh tokens for the user', async () => {
      await service.logout('u-1');

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u-1', isRevoked: false },
        data: { isRevoked: true },
      });
    });
  });
});
