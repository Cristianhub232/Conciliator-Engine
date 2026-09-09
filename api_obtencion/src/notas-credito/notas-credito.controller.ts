import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { NotasCreditoService } from './notas-credito.service';

@Controller('api/notas-credito')
export class NotasCreditoController {
  constructor(private readonly notasCreditoService: NotasCreditoService) {}

  @Get()
  async getNotasCredito(
    @Query('fecha') fecha: string,
    @Query('banco') banco?: string,
    @Query('expediente') expediente?: string,
  ) {
    const data = await this.notasCreditoService.getNotasCredito(fecha, banco, expediente);
    return {
      success: true,
      ...data,
    };
  }

  @Get(':codigo')
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
