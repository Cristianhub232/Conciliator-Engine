import { Injectable, Logger } from '@nestjs/common';
import { PostgresService } from '../database/postgres.service';
import { ConfigService } from '@nestjs/config';

export interface BancoItem {
  id: number;
  codigo_banco: string;
  codigo: string;          // Formato normalizado 3 dígitos para Oracle (ej: "102")
  codigo_4: string;        // Formato estándar 4 dígitos (ej: "0102")
  nombre_banco: string;    // Razón social completa
  nombre_corto: string;    // Nombre conciso amigable
  label: string;           // "102 — BANCO DE VENEZUELA"
}

// Fallback estático con los 29 bancos oficiales de la República Bolivariana de Venezuela
const BANCOS_FALLBACK: Array<{ id: number; codigo_banco: string; nombre_banco: string }> = [
  { id: 1, codigo_banco: '001', nombre_banco: 'Banco Central de Venezuela' },
  { id: 2, codigo_banco: '102', nombre_banco: 'Banco de Venezuela S.A.C.A. Banco Universal' },
  { id: 3, codigo_banco: '104', nombre_banco: 'Venezolano de Crédito, S.A. Banco Universal' },
  { id: 4, codigo_banco: '105', nombre_banco: 'Banco Mercantil, C.A. Banco Universal' },
  { id: 5, codigo_banco: '108', nombre_banco: 'Banco Provincial, S.A. Banco Universal' },
  { id: 6, codigo_banco: '114', nombre_banco: 'Bancaribe C.A. Banco Universal' },
  { id: 16, codigo_banco: '115', nombre_banco: 'Banco Exterior C.A., Banco Universal' },
  { id: 7, codigo_banco: '116', nombre_banco: 'Banco Occidental de Descuento, Banco Universal C.A' },
  { id: 8, codigo_banco: '128', nombre_banco: 'Banco Caroní C.A. Banco Universal' },
  { id: 9, codigo_banco: '134', nombre_banco: 'Banesco Banco Universal S.A.C.A.' },
  { id: 10, codigo_banco: '137', nombre_banco: 'Banco Sofitasa, Banco Universal' },
  { id: 11, codigo_banco: '138', nombre_banco: 'Banco Plaza, Banco Universal' },
  { id: 12, codigo_banco: '146', nombre_banco: 'Banco de la Gente Emprendedora C.A' },
  { id: 13, codigo_banco: '151', nombre_banco: 'BFC Banco Fondo Común C.A. Banco Universal' },
  { id: 31, codigo_banco: '156', nombre_banco: '100% Banco, Banco Universal C.A.' },
  { id: 15, codigo_banco: '157', nombre_banco: 'DelSur Banco Universal C.A.' },
  { id: 17, codigo_banco: '163', nombre_banco: 'Banco del Tesoro C.A., Banco Universal' },
  { id: 18, codigo_banco: '166', nombre_banco: 'Banco Agrícola de Venezuela C.A., Banco Universal' },
  { id: 19, codigo_banco: '168', nombre_banco: 'Bancrecer S.A., Banco Microfinanciero' },
  { id: 20, codigo_banco: '169', nombre_banco: 'Mi Banco, Banco Microfinanciero, C.A' },
  { id: 21, codigo_banco: '171', nombre_banco: 'Banco Activo C.A., Banco Universal' },
  { id: 22, codigo_banco: '172', nombre_banco: 'Bancamiga Banco Universal, C.A.' },
  { id: 23, codigo_banco: '173', nombre_banco: 'Banco Internacional de Desarrollo C.A., Banco Universal' },
  { id: 24, codigo_banco: '174', nombre_banco: 'Banplus Banco Universal, C.A.' },
  { id: 25, codigo_banco: '175', nombre_banco: 'Banco Bicentenario del Pueblo, Banco Universal C.A.' },
  { id: 26, codigo_banco: '177', nombre_banco: 'Banco de la Fuerza Armada Nacional Bolivariana, B.U.' },
  { id: 27, codigo_banco: '178', nombre_banco: 'N58 Banco Digital, Banco Microfinanciero' },
  { id: 28, codigo_banco: '191', nombre_banco: 'Banco Nacional de Crédito C.A., Banco Universal' },
  { id: 29, codigo_banco: '601', nombre_banco: 'Instituto Municipal de Crédito Popular' },
];

const NOMBRES_CORTOS: Record<string, string> = {
  '001': 'BANCO CENTRAL DE VENEZUELA',
  '102': 'BANCO DE VENEZUELA',
  '104': 'BANCO VENEZOLANO DE CRÉDITO',
  '105': 'BANCO MERCANTIL',
  '108': 'BANCO PROVINCIAL',
  '114': 'BANCARIBE',
  '115': 'BANCO EXTERIOR',
  '116': 'BANCO OCCIDENTAL DE DESCUENTO (BOD)',
  '128': 'BANCO CARONÍ',
  '134': 'BANESCO',
  '137': 'BANCO SOFITASA',
  '138': 'BANCO PLAZA',
  '146': 'BANGENTE',
  '151': 'BFC BANCO FONDO COMÚN',
  '156': '100% BANCO',
  '157': 'DELSUR BANCO UNIVERSAL',
  '163': 'BANCO DEL TESORO',
  '166': 'BANCO AGRÍCOLA DE VENEZUELA',
  '168': 'BANCRECER',
  '169': 'MI BANCO',
  '171': 'BANCO ACTIVO',
  '172': 'BANCAMIGA',
  '173': 'BANCO INTERNACIONAL DE DESARROLLO',
  '174': 'BANPLUS',
  '175': 'BANCO DIGITAL DE LOS TRABAJADORES (BICENTENARIO)',
  '177': 'BANFANB',
  '178': 'N58 BANCO DIGITAL',
  '191': 'BANCO NACIONAL DE CRÉDITO (BNC)',
  '601': 'INSTITUTO MUNICIPAL DE CRÉDITO POPULAR',
};

