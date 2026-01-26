import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private isRlsEnabled = process.env.FEATURE_RLS_ENABLED === 'true';

  async onModuleInit() {
    await this.$connect();
    console.log('Database connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('Database disconnected');
  }

  /**
   * Sets the current tenant context for RLS policies.
   * Must be called at the start of each request that needs tenant isolation.
   */
  async setTenantContext(tenantId: string): Promise<void> {
    if (!this.isRlsEnabled || !tenantId) return;
    await this.$executeRawUnsafe(
      `SELECT set_config('app.current_tenant_id', $1, TRUE)`,
      tenantId
    );
  }

  /**
   * Clears the current tenant context.
   * Should be called at the end of requests or for system-level operations.
   */
  async clearTenantContext(): Promise<void> {
    if (!this.isRlsEnabled) return;
    await this.$executeRawUnsafe(
      `SELECT set_config('app.current_tenant_id', '', TRUE)`
    );
  }

  /**
   * Executes a callback with tenant context set.
   * Automatically clears context after execution.
   */
  async withTenantContext<T>(
    tenantId: string,
    callback: () => Promise<T>
  ): Promise<T> {
    await this.setTenantContext(tenantId);
    try {
      return await callback();
    } finally {
      await this.clearTenantContext();
    }
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    const models = Reflect.ownKeys(this).filter(
      (key) => typeof key === 'string' && key[0] !== '_' && key[0] !== '$',
    );

    return Promise.all(
      models.map((modelKey) => {
        const model = this[modelKey as string];
        if (model && typeof model.deleteMany === 'function') {
          return model.deleteMany();
        }
      }),
    );
  }
}
