import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { PostgresService } from './postgres.service';

@Module({
  imports: [ConfigModule],
  providers: [DatabaseService, PostgresService],
  exports: [DatabaseService, PostgresService],
})
export class DatabaseModule {}
