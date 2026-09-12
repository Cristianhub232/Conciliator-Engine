import { Controller, Get, Post, Patch, Delete, Body, Query, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DepuracionService } from './depuracion.service';

export class EjecutarDepuracionDto {
  @ApiProperty({ description: 'Fecha de recaudación (YYYY-MM-DD)', example: '2024-05-15' })
  fecha!: string;

  @ApiProperty({ description: 'Código de banco (3 o 4 dígitos)', example: '007' })
  banco!: string;

  @ApiProperty({ type: [String], description: 'Listado de IDs de planillas a depurar', example: ['10524', '10525'] })
  planillas_ids!: string[];

  @ApiProperty({ description: 'Motivo o justificación operacional de la depuración', example: 'Transmisión duplicada por inconsistencia de red bancaria' })
  motivo!: string;

  @ApiProperty({ description: 'Contraseña de autorización de seguridad', example: 'AuthDepura2026!' })
  password_autorizacion!: string;

  @ApiProperty({ description: 'Email del usuario ejecutor', example: 'admin@seniat.gob.ve' })
  usuario_email!: string;

  @ApiPropertyOptional({ description: 'Número de expediente', example: '7638' })
  expediente?: string;
}

export class AddFormaConfiguradaDto {
  @ApiProperty({ description: 'Código de forma tributaria', example: '99044' })
  cod_forma!: string;

  @ApiProperty({ description: 'Descripción de la forma tributaria', example: 'ISLR Declaración Definitiva' })
  descripcion!: string;

  @ApiProperty({ description: 'Motivo de inclusión en catálogo de depuración', example: 'Forma susceptible a seriales duplicados' })
  motivo!: string;
}

@ApiTags('depuracion')
@Controller('api/depuracion')
export class DepuracionController {
  constructor(private readonly depuracionService: DepuracionService) {}

  @Get('formas')
  @ApiOperation({ summary: 'Obtener formas tributarias configuradas para depuración' })
  @ApiResponse({ status: 200, description: 'Catálogo de formas configuradas' })
  async getFormasConfiguradas() {
    return this.depuracionService.getFormasConfiguradas();
  }

  @Post('formas')
  @ApiOperation({ summary: 'Agregar nueva forma tributaria al catálogo de depuración' })
  @ApiBody({ type: AddFormaConfiguradaDto })
  @ApiResponse({ status: 201, description: 'Forma registrada exitosamente' })
  async addFormaConfigurada(@Body() body: AddFormaConfiguradaDto) {
    return this.depuracionService.addFormaConfigurada(body.cod_forma, body.descripcion, body.motivo);
  }

  @Patch('formas/:id/estado')
  @ApiOperation({ summary: 'Activar o inhabilitar regla de depuración por ID' })
  @ApiParam({ name: 'id', description: 'ID primario de la regla de depuración', example: '1' })
  @ApiBody({ schema: { type: 'object', properties: { estado: { type: 'string', example: 'ACTIVO' } } } })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  async toggleFormaEstado(@Param('id') id: string, @Body() body: { estado: string }) {
    return this.depuracionService.toggleFormaEstado(Number(id), body.estado);
  }

  @Delete('formas/:id')
  @ApiOperation({ summary: 'Eliminar una forma configurada del módulo de depuración' })
  @ApiParam({ name: 'id', description: 'ID primario de la regla de depuración', example: '1' })
  @ApiResponse({ status: 200, description: 'Regla eliminada' })
  async deleteFormaConfigurada(@Param('id') id: string) {
    return this.depuracionService.deleteFormaConfigurada(Number(id));
  }

  @Get('scan')
  @ApiOperation({ summary: 'Escanear lote para detectar planillas candidatas a depuración' })
  @ApiQuery({ name: 'fecha', required: true, example: '2024-05-15' })
  @ApiQuery({ name: 'banco', required: true, example: '007' })
  @ApiQuery({ name: 'expediente', required: false, example: '7638' })
  @ApiResponse({ status: 200, description: 'Planillas candidatas detectadas' })
  async escanearLote(
    @Query('fecha') fecha: string,
    @Query('banco') banco: string,
    @Query('expediente') expediente?: string
  ) {
    const cleanBanco = banco ? (banco.length === 4 && banco.startsWith('0') ? banco.substring(1) : banco) : banco;
    return this.depuracionService.escanearLote(fecha, cleanBanco, expediente);
  }

  @Post('ejecutar')
  @ApiOperation({ summary: 'Ejecutar depuración manual de planillas con clave de autorización' })
  @ApiBody({ type: EjecutarDepuracionDto })
  @ApiResponse({ status: 200, description: 'Depuración ejecutada con éxito' })
  async ejecutarDepuracion(@Body() payload: EjecutarDepuracionDto, @Req() req: any) {
    if (payload.banco && payload.banco.length === 4 && payload.banco.startsWith('0')) {
      payload.banco = payload.banco.substring(1);
    }
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    return this.depuracionService.ejecutarDepuracion(payload, String(ip));
  }

  @Get('historial')
  @ApiOperation({ summary: 'Obtener historial de auditoría de depuraciones realizadas' })
  @ApiResponse({ status: 200, description: 'Registro de auditoría retornado' })
  async getHistorialAudit() {
    return this.depuracionService.getHistorialAudit();
  }
}
