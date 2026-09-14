import { Module } from '@nestjs/common';
import { IchiController } from './ichi.controller';
import { IchiService } from './ichi.service';
import { DatabaseModule } from '../database/database.module';
import { PipelineModule } from '../pipeline/pipeline.module';
import { IaModule } from '../ia/ia.module';

@Module({
  imports: [DatabaseModule, PipelineModule, IaModule],
  controllers: [IchiController],
  providers: [IchiService],
  exports: [IchiService],
})
export class IchiModule {}
