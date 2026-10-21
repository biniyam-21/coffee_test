import {
  Injectable,
  ConflictException,
  UnprocessableEntityException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { IdempotencyStatus, Prisma } from '@prisma/client';

export type KeyAcquireResult =
  | { status: 'ACQUIRED'; key: string }
  | { status: 'CACHED'; responseCode: number; responseBody: unknown };

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates or acquires an idempotency lock for a client-supplied key.
   *
   * @param key Client-supplied UUID
   * @param userId Owner user ID
   * @param requestHash SHA-256 fingerprint of request URL and body
   * @param ttlHours Key lifespan in hours (default: 24)
   */
  async acquireKey(
    key: string,
    userId: string,
    requestHash: string,
    ttlHours = 24,
  ): Promise<KeyAcquireResult> {
    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { key },
    });

    if (existing) {
      // 1. If key is expired, allow overwrite
      if (existing.expiresAt < new Date()) {
        await this.prisma.idempotencyKey.delete({ where: { key } });
      } else {
        // 2. Validate request fingerprint consistency
        if (existing.requestHash !== requestHash) {
          throw new UnprocessableEntityException(
            'Idempotency key was previously used with a different request payload.',
          );
        }

        // 3. If request is still in flight, reject concurrent execution
        if (existing.status === IdempotencyStatus.IN_PROGRESS) {
          throw new ConflictException(
            'A request with this idempotency key is currently being processed. Please wait.',
          );
        }

        // 4. If request completed successfully, serve cached response
        if (existing.status === IdempotencyStatus.COMPLETED && existing.responseCode) {
          this.logger.log(`Idempotent cache hit for key ${key}`);
          return {
            status: 'CACHED',
            responseCode: existing.responseCode,
            responseBody: existing.responseBody,
          };
        }

        if (existing.status === IdempotencyStatus.FAILED) {
          const retry = await this.prisma.idempotencyKey.updateMany({
            where: {
              key,
              status: IdempotencyStatus.FAILED,
              requestHash,
              expiresAt: { gt: new Date() },
            },
            data: {
              status: IdempotencyStatus.IN_PROGRESS,
              responseCode: null,
              responseBody: Prisma.DbNull,
            },
          });
          if (retry.count === 1) return { status: 'ACQUIRED', key };
          throw new ConflictException('Concurrent retry detected for this idempotency key.');
        }
      }
    }

    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    try {
      await this.prisma.idempotencyKey.create({
        data: {
          key,
          userId,
          requestHash,
          status: IdempotencyStatus.IN_PROGRESS,
          expiresAt,
        },
      });

      return { status: 'ACQUIRED', key };
    } catch (error) {
      // Catch concurrent insert race condition via unique constraint violation
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Concurrent request detected for this idempotency key.');
      }
      throw error;
    }
  }

  /**
   * Finalizes the key with successful response data
   */
  async completeKey(key: string, responseCode: number, responseBody: unknown): Promise<void> {
    await this.prisma.idempotencyKey.update({
      where: { key },
      data: {
        status: IdempotencyStatus.COMPLETED,
        responseCode,
        responseBody: responseBody as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Marks key as failed so future retries are permitted
   */
  async failKey(key: string): Promise<void> {
    await this.prisma.idempotencyKey.update({
      where: { key },
      data: {
        status: IdempotencyStatus.FAILED,
      },
    });
  }
}
