import { Module } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { PrismaModule } from '../../config/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
