import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResult, QueryResultRow } from 'pg';

@Injectable()
export class PostgresService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PostgresService.name);
  private pool: Pool;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      this.pool = new Pool({
        host: this.configService.get<string>('PG_HOST') || '10.78.30.63',
        port: parseInt(this.configService.get<string>('PG_PORT') || '5432'),
        database: this.configService.get<string>('PG_DATABASE') || 'xmls',
        user: this.configService.get<string>('PG_USER') || 'ont',
        password: this.configService.get<string>('PG_PASSWORD') || '123456',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ssl: false,
      });

      // Validar conexión
      const client = await this.pool.connect();
      client.release();
      this.logger.log('PostgreSQL Connection Pool initialized successfully (10.78.30.63:5432/xmls).');
    } catch (err) {
      this.logger.error('Error connecting to PostgreSQL database:', err);
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.logger.log('PostgreSQL Connection Pool closed.');
    }
  }

  async query<T extends QueryResultRow = any>(text: string, params: any[] = []): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const res = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      if (duration > 500) {
        this.logger.warn(`Slow PostgreSQL query (${duration}ms): ${text.substring(0, 100)}...`);
      }
      return res;
    } catch (err) {
      this.logger.error(`Error executing PostgreSQL query: ${text}`, err);
      throw err;
    }
  }
}
