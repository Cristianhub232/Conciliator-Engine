import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { PipelineModule } from '../pipeline/pipeline.module';
import { IaModule } from '../ia/ia.module';

@Module({
  imports: [PipelineModule, IaModule],
  providers: [TelegramService],
  exports: [TelegramService]
})
export class TelegramModule {}
