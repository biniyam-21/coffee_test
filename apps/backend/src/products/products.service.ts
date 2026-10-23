import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StockMovementReason, Prisma } from '@prisma/client';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePriceCents: number;
  imageUrl: string | null;
  category: { id: string; name: string; slug: string };
  inventory: { inStock: boolean; availableQuantity: number };
  createdAt: Date;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Public catalog retrieval supporting search, category filter, and pagination.
   */
  async findAll(query: QueryProductsDto): Promise<PaginatedResult<ProductListItem>> {
    const { categoryId, search, page, limit, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(categoryId ? { categoryId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder.toLowerCase() },
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          inventory: {
            select: { quantity: true, lowStockThreshold: true },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    const transformedData = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      basePriceCents: p.basePriceCents,
      imageUrl: p.imageUrl,
      category: p.category,
      inventory: {
        inStock: (p.inventory?.quantity ?? 0) > 0,
        availableQuantity: p.inventory?.quantity ?? 0,
      },
      createdAt: p.createdAt,
    }));

    return {
      data: transformedData,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Retrieves single product detail by ID.
   */
  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        inventory: {
          select: { quantity: true, lowStockThreshold: true },
        },
      },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      basePriceCents: product.basePriceCents,
      imageUrl: product.imageUrl,
      category: product.category,
      inventory: {
        inStock: (product.inventory?.quantity ?? 0) > 0,
        availableQuantity: product.inventory?.quantity ?? 0,
      },
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  /**
   * Retrieves all active categories sorted by display order.
   */
  async findAllCategories() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        displayOrder: true,
      },
    });
  }

  /**
   * Administrative creation of products with inventory ledger and audit trail.
   */
  async create(dto: CreateProductDto, actorUserId?: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${dto.categoryId} not found`);
    }

    const existingSlug = await this.prisma.product.findUnique({
      where: { slug: dto.slug },
    });

    if (existingSlug) {
      throw new ConflictException(`Product slug '${dto.slug}' already exists`);
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          categoryId: dto.categoryId,
          name: dto.name.trim(),
          slug: dto.slug.trim(),
          description: dto.description?.trim() || null,
          basePriceCents: dto.basePriceCents,
          imageUrl: dto.imageUrl || null,
        },
      });

      const initialStock = dto.initialStock || 0;

      await tx.inventory.create({
        data: {
          productId: product.id,
          quantity: initialStock,
        },
      });

      if (initialStock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            userId: actorUserId || null,
            quantityDelta: initialStock,
            balanceAfter: initialStock,
            reason: StockMovementReason.RESTOCK_PURCHASE,
            notes: 'Initial inventory creation',
          },
        });
      }

      await tx.auditEvent.create({
        data: {
          userId: actorUserId || null,
          action: 'PRODUCT_CREATED',
          entityName: 'Product',
          entityId: product.id,
          newValues: {
            name: product.name,
            basePriceCents: product.basePriceCents,
            initialStock,
          },
        },
      });

      return product;
    });
  }

  /**
   * Administrative product updating with audit tracking for price adjustments.
   */
  async update(id: string, dto: UpdateProductDto, actorUserId?: string) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const existingSlug = await this.prisma.product.findUnique({
        where: { slug: dto.slug },
      });
      if (existingSlug) {
        throw new ConflictException(`Product slug '${dto.slug}' already exists`);
      }
    }

    if (dto.categoryId && dto.categoryId !== existing.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(`Category with ID ${dto.categoryId} not found`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: {
          ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
          ...(dto.name ? { name: dto.name.trim() } : {}),
          ...(dto.slug ? { slug: dto.slug.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description?.trim() || null }
            : {}),
          ...(dto.basePriceCents !== undefined ? { basePriceCents: dto.basePriceCents } : {}),
          ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });

      const action =
        dto.basePriceCents !== undefined && dto.basePriceCents !== existing.basePriceCents
          ? 'PRODUCT_PRICE_UPDATED'
          : 'PRODUCT_UPDATED';

      await tx.auditEvent.create({
        data: {
          userId: actorUserId || null,
          action,
          entityName: 'Product',
          entityId: id,
          oldValues: {
            name: existing.name,
            basePriceCents: existing.basePriceCents,
            isActive: existing.isActive,
          },
          newValues: {
            name: updated.name,
            basePriceCents: updated.basePriceCents,
            isActive: updated.isActive,
          },
        },
      });

      return updated;
    });
  }
}
