import { Controller, Get, Query, Param, HttpException, HttpStatus } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';

@Controller('api/auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get('transcriptor')
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
  async getEventos(@Query('limit') limitStr?: string) {
    const limit = limitStr ? parseInt(limitStr, 10) : 100;
    return await this.auditoriaService.getEventosAuditoriaJson(limit);
  }
}
