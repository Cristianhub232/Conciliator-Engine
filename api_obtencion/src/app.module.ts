import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PlanillasModule } from './planillas/planillas.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { ConfiguracionModule } from './configuracion/configuracion.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { DepuracionModule } from './depuracion/depuracion.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { IaModule } from './ia/ia.module';
import { TelegramModule } from './telegram/telegram.module';
import { BotConfigModule } from './bot-config/bot-config.module';
import { FormasAuditoriaModule } from './formas-auditoria/formas-auditoria.module';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
import { loadRequiredEnvironment } from './config/env-loader';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      load: [() => loadRequiredEnvironment(path.resolve(process.cwd(), '.env'))],
    }),
    PlanillasModule, 
    AuditoriaModule,
    ConfiguracionModule,
    AuthModule,
    UsuariosModule,
    DepuracionModule,
    PipelineModule,
    IaModule,
    TelegramModule,
    BotConfigModule,
    FormasAuditoriaModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
