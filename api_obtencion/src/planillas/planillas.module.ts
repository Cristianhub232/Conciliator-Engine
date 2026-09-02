import { Module } from '@nestjs/common';
import { PlanillasService } from './planillas.service';
import { PlanillasController } from './planillas.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PlanillasController],
  providers: [PlanillasService],
  exports: [PlanillasService]
})
export class PlanillasModule {}
