import axios from 'axios';

export interface BancoItem {
  id?: number;
  codigo_banco: string;
  codigo: string;          // Formato normalizado 3 dígitos Oracle (ej: "102")
  codigo_4: string;        // Formato estándar 4 dígitos (ej: "0102")
  nombre_banco: string;    // Razón social completa
  nombre_corto: string;    // Nombre conciso amigable
  label: string;           // "102 — BANCO DE VENEZUELA"
}

// Catálogo base de los 29 bancos oficiales de Venezuela (carga inmediata sin flash ni espera)
export const BANCOS_OFICIALES_BASE: BancoItem[] = [
  { id: 2, codigo_banco: '102', codigo: '102', codigo_4: '0102', nombre_banco: 'Banco de Venezuela S.A.C.A. Banco Universal', nombre_corto: 'BANCO DE VENEZUELA', label: '102 — BANCO DE VENEZUELA' },
  { id: 4, codigo_banco: '105', codigo: '105', codigo_4: '0105', nombre_banco: 'Banco Mercantil, C.A. Banco Universal', nombre_corto: 'BANCO MERCANTIL', label: '105 — BANCO MERCANTIL' },
  { id: 9, codigo_banco: '134', codigo: '134', codigo_4: '0134', nombre_banco: 'Banesco Banco Universal S.A.C.A.', nombre_corto: 'BANESCO', label: '134 — BANESCO' },
  { id: 5, codigo_banco: '108', codigo: '108', codigo_4: '0108', nombre_banco: 'Banco Provincial, S.A. Banco Universal', nombre_corto: 'BANCO PROVINCIAL', label: '108 — BANCO PROVINCIAL' },
  { id: 3, codigo_banco: '104', codigo: '104', codigo_4: '0104', nombre_banco: 'Venezolano de Crédito, S.A. Banco Universal', nombre_corto: 'BANCO VENEZOLANO DE CRÉDITO', label: '104 — BANCO VENEZOLANO DE CRÉDITO' },
  { id: 6, codigo_banco: '114', codigo: '114', codigo_4: '0114', nombre_banco: 'Bancaribe C.A. Banco Universal', nombre_corto: 'BANCARIBE', label: '114 — BANCARIBE' },
  { id: 16, codigo_banco: '115', codigo: '115', codigo_4: '0115', nombre_banco: 'Banco Exterior C.A., Banco Universal', nombre_corto: 'BANCO EXTERIOR', label: '115 — BANCO EXTERIOR' },
  { id: 17, codigo_banco: '163', codigo: '163', codigo_4: '0163', nombre_banco: 'Banco del Tesoro C.A., Banco Universal', nombre_corto: 'BANCO DEL TESORO', label: '163 — BANCO DEL TESORO' },
  { id: 22, codigo_banco: '172', codigo: '172', codigo_4: '0172', nombre_banco: 'Bancamiga Banco Universal, C.A.', nombre_corto: 'BANCAMIGA', label: '172 — BANCAMIGA' },
  { id: 24, codigo_banco: '174', codigo: '174', codigo_4: '0174', nombre_banco: 'Banplus Banco Universal, C.A.', nombre_corto: 'BANPLUS', label: '174 — BANPLUS' },
  { id: 25, codigo_banco: '175', codigo: '175', codigo_4: '0175', nombre_banco: 'Banco Bicentenario del Pueblo, Banco Universal C.A.', nombre_corto: 'BANCO DIGITAL DE LOS TRABAJADORES (BICENTENARIO)', label: '175 — BANCO DIGITAL DE LOS TRABAJADORES (BICENTENARIO)' },
  { id: 26, codigo_banco: '177', codigo: '177', codigo_4: '0177', nombre_banco: 'Banco de la Fuerza Armada Nacional Bolivariana, B.U.', nombre_corto: 'BANFANB', label: '177 — BANFANB' },
  { id: 28, codigo_banco: '191', codigo: '191', codigo_4: '0191', nombre_banco: 'Banco Nacional de Crédito C.A., Banco Universal', nombre_corto: 'BANCO NACIONAL DE CRÉDITO (BNC)', label: '191 — BANCO NACIONAL DE CRÉDITO (BNC)' },
  { id: 8, codigo_banco: '128', codigo: '128', codigo_4: '0128', nombre_banco: 'Banco Caroní C.A. Banco Universal', nombre_corto: 'BANCO CARONÍ', label: '128 — BANCO CARONÍ' },
  { id: 10, codigo_banco: '137', codigo: '137', codigo_4: '0137', nombre_banco: 'Banco Sofitasa, Banco Universal', nombre_corto: 'BANCO SOFITASA', label: '137 — BANCO SOFITASA' },
  { id: 11, codigo_banco: '138', codigo: '138', codigo_4: '0138', nombre_banco: 'Banco Plaza, Banco Universal', nombre_corto: 'BANCO PLAZA', label: '138 — BANCO PLAZA' },
  { id: 13, codigo_banco: '151', codigo: '151', codigo_4: '0151', nombre_banco: 'BFC Banco Fondo Común C.A. Banco Universal', nombre_corto: 'BFC BANCO FONDO COMÚN', label: '151 — BFC BANCO FONDO COMÚN' },
  { id: 31, codigo_banco: '156', codigo: '156', codigo_4: '0156', nombre_banco: '100% Banco, Banco Universal C.A.', nombre_corto: '100% BANCO', label: '156 — 100% BANCO' },
  { id: 15, codigo_banco: '157', codigo: '157', codigo_4: '0157', nombre_banco: 'DelSur Banco Universal C.A.', nombre_corto: 'DELSUR BANCO UNIVERSAL', label: '157 — DELSUR BANCO UNIVERSAL' },
  { id: 18, codigo_banco: '166', codigo: '166', codigo_4: '0166', nombre_banco: 'Banco Agrícola de Venezuela C.A., Banco Universal', nombre_corto: 'BANCO AGRÍCOLA DE VENEZUELA', label: '166 — BANCO AGRÍCOLA DE VENEZUELA' },
  { id: 19, codigo_banco: '168', codigo: '168', codigo_4: '0168', nombre_banco: 'Bancrecer S.A., Banco Microfinanciero', nombre_corto: 'BANCRECER', label: '168 — BANCRECER' },
  { id: 20, codigo_banco: '169', codigo: '169', codigo_4: '0169', nombre_banco: 'Mi Banco, Banco Microfinanciero, C.A', nombre_corto: 'MI BANCO', label: '169 — MI BANCO' },
  { id: 21, codigo_banco: '171', codigo: '171', codigo_4: '0171', nombre_banco: 'Banco Activo C.A., Banco Universal', nombre_corto: 'BANCO ACTIVO', label: '171 — BANCO ACTIVO' },
  { id: 23, codigo_banco: '173', codigo: '173', codigo_4: '0173', nombre_banco: 'Banco Internacional de Desarrollo C.A., Banco Universal', nombre_corto: 'BANCO INTERNACIONAL DE DESARROLLO', label: '173 — BANCO INTERNACIONAL DE DESARROLLO' },
  { id: 27, codigo_banco: '178', codigo: '178', codigo_4: '0178', nombre_banco: 'N58 Banco Digital, Banco Microfinanciero', nombre_corto: 'N58 BANCO DIGITAL', label: '178 — N58 BANCO DIGITAL' },
  { id: 7, codigo_banco: '116', codigo: '116', codigo_4: '0116', nombre_banco: 'Banco Occidental de Descuento, Banco Universal C.A', nombre_corto: 'BANCO OCCIDENTAL DE DESCUENTO (BOD)', label: '116 — BANCO OCCIDENTAL DE DESCUENTO (BOD)' },
  { id: 12, codigo_banco: '146', codigo: '146', codigo_4: '0146', nombre_banco: 'Banco de la Gente Emprendedora C.A', nombre_corto: 'BANGENTE', label: '146 — BANGENTE' },
  { id: 29, codigo_banco: '601', codigo: '601', codigo_4: '0601', nombre_banco: 'Instituto Municipal de Crédito Popular', nombre_corto: 'INSTITUTO MUNICIPAL DE CRÉDITO POPULAR', label: '601 — INSTITUTO MUNICIPAL DE CRÉDITO POPULAR' },
  { id: 1, codigo_banco: '001', codigo: '001', codigo_4: '0001', nombre_banco: 'Banco Central de Venezuela', nombre_corto: 'BANCO CENTRAL DE VENEZUELA', label: '001 — BANCO CENTRAL DE VENEZUELA' },
];

