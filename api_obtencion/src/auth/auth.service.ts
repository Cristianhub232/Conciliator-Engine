import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PostgresService } from '../database/postgres.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { LoginDto } from './dto/login.dto';

const JWT_SECRET = process.env.JWT_SECRET || 'SIRONT_SECRET_KEY_2026_VENEZUELA';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '4h') as jwt.SignOptions['expiresIn'];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly pg: PostgresService) {}

  async login(loginDto: LoginDto, ipAddress: string = '127.0.0.1', userAgent: string = 'Unknown') {
    const { email, password } = loginDto;

    const res = await this.pg.query(
      'SELECT id, email, nombre, apellido, password_hash, rol, estado FROM motor_app.usuarios WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );

    if (res.rows.length === 0) {
      throw new UnauthorizedException('Credenciales inválidas. Usuario no encontrado.');
    }

    const user = res.rows[0];

    if (user.estado !== 'ACTIVO') {
      throw new UnauthorizedException('Su cuenta se encuentra inactiva o bloqueada. Contacte al administrador.');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas. Contraseña incorrecta.');
    }

    // Actualizar último acceso
    await this.pg.query(
      'UPDATE motor_app.usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generar Token JWT
    const payload = {
      sub: user.id,
      email: user.email,
      nombre: user.nombre,
      apellido: user.apellido,
      rol: user.rol,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Registrar sesión en auditoría
    try {
      await this.pg.query(
        `INSERT INTO motor_app.sesiones_audit (usuario_id, ip_address, user_agent, token_hash)
         VALUES ($1, $2, $3, $4)`,
        [user.id, ipAddress, userAgent, token.substring(0, 32)]
      );
    } catch (err) {
      this.logger.warn('No se pudo registrar la sesión de auditoría:', err);
    }

    return {
      status: 200,
      message: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        rol: user.rol,
        estado: user.estado,
      },
    };
  }

  async verifyToken(token: string) {
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const res = await this.pg.query(
        'SELECT id, email, nombre, apellido, rol, estado, ultimo_acceso FROM motor_app.usuarios WHERE id = $1',
        [decoded.sub]
      );
      if (res.rows.length === 0 || res.rows[0].estado !== 'ACTIVO') {
        throw new UnauthorizedException('Sesión expirada o usuario inactivo.');
      }
      return {
        valid: true,
        usuario: res.rows[0],
      };
    } catch (err) {
      throw new UnauthorizedException('Token inválido o expirado.');
    }
  }

  async logout(usuarioId: number, token?: string) {
    try {
      if (token) {
        await this.pg.query(
          `UPDATE motor_app.sesiones_audit 
           SET fecha_salida = CURRENT_TIMESTAMP 
           WHERE usuario_id = $1 AND token_hash = $2 AND fecha_salida IS NULL`,
          [usuarioId, token.substring(0, 32)]
        );
      }
    } catch (err) {
      this.logger.warn('Error al registrar logout:', err);
    }
    return { status: 200, message: 'Sesión cerrada correctamente' };
  }
}
