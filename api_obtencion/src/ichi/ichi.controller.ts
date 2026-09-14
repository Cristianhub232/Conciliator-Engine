import { Controller, Get, Post, Body } from '@nestjs/common';
import { IchiService } from './ichi.service';
import { IchiChatDto, IchiExecuteToolDto } from './ichi.dto';

@Controller('api/ichi')
export class IchiController {
  constructor(private readonly ichiService: IchiService) {}

  @Get('tools')
  getTools() {
    return {
      success: true,
      tools: this.ichiService.getAvailableTools(),
    };
  }

  @Post('execute-tool')
  async executeTool(@Body() body: IchiExecuteToolDto) {
    return await this.ichiService.executeTool(body.tool, body.params, body.formatOptions);
  }

  @Post('chat')
  async chat(@Body() body: IchiChatDto) {
    return await this.ichiService.chat(body);
  }
}
