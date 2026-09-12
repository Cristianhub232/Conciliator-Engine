import { Controller, Get, Query, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AuditoriaService } from './auditoria.service';

@ApiTags('auditoria')
@Controller('api/auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get('transcriptor')
  @ApiOperation({ summary: 'Obtener auditoría de productividad de un transcriptor/operador' })
  @ApiQuery({ name: 'usuario', required: true, example: 'MAIRA_0018', description: 'Nombre de usuario del transcriptor' })
  @ApiQuery({ name: 'anho', required: false, example: 2024, description: 'Año fiscal' })
  @ApiResponse({ status: 200, description: 'Métricas de transcripción y planillas conciliadas' })
  async getTranscriptor(
    @Query('usuario') usuario: string,
    @Query('anho') anhoStr?: string,
  ) {
    if (!usuario) {
      throw new HttpException(
        { status: HttpStatus.BAD_REQUEST, error: 'Bad Request', message: 'El parámetro usuario es obligatorio.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const anho = anhoStr ? parseInt(anhoStr, 10) : 2024;
    return await this.auditoriaService.getAuditoriaTranscriptor(usuario, anho);
  }

  @Get('expediente/:id')
  @ApiOperation({ summary: 'Obtener trazabilidad e historial completo de un expediente' })
  @ApiParam({ name: 'id', description: 'ID del expediente', example: '7638' })
  @ApiQuery({ name: 'anho', required: false, example: 2024, description: 'Año fiscal' })
  @ApiResponse({ status: 200, description: 'Trazabilidad histórica en WFE_HISTORIA y PostgreSQL' })
  async getExpediente(
    @Param('id') expedienteId: string,
    @Query('anho') anhoStr?: string,
  ) {
    if (!expedienteId) {
      throw new HttpException(
        { status: HttpStatus.BAD_REQUEST, error: 'Bad Request', message: 'El id de expediente es obligatorio.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const anho = anhoStr ? parseInt(anhoStr, 10) : 2024;
    return await this.auditoriaService.getDetalleExpediente(expedienteId, anho);
  }

  @Get('lote/:id')
  @ApiOperation({ summary: 'Obtener auditoría detallada de un lote presupuestario' })
  @ApiParam({ name: 'id', description: 'Secuencia del lote (lote_seq)', example: '14' })
  @ApiQuery({ name: 'anho', required: false, example: 2024, description: 'Año fiscal' })
  @ApiResponse({ status: 200, description: 'Detalle presupuestario del lote' })
  async getLote(
    @Param('id') loteSeqStr: string,
    @Query('anho') anhoStr?: string,
  ) {
    if (!loteSeqStr) {
      throw new HttpException(
        { status: HttpStatus.BAD_REQUEST, error: 'Bad Request', message: 'El lote_seq es obligatorio.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const loteSeq = parseInt(loteSeqStr, 10);
    const anho = anhoStr ? parseInt(anhoStr, 10) : 2024;
    return await this.auditoriaService.getDetalleLote(loteSeq, anho);
  }

  @Get('eventos')
  @ApiOperation({ summary: 'Consultar logs y eventos de auditoría institucional' })
  @ApiQuery({ name: 'limit', required: false, example: 100, description: 'Número máximo de eventos a retornar' })
  @ApiResponse({ status: 200, description: 'Lista de eventos JSON de auditoría' })
  async getEventos(@Query('limit') limitStr?: string) {
    const limit = limitStr ? parseInt(limitStr, 10) : 100;
    return await this.auditoriaService.getEventosAuditoriaJson(limit);
  }
}
