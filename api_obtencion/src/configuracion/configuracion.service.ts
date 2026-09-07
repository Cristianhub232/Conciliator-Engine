import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService, OracleDbConfig } from '../database/database.service';
import * as fs from 'fs';
import * as path from 'path';

export interface EnvironmentPreset {
  id: string;
  nombre: string;
  descripcion: string;
  host: string;
  port: number;
  sid?: string;
  service_name?: string;
  user: string;
  password?: string;
}

@Injectable()
export class ConfiguracionService {
  private readonly logger = new Logger(ConfiguracionService.name);
  private readonly envPath = path.join(process.cwd(), '.env');

  constructor(private readonly db: DatabaseService) {}

  getPresets(): EnvironmentPreset[] {
    return [
      {
        id: 'desarrollo',
        nombre: 'Desarrollo / Certificación',
        descripcion: 'Servidor Oracle 19c cert_rep (Ambiente de Pruebas ONT)',
        host: '172.21.65.90',
        port: 1521,
        sid: 'cert_rep',
        service_name: 'estatal',
        user: 'ONT_SIR_BOT',
        password: 'ONT_SIR_BOT123456',
      },
      {
        id: 'produccion',
        nombre: 'Producción SIGECOF',
        descripcion: 'Servidor Central SIGECOF Oracle 12c/19c (Producción)',
        host: '10.79.6.247',
        port: 1521,
        sid: 'sige1',
        service_name: 'sige1',
        user: 'consulta',
        password: 'pumyra1584',
      },
    ];
  }

  getCurrentEnv() {
    const current = this.db.getCurrentConfig();
    const presets = this.getPresets();

    // Detectar perfil activo
    let perfilActivo = 'personalizado';
    if (current.host === '172.21.65.90') perfilActivo = 'desarrollo';
    else if (current.host === '10.79.6.247') perfilActivo = 'produccion';

    return {
      status: 200,
      config: current,
      perfilActivo,
      presets,
    };
  }

  async testConnection(config: OracleDbConfig) {
    return await this.db.testConnection(config);
  }

  async saveEnvAndReconnect(config: OracleDbConfig) {
    try {
      // 1. Reconectar Pool en memoria
      const reconnectRes = await this.db.reconnectPool(config);

      // 2. Actualizar .env preservando el resto de las variables (PostgreSQL, Telegram, IA, JWT)
      let envLines: string[] = [];
      if (fs.existsSync(this.envPath)) {
        const raw = await fs.promises.readFile(this.envPath, 'utf8');
        envLines = raw.split('\n');
      }

      const updates: Record<string, string> = {
        ORACLE_HOST: config.host,
        ORACLE_PORT: String(config.port || 1521),
        ORACLE_SERVICE_NAME: config.service_name || '',
        ORACLE_SID: config.sid || '',
        ORACLE_USER: config.user,
        ORACLE_PASSWORD: config.password || '',
      };

      const formatEnvValue = (key: string, val: string) => {
        // Envolver contraseñas, secretos o valores con caracteres especiales (#, $, !, comillas, espacios) en comillas dobles
        if (key.includes('PASSWORD') || key.includes('SECRET') || /[#$!\s"']/.test(val)) {
          const escaped = val.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          return `${key}="${escaped}"`;
        }
        return `${key}=${val}`;
      };

      const updatedKeys = new Set<string>();
      const newLines = envLines.map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || !trimmed.includes('=')) return line;
        const key = trimmed.split('=')[0].trim();
        if (Object.prototype.hasOwnProperty.call(updates, key)) {
          updatedKeys.add(key);
          return formatEnvValue(key, updates[key]);
        }
        return line;
      });

      for (const [key, val] of Object.entries(updates)) {
        if (!updatedKeys.has(key)) {
          newLines.push(formatEnvValue(key, val));
        }
      }

      await fs.promises.writeFile(this.envPath, newLines.join('\n'), 'utf8');
      this.logger.log(`Archivo .env actualizado exitosamente en ${this.envPath}`);

      return {
        status: 200,
        success: true,
        message: 'Configuración guardada en .env y Pool de Oracle reconectado exitosamente en caliente.',
        reconnectRes,
      };
    } catch (err: any) {
      this.logger.error('Error al guardar .env o reconectar pool:', err);
      throw new Error(`Error al aplicar configuración: ${err.message}`);
    }
  }
}
