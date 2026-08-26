import { Controller, Post, Get, Body, Req, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import type { Request } from 'express';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    return await this.authService.login(loginDto, ip, userAgent);
  }

  @Get('me')
  async getProfile(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autorización no proporcionado.');
    }
    const token = authHeader.replace('Bearer ', '');
    return await this.authService.verifyToken(token);
  }

  @Post('logout')
  async logout(@Headers('authorization') authHeader?: string, @Body('usuario_id') usuarioId?: number) {
    const token = authHeader?.replace('Bearer ', '');
    return await this.authService.logout(usuarioId || 0, token);
  }
}
