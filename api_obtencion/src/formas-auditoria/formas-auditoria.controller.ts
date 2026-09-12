import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { FormasAuditoriaService, SetAuditoriaDto } from './formas-auditoria.service';

@ApiTags('formas-auditoria')
@Controller('api/formas-auditoria')
export class FormasAuditoriaController {
  constructor(private readonly formasAuditoriaService: FormasAuditoriaService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener catálogo de formas tributarias y reglas de auditoría',
    description: 'Combina metadatos de la API externa de catálogos (10.46.0.189:3000) con la tabla motor_app.formas_auditoria.'
  })
  @ApiResponse({ status: 200, description: 'Catálogo global de formas e impuestos' })
  async getAll() {
    const data = await this.formasAuditoriaService.getAll();
    return {
      success: true,
      formas: data,
      total: Object.keys(data).length,
    };
  }

  @Get(':cod_forma')
  @ApiOperation({ summary: 'Obtener configuración de auditoría para una forma específica' })
  @ApiParam({ name: 'cod_forma', description: 'Código tributario de la forma', example: '99044' })
  @ApiResponse({ status: 200, description: 'Configuración de auditoría de la forma' })
  async getByCod(@Param('cod_forma') codForma: string) {
    const data = await this.formasAuditoriaService.getByCod(codForma);
    return {
      success: true,
      data,
    };
  }

  @Post(':cod_forma')
  @ApiOperation({ summary: 'Actualizar configuración y reglas de auditoría para una forma' })
  @ApiParam({ name: 'cod_forma', description: 'Código tributario de la forma', example: '99044' })
  @ApiBody({ schema: { type: 'object', properties: { requiere_revision: { type: 'boolean', example: true }, observacion: { type: 'string', example: 'Forma requiere verificación manual de seriales' } } } })
  @ApiResponse({ status: 200, description: 'Configuración actualizada' })
  async setAuditoria(
    @Param('cod_forma') codForma: string,
    @Body() body: SetAuditoriaDto
  ) {
    const updated = await this.formasAuditoriaService.setAuditoria(codForma, body);
    return {
      success: true,
      data: updated,
    };
  }
}
