import { PrismaClient } from '@prisma/client';
import prisma from '../lib/prisma';

/**
 * Base repository class providing common database operations
 */
export abstract class BaseRepository<T = any> {
  protected prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Find a single record by ID
   */
  async findById(id: string, include?: any): Promise<T | null> {
    return (this.prisma as any)[this.getModelName()].findUnique({
      where: { id },
      ...(include && { include }),
    });
  }

  /**
   * Find multiple records by criteria
   */
  async findMany(where?: any, include?: any, orderBy?: any): Promise<T[]> {
    return (this.prisma as any)[this.getModelName()].findMany({
      ...(where && { where }),
      ...(include && { include }),
      ...(orderBy && { orderBy }),
    });
  }

  /**
   * Create a new record
   */
  async create(data: any, include?: any): Promise<T> {
    return (this.prisma as any)[this.getModelName()].create({
      data,
      ...(include && { include }),
    });
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: any, include?: any): Promise<T> {
    return (this.prisma as any)[this.getModelName()].update({
      where: { id },
      data,
      ...(include && { include }),
    });
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<T> {
    return (this.prisma as any)[this.getModelName()].delete({
      where: { id },
    });
  }

  /**
   * Count records by criteria
   */
  async count(where?: any): Promise<number> {
    return (this.prisma as any)[this.getModelName()].count({
      ...(where && { where }),
    });
  }

  /**
   * Find first record matching criteria
   */
  async findFirst(where?: any, include?: any, orderBy?: any): Promise<T | null> {
    return (this.prisma as any)[this.getModelName()].findFirst({
      ...(where && { where }),
      ...(include && { include }),
      ...(orderBy && { orderBy }),
    });
  }

  /**
   * Execute raw transaction
   */
  async transaction<R>(fn: (tx: any) => Promise<R>): Promise<R> {
    return this.prisma.$transaction(fn);
  }

  /**
   * Get the Prisma model name for this repository
   * Must be implemented by child classes
   */
  protected abstract getModelName(): string;
}