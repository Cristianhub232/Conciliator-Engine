import { Controller, Get, Param, Query, NotFoundException, ParseIntPipe } from '@nestjs/common';
import { BancosService } from './bancos.service';

@Controller('api/bancos')
export class BancosController {
  constructor(private readonly bancosService: BancosService) {}

  @Get()
  async getBancos(
    @Query('nombre') nombre?: string,
    @Query('codigo') codigo?: string,
  ) {
    const data = await this.bancosService.getBancos(nombre, codigo);
    return {
      success: true,
      data,
    };
  }

  @Get(':id')
  async getBancoById(@Param('id', ParseIntPipe) id: number) {
    const banco = await this.bancosService.getBancoById(id);
    if (!banco) {
      throw new NotFoundException({ error: 'Banco no encontrado' });
    }
    return banco;
  }
}
