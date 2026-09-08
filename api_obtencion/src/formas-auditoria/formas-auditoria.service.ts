import { Injectable, OnModuleInit, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PostgresService } from '../database/postgres.service';

export interface FormaAuditoriaRecord {
  cod_forma: string;
  auditada: boolean;
  usuario_auditor: string | null;
  fecha_auditoria: string | null;
  version_auditada: number;
  observaciones: string | null;
  created_at?: string;
  updated_at?: string;
}

export class SetAuditoriaDto {
  auditada: boolean;
  usuario_auditor?: string;
  observaciones?: string;
  version_auditada?: number;
}

@Injectable()
export class FormasAuditoriaService implements OnModuleInit {
  private readonly logger = new Logger(FormasAuditoriaService.name);

  constructor(private readonly pg: PostgresService) {}

  async onModuleInit() {
    try {
      await this.pg.query(`
        CREATE TABLE IF NOT EXISTS motor_app.formas_auditoria (
          cod_forma VARCHAR(20) PRIMARY KEY,
          auditada BOOLEAN NOT NULL DEFAULT FALSE,
          usuario_auditor VARCHAR(150),
          fecha_auditoria TIMESTAMP WITH TIME ZONE,
          version_auditada INT DEFAULT 1,
          observaciones TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      this.logger.log('Tabla motor_app.formas_auditoria verificada en PostgreSQL.');
    } catch (err) {
      this.logger.error('Error inicializando tabla motor_app.formas_auditoria:', err);
    }
  }

  async getAll(): Promise<Record<string, FormaAuditoriaRecord>> {
    try {
      const res = await this.pg.query<FormaAuditoriaRecord>(
        `SELECT cod_forma, auditada, usuario_auditor, fecha_auditoria, version_auditada, observaciones, updated_at 
         FROM motor_app.formas_auditoria`
      );
      const map: Record<string, FormaAuditoriaRecord> = {};
      for (const row of res.rows) {
        map[row.cod_forma] = row;
      }
      return map;
    } catch (err: any) {
      this.logger.error('Error obteniendo formas auditadas:', err);
      throw new HttpException(
        { message: 'Error al consultar auditorías de formas en base de datos', error: err.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getByCod(codForma: string): Promise<FormaAuditoriaRecord | null> {
    try {
      const res = await this.pg.query<FormaAuditoriaRecord>(
        `SELECT cod_forma, auditada, usuario_auditor, fecha_auditoria, version_auditada, observaciones, updated_at 
         FROM motor_app.formas_auditoria 
         WHERE cod_forma = $1`,
        [codForma]
      );
      return res.rows[0] || null;
    } catch (err: any) {
      this.logger.error(`Error consultando auditoría de forma ${codForma}:`, err);
      throw new HttpException(
        { message: 'Error al consultar forma auditada', error: err.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async setAuditoria(codForma: string, dto: SetAuditoriaDto): Promise<FormaAuditoriaRecord> {
    try {
      const fechaAuditoria = dto.auditada ? new Date().toISOString() : null;
      const res = await this.pg.query<FormaAuditoriaRecord>(
        `INSERT INTO motor_app.formas_auditoria 
          (cod_forma, auditada, usuario_auditor, fecha_auditoria, version_auditada, observaciones, updated_at)
         VALUES 
          ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
         ON CONFLICT (cod_forma) DO UPDATE SET
          auditada = EXCLUDED.auditada,
          usuario_auditor = EXCLUDED.usuario_auditor,
          fecha_auditoria = EXCLUDED.fecha_auditoria,
          version_auditada = COALESCE(EXCLUDED.version_auditada, motor_app.formas_auditoria.version_auditada),
          observaciones = COALESCE(EXCLUDED.observaciones, motor_app.formas_auditoria.observaciones),
          updated_at = CURRENT_TIMESTAMP
         RETURNING cod_forma, auditada, usuario_auditor, fecha_auditoria, version_auditada, observaciones, updated_at`,
        [
          codForma,
          dto.auditada,
          dto.usuario_auditor || (dto.auditada ? 'Usuario Auditor' : null),
          fechaAuditoria,
          dto.version_auditada || 1,
          dto.observaciones || null
        ]
      );
      return res.rows[0];
    } catch (err: any) {
      this.logger.error(`Error guardando auditoría de forma ${codForma}:`, err);
      throw new HttpException(
        { message: 'Error al actualizar auditoría de la forma', error: err.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
