import { Controller, Get, Post, Patch, Delete, Body, Query, Param, Req } from '@nestjs/common';
import { DepuracionService } from './depuracion.service';

export class EjecutarDepuracionDto {
  fecha!: string;
  banco!: string;
  planillas_ids!: string[];
  motivo!: string;
  password_autorizacion!: string;
  usuario_email!: string;
}

@Controller('api/depuracion')
export class DepuracionController {
  constructor(private readonly depuracionService: DepuracionService) {}

  @Get('formas')
  async getFormasConfiguradas() {
    return this.depuracionService.getFormasConfiguradas();
  }

  @Post('formas')
  async addFormaConfigurada(@Body() body: { cod_forma: string; descripcion: string; motivo: string }) {
    return this.depuracionService.addFormaConfigurada(body.cod_forma, body.descripcion, body.motivo);
  }

  @Patch('formas/:id/estado')
  async toggleFormaEstado(@Param('id') id: string, @Body() body: { estado: string }) {
    return this.depuracionService.toggleFormaEstado(Number(id), body.estado);
  }

  @Delete('formas/:id')
  async deleteFormaConfigurada(@Param('id') id: string) {
    return this.depuracionService.deleteFormaConfigurada(Number(id));
  }

  @Get('scan')
  async escanearLote(
    @Query('fecha') fecha: string,
    @Query('banco') banco: string,
    @Query('expediente') expediente?: string
  ) {
    return this.depuracionService.escanearLote(fecha, banco, expediente);
  }

  @Post('ejecutar')
  async ejecutarDepuracion(@Body() payload: EjecutarDepuracionDto, @Req() req: any) {
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    return this.depuracionService.ejecutarDepuracion(payload, String(ip));
  }

  @Get('historial')
  async getHistorialAudit() {
    return this.depuracionService.getHistorialAudit();
  }
}
