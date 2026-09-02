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
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), 
    PlanillasModule, 
    AuditoriaModule,
    ConfiguracionModule,
    AuthModule,
    UsuariosModule,
    DepuracionModule,
    PipelineModule,
    IaModule,
    TelegramModule,
    BotConfigModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
