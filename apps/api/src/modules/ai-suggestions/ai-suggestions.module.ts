import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { AiEngineModule } from '../ai-engine/ai-engine.module';
import { AiActionsModule } from '../ai-actions/ai-actions.module';
import { AiSuggestionsController } from './ai-suggestions.controller';
import { AiSuggestionsService } from './ai-suggestions.service';
import { ProactiveSuggestionsHandler } from './proactive-suggestions.handler';

@Module({
  imports: [
    PrismaModule,
    AiEngineModule,
    forwardRef(() => AiActionsModule),
  ],
  controllers: [AiSuggestionsController],
  providers: [AiSuggestionsService, ProactiveSuggestionsHandler],
  exports: [AiSuggestionsService],
})
export class AiSuggestionsModule {}
