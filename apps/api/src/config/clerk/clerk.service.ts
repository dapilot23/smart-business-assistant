import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient } from '@clerk/backend';

@Injectable()
export class ClerkService {
  private clerkClient: ReturnType<typeof createClerkClient>;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    const publishableKey = this.configService.get<string>('CLERK_PUBLISHABLE_KEY');

    if (!secretKey) {
      throw new Error('CLERK_SECRET_KEY is not configured');
    }

    this.clerkClient = createClerkClient({
      secretKey,
      publishableKey,
    });
  }

  getClient() {
    return this.clerkClient;
  }

  getSecretKey(): string {
    return this.configService.get<string>('CLERK_SECRET_KEY') || '';
  }

  getPublishableKey(): string {
    return this.configService.get<string>('CLERK_PUBLISHABLE_KEY') || '';
  }
}
