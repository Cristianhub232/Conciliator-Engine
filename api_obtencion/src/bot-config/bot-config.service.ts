import { Injectable, Logger } from '@nestjs/common';
import { TelegramService } from '../telegram/telegram.service';
import { IaService } from '../ia/ia.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BotConfigService {
  private readonly logger = new Logger(BotConfigService.name);
  private envPath = path.resolve(process.cwd(), '.env');

  constructor(
    private readonly telegramService: TelegramService,
    private readonly iaService: IaService
  ) {}

  /**
   * Obtiene la configuración consolidada del Bot y de los Proveedores de IA
   */
  async getConfig() {
    const telegramInfo = this.telegramService.getBotInfo();
    const iaConfig = this.iaService.getConfig();

    const mask = (key: string) => {
      if (!key) return '';
      if (key.length <= 8) return '********';
      return `${key.slice(0, 4)}...${key.slice(-4)}`;
    };

    return {
      telegram: {
        ...telegramInfo,
        maskedToken: mask(process.env.TELEGRAM_BOT_TOKEN || ''),
        rawAllowedUsers: process.env.TELEGRAM_ALLOWED_USERS || ''
      },
      ia: iaConfig
    };
  }

  /**
   * Guarda los cambios en memoria y en el archivo .env
   */
  async saveConfig(body: {
    telegramToken?: string;
    telegramAllowedUsers?: string;
    iaActiveProvider?: 'deepseek' | 'anthropic' | 'google';
    providers?: any;
  }) {
    // 1. Actualizar Telegram si viene un token nuevo o usuarios
    let telegramReloadResult: any = null;
    const isNewToken = body.telegramToken && !body.telegramToken.includes('...');
    
    if (isNewToken || body.telegramAllowedUsers !== undefined) {
      telegramReloadResult = await this.telegramService.recargarBot(
        isNewToken ? body.telegramToken : undefined,
        body.telegramAllowedUsers
      );
    }

    // 2. Actualizar IA
    if (body.iaActiveProvider || body.providers) {
      this.iaService.updateConfig({
        activeProvider: body.iaActiveProvider,
        providers: body.providers
      });
    }

    // 3. Persistir en archivo .env
    this.persistirEnEnv({
      TELEGRAM_BOT_TOKEN: isNewToken ? body.telegramToken : undefined,
      TELEGRAM_ALLOWED_USERS: body.telegramAllowedUsers,
      IA_ACTIVE_PROVIDER: body.iaActiveProvider,
      DEEPSEEK_API_KEY: body.providers?.deepseek?.apiKey && !body.providers.deepseek.apiKey.includes('...') ? body.providers.deepseek.apiKey : undefined,
      DEEPSEEK_BASE_URL: body.providers?.deepseek?.baseUrl,
      DEEPSEEK_MODEL: body.providers?.deepseek?.model,
      ANTHROPIC_API_KEY: body.providers?.anthropic?.apiKey && !body.providers.anthropic.apiKey.includes('...') ? body.providers.anthropic.apiKey : undefined,
      ANTHROPIC_BASE_URL: body.providers?.anthropic?.baseUrl,
      ANTHROPIC_MODEL: body.providers?.anthropic?.model,
      GEMINI_API_KEY: body.providers?.google?.apiKey && !body.providers.google.apiKey.includes('...') ? body.providers.google.apiKey : undefined,
      GOOGLE_BASE_URL: body.providers?.google?.baseUrl,
      GOOGLE_MODEL: body.providers?.google?.model
    });

    return {
      success: true,
      mensaje: 'Configuración de Bot e IA guardada y aplicada exitosamente.',
      data: await this.getConfig()
    };
  }

  /**
   * Prueba un token de Telegram llamando a getMe
   */
  async testTelegram(token?: string) {
    const testToken = token && !token.includes('...') ? token.trim() : process.env.TELEGRAM_BOT_TOKEN;
    if (!testToken) {
      return { success: false, error: 'No se suministró token de Telegram' };
    }

    try {
      const resp = await fetch(`https://api.telegram.org/bot${testToken}/getMe`);
      const data = await resp.json();
      if (!data.ok) {
        return { success: false, error: data.description || 'Token inválido' };
      }
      return {
        success: true,
        bot: {
          id: data.result.id,
          username: data.result.username,
          firstName: data.result.first_name
        }
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Prueba un proveedor de IA enviando un prompt y midiendo latencia
   */
  async testIa(body: {
    provider: 'deepseek' | 'anthropic' | 'google';
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    prompt?: string;
  }) {
    const apiKey = body.apiKey && !body.apiKey.includes('...') ? body.apiKey : undefined;
    return this.iaService.testProvider(
      body.provider,
      apiKey,
      body.baseUrl,
      body.model,
      body.prompt
    );
  }

  private persistirEnEnv(variables: Record<string, string | undefined>) {
    try {
      if (!fs.existsSync(this.envPath)) return;
      let content = fs.readFileSync(this.envPath, 'utf8');

      for (const [key, value] of Object.entries(variables)) {
        if (value === undefined) continue;
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(content)) {
          content = content.replace(regex, `${key}=${value}`);
        } else {
          content += `\n${key}=${value}`;
        }
        process.env[key] = value;
      }

      fs.writeFileSync(this.envPath, content, 'utf8');
      this.logger.log('[BOT_CONFIG] Variables de entorno persistidas en .env');
    } catch (err: any) {
      this.logger.warn(`[BOT_CONFIG] No se pudo escribir en .env: ${err.message}`);
    }
  }
}
