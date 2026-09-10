import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { NotasCreditoService } from './notas-credito.service';
import { BancosService } from '../bancos/bancos.service';

@Controller('api/notas-credito')
export class NotasCreditoController {
  constructor(
    private readonly notasCreditoService: NotasCreditoService,
    private readonly bancosService: BancosService,
  ) {}

  @Get('bancos')
  async getBancos() {
    const bancos = await this.bancosService.getNotasCreditoBancos();
    return {
      success: true,
      bancos,
    };
  }

  @Get()
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
