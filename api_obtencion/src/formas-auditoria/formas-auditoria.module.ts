import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FormasAuditoriaService } from './formas-auditoria.service';
import { FormasAuditoriaController } from './formas-auditoria.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [FormasAuditoriaController],
  providers: [FormasAuditoriaService],
  exports: [FormasAuditoriaService],
})
export class FormasAuditoriaModule {}
