import { Controller, Get, Post, Body } from '@nestjs/common';
import { BotConfigService } from './bot-config.service';

@Controller('api/bot-config')
export class BotConfigController {
  constructor(private readonly botConfigService: BotConfigService) {}

  @Get()
  async getConfig() {
    return this.botConfigService.getConfig();
  }

  @Post()
  async saveConfig(@Body() body: any) {
    return this.botConfigService.saveConfig(body);
  }

  @Post('test-telegram')
  async testTelegram(@Body() body: { token?: string }) {
    return this.botConfigService.testTelegram(body.token);
  }

  @Post('test-ia')
  async testIa(@Body() body: {
    provider: 'deepseek' | 'anthropic' | 'google';
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    prompt?: string;
  }) {
    return this.botConfigService.testIa(body);
  }
}