// Mapa estático rápido por código
export const MAPA_BANCOS: Record<string, BancoItem> = BANCOS_OFICIALES_BASE.reduce(
  (acc, b) => {
    acc[b.codigo] = b;
    acc[b.codigo_4] = b;
    return acc;
  },
  {} as Record<string, BancoItem>
);

let catalogoActual: BancoItem[] = [...BANCOS_OFICIALES_BASE];
let fetchPromise: Promise<BancoItem[]> | null = null;

export async function fetchBancosCatalog(): Promise<BancoItem[]> {
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const res = await axios.get('/api/orquestador/bancos', { timeout: 4000 });
      if (res.data && res.data.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        catalogoActual = res.data.data;
        // Actualizar mapa
        catalogoActual.forEach((b) => {
          MAPA_BANCOS[b.codigo] = b;
          MAPA_BANCOS[b.codigo_4] = b;
        });
      }
    } catch (err) {
      console.warn('No se pudo conectar a /api/orquestador/bancos, usando catálogo base local:', err);
    }
    return catalogoActual;
  })();

  return fetchPromise;
}

export function getBancoNombre(codigo: string | null | undefined): string {
  if (!codigo) return 'DESCONOCIDO';
  const clean = String(codigo).trim();
  const c3 = clean.length === 4 && clean.startsWith('0') ? clean.substring(1) : clean;
  const banco = MAPA_BANCOS[c3] || MAPA_BANCOS[clean];
  return banco ? banco.nombre_corto : `BANCO ${clean}`;
}

export function getBancoLabel(codigo: string | null | undefined): string {
  if (!codigo) return '';
  const clean = String(codigo).trim();
  const c3 = clean.length === 4 && clean.startsWith('0') ? clean.substring(1) : clean;
  const banco = MAPA_BANCOS[c3] || MAPA_BANCOS[clean];
  return banco ? banco.label : `${clean} — BANCO ${clean}`;
}
