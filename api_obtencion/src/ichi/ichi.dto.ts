export class IchiChatFormatOptionsDto {
  tabular?: boolean;
  currency?: boolean;
  executive?: boolean;
  maxRecords?: number;
}

export class IchiChatDto {
  pregunta!: string;
  context?: string;
  banco?: string;
  fecha?: string;
  enabledTools?: string[];
  formatOptions?: IchiChatFormatOptionsDto;
}

export class IchiExecuteToolDto {
  tool!: string;
  params?: Record<string, any>;
  formatOptions?: IchiChatFormatOptionsDto;
}

export interface IchiToolMetadata {
  id: string;
  nombre: string;
  descripcion: string;
  fuente: 'ORACLE_SIGECOF' | 'POSTGRES_LOCAL' | 'CATALOGO_API';
  parametros: string[];
  defaultHabilitado: boolean;
}
