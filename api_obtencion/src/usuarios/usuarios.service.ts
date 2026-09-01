import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PostgresService } from '../database/postgres.service';
import * as bcrypt from 'bcryptjs';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Injectable()
export class UsuariosService {
  private readonly logger = new Logger(UsuariosService.name);

  constructor(private readonly pg: PostgresService) {}

  async findAll(search?: string, rol?: string, estado?: string) {
    let query = `
      SELECT id, email, nombre, apellido, rol, estado, ultimo_acceso, created_at, updated_at
      FROM motor_app.usuarios
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(nombre) LIKE $${params.length} OR LOWER(apellido) LIKE $${params.length} OR LOWER(email) LIKE $${params.length})`;
    }

    if (rol && rol.trim()) {
      params.push(rol.trim().toUpperCase());
      query += ` AND rol = $${params.length}`;
    }

    if (estado && estado.trim()) {
      params.push(estado.trim().toUpperCase());
      query += ` AND estado = $${params.length}`;
    }

    query += ` ORDER BY id ASC`;

    const res = await this.pg.query(query, params);
    return {
      status: 200,
      total: res.rows.length,
      usuarios: res.rows,
    };
  }

  async findOne(id: number) {
    const res = await this.pg.query(
      `SELECT id, email, nombre, apellido, rol, estado, ultimo_acceso, created_at, updated_at
       FROM motor_app.usuarios
       WHERE id = $1`,
      [id]
    );

    if (res.rows.length === 0) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
    }

    return {
      status: 200,
      usuario: res.rows[0],
    };
  }

  async create(dto: CreateUsuarioDto) {
    const email = dto.email.trim().toLowerCase();

    // Validar si el email ya existe
    const exists = await this.pg.query('SELECT id FROM motor_app.usuarios WHERE LOWER(email) = $1', [email]);
    if (exists.rows.length > 0) {
      throw new BadRequestException(`El correo electrónico ${email} ya se encuentra registrado.`);
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(dto.password, salt);
    const rol = (dto.rol || 'ANALISTA').toUpperCase();
    const estado = (dto.estado || 'ACTIVO').toUpperCase();

    const res = await this.pg.query(
      `INSERT INTO motor_app.usuarios (email, nombre, apellido, password_hash, rol, estado)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, nombre, apellido, rol, estado, created_at`,
      [email, dto.nombre.trim(), dto.apellido.trim(), passwordHash, rol, estado]
    );

    return {
      status: 201,
      message: 'Usuario creado exitosamente',
      usuario: res.rows[0],
    };
  }

  async update(id: number, dto: UpdateUsuarioDto) {
    // Validar existencia
    const current = await this.pg.query('SELECT id, email FROM motor_app.usuarios WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (dto.nombre !== undefined) {
      params.push(dto.nombre.trim());
      updates.push(`nombre = $${params.length}`);
    }

    if (dto.apellido !== undefined) {
      params.push(dto.apellido.trim());
      updates.push(`apellido = $${params.length}`);
    }

    if (dto.email !== undefined) {
      const newEmail = dto.email.trim().toLowerCase();
      // Validar que no pertenezca a otro usuario
      const checkEmail = await this.pg.query('SELECT id FROM motor_app.usuarios WHERE LOWER(email) = $1 AND id != $2', [newEmail, id]);
      if (checkEmail.rows.length > 0) {
        throw new BadRequestException(`El correo electrónico ${newEmail} ya pertenece a otro usuario.`);
      }
      params.push(newEmail);
      updates.push(`email = $${params.length}`);
    }

    if (dto.password && dto.password.trim()) {
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(dto.password.trim(), salt);
      params.push(passwordHash);
      updates.push(`password_hash = $${params.length}`);
    }

    if (dto.rol !== undefined) {
      params.push(dto.rol.trim().toUpperCase());
      updates.push(`rol = $${params.length}`);
    }

    if (dto.estado !== undefined) {
      params.push(dto.estado.trim().toUpperCase());
      updates.push(`estado = $${params.length}`);
    }

    if (updates.length === 0) {
      throw new BadRequestException('No se proporcionaron campos para actualizar.');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const query = `
      UPDATE motor_app.usuarios 
      SET ${updates.join(', ')} 
      WHERE id = $${params.length}
      RETURNING id, email, nombre, apellido, rol, estado, ultimo_acceso, updated_at
    `;

    const res = await this.pg.query(query, params);
    return {
      status: 200,
      message: 'Usuario actualizado exitosamente',
      usuario: res.rows[0],
    };
  }

  async remove(id: number) {
    const check = await this.pg.query('SELECT id, email FROM motor_app.usuarios WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
    }

    if (check.rows[0].id === 1) {
      throw new BadRequestException('No se puede eliminar el usuario administrador principal del sistema.');
    }

    await this.pg.query('DELETE FROM motor_app.usuarios WHERE id = $1', [id]);

    return {
      status: 200,
      message: `Usuario ${check.rows[0].email} eliminado exitosamente.`,
    };
  }
}
