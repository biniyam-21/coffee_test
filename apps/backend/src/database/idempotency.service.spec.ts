import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyService } from './idempotency.service';
import { PrismaService } from './prisma.service';
import { IdempotencyStatus } from '@prisma/client';
import { ConflictException, UnprocessableEntityException } from '@nestjs/common';

describe('IdempotencyService (Duplicate Order Submission Prevention)', () => {
  let service: IdempotencyService;
  let mockPrisma: {
    idempotencyKey: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    mockPrisma = {
      idempotencyKey: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<IdempotencyService>(IdempotencyService);
  });

  it('should acquire lock with status ACQUIRED when key is brand new', async () => {
    mockPrisma.idempotencyKey.findUnique.mockResolvedValue(null);
    mockPrisma.idempotencyKey.create.mockResolvedValue({ key: 'uuid-key-1' });

    const result = await service.acquireKey('uuid-key-1', 'user-1', 'hash-abc');

    expect(result).toEqual({ status: 'ACQUIRED', key: 'uuid-key-1' });
    expect(mockPrisma.idempotencyKey.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          key: 'uuid-key-1',
          userId: 'user-1',
          status: IdempotencyStatus.IN_PROGRESS,
        }),
      }),
    );
  });

  it('should return CACHED result when key previously completed successfully with identical hash', async () => {
    mockPrisma.idempotencyKey.findUnique.mockResolvedValue({
      key: 'uuid-key-1',
      requestHash: 'hash-abc',
      status: IdempotencyStatus.COMPLETED,
      responseCode: 201,
      responseBody: { orderId: 'ord-123', totalCents: 950 },
      expiresAt: new Date(Date.now() + 100000),
    });

    const result = await service.acquireKey('uuid-key-1', 'user-1', 'hash-abc');

    expect(result).toEqual({
      status: 'CACHED',
      responseCode: 201,
      responseBody: { orderId: 'ord-123', totalCents: 950 },
    });
  });

  it('should throw ConflictException when an identical key is currently IN_PROGRESS', async () => {
    mockPrisma.idempotencyKey.findUnique.mockResolvedValue({
      key: 'uuid-key-1',
      requestHash: 'hash-abc',
      status: IdempotencyStatus.IN_PROGRESS,
      expiresAt: new Date(Date.now() + 100000),
    });

    await expect(service.acquireKey('uuid-key-1', 'user-1', 'hash-abc')).rejects.toThrow(
      ConflictException,
    );
  });

  it('should throw UnprocessableEntityException when existing key is reused with a different payload hash', async () => {
    mockPrisma.idempotencyKey.findUnique.mockResolvedValue({
      key: 'uuid-key-1',
      requestHash: 'hash-original',
      status: IdempotencyStatus.COMPLETED,
      expiresAt: new Date(Date.now() + 100000),
    });

    await expect(service.acquireKey('uuid-key-1', 'user-1', 'hash-modified')).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('should update key status to COMPLETED with stored response on completion', async () => {
    await service.completeKey('uuid-key-1', 201, { orderId: 'ord-123' });

    expect(mockPrisma.idempotencyKey.update).toHaveBeenCalledWith({
      where: { key: 'uuid-key-1' },
      data: {
        status: IdempotencyStatus.COMPLETED,
        responseCode: 201,
        responseBody: { orderId: 'ord-123' },
      },
    });
  });

  it('should atomically reacquire a failed key for a retry', async () => {
    mockPrisma.idempotencyKey.findUnique.mockResolvedValue({
      key: 'uuid-key-1',
      requestHash: 'hash-abc',
      status: IdempotencyStatus.FAILED,
      expiresAt: new Date(Date.now() + 100000),
    });
    mockPrisma.idempotencyKey.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.acquireKey('uuid-key-1', 'user-1', 'hash-abc')).resolves.toEqual({
      status: 'ACQUIRED',
      key: 'uuid-key-1',
    });
    expect(mockPrisma.idempotencyKey.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: IdempotencyStatus.FAILED }),
        data: expect.objectContaining({ status: IdempotencyStatus.IN_PROGRESS }),
      }),
    );
  });
});
