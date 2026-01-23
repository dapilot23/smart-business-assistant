import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '@/common/guards/clerk-auth.guard';
import { CurrentUser, CurrentUserPayload } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';

/**
 * Example controller showing Clerk authentication patterns
 */
@Controller('examples')
export class ExampleController {

  // ============================================
  // Protected Endpoints (require authentication)
  // ============================================

  /**
   * Protected endpoint - requires valid Clerk JWT
   * User info automatically extracted from token
   */
  @Get('protected')
  getProtectedData(@CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'This is protected data',
      user: {
        id: user.userId,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
      },
    };
  }

  /**
   * Get specific user field
   * Use CurrentUser with field name to extract single property
   */
  @Get('my-tenant')
  getMyTenant(@CurrentUser('tenantId') tenantId: string) {
    return {
      message: 'Your tenant ID',
      tenantId,
    };
  }

  /**
   * Create resource with tenant isolation
   * All data automatically scoped to user's tenant
   */
  @Post('resources')
  createResource(
    @Body() data: any,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    // In real service, pass tenantId to ensure data isolation
    return {
      message: 'Resource created',
      tenantId,
      data,
    };
  }

  // ============================================
  // Public Endpoints (no authentication required)
  // ============================================

  /**
   * Public endpoint - accessible without authentication
   * Use @Public() decorator to bypass ClerkAuthGuard
   */
  @Public()
  @Get('public')
  getPublicData() {
    return {
      message: 'This is public data',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Public health check
   */
  @Public()
  @Get('health')
  healthCheck() {
    return { status: 'ok' };
  }

  // ============================================
  // Explicit Guard Usage (optional)
  // ============================================

  /**
   * Explicitly use ClerkAuthGuard
   * Not needed since it's applied globally,
   * but shown for completeness
   */
  @UseGuards(ClerkAuthGuard)
  @Get('explicit-guard')
  withExplicitGuard(@CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'Using explicit guard',
      userId: user.userId,
    };
  }

  // ============================================
  // Role-Based Access (future enhancement)
  // ============================================

  /**
   * Admin-only endpoint example
   * You can create a custom RoleGuard to check user.role
   */
  @Get('admin-only')
  adminOnlyEndpoint(@CurrentUser() user: CurrentUserPayload) {
    // In practice, add a @Roles('ADMIN') decorator
    // and implement a RolesGuard
    if (user.role !== 'ADMIN') {
      throw new Error('Forbidden: Admin access required');
    }

    return {
      message: 'Admin-only data',
      adminEmail: user.email,
    };
  }
}
