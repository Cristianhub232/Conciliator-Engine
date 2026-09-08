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
  private activePool: oracledb.Pool | null = null;
  private readPool: oracledb.Pool | null = null;
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
      
      this.activePool = await oracledb.createPool({
        user: this.currentConfig.user,
        password: this.currentConfig.password,
        connectString,
        poolMin: 2,
        poolMax: 30,
        poolIncrement: 2,
        poolTimeout: 300,
        poolPingInterval: 60,
        queueTimeout: 0,
        enableStatistics: false,
      });
      this.logger.log(`Oracle Database pool created successfully (${this.currentConfig.host}:${this.currentConfig.port}) with max 30 connections.`);

      // En producción (10.79.6.247), inicializar readPool con ONT_SIR_BOT_AUDIT para consultas con WFE_WORKFLOW
      if (this.currentConfig.host === '10.79.6.247') {
        try {
          this.readPool = await oracledb.createPool({
            user: 'ONT_SIR_BOT_AUDIT',
            password: 'K#9xP$7mQ!2vW8z',
            connectString,
            poolMin: 1,
            poolMax: 15,
            poolIncrement: 1,
            poolTimeout: 300,
            poolPingInterval: 60,
            queueTimeout: 0,
            enableStatistics: false,
          });
          this.logger.log(`Oracle Read/Audit Pool initialized for WFE_WORKFLOW queries.`);
        } catch (readErr) {
          this.logger.warn(`Could not create readPool for ONT_SIR_BOT_AUDIT:`, readErr);
        }
      }
    } catch (err) {
      this.logger.error('Error creating Oracle Database pool', err);
    }
  }

  async onModuleDestroy() {
    try {
      if (this.activePool) {
        await this.activePool.close(0);
        this.activePool = null;
        this.logger.log('Oracle Database pool closed.');
      }
      if (this.readPool) {
        await this.readPool.close(0);
        this.readPool = null;
        this.logger.log('Oracle Read/Audit pool closed.');
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
    if (this.activePool) {
      try {
        await this.activePool.close(0);
      } catch (err) {
        this.logger.warn('Aviso al cerrar pool activo:', err);
      }
      this.activePool = null;
    }

    try {
      const oldDefault = oracledb.getPool('default');
      if (oldDefault) {
        await oldDefault.close(0);
      }
    } catch {}

    // 3. Crear nuevo pool anónimo (sin alias colisionable)
    const connectData = config.sid
      ? `(SID=${config.sid})`
      : `(SERVICE_NAME=${config.service_name || 'estatal'})`;

    const connectString = `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${config.host})(PORT=${config.port}))(CONNECT_DATA=${connectData}))`;

    this.activePool = await oracledb.createPool({
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

    // Si reconectamos a producción, asegurar también readPool
    if (this.readPool) {
      try {
        await this.readPool.close(0);
      } catch {}
      this.readPool = null;
    }
    if (config.host === '10.79.6.247') {
      try {
        this.readPool = await oracledb.createPool({
          user: 'ONT_SIR_BOT_AUDIT',
          password: 'K#9xP$7mQ!2vW8z',
          connectString,
          poolMin: 1,
          poolMax: 15,
          poolIncrement: 1,
          poolTimeout: 300,
          poolPingInterval: 60,
          queueTimeout: 0,
          enableStatistics: false,
        });
        this.logger.log(`Oracle Read/Audit Pool reconnected for WFE_WORKFLOW queries.`);
      } catch (rErr) {
        this.logger.warn(`Could not recreate readPool:`, rErr);
      }
    }

    return {
      success: true,
      message: `Pool Oracle reconectado exitosamente a ${config.host}:${config.port}`,
      version: testResult.version,
      latency: testResult.latency,
    };
  }

  async executeQuery<T>(query: string, binds: any = [], options: oracledb.ExecuteOptions = {}): Promise<T[]> {
    let connection: oracledb.Connection | null = null;
    const queryUpper = query.toUpperCase();
    const prefersReadPool = Boolean(
      this.readPool && (queryUpper.includes('WFE_WORKFLOW') || queryUpper.includes('MV_'))
    );

    try {
      if (prefersReadPool && this.readPool) {
        connection = await this.readPool.getConnection();
      } else {
        connection = await this.getConnection();
      }

      const execOptions: oracledb.ExecuteOptions = {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchAsString: [oracledb.CLOB],
        ...options,
      };
      const result = await connection.execute(query, binds, execOptions);
      return result.rows as T[];
    } catch (err: any) {
      // Si la consulta arrojó ORA-01031 (permisos insuficientes) y tenemos readPool, reintentar automáticamente con readPool
      if (err?.message && err.message.includes('ORA-01031') && this.readPool && !prefersReadPool) {
        if (connection) {
          try { await connection.close(); } catch {}
          connection = null;
        }
        try {
          connection = await this.readPool.getConnection();
          const execOptions: oracledb.ExecuteOptions = {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
            fetchAsString: [oracledb.CLOB],
            ...options,
          };
          const retryRes = await connection.execute(query, binds, execOptions);
          return retryRes.rows as T[];
        } catch (retryErr) {
          this.logger.error(`Error executing query with readPool retry: ${query}`, retryErr);
          throw retryErr;
        }
      }

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

  async getReadConnection(): Promise<oracledb.Connection> {
    if (this.readPool) {
      try {
        return await this.readPool.getConnection();
      } catch (err) {
        this.logger.warn('Error obteniendo conexion de readPool, fallback a activePool:', err);
      }
    }
    return await this.getConnection();
  }

  async getConnection(): Promise<oracledb.Connection> {
    try {
      if (this.activePool) {
        return await this.activePool.getConnection();
      }
      try {
        const pool = oracledb.getPool('default');
        return await pool.getConnection();
      } catch {}
      
      throw new Error('Pool no disponible');
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
