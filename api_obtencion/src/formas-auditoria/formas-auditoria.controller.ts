import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { FormasAuditoriaService, SetAuditoriaDto } from './formas-auditoria.service';

@Controller('api/formas-auditoria')
export class FormasAuditoriaController {
  constructor(private readonly formasAuditoriaService: FormasAuditoriaService) {}

  @Get()
  async getAll() {
    const data = await this.formasAuditoriaService.getAll();
    return {
      success: true,
      formas: data,
      total: Object.keys(data).length,
    };
  }

  @Get(':cod_forma')
  async getByCod(@Param('cod_forma') codForma: string) {
    const data = await this.formasAuditoriaService.getByCod(codForma);
    return {
      success: true,
      data,
    };
  }

  @Post(':cod_forma')
  async setAuditoria(
    @Param('cod_forma') codForma: string,
    @Body() body: SetAuditoriaDto
  ) {
    const updated = await this.formasAuditoriaService.setAuditoria(codForma, body);
    return {
      success: true,
      data: updated,
    };
  }
}
