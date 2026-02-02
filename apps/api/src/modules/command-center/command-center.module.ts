import { Module } from '@nestjs/common';
import { DashboardCacheService } from './dashboard-cache.service';
import { CommandCenterService } from './command-center.service';
import { CommandCenterController } from './command-center.controller';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { TaskLedgerModule } from '../task-ledger/task-ledger.module';

@Module({
  imports: [PrismaModule, TaskLedgerModule],
  controllers: [CommandCenterController],
  providers: [DashboardCacheService, CommandCenterService],
  exports: [DashboardCacheService, CommandCenterService],
})
export class CommandCenterModule {}
