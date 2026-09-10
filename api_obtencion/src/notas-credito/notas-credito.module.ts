import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { NotasCreditoService } from './notas-credito.service';
import { NotasCreditoController } from './notas-credito.controller';
import { BancosModule } from '../bancos/bancos.module';

@Module({
  imports: [DatabaseModule, BancosModule],
  controllers: [NotasCreditoController],
  providers: [NotasCreditoService],
  exports: [NotasCreditoService],
})
export class NotasCreditoModule {}

