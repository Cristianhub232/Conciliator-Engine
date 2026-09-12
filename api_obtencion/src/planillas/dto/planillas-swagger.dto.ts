import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PartidaAsignacionDto {
  @ApiProperty({ description: 'Código de partida presupuestaria', example: '3.01.01.01.00' })
  partida!: string;

  @ApiProperty({ description: 'Monto asignado a la partida', example: 1500.50 })
  monto!: number;
}

export class ConciliarPayloadDto {
  @ApiProperty({ description: 'Usuario que ejecuta la acción', example: 'MAIRA_0018' })
  usuario_operador!: string;

  @ApiProperty({ description: 'Número de expediente presupuestario', example: 7638 })
  expediente!: number;

  @ApiProperty({ description: 'ID único del lote en Oracle', example: 842 })
  lote_id!: number;

  @ApiProperty({ description: 'Secuencia del lote dentro del expediente', example: 14 })
  lote_seq!: number;

  @ApiProperty({ description: 'ID o serial de la planilla', example: '10524' })
  planilla_id!: string;

  @ApiProperty({ description: 'Código de forma tributaria (ej: 99044)', example: '99044' })
  forma!: string;

  @ApiProperty({ description: 'Monto total de la planilla', example: 1500.50 })
  monto!: number;

  @ApiProperty({ description: 'Código de banco (3 o 4 dígitos)', example: '007' })
  banco!: string;

  @ApiProperty({ description: 'Código de agencia bancaria', example: '001' })
  agencia!: string;

  @ApiProperty({ description: 'Fecha de recaudación (YYYY-MM-DD)', example: '2024-05-15' })
  fecha_recaudacion!: string;

  @ApiProperty({ type: [PartidaAsignacionDto], description: 'Asignaciones de partida presupuestaria' })
  asignaciones!: PartidaAsignacionDto[];
}

export class RevertirPayloadDto {
  @ApiProperty({ description: 'Usuario operador que solicita reversión', example: 'ADMIN_ONT' })
  usuario_operador!: string;

  @ApiProperty({ description: 'ID o serial de la planilla a revertir', example: '10524' })
  planilla_id!: string;

  @ApiProperty({ description: 'Código de banco (3 o 4 dígitos)', example: '007' })
  banco!: string;

  @ApiProperty({ description: 'Fecha de recaudación (YYYY-MM-DD)', example: '2024-05-15' })
  fecha_recaudacion!: string;

  @ApiPropertyOptional({ description: 'Código de forma tributaria', example: '99044' })
  forma?: string;

  @ApiPropertyOptional({ description: 'Código de agencia bancaria', example: '001' })
  agencia?: string;
}

export class CerrarExpedienteDto {
  @ApiProperty({ description: 'Número de expediente a cerrar en Oracle WFE_WORKFLOW', example: 7638 })
  expediente!: number;

  @ApiProperty({ description: 'Año fiscal del expediente', example: 2024 })
  anho!: number;

  @ApiProperty({ description: 'Usuario revisor al cual reasignar el expediente (ej. TIBISAYRIVAS)', example: 'TIBISAYRIVAS' })
  analista_asignado!: string;

  @ApiPropertyOptional({ description: 'Usuario operador que ejecuta el cierre', example: 'MAIRA_0018' })
  usuario_operador?: string;

  @ApiPropertyOptional({ description: 'Observación institucional del cierre', example: 'Cierre verificado sin diferencias en planillas' })
  observacion?: string;

  @ApiPropertyOptional({ description: 'Fecha de recaudación asociada', example: '2024-05-15' })
  fecha_recaudacion?: string;

  @ApiPropertyOptional({ description: 'Código de banco', example: '007' })
  banco?: string;
}

export class DepurarDuplicadosTxtDto {
  @ApiProperty({ description: 'Fecha de recaudación a depurar (YYYY-MM-DD)', example: '2024-05-15' })
  fecha!: string;

  @ApiProperty({ description: 'Código de banco (3 o 4 dígitos)', example: '007' })
  banco!: string;

  @ApiProperty({ description: 'Email del usuario autorizado para depuración', example: 'admin@seniat.gob.ve' })
  usuario_email!: string;

  @ApiProperty({ description: 'Contraseña de autorización de seguridad', example: 'AuthPass2026!' })
  password_autorizacion!: string;

  @ApiPropertyOptional({ description: 'Motivo justificado de la depuración', example: 'Líneas duplicadas en transmisión TXT bancaria' })
  motivo?: string;

  @ApiPropertyOptional({ type: [String], description: 'IDs de planillas específicas a depurar', example: ['10524', '10525'] })
  planillas_ids?: string[];

  @ApiPropertyOptional({ description: 'Número de expediente', example: '7638' })
  expediente?: string;
}

export class ConciliarEspecialItemDto {
  @ApiProperty({ description: 'ID de la planilla', example: '10524' })
  planilla_id!: string;

  @ApiProperty({ description: 'Código de forma', example: '99044' })
  forma!: string;

  @ApiProperty({ description: 'Monto total', example: 1500.50 })
  monto!: number;

  @ApiProperty({ description: 'Código de banco', example: '007' })
  banco!: string;

  @ApiProperty({ description: 'Código de agencia', example: '001' })
  agencia!: string;

  @ApiProperty({ description: 'Fecha de recaudación', example: '2024-05-15' })
  fecha_recaudacion!: string;

  @ApiProperty({ type: [PartidaAsignacionDto], description: 'Partidas presupuestarias asignadas' })
  asignaciones!: PartidaAsignacionDto[];
}

export class ConciliarEspecialesDto {
  @ApiProperty({ description: 'Email de autorización del supervisor', example: 'supervisor@seniat.gob.ve' })
  usuario_email!: string;

  @ApiProperty({ description: 'Contraseña de autorización', example: 'SuperAuth2026!' })
  password_autorizacion!: string;

  @ApiPropertyOptional({ description: 'Motivo justificado', example: 'Aprobación especial de brecha atípica' })
  motivo?: string;

  @ApiProperty({ type: [ConciliarEspecialItemDto], description: 'Planillas especiales a conciliar' })
  planillas!: ConciliarEspecialItemDto[];
}
