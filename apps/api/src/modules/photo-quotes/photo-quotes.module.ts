import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PhotoQuotesController } from './photo-quotes.controller';
import { PhotoQuotesService, PHOTO_QUOTE_QUEUE } from './photo-quotes.service';
import { PhotoQuotesProcessor } from './photo-quotes.processor';
import { StorageModule } from '../../config/storage/storage.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: PHOTO_QUOTE_QUEUE,
    }),
    StorageModule,
  ],
  controllers: [PhotoQuotesController],
  providers: [PhotoQuotesService, PhotoQuotesProcessor],
  exports: [PhotoQuotesService],
})
export class PhotoQuotesModule {}
