import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3010;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 ONT Conciliación API backend corriendo en http://0.0.0.0:${port}`);
}
bootstrap();

