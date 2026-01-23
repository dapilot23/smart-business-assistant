import { Module } from '@nestjs/common';
import { ReviewRequestsController } from './review-requests.controller';
import { ReviewRequestsService } from './review-requests.service';
import { PrismaModule } from '../../config/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReviewRequestsController],
  providers: [ReviewRequestsService],
  exports: [ReviewRequestsService],
})
export class ReviewRequestsModule {}
