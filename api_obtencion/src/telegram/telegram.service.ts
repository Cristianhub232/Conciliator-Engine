import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Telegraf, Context } from 'telegraf';
import { PipelineService } from '../pipeline/pipeline.service';
import { IaService } from '../ia/ia.service';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf | null = null;
  private allowedUsers: Set<number> = new Set();

  private isPollingActive = false;
  private currentOffset = 0;

  constructor(
    private readonly pipelineService: PipelineService,
    private readonly iaService: IaService
  ) {}

  onModuleInit() {
    this.iniciarBot();
  }

  onModuleDestroy() {
    this.isPollingActive = false;
    this.logger.log('[TELEGRAM] Bot detenido correctamente.');
  }

  private iniciarBot() {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (!token) {
      this.logger.warn(
        '[TELEGRAM] TELEGRAM_BOT_TOKEN no está definido en api_obtencion/.env. El bot de Telegram no se iniciará hasta configurar el token.'
      );
      return;
    }

    // Cargar usuarios autorizados
    const allowedEnv = process.env.TELEGRAM_ALLOWED_USERS?.trim();
    if (allowedEnv) {
      allowedEnv.split(',').forEach(id => {
        const num = parseInt(id.trim(), 10);
        if (!isNaN(num)) this.allowedUsers.add(num);
      });
      this.logger.log(`[TELEGRAM] ${this.allowedUsers.size} usuarios autorizados cargados.`);
    } else {
      this.logger.warn('[TELEGRAM] No se definió TELEGRAM_ALLOWED_USERS. Se aceptarán peticiones de cualquier usuario.');
    }

    try {
      this.bot = new Telegraf(token);

      // Middleware de autorización
      this.bot.use(async (ctx, next) => {
        const userId = ctx.from?.id;
        if (this.allowedUsers.size > 0 && userId && !this.allowedUsers.has(userId)) {
          this.logger.warn(`[TELEGRAM] Intento de acceso no autorizado del usuario ID ${userId} (@${ctx.from?.username || 'sin_alias'})`);
          await ctx.reply(
            `⛔ *Acceso no autorizado*\nTu ID de Telegram (\`${userId}\`) no tiene permisos para operar el motor de conciliación de la ONT.`,
            { parse_mode: 'Markdown' }
          );
          return;
        }
        return next();
      });

      this.registrarComandos();

      // Verificar conexión y arrancar polling controlado
      this.bot.telegram.getMe().then(me => {
        this.logger.log(`[TELEGRAM] 🚀 Bot @${me.username} (${me.first_name}) conectado exitosamente.`);
        this.iniciarPollingLoop();
      }).catch(err => {
        this.logger.error(`[TELEGRAM] Error conectando con Telegram getMe: ${err.message}`);
        setTimeout(() => this.iniciarBot(), 4000);
      });
    } catch (err: any) {
      this.logger.error(`[TELEGRAM] Fallo al inicializar Telegraf: ${err.message}`);
    }
  }

  private async iniciarPollingLoop() {
    this.isPollingActive = true;
    while (this.isPollingActive) {
      try {
        if (!this.bot) break;
        const updates = await this.bot.telegram.getUpdates(15, 100, this.currentOffset, []);

        if (Array.isArray(updates) && updates.length > 0) {
          for (const update of updates) {
            if (!this.isPollingActive) break;
            this.currentOffset = update.update_id + 1;
            try {
              await this.bot.handleUpdate(update);
            } catch (handleErr: any) {
              this.logger.error(`[TELEGRAM] Error procesando update ${update.update_id}: ${handleErr.message}`);
            }
          }
        } else {
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch (pollErr: any) {
        if (this.isPollingActive) {
          if (pollErr.message && pollErr.message.includes('409')) {
            this.logger.warn('[TELEGRAM] Conflicto 409 detectado. Reintentando polling en 3s...');
          } else {
            this.logger.warn(`[TELEGRAM] Aviso en polling: ${pollErr.message}. Reintentando en 3s...`);
          }
          await new Promise(r => setTimeout(r, 3000));
        }
      }
    }
  }

  private registrarComandos() {
    if (!this.bot) return;

    // Comando /start o /ayuda
    this.bot.command(['start', 'help', 'ayuda'], async (ctx) => {
      const msg = 
        `🤖 *Motor Conciliador ONT · SIGECOF*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Bienvenido al asistente de conciliación bajo demanda.\n\n` +
        `📌 *Comandos disponibles:*\n\n` +
        `🔹 \`/conciliar <banco> <fecha_inicio> [fecha_fin]\`\n` +
        `   Ejecuta el pipeline día a día en el rango solicitado.\n` +
        `   _Ejemplo:_ \`/conciliar 105 2024-04-15 2024-04-18\`\n\n` +
        `🔹 \`/conciliar_dia <banco> <fecha>\`\n` +
        `   Ejecuta la conciliación de un único día.\n` +
        `   _Ejemplo:_ \`/conciliar_dia 105 2024-04-15\`\n\n` +
        `🔹 \`/estado\`\n` +
        `   Verifica si hay un lote procesándose actualmente.\n\n` +
        `🔹 \`/detener\`\n` +
        `   Pausa de forma segura la ejecución del lote actual.\n\n` +
        `💡 _También puedes escribir en lenguaje natural, por ejemplo:_\n` +
        `_"por favor concilia banco 105 del 2024-04-15 al 2024-04-17"_`;

      await this.enviarMensajeSeguro(ctx, msg);
    });

    // Comando /estado
    this.bot.command('estado', async (ctx) => {
      const running = this.pipelineService.getIsRunning();
      if (running) {
        await ctx.reply('⏳ *Estado actual:* Hay un lote de conciliación en ejecución activa en la base de datos.', { parse_mode: 'Markdown' });
      } else {
        await ctx.reply('🟢 *Estado actual:* Motor en reposo. Listo para recibir nuevas órdenes de conciliación.', { parse_mode: 'Markdown' });
      }
    });

    // Comando /detener
    this.bot.command('detener', async (ctx) => {
      if (!this.pipelineService.getIsRunning()) {
        await ctx.reply('ℹ️ No hay ningún proceso de conciliación en ejecución para detener.');
        return;
      }
      this.pipelineService.requestStop();
      await ctx.reply('🛑 *Solicitud de detención enviada.*\nEl proceso se pausará al culminar la planilla en curso.', { parse_mode: 'Markdown' });
    });

    // Comando /conciliar <banco> <fecha_inicio> [fecha_fin]
    this.bot.command('conciliar', async (ctx) => {
      const args = ctx.message.text.trim().split(/\s+/).slice(1);
      if (args.length < 2) {
        await ctx.reply(
          `⚠️ *Formato incorrecto.*\nUso correcto: \`/conciliar <banco> <fecha_inicio> [fecha_fin]\`\nEjemplo: \`/conciliar 105 2024-04-15 2024-04-18\``,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const banco = args[0];
      const fechaInicio = args[1];
      const fechaFin = args[2] || fechaInicio;

      await this.lanzarConciliacion(ctx, banco, fechaInicio, fechaFin);
    });

    // Comando /conciliar_dia <banco> <fecha>
    this.bot.command('conciliar_dia', async (ctx) => {
      const args = ctx.message.text.trim().split(/\s+/).slice(1);
      if (args.length < 2) {
        await ctx.reply(
          `⚠️ *Formato incorrecto.*\nUso correcto: \`/conciliar_dia <banco> <fecha>\`\nEjemplo: \`/conciliar_dia 105 2024-04-15\``,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const banco = args[0];
      const fecha = args[1];
      await this.lanzarConciliacion(ctx, banco, fecha, fecha);
    });

    // Escucha de mensajes de texto libre (Procesamiento NLU / IA)
    this.bot.on('text', async (ctx) => {
      const texto = ctx.message.text.trim();
      if (texto.startsWith('/')) return; // Ya manejado por comandos

      const usuarioAlias = ctx.from?.username ? `@${ctx.from.username}` : `ID ${ctx.from?.id}`;
      this.logger.log(`[TELEGRAM] Mensaje en lenguaje natural de ${usuarioAlias}: "${texto}"`);

      const interpretacion = await this.iaService.interpretarPeticion(texto);

      if (interpretacion.accion === 'estado') {
        const running = this.pipelineService.getIsRunning();
        await ctx.reply(running ? '⏳ Hay un proceso en ejecución actualmente.' : '🟢 Motor en reposo, listo para trabajar.');
        return;
      }

      if (interpretacion.accion === 'detener') {
        if (!this.pipelineService.getIsRunning()) {
          await ctx.reply('ℹ️ No hay ningún lote en ejecución.');
          return;
        }
        this.pipelineService.requestStop();
        await ctx.reply('🛑 Solicitud de detención enviada.');
        return;
      }

      if (interpretacion.accion === 'conciliar' && interpretacion.banco && interpretacion.fechaInicio) {
        const fin = interpretacion.fechaFin || interpretacion.fechaInicio;
        await ctx.reply(
          `🎯 *Petición entendida:*\n${interpretacion.interpretacion || 'Conciliación solicitada'}\n\n` +
          `🏦 *Banco:* \`${interpretacion.banco}\`\n` +
          `📅 *Rango:* \`${interpretacion.fechaInicio}\` hasta \`${fin}\`\n\n` +
          `➡️ _Iniciando procesamiento secuencial..._`,
          { parse_mode: 'Markdown' }
        );

        await this.lanzarConciliacion(ctx, interpretacion.banco, interpretacion.fechaInicio, fin);
        return;
      }

      await ctx.reply(
        `🤖 No pude identificar con certeza los parámetros.\n` +
        `Puedes usar el comando directo:\n\`/conciliar <banco> <fecha_inicio> <fecha_fin>\`\n` +
        `_Ejemplo:_ \`/conciliar 105 2024-04-15 2024-04-18\``,
        { parse_mode: 'Markdown' }
      );
    });
  }

  private async lanzarConciliacion(ctx: Context, banco: string, fechaInicio: string, fechaFin: string) {
    if (this.pipelineService.getIsRunning()) {
      await ctx.reply(
        '⚠️ *Atención:* Ya hay un proceso de conciliación ejecutándose en este momento.\n' +
        'Por normas de no-concurrencia y seguridad de Oracle, debes esperar a que culmine o usar `/detener`.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Validación básica de fecha
    const regexFecha = /^\d{4}-\d{2}-\d{2}$/;
    if (!regexFecha.test(fechaInicio) || !regexFecha.test(fechaFin)) {
      await ctx.reply('⚠️ Formato de fecha no válido. Debe ser `YYYY-MM-DD` (ej. `2024-04-15`).', { parse_mode: 'Markdown' });
      return;
    }

    const operador = ctx.from?.username ? `@${ctx.from.username}` : `TG_USER_${ctx.from?.id}`;

    await ctx.reply(
      `🚀 *Lote Recibido*\n` +
      `🏦 Banco: *${banco}*\n` +
      `📅 Rango: *${fechaInicio}* a *${fechaFin}*\n` +
      `👤 Operador: *${operador}*\n\n` +
      `Iniciando ejecución secuencial día a día sin concurrencia...`,
      { parse_mode: 'Markdown' }
    );

    // Ejecutar pipeline en segundo plano enviando actualizaciones al chat
    this.pipelineService.ejecutarLoteSecuencial({
      banco,
      fechaInicio,
      fechaFin,
      operador,
      onMensaje: async (mensaje, tipo) => {
        await this.enviarMensajeSeguro(ctx, mensaje);
      }
    }).then((res) => {
      if (res.exito) {
        ctx.reply(`🏁 *${res.mensaje}*`, { parse_mode: 'Markdown' }).catch(() => {});
      } else {
        ctx.reply(`⚠️ *Resultado del lote:* ${res.mensaje}`, { parse_mode: 'Markdown' }).catch(() => {});
      }
    }).catch((err) => {
      ctx.reply(`❌ *Error fatal:* ${err.message}`).catch(() => {});
    });
  }

  private async enviarMensajeSeguro(ctx: Context, texto: string) {
    try {
      await ctx.reply(texto, { parse_mode: 'Markdown' });
    } catch (e) {
      // Si falla por caracteres especiales de Markdown, enviar texto plano
      try {
        await ctx.reply(texto.replace(/[*_`]/g, ''));
      } catch (err) {
        this.logger.error(`[TELEGRAM] Error enviando mensaje a chat ${ctx.chat?.id}: ${(err as any).message}`);
      }
    }
  }
}
