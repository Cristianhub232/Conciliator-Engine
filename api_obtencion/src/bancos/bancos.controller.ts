import { Controller, Get, Param, Query, NotFoundException, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { BancosService } from './bancos.service';

@ApiTags('bancos')
@Controller('api/bancos')
export class BancosController {
  constructor(private readonly bancosService: BancosService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener catálogo de bancos centralizados con normalización de códigos',
    description: 'Devuelve la lista de instituciones bancarias permitiendo búsqueda por código (3 u 4 dígitos, ej: 007 / 0007) y nombre.'
  })
  @ApiQuery({ name: 'nombre', required: false, example: 'BANCO DE VENEZUELA', description: 'Filtro por nombre de entidad' })
  @ApiQuery({ name: 'codigo', required: false, example: '007', description: 'Código de banco de 3 o 4 dígitos' })
  @ApiResponse({ status: 200, description: 'Catálogo de bancos homologado' })
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
  @ApiOperation({ summary: 'Obtener información de un banco por ID primario' })
  @ApiParam({ name: 'id', description: 'ID primario del banco', example: 1 })
  @ApiResponse({ status: 200, description: 'Información detallada del banco' })
  @ApiResponse({ status: 404, description: 'Banco no encontrado' })
  async getBancoById(@Param('id', ParseIntPipe) id: number) {
    const banco = await this.bancosService.getBancoById(id);
    if (!banco) {
      throw new NotFoundException({ error: 'Banco no encontrado' });
    }
    return banco;
  }
}
