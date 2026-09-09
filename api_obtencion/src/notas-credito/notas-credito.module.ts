import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { NotasCreditoService } from './notas-credito.service';
import { NotasCreditoController } from './notas-credito.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [NotasCreditoController],
  providers: [NotasCreditoService],
  exports: [NotasCreditoService],
})
export class NotasCreditoModule {}
