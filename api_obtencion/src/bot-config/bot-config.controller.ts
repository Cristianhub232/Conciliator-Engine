import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BotConfigService } from './bot-config.service';

export class TestIaDto {
  @ApiProperty({ description: 'Proveedor de Inteligencia Artificial', enum: ['deepseek', 'anthropic', 'google'], example: 'deepseek' })
  provider!: 'deepseek' | 'anthropic' | 'google';

  @ApiPropertyOptional({ description: 'API Key del servicio de IA', example: 'sk-1234567890abcdef' })
  apiKey?: string;

  @ApiPropertyOptional({ description: 'Base URL de la API (opcional)', example: 'https://api.deepseek.com' })
  baseUrl?: string;

  @ApiPropertyOptional({ description: 'Nombre del modelo', example: 'deepseek-chat' })
  model?: string;

  @ApiPropertyOptional({ description: 'Prompt de prueba', example: 'Hola, ¿estás operativo?' })
  prompt?: string;
}

@ApiTags('bot-config')
@Controller('api/bot-config')
export class BotConfigController {
  constructor(private readonly botConfigService: BotConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener configuración activa del Bot de Telegram e IA' })
  @ApiResponse({ status: 200, description: 'Configuración retornada' })
  async getConfig() {
    return this.botConfigService.getConfig();
  }

  @Post()
  @ApiOperation({ summary: 'Guardar parámetros del Bot de Telegram e IA' })
  @ApiResponse({ status: 200, description: 'Configuración guardada' })
  async saveConfig(@Body() body: any) {
    return this.botConfigService.saveConfig(body);
  }

  @Post('test-telegram')
  @ApiOperation({ summary: 'Realizar prueba de conectividad con Telegram Bot API' })
  @ApiBody({ schema: { type: 'object', properties: { token: { type: 'string', example: '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ' } } } })
  @ApiResponse({ status: 200, description: 'Respuesta del test de Telegram' })
  async testTelegram(@Body() body: { token?: string }) {
    return this.botConfigService.testTelegram(body.token);
  }

  @Post('test-ia')
  @ApiOperation({ summary: 'Realizar prueba de conexión con modelo de Inteligencia Artificial' })
  @ApiBody({ type: TestIaDto })
  @ApiResponse({ status: 200, description: 'Respuesta del test de IA' })
  async testIa(@Body() body: TestIaDto) {
    return this.botConfigService.testIa(body);
  }
}
