import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { NotasCreditoService } from './notas-credito.service';
import { BancosService } from '../bancos/bancos.service';

@ApiTags('notas-credito')
@Controller('api/notas-credito')
export class NotasCreditoController {
  constructor(
    private readonly notasCreditoService: NotasCreditoService,
    private readonly bancosService: BancosService,
  ) {}

  @Get('bancos')
  @ApiOperation({ summary: 'Obtener catálogo de bancos con Notas de Crédito' })
  @ApiResponse({ status: 200, description: 'Catálogo de bancos retornado' })
  async getBancos() {
    const bancos = await this.bancosService.getNotasCreditoBancos();
    return {
      success: true,
      bancos,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Consultar auditoría comparativa de Notas de Crédito Bancarias' })
  @ApiQuery({ name: 'fecha', required: true, example: '2024-05-15', description: 'Fecha de recaudación (YYYY-MM-DD)' })
  @ApiQuery({ name: 'banco', required: false, example: '007', description: 'Código de banco' })
  @ApiQuery({ name: 'expediente', required: false, example: '7638', description: 'Número de expediente' })
  @ApiResponse({ status: 200, description: 'Listado comparativo de Notas de Crédito vs planillas vs TXT' })
  async getNotasCredito(
    @Query('fecha') fecha: string,
    @Query('banco') banco?: string,
    @Query('expediente') expediente?: string,
  ) {
    const cleanBanco = banco ? (banco.length === 4 && banco.startsWith('0') ? banco.substring(1) : banco) : banco;
    const data = await this.notasCreditoService.getNotasCredito(fecha, cleanBanco, expediente);
    return {
      success: true,
      ...data,
    };
  }

  @Get(':codigo')
  @ApiOperation({ summary: 'Obtener detalle específico de una Nota de Crédito' })
  @ApiParam({ name: 'codigo', description: 'Código único de la Nota de Crédito', example: 'NC-2024-0091' })
  @ApiResponse({ status: 200, description: 'Detalle de la Nota de Crédito y planillas asociadas' })
  @ApiResponse({ status: 404, description: 'Nota de Crédito no encontrada' })
  async getDetalle(@Param('codigo') codigo: string) {
    const data = await this.notasCreditoService.getNotaCreditoDetalle(codigo);
    if (!data) {
      throw new NotFoundException(`Nota de Crédito ${codigo} no encontrada`);
    }
    return {
      success: true,
      ...data,
    };
  }
}
