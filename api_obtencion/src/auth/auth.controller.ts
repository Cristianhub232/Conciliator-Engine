import { Controller, Post, Get, Body, Req, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import type { Request } from 'express';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Iniciar sesión y obtener Token JWT',
    description: 'Valida credenciales de usuario, registra IP/User-Agent en auditoría y retorna Token JWT cifrado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Autenticación exitosa',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 1,
          email: 'maira_0018@seniat.gob.ve',
          nombre: 'Maira',
          apellido: 'Rodríguez',
          rol: 'REVISOR',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    return await this.authService.login(loginDto, ip, userAgent);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener perfil del usuario autenticado',
    description: 'Verifica la validez del token Bearer JWT y retorna los metadatos del usuario activo.',
  })
  @ApiResponse({ status: 200, description: 'Datos de perfil' })
  @ApiResponse({ status: 401, description: 'Token no proporcionado o expirado' })
  async getProfile(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autorización no proporcionado.');
    }
    const token = authHeader.replace('Bearer ', '');
    return await this.authService.verifyToken(token);
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión de usuario', description: 'Invalida la sesión del token actual.' })
  @ApiResponse({ status: 200, description: 'Sesión finalizada exitosamente' })
  async logout(@Headers('authorization') authHeader?: string, @Body('usuario_id') usuarioId?: number) {
    const token = authHeader?.replace('Bearer ', '');
    return await this.authService.logout(usuarioId || 0, token);
  }
}

