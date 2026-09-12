import { Controller, Post, Get, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PipelineService } from './pipeline.service';

export class ExecutarPipelineDto {
  @ApiProperty({ description: 'Código de banco (3 o 4 dígitos)', example: '007' })
  banco!: string;

  @ApiProperty({ description: 'Fecha de inicio del rango (YYYY-MM-DD)', example: '2024-05-01' })
  fechaInicio!: string;

  @ApiPropertyOptional({ description: 'Fecha de fin del rango (YYYY-MM-DD)', example: '2024-05-31' })
  fechaFin?: string;

  @ApiPropertyOptional({ description: 'Identificador del operador que ejecuta', example: 'MAIRA_0018' })
  operador?: string;

  @ApiPropertyOptional({ description: 'Chat ID de Telegram para recibir notificaciones en tiempo real', example: 123456789 })
  chatId?: number;
}

@ApiTags('pipeline')
@Controller('api/pipeline')
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Get('estado')
  @ApiOperation({ summary: 'Obtener el estado del pipeline de conciliación en ejecución' })
  @ApiResponse({ status: 200, description: 'Estado del motor de conciliación (reposo o ejecutando)' })
  getEstado() {
    const isRunning = this.pipelineService.getIsRunning();
    return {
      running: isRunning,
      mensaje: isRunning 
        ? 'Hay un lote de conciliación en ejecución' 
        : 'Motor en reposo, listo para procesar'
    };
  }

  @Post('detener')
  @ApiOperation({ summary: 'Solicitar detención de emergencia del proceso de conciliación' })
  @ApiResponse({ status: 200, description: 'Solicitud de detención enviada' })
  detener() {
    this.pipelineService.requestStop();
    return {
      message: 'Solicitud de detención enviada'
    };
  }

  @Post('conciliar')
  @ApiOperation({ summary: 'Iniciar conciliación masiva secuencial por banco y rango de fechas' })
  @ApiBody({ type: ExecutarPipelineDto })
  @ApiResponse({ status: 200, description: 'Conciliación masiva iniciada en segundo plano' })
  async conciliar(
    @Body() body: ExecutarPipelineDto
  ) {
    if (!body.banco || !body.fechaInicio) {
      throw new BadRequestException('El banco y la fechaInicio son obligatorios');
    }

    if (this.pipelineService.getIsRunning()) {
      return {
        success: false,
        mensaje: 'Ya existe un lote en ejecución en la base de datos Oracle.'
      };
    }

    const promesa = this.pipelineService.ejecutarLoteSecuencial({
      banco: body.banco,
      fechaInicio: body.fechaInicio,
      fechaFin: body.fechaFin || body.fechaInicio,
      operador: body.operador || 'HTTP_API',
      onMensaje: async (msg, tipo) => {
        if (body.chatId && process.env.TELEGRAM_BOT_TOKEN) {
          try {
            await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: body.chatId,
                text: msg,
                parse_mode: 'Markdown'
              })
            });
          } catch (e) {}
        }
      }
    });

    return {
      success: true,
      mensaje: `Conciliación iniciada para Banco ${body.banco} desde ${body.fechaInicio} hasta ${body.fechaFin || body.fechaInicio}`,
      estado: 'EN_PROCESO'
    };
  }
}
