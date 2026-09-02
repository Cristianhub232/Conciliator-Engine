import { Controller, Post, Get, Body, BadRequestException } from '@nestjs/common';
import { PipelineService } from './pipeline.service';

@Controller('api/pipeline')
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Get('estado')
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
  detener() {
    this.pipelineService.requestStop();
    return {
      message: 'Solicitud de detención enviada'
    };
  }

  @Post('conciliar')
  async conciliar(
    @Body() body: { banco: string; fechaInicio: string; fechaFin?: string; operador?: string; chatId?: number }
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

    // Iniciar procesamiento secuencial
    const promesa = this.pipelineService.ejecutarLoteSecuencial({
      banco: body.banco,
      fechaInicio: body.fechaInicio,
      fechaFin: body.fechaFin || body.fechaInicio,
      operador: body.operador || 'HTTP_API',
      onMensaje: async (msg, tipo) => {
        // Si se suministró chatId, enviar notificación vía Telegram sendMessage
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
