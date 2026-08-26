import { Controller, Get, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ConfiguracionService } from './configuracion.service';
import { OracleDbConfigDto } from './dto/oracle-db-config.dto';

@Controller('api/configuracion')
export class ConfiguracionController {
  constructor(private readonly configService: ConfiguracionService) {}

  @Get('env')
  getEnv() {
    return this.configService.getCurrentEnv();
  }

  @Post('test')
  async testConnection(@Body() body: OracleDbConfigDto) {
    if (!body.host || !body.user || !body.password) {
      throw new HttpException(
        { status: HttpStatus.BAD_REQUEST, error: 'Bad Request', message: 'Host, usuario y contraseña son requeridos para la prueba.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.configService.testConnection(body);
  }

  @Post('save')
  async saveAndReconnect(@Body() body: OracleDbConfigDto) {
    if (!body.host || !body.user || !body.password) {
      throw new HttpException(
        { status: HttpStatus.BAD_REQUEST, error: 'Bad Request', message: 'Host, usuario y contraseña son obligatorios para guardar.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      return await this.configService.saveEnvAndReconnect(body);
    } catch (err: any) {
      throw new HttpException(
        { status: HttpStatus.INTERNAL_SERVER_ERROR, error: 'Error de Configuración', message: err.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
