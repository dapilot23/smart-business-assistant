import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ClerkStrategy } from './strategies/clerk.strategy';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'clerk' })],
  controllers: [AuthController],
  providers: [AuthService, ClerkStrategy],
  exports: [AuthService],
})
export class AuthModule {}
