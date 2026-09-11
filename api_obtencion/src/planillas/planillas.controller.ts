import { Controller, Get, Post, Body, Query, Param, HttpException, HttpStatus } from '@nestjs/common';
import { PlanillasService } from './planillas.service';
import type { PlanillasFilter, ConciliarPayload, RevertirPayload, ConciliarEspecialesDto, DepurarDuplicadosTxtDto, CerrarExpedienteDto } from './planillas.service';

function sanitizeBanco(banco?: string): string {
  if (!banco) return '';
  const clean = String(banco).trim();
  if (clean.length === 4 && clean.startsWith('0')) {
    return clean.substring(1);
  }
  return clean;
}

@Controller('api/planillas')
export class PlanillasController {
  constructor(private readonly planillasService: PlanillasService) {}

  @Get('pendientes')
  async getPendientes(
    @Query('fecha') fecha: string,
    @Query('banco') banco: string,
    @Query('estado_asignacion') estado_asignacion?: 'ASIGNADAS' | 'HUERFANAS',
    @Query('expediente') expediente?: string,
    @Query('lote_id') lote_id?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (!fecha || !banco) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'Los parámetros fecha (YYYY-MM-DD) y banco son obligatorios.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const cleanBanco = sanitizeBanco(banco);
      const filters: PlanillasFilter = {
        fecha,
        banco: cleanBanco,
        estado_asignacion,
        expediente,
        lote_id: lote_id ? Number(lote_id) : undefined,
        limit: limit ? parseInt(limit, 10) : 1000,
        offset: offset ? parseInt(offset, 10) : 0,
      };

      const results = await this.planillasService.getPendientes(filters);
      return {
        data: results,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          count: results.length
        }
      };
    } catch (error) {
      throw new HttpException(
        { status: HttpStatus.INTERNAL_SERVER_ERROR, error: 'Error al consultar las planillas pendientes', message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('conciliar')
  async conciliarPlanilla(@Body() payload: ConciliarPayload) {
    // Validaciones básicas de que los datos vengan en el body
    const requiredFields = ['usuario_operador', 'expediente', 'lote_id', 'lote_seq', 'planilla_id', 'forma', 'monto', 'banco', 'agencia', 'fecha_recaudacion', 'asignaciones'];
    for (const field of requiredFields) {
      if (payload[field] === undefined || payload[field] === null) {
        throw new HttpException(
          { status: HttpStatus.BAD_REQUEST, error: 'Bad Request', message: `El campo ${field} es obligatorio.` },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    payload.banco = sanitizeBanco(payload.banco);

    // Regla de Negocio: Validar Formas Excluidas
    const formasExcluidas = ['00000', '99999']; // TODO: Reemplazar con las formas excluidas reales
    if (formasExcluidas.includes(payload.forma)) {
      throw new HttpException(
        { 
          status: HttpStatus.UNPROCESSABLE_ENTITY, 
          error: 'Forma Excluida', 
          message: `La forma ${payload.forma} está excluida del proceso de conciliación automática.` 
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (!Array.isArray(payload.asignaciones) || payload.asignaciones.length === 0) {
      throw new HttpException(
        { status: HttpStatus.BAD_REQUEST, error: 'Bad Request', message: `El campo asignaciones debe ser un arreglo con al menos un elemento.` },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.planillasService.conciliarPlanilla(payload);
      return result;
    } catch (error) {
      throw new HttpException(
        { status: HttpStatus.INTERNAL_SERVER_ERROR, error: 'Error durante la conciliación atómica', message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('conciliar-lote')
  async conciliarLote(@Body() body: { planillas: ConciliarPayload[] }) {
    if (!body || !Array.isArray(body.planillas) || body.planillas.length === 0) {
      throw new HttpException(
        { status: HttpStatus.BAD_REQUEST, error: 'Bad Request', message: 'El campo planillas debe ser un arreglo no vacío.' },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.planillasService.conciliarLote(body.planillas);
      return result;
    } catch (error) {
      throw new HttpException(
        { status: HttpStatus.INTERNAL_SERVER_ERROR, error: 'Error durante la conciliación masiva del lote', message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('revertir')
  async revertirPlanilla(@Body() payload: RevertirPayload) {
    const requiredFields = ['usuario_operador', 'planilla_id', 'banco', 'fecha_recaudacion'];
    for (const field of requiredFields) {
      if (payload[field] === undefined || payload[field] === null) {
        throw new HttpException(
          { status: HttpStatus.BAD_REQUEST, error: 'Bad Request', message: `El campo ${field} es obligatorio.` },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    try {
      const result = await this.planillasService.revertirPlanilla(payload);
      return result;
    } catch (error: any) {
      throw new HttpException(
        { status: HttpStatus.INTERNAL_SERVER_ERROR, error: 'Error durante la reversión de la conciliación', message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('lotes/:loteSeq/verificar-cierre')
  async verificarYCerrarLote(
    @Param('loteSeq') loteSeq: string,
    @Query('anho') anho?: string,
    @Body() body?: { usuario_operador?: string }
  ) {
    try {
      const anhoNum = anho ? parseInt(anho, 10) : new Date().getFullYear();
      const result = await this.planillasService.verificarYCerrarLote(
        Number(loteSeq),
        anhoNum,
        body?.usuario_operador || 'BOT_ORQUESTADOR'
      );
      return result;
    } catch (error: any) {
      throw new HttpException(
        { status: HttpStatus.INTERNAL_SERVER_ERROR, error: 'Error al verificar cierre de lote', message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('detectar-atributos-null')
  async detectarAtributosNull(
    @Query('fecha') fecha: string,
    @Query('banco') banco: string,
    @Query('expediente') expediente?: string,
    @Query('lote_id') lote_id?: string,
  ) {
    if (!fecha || !banco) {
      throw new HttpException(
        { status: HttpStatus.BAD_REQUEST, error: 'Parámetros requeridos', message: 'fecha y banco son obligatorios.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const data = await this.planillasService.detectarAtributosNull(fecha, sanitizeBanco(banco), expediente, lote_id);
      return {
        success: true,
        ...data,
      };
    } catch (error: any) {
      throw new HttpException(
        { status: HttpStatus.INTERNAL_SERVER_ERROR, error: 'Error al detectar planillas con atributos NULL', message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('duplicados-txt')
  async getDuplicadosTxt(
    @Query('fecha') fecha: string,
    @Query('banco') banco?: string,
  ) {
    if (!fecha) {
      throw new HttpException(
        { status: HttpStatus.BAD_REQUEST, error: 'Parámetro requerido', message: 'El parámetro fecha es obligatorio.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const data = await this.planillasService.detectarDuplicadosTxt(fecha, banco ? sanitizeBanco(banco) : undefined);
      return {
        success: true,
        ...data,
      };
    } catch (error: any) {
      throw new HttpException(
        { status: HttpStatus.INTERNAL_SERVER_ERROR, error: 'Error al detectar duplicados en TXT', message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('conciliar-especiales')
  async conciliarPlanillasEspeciales(@Body() payload: ConciliarEspecialesDto) {
    try {
      const result = await this.planillasService.conciliarPlanillasEspeciales(payload);
      return result;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { status: HttpStatus.INTERNAL_SERVER_ERROR, error: 'Error al conciliar planillas especiales', message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('depurar-duplicados-txt')
  async depurarDuplicadosTxt(@Body() payload: DepurarDuplicadosTxtDto) {
    if (payload.banco) {
      payload.banco = sanitizeBanco(payload.banco);
    }
    try {
      const result = await this.planillasService.depurarDuplicadosTxt(payload);
      return result;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { status: HttpStatus.INTERNAL_SERVER_ERROR, error: 'Error al depurar duplicados en TXT', message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('analistas-revisores')
  async getAnalistasRevisores() {
    try {
      const result = await this.planillasService.getAnalistasRevisores();
      return result;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { status: HttpStatus.INTERNAL_SERVER_ERROR, error: 'Error al consultar analistas revisores', message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('cerrar-expediente')
  async cerrarExpediente(@Body() payload: CerrarExpedienteDto) {
    if (payload.banco) {
      payload.banco = sanitizeBanco(payload.banco);
    }
    try {
      const result = await this.planillasService.cerrarExpedienteYReasignar(payload);
      return result;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { status: HttpStatus.INTERNAL_SERVER_ERROR, error: 'Error al cerrar expediente y reasignar a validación', message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

