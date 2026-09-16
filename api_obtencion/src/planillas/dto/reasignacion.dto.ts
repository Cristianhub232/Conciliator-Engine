import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConsultarExpedientesReasignacionDto {
  @ApiPropertyOptional({ 
    description: 'Usuario asignado actual (ej. GILLIAMS_0028 o TODOS)', 
    default: 'GILLIAMS_0028' 
  })
  usuario_origen?: string;

  @ApiPropertyOptional({ 
    description: 'Código de banco para filtrar (ej. 105, 134, 102)', 
    example: '105' 
  })
  banco?: string;

  @ApiPropertyOptional({ 
    description: 'Año del expediente', 
    default: 2024 
  })
  anho?: number;

  @ApiPropertyOptional({ 
    description: 'Mes de recaudación (ej. 01, 04, 05 o TODOS)', 
    example: '05' 
  })
  mes?: string;

  @ApiPropertyOptional({ 
    description: 'Estado del WorkItem (ABIERTA, PENDIENTE o TODOS)', 
    default: 'ABIERTA' 
  })
  estado_wi?: string;

  @ApiPropertyOptional({ 
    description: 'Término de búsqueda rápida por número de expediente', 
    example: '2627' 
  })
  search?: string;

  @ApiPropertyOptional({ 
    description: 'Límite de registros a retornar', 
    default: 100 
  })
  limit?: number;
}

export class ExpedienteSeleccionadoItemDto {
  @ApiProperty({ description: 'Número del expediente', example: 2627 })
  expediente: number;

  @ApiProperty({ description: 'Año del expediente', example: 2024 })
  anho: number;

  @ApiPropertyOptional({ description: 'ID de WorkItem actual a cerrar', example: 2 })
  workitem?: number;

  @ApiPropertyOptional({ description: 'Banco del expediente', example: '134' })
  banco?: string;

  @ApiPropertyOptional({ description: 'Fecha de recaudación (YYYY-MM-DD)', example: '2024-05-17' })
  fecha_recaudacion?: string;
}

export class EjecutarReasignacionDto {
  @ApiProperty({ 
    description: 'Lista de expedientes a reasignar', 
    type: [ExpedienteSeleccionadoItemDto] 
  })
  expedientes: ExpedienteSeleccionadoItemDto[];

  @ApiProperty({ 
    description: 'ID del transcriptor destino en WF_USERS (ej. CCONTRERAS_18)', 
    example: 'CCONTRERAS_18' 
  })
  nuevo_transcriptor: string;

  @ApiPropertyOptional({ 
    description: 'Usuario que ejecuta la reasignación en el sistema', 
    default: 'ONT_SIR_BOT' 
  })
  usuario_operador?: string;

  @ApiPropertyOptional({ 
    description: 'Observación institucional de la reasignación', 
    default: 'Reasignación de expedientes para balanceo de carga operativa' 
  })
  observacion?: string;
}

export class ConsultarExpedientesCierreDto {
  @ApiPropertyOptional({ 
    description: 'Año del expediente (ej. 2024 o TODOS)', 
    default: 2024 
  })
  anho?: number;

  @ApiPropertyOptional({ 
    description: 'Código de banco para filtrar (ej. 105, 114)', 
    example: '114' 
  })
  banco?: string;

  @ApiPropertyOptional({ 
    description: 'Usuario asignado actual (ej. GILLIAMS_0028 o TODOS)', 
    example: 'GILLIAMS_0028' 
  })
  usuario_asignado?: string;

  @ApiPropertyOptional({ 
    description: 'Mes de recaudación (ej. 01, 05, 07 o TODOS)', 
    example: 'TODOS' 
  })
  mes?: string;

  @ApiPropertyOptional({ 
    description: 'Término de búsqueda rápida por número de expediente', 
    example: '8379' 
  })
  search?: string;

  @ApiPropertyOptional({ 
    description: 'Límite de registros a retornar', 
    default: 100 
  })
  limit?: number;
}

export class EjecutarCierreMasivoDto {
  @ApiProperty({ 
    description: 'Lista de expedientes a cerrar formalmente en Workflow', 
    type: [ExpedienteSeleccionadoItemDto] 
  })
  expedientes: ExpedienteSeleccionadoItemDto[];

  @ApiPropertyOptional({ 
    description: 'Observación o justificación institucional del cierre', 
    default: 'Cierre de expediente con planillas 100% conciliadas' 
  })
  observacion?: string;

  @ApiPropertyOptional({ 
    description: 'Usuario que ejecuta la acción en el sistema', 
    default: 'ONT_SIR_BOT' 
  })
  usuario_operador?: string;
}

