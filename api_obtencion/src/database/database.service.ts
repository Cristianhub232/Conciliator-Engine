import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as oracledb from 'oracledb';

export interface OracleDbConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  sid?: string;
  service_name?: string;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private currentConfig: OracleDbConfig = {
    user: '',
    password: '',
    host: '',
    port: 1521,
    sid: '',
    service_name: '',
  };

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.currentConfig = {
      user: this.configService.get<string>('ORACLE_USER') || '',
      password: this.configService.get<string>('ORACLE_PASSWORD') || '',
      host: this.configService.get<string>('ORACLE_HOST') || '',
      port: Number(this.configService.get<number>('ORACLE_PORT')) || 1521,
      sid: this.configService.get<string>('ORACLE_SID') || '',
      service_name: this.configService.get<string>('ORACLE_SERVICE_NAME') || '',
    };

    try {
      const connectData = this.currentConfig.sid
        ? `(SID=${this.currentConfig.sid})`
        : `(SERVICE_NAME=${this.currentConfig.service_name || 'estatal'})`;

      const connectString = `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${this.currentConfig.host})(PORT=${this.currentConfig.port}))(CONNECT_DATA=${connectData}))`;
      
      await oracledb.createPool({
        poolAlias: 'default',
        user: this.currentConfig.user,
        password: this.currentConfig.password,
        connectString,
        poolMin: 2,
        poolMax: 30,
        poolIncrement: 2,
        poolTimeout: 300,
        poolPingInterval: 60,
        queueTimeout: 0, // No rechazar peticiones en cola por timeout
        enableStatistics: false,
      });
      this.logger.log(`Oracle Database pool created successfully (${this.currentConfig.host}:${this.currentConfig.port}) with max 30 connections.`);
    } catch (err) {
      this.logger.error('Error creating Oracle Database pool', err);
    }
  }

  async onModuleDestroy() {
    try {
      const pool = oracledb.getPool('default');
      if (pool) {
        await pool.close(10);
        this.logger.log('Oracle Database pool closed.');
      }
    } catch (err) {
      this.logger.error('Error closing Oracle Database pool', err);
    }
  }

  getCurrentConfig(): OracleDbConfig {
    return {
      host: this.currentConfig.host || this.configService.get<string>('ORACLE_HOST') || '',
      port: this.currentConfig.port || Number(this.configService.get<number>('ORACLE_PORT')) || 1521,
      sid: this.currentConfig.sid || this.configService.get<string>('ORACLE_SID') || '',
      service_name: this.currentConfig.service_name || this.configService.get<string>('ORACLE_SERVICE_NAME') || '',
      user: this.currentConfig.user || this.configService.get<string>('ORACLE_USER') || '',
      password: this.currentConfig.password || this.configService.get<string>('ORACLE_PASSWORD') || '',
    };
  }

  async testConnection(config: OracleDbConfig) {
    const startTime = Date.now();
    let conn;
    try {
      const connectData = config.sid
        ? `(SID=${config.sid})`
        : `(SERVICE_NAME=${config.service_name || 'estatal'})`;

      const connectString = `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${config.host})(PORT=${config.port}))(CONNECT_DATA=${connectData}))`;
      conn = await oracledb.getConnection({
        user: config.user,
        password: config.password,
        connectString,
      });

      const res = await conn.execute('SELECT banner FROM v$version WHERE ROWNUM = 1');
      const version = (res.rows as any[])?.[0]?.[0] || 'Oracle Database';
      const latency = Date.now() - startTime;

      return {
        success: true,
        latency,
        version,
        message: `Conexión exitosa a Oracle (${latency} ms)`,
      };
    } catch (err: any) {
      return {
        success: false,
        latency: Date.now() - startTime,
        error: err.message,
        message: `Fallo de conexión: ${err.message}`,
      };
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch {}
      }
    }
  }

  async reconnectPool(config: OracleDbConfig) {
    // 1. Probar antes de aplicar
    const testResult = await this.testConnection(config);
    if (!testResult.success) {
      throw new Error(testResult.message);
    }

    // 2. Cerrar pool anterior si existe
    try {
      const oldPool = oracledb.getPool('default');
      if (oldPool) {
        await oldPool.close(10);
      }
    } catch (err) {
      this.logger.warn('Aviso al cerrar pool anterior:', err);
    }

    // 3. Crear nuevo pool
    const connectData = config.sid
      ? `(SID=${config.sid})`
      : `(SERVICE_NAME=${config.service_name || 'estatal'})`;

    const connectString = `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${config.host})(PORT=${config.port}))(CONNECT_DATA=${connectData}))`;

    await oracledb.createPool({
      poolAlias: 'default',
      user: config.user,
      password: config.password,
      connectString,
      poolMin: 0,
      poolMax: 20,
      poolIncrement: 1,
      poolTimeout: 60,
      queueTimeout: 0,
    });

    this.currentConfig = {
      host: config.host,
      port: Number(config.port),
      sid: config.sid || '',
      service_name: config.service_name || '',
      user: config.user,
      password: config.password,
    };

    this.logger.log(`Oracle Database pool reconnected successfully to ${config.host}:${config.port}`);
    return {
      success: true,
      message: `Pool Oracle reconectado exitosamente a ${config.host}:${config.port}`,
      version: testResult.version,
      latency: testResult.latency,
    };
  }

  async executeQuery<T>(query: string, binds: any = [], options: oracledb.ExecuteOptions = {}): Promise<T[]> {
    let connection;
    try {
      connection = await this.getConnection();
      const execOptions: oracledb.ExecuteOptions = {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchAsString: [oracledb.CLOB],
        ...options,
      };
      const result = await connection.execute(query, binds, execOptions);
      return result.rows as T[];
    } catch (err) {
      this.logger.error(`Error executing query: ${query}`, err);
      throw err;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          this.logger.error('Error closing connection', err);
        }
      }
    }
  }

  async getConnection(): Promise<oracledb.Connection> {
    try {
      const pool = oracledb.getPool('default');
      const conn = await pool.getConnection();
      return conn;
    } catch (poolErr) {
      this.logger.warn('Pool getConnection failed, falling back to direct connection:', poolErr);
      const connectData = this.currentConfig.sid
        ? `(SID=${this.currentConfig.sid})`
        : `(SERVICE_NAME=${this.currentConfig.service_name || 'estatal'})`;

      const connectString = `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${this.currentConfig.host})(PORT=${this.currentConfig.port}))(CONNECT_DATA=${connectData}))`;
      return await oracledb.getConnection({
        user: this.currentConfig.user,
        password: this.currentConfig.password,
        connectString,
      });
    }
  }
}
