import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PlanillasModule } from './planillas/planillas.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { ConfiguracionModule } from './configuracion/configuracion.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { DepuracionModule } from './depuracion/depuracion.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), 
    PlanillasModule, 
    AuditoriaModule,
    ConfiguracionModule,
    AuthModule,
    UsuariosModule,
    DepuracionModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
