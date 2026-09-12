import { Controller, Get, Post, Body, Query, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { PlanillasService } from './planillas.service';
import type { PlanillasFilter } from './planillas.service';
import { 
  ConciliarPayloadDto, 
  RevertirPayloadDto, 
  CerrarExpedienteDto, 
  DepurarDuplicadosTxtDto, 
  ConciliarEspecialesDto 
} from './dto/planillas-swagger.dto';

function sanitizeBanco(banco?: string): string {
  if (!banco) return '';
  const clean = String(banco).trim();
  if (clean.length === 4 && clean.startsWith('0')) {
    return clean.substring(1);
  }
  return clean;
}

@ApiTags('planillas')
@Controller('api/planillas')
export class PlanillasController {
  constructor(private readonly planillasService: PlanillasService) {}

  @Get('pendientes')
  @ApiOperation({
    summary: 'Consultar planillas pendientes por conciliar',
    description: 'Obtiene el listado de planillas tributarias pendientes de la base de datos Oracle y PostgreSQL filtradas por fecha, banco, estado de asignación y expediente.'
  })
  @ApiQuery({ name: 'fecha', required: true, example: '2024-05-15', description: 'Fecha de recaudación (YYYY-MM-DD)' })
  @ApiQuery({ name: 'banco', required: true, example: '007', description: 'Código de banco (3 o 4 dígitos)' })
  @ApiQuery({ name: 'estado_asignacion', required: false, enum: ['ASIGNADAS', 'HUERFANAS'], description: 'Filtrar por planillas asignadas a lote u huérfanas' })
  @ApiQuery({ name: 'expediente', required: false, example: '7638', description: 'Número de expediente en Oracle' })
  @ApiQuery({ name: 'lote_id', required: false, example: '842', description: 'ID de lote' })
  @ApiQuery({ name: 'limit', required: false, example: 100, description: 'Límite de registros' })
  @ApiQuery({ name: 'offset', required: false, example: 0, description: 'Desplazamiento' })
  @ApiResponse({ status: 200, description: 'Lista de planillas pendientes obtenida exitosamente' })
  @ApiResponse({ status: 400, description: 'Parámetros obligatorios (fecha, banco) no proporcionados' })
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
    } catch (error: any) {
      throw new HttpException(
        { status: HttpStatus.INTERNAL_SERVER_ERROR, error: 'Error al consultar las planillas pendientes', message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('conciliar')
  @ApiOperation({
    summary: 'Conciliar una planilla individual de forma atómica',
    description: 'Ejecuta la conciliación presupuestaria de una planilla asociando partidas y movimientos bancarios.'
  })
  @ApiBody({ type: ConciliarPayloadDto })
  @ApiResponse({ status: 200, description: 'Planilla conciliada exitosamente' })
  @ApiResponse({ status: 400, description: 'Campos requeridos faltantes' })
  @ApiResponse({ status: 422, description: 'Forma excluida de la conciliación automática' })
  async conciliarPlanilla(@Body() payload: ConciliarPayloadDto) {
    const requiredFields = ['usuario_operador', 'expediente', 'lote_id', 'lote_seq', 'planilla_id', 'forma', 'monto', 'banco', 'agencia', 'fecha_recaudacion', 'asignaciones'];
    for (const field of requiredFields) {
      if ((payload as any)[field] === undefined || (payload as any)[field] === null) {
        throw new HttpException(
          { status: HttpStatus.BAD_REQUEST, error: 'Bad Request', message: `El campo ${field} es obligatorio.` },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    payload.banco = sanitizeBanco(payload.banco);

    const formasExcluidas = ['00000', '99999'];
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
      const result = await this.planillasService.conciliarPlanilla(payload as any);
      return result;
    } catch (error: any) {
      throw new HttpException(
        { status: HttpStatus.INTERNAL_SERVER_ERROR, error: 'Error durante la conciliación atómica', message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('conciliar-lote')
  @ApiOperation({
    summary: 'Conciliación masiva automática por lote',
    description: 'Procesa secuencialmente la conciliación de un conjunto de planillas pertenencientes a un mismo lote.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        planillas: {
          type: 'array',
          items: { $ref: '#/components/schemas/ConciliarPayloadDto' }
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Lote procesado masivamente' })
  async conciliarLote(@Body() body: { planillas: ConciliarPayloadDto[] }) {
    if (!body || !Array.isArray(body.planillas) || body.planillas.length === 0) {
      throw new HttpException(
        { status: HttpStatus.BAD_REQUEST, error: 'Bad Request', message: 'El campo planillas debe ser un arreglo no vacío.' },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.planillasService.conciliarLote(body.planillas as any[]);
      return result;
    } catch (error: any) {
      throw new HttpException(
        { status: HttpStatus.INTERNAL_SERVER_ERROR, error: 'Error durante la conciliación masiva del lote', message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('revertir')
  @ApiOperation({
    summary: 'Revertir la conciliación de una planilla',
    description: 'Cancela la conciliación de una planilla previamente procesada, liberando los movimientos bancarios.'
  })
  @ApiBody({ type: RevertirPayloadDto })
  @ApiResponse({ status: 200, description: 'Reversión ejecutada correctamente' })
  async revertirPlanilla(@Body() payload: RevertirPayloadDto) {
    const requiredFields = ['usuario_operador', 'planilla_id', 'banco', 'fecha_recaudacion'];
    for (const field of requiredFields) {
      if ((payload as any)[field] === undefined || (payload as any)[field] === null) {
        throw new HttpException(
          { status: HttpStatus.BAD_REQUEST, error: 'Bad Request', message: `El campo ${field} es obligatorio.` },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    try {
      const result = await this.planillasService.revertirPlanilla(payload as any);
      return result;
    } catch (error: any) {
      throw new HttpException(
        { status: HttpStatus.INTERNAL_SERVER_ERROR, error: 'Error durante la reversión de la conciliación', message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('lotes/:loteSeq/verificar-cierre')
  @ApiOperation({
    summary: 'Verificar estado del lote y cerrar si está completo',
    description: 'Valida si todas las planillas de un lote están conciliadas y actualiza el estado del lote a cerrado ("V").'
  })
  @ApiParam({ name: 'loteSeq', description: 'Secuencia del lote dentro del expediente', example: 14 })
  @ApiQuery({ name: 'anho', required: false, description: 'Año fiscal del lote', example: 2024 })
  @ApiBody({ schema: { type: 'object', properties: { usuario_operador: { type: 'string', example: 'BOT_ORQUESTADOR' } } } })
  @ApiResponse({ status: 200, description: 'Lote verificado y/o cerrado exitosamente' })
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
  @ApiOperation({
    summary: 'Detectar planillas con atributos en NULL',
    description: 'Escanea planillas con inconsistencias o campos faltantes (ej: Forma 99044 sin Nro de Planilla).'
  })
  @ApiQuery({ name: 'fecha', required: true, example: '2024-05-15' })
  @ApiQuery({ name: 'banco', required: true, example: '007' })
  @ApiQuery({ name: 'expediente', required: false, example: '7638' })
  @ApiQuery({ name: 'lote_id', required: false, example: '842' })
  @ApiResponse({ status: 200, description: 'Resultado de la detección de atributos en NULL' })
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
  @ApiOperation({
    summary: 'Detectar planillas duplicadas en archivos TXT bancarios',
    description: 'Analiza el Data Lake de PostgreSQL buscando repeticiones en las transmisiones bancarias TXT.'
  })
  @ApiQuery({ name: 'fecha', required: true, example: '2024-05-15' })
  @ApiQuery({ name: 'banco', required: false, example: '007' })
  @ApiResponse({ status: 200, description: 'Resultado del análisis de duplicados en TXT' })
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
  @ApiOperation({
    summary: 'Conciliación de planillas especiales con autorización',
    description: 'Procesa conciliaciones atípicas requiriendo clave de autorización de supervisor.'
  })
  @ApiBody({ type: ConciliarEspecialesDto })
  @ApiResponse({ status: 200, description: 'Planillas especiales conciliadas exitosamente' })
  async conciliarPlanillasEspeciales(@Body() payload: ConciliarEspecialesDto) {
    try {
      const result = await this.planillasService.conciliarPlanillasEspeciales(payload as any);
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
  @ApiOperation({
    summary: 'Depuración autorizada de registros TXT duplicados',
    description: 'Elimina de forma autorizada las líneas duplicadas en el Data Lake garantizando auditoría.'
  })
  @ApiBody({ type: DepurarDuplicadosTxtDto })
  @ApiResponse({ status: 200, description: 'Registros duplicados depurados correctamente' })
  async depurarDuplicadosTxt(@Body() payload: DepurarDuplicadosTxtDto) {
    if (payload.banco) {
      payload.banco = sanitizeBanco(payload.banco);
    }
    try {
      const result = await this.planillasService.depurarDuplicadosTxt(payload as any);
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
  @ApiOperation({
    summary: 'Obtener lista de analistas revisores/validadores',
    description: 'Devuelve los usuarios que cuentan con rol o permiso para recibir expedientes de conciliación.'
  })
  @ApiResponse({ status: 200, description: 'Lista de analistas revisores obtenida' })
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
  @ApiOperation({
    summary: 'Cerrar expediente y reasignar a analista de la siguiente fase',
    description: 'Realiza el cierre formal del expediente en Oracle WFE_WORKFLOW y asigna la revisión al analista seleccionado.'
  })
  @ApiBody({ type: CerrarExpedienteDto })
  @ApiResponse({ status: 200, description: 'Expediente cerrado y reasignado exitosamente' })
  async cerrarExpediente(@Body() payload: CerrarExpedienteDto) {
    if (payload.banco) {
      payload.banco = sanitizeBanco(payload.banco);
    }
    try {
      const result = await this.planillasService.cerrarExpedienteYReasignar(payload as any);
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
