import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { DepuracionService } from './depuracion.service';
import { DepuracionController } from './depuracion.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [DepuracionController],
  providers: [DepuracionService],
  exports: [DepuracionService]
})
export class DepuracionModule {}
