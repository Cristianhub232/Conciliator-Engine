import { Module } from '@nestjs/common';
import { BotConfigController } from './bot-config.controller';
import { BotConfigService } from './bot-config.service';
import { TelegramModule } from '../telegram/telegram.module';
import { IaModule } from '../ia/ia.module';

@Module({
  imports: [TelegramModule, IaModule],
  controllers: [BotConfigController],
  providers: [BotConfigService],
  exports: [BotConfigService]
})
export class BotConfigModule {}
