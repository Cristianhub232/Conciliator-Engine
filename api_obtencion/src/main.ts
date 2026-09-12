import * as net from 'net';
import * as dns from 'dns';

try {
  (net as any).setDefaultAutoSelectFamily?.(false);
  dns.setDefaultResultOrder?.('ipv4first');
} catch (e) {}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Configuración de Swagger OpenAPI 3.0
  const config = new DocumentBuilder()
    .setTitle('SIRONT — API Backend de Conciliación y Auditoría ONT')
    .setDescription(
      'Documentación técnica interactiva de los microservicios, endpoints y servicios de conciliación masiva, depuración, notas de crédito, usuarios y workflow de SIGECOF.'
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('planillas', 'Gestión de planillas, conciliación masiva, depuración TXT y cierre de expedientes')
    .addTag('notas-credito', 'Auditoría y conciliación de Notas de Crédito Bancarias')
    .addTag('depuracion', 'Depuración manual y autorizada de planillas')
    .addTag('auditoria', 'Trazabilidad y consulta de registros de auditoría')
    .addTag('usuarios', 'Gestión de usuarios de la plataforma')
    .addTag('auth', 'Autenticación y tokens JWT')
    .addTag('bot', 'Configuración y control del Bot de Conciliación Telegram')
    .addTag('configuracion', 'Conexión a Oracle DB y estado del sistema')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs-api', app, document, {
    customSiteTitle: 'SIRONT API — Documentación Swagger',
  });

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3010;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 ONT Conciliación API backend corriendo en http://0.0.0.0:${port}`);
  console.log(`📚 Documentación Swagger OpenAPI disponible en http://localhost:${port}/docs-api`);
}
bootstrap();