@Injectable()
export class BancosService {
  private readonly logger = new Logger(BancosService.name);
  private cachedBancos: BancoItem[] | null = null;
  private cacheExpiresAt: number = 0;
  private readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

  constructor(
    private readonly pg: PostgresService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Normaliza un código bancario a 3 dígitos para Oracle INFN_CODIGO
   * Ej: "0102" -> "102", "102" -> "102", "001" -> "001"
   */
  public normalizarCodigoOracle(codigo: string | null | undefined): string {
    if (!codigo) return '';
    const clean = String(codigo).trim();
    if (clean.length === 4 && clean.startsWith('0')) {
      return clean.substring(1);
    }
    return clean;
  }

  /**
   * Normaliza un código bancario a 4 dígitos para estándar SUDEBAN
   * Ej: "102" -> "0102", "0102" -> "0102"
   */
  public normalizarCodigo4Digitos(codigo: string | null | undefined): string {
    if (!codigo) return '';
    const clean = String(codigo).trim();
    return clean.padStart(4, '0');
  }

  private mapearBanco(raw: { id: number; codigo_banco: string; nombre_banco: string }): BancoItem {
    const codOriginal = String(raw.codigo_banco || '').trim();
    const codigo3 = this.normalizarCodigoOracle(codOriginal);
    const codigo4 = this.normalizarCodigo4Digitos(codOriginal);
    const nombreSocial = String(raw.nombre_banco || '').trim();
    const nombreCorto = NOMBRES_CORTOS[codigo3] || nombreSocial.toUpperCase();
    const label = `${codigo3} — ${nombreCorto}`;

    return {
      id: raw.id,
      codigo_banco: codOriginal,
      codigo: codigo3,
      codigo_4: codigo4,
      nombre_banco: nombreSocial,
      nombre_corto: nombreCorto,
      label,
    };
  }

  /**
   * Obtiene todos los bancos desde PostgreSQL public.bancos o fallback
   */
  async getBancos(nombre?: string, codigo?: string): Promise<BancoItem[]> {
    const now = Date.now();
    let list: BancoItem[] = [];

    if (this.cachedBancos && this.cacheExpiresAt > now) {
      list = this.cachedBancos;
    } else {
      try {
        const queryRes = await this.pg.query<{
          id: number;
          codigo_banco: string;
          nombre_banco: string;
        }>(
          `SELECT id, codigo_banco, nombre_banco 
           FROM public.bancos 
           WHERE nombre_banco IS NOT NULL AND TRIM(nombre_banco) <> ''
           ORDER BY codigo_banco ASC`
        );

        if (queryRes.rows && queryRes.rows.length > 0) {
          list = queryRes.rows.map((r) => this.mapearBanco(r));
        } else {
          this.logger.warn('public.bancos retornó 0 filas; utilizando catálogo de respaldo');
          list = BANCOS_FALLBACK.map((r) => this.mapearBanco(r));
        }
      } catch (err) {
        this.logger.error('Error consultando public.bancos en PostgreSQL, utilizando respaldo:', err);
        list = BANCOS_FALLBACK.map((r) => this.mapearBanco(r));
      }

      this.cachedBancos = list;
      this.cacheExpiresAt = now + this.CACHE_TTL_MS;
    }

    // Filtrar opcionalmente según parámetros
    if (nombre || codigo) {
      const qNombre = (nombre || '').toLowerCase().trim();
      const qCod = (codigo || '').trim();

      list = list.filter((b) => {
        let matchNombre = false;
        let matchCod = false;

        if (qNombre) {
          matchNombre =
            b.nombre_banco.toLowerCase().includes(qNombre) ||
            b.nombre_corto.toLowerCase().includes(qNombre);
        }
        if (qCod) {
          matchCod =
            b.codigo.includes(qCod) ||
            b.codigo_4.includes(qCod) ||
            b.codigo_banco.includes(qCod);
        }

        if (qNombre && qCod) {
          return matchNombre || matchCod;
        }
        return matchNombre || matchCod;
      });
    }

    return list;
  }

  /**
   * Obtiene un banco específico por ID
   */
  async getBancoById(id: number): Promise<BancoItem | null> {
    const all = await this.getBancos();
    return all.find((b) => b.id === Number(id)) || null;
  }

  /**
   * Endpoint específico para Notas de Crédito y selectores rápidos
   * Responde según especificación: { nombre_banco, codigo_banco }
   */
  async getNotasCreditoBancos(): Promise<Array<{ nombre_banco: string; codigo_banco: string; codigo_4: string; label: string }>> {
    const list = await this.getBancos();
    return list.map((b) => ({
      nombre_banco: b.nombre_banco,
      codigo_banco: b.codigo,
      codigo_4: b.codigo_4,
      label: b.label,
    }));
  }
}
