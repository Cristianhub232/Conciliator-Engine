export class IchiChatFormatOptionsDto {
  tabular?: boolean;
  currency?: boolean;
  executive?: boolean;
  maxRecords?: number;
}

export class IchiLlmConfigDto {
  provider?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
}

export class IchiChatDto {
  pregunta!: string;
  context?: string;
  banco?: string;
  fecha?: string;
  enabledTools?: string[];
  formatOptions?: IchiChatFormatOptionsDto;
  llmConfig?: IchiLlmConfigDto;
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
