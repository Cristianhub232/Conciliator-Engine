import { Controller, Get, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ConfiguracionService } from './configuracion.service';
import { OracleDbConfigDto } from './dto/oracle-db-config.dto';

@ApiTags('configuracion')
@Controller('api/configuracion')
export class ConfiguracionController {
  constructor(private readonly configService: ConfiguracionService) {}

  @Get('env')
  @ApiOperation({ summary: 'Consultar variables de entorno y estado del Pool de Oracle DB' })
  @ApiResponse({ status: 200, description: 'Estado actual de la configuración' })
  getEnv() {
    return this.configService.getCurrentEnv();
  }

  @Post('test')
  @ApiOperation({ summary: 'Probar conexión a Oracle DB sin guardar cambios' })
  @ApiBody({ type: OracleDbConfigDto })
  @ApiResponse({ status: 200, description: 'Resultado de la prueba de conexión' })
  async testConnection(@Body() body: OracleDbConfigDto) {
    if (!body.host || !body.user || !body.password) {
      throw new HttpException(
        { status: HttpStatus.BAD_REQUEST, error: 'Bad Request', message: 'Host, usuario y contraseña son requeridos para la prueba.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.configService.testConnection(body);
  }

  @Post('test-connection')
  @ApiOperation({ summary: 'Alias para prueba de conexión Oracle DB' })
  @ApiBody({ type: OracleDbConfigDto })
  async testConnectionAlias(@Body() body: OracleDbConfigDto) {
    return this.testConnection(body);
  }

  @Post('save')
  @ApiOperation({ summary: 'Guardar configuración en .env y reconectar Pool de Oracle DB' })
  @ApiBody({ type: OracleDbConfigDto })
  @ApiResponse({ status: 200, description: 'Configuración guardada y Pool reconectado' })
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
