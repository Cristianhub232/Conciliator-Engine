import { Module } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { PipelineController } from './pipeline.controller';
import { PlanillasModule } from '../planillas/planillas.module';
import { DepuracionModule } from '../depuracion/depuracion.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [PlanillasModule, DepuracionModule, DatabaseModule],
  controllers: [PipelineController],
  providers: [PipelineService],
  exports: [PipelineService]
})
export class PipelineModule {}
