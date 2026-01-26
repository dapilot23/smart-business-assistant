import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

// UUID regex pattern for tenant ID validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// CUID regex pattern (Prisma default IDs)
const CUID_REGEX = /^c[a-z0-9]{24}$/i;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  // SECURITY: RLS is mandatory in production
  private readonly isRlsEnabled = process.env.NODE_ENV === 'production'
    ? true
    : process.env.FEATURE_RLS_ENABLED === 'true';

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected successfully');

    // SECURITY: Verify RLS configuration in production
    if (this.isProduction) {
      if (!this.isRlsEnabled) {
        throw new Error('CRITICAL: RLS must be enabled in production');
      }
      this.logger.log('RLS enforcement: ENABLED (production mode)');
    } else {
      this.logger.log(`RLS enforcement: ${this.isRlsEnabled ? 'ENABLED' : 'DISABLED'} (development mode)`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  /**
   * Validates tenant ID format to prevent SQL injection
   */
  private validateTenantId(tenantId: string): boolean {
    // Accept both UUID and CUID formats
    return UUID_REGEX.test(tenantId) || CUID_REGEX.test(tenantId);
  }

  /**
   * Sets the current tenant context for RLS policies.
   * Must be called at the start of each request that needs tenant isolation.
   */
  async setTenantContext(tenantId: string): Promise<void> {
    if (!this.isRlsEnabled || !tenantId) return;

    // SECURITY: Validate tenant ID format to prevent injection
    if (!this.validateTenantId(tenantId)) {
      this.logger.error(`Invalid tenant ID format: ${tenantId}`);
      throw new Error('Invalid tenant ID format');
    }

    // Use parameterized query (Prisma.sql tagged template is safe)
    await this.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}::text, TRUE)`;
  }

  /**
   * Clears the current tenant context.
   * Should be called at the end of requests or for system-level operations.
   */
  async clearTenantContext(): Promise<void> {
    if (!this.isRlsEnabled) return;
    await this.$executeRaw`SELECT set_config('app.current_tenant_id', '', TRUE)`;
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
    // SECURITY: Prevent database wipe in production
    if (this.isProduction) {
      throw new Error('CRITICAL: Cannot clean database in production');
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
