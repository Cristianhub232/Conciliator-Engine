import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  Query, 
  Body, 
  ParseIntPipe,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@ApiTags('usuarios')
@Controller('api/usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener lista de usuarios con opción de filtrado' })
  @ApiQuery({ name: 'search', required: false, example: 'Tibisay', description: 'Término de búsqueda por nombre o email' })
  @ApiQuery({ name: 'rol', required: false, example: 'REVISOR', description: 'Filtrar por rol' })
  @ApiQuery({ name: 'estado', required: false, example: 'ACTIVO', description: 'Filtrar por estado' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  async findAll(
    @Query('search') search?: string,
    @Query('rol') rol?: string,
    @Query('estado') estado?: string,
  ) {
    return await this.usuariosService.findAll(search, rol, estado);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiParam({ name: 'id', description: 'ID primario del usuario', example: 1 })
  @ApiResponse({ status: 200, description: 'Datos del usuario' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.usuariosService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo usuario operador o analista' })
  @ApiBody({ type: CreateUsuarioDto })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos obligatorios no proporcionados' })
  async create(@Body() createUsuarioDto: CreateUsuarioDto) {
    if (!createUsuarioDto.email || !createUsuarioDto.nombre || !createUsuarioDto.apellido || !createUsuarioDto.password) {
      throw new HttpException(
        { status: HttpStatus.BAD_REQUEST, error: 'Bad Request', message: 'Email, nombre, apellido y contraseña son obligatorios.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.usuariosService.create(createUsuarioDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modificar datos o rol de un usuario existente' })
  @ApiParam({ name: 'id', description: 'ID primario del usuario', example: 1 })
  @ApiBody({ type: UpdateUsuarioDto })
  @ApiResponse({ status: 200, description: 'Usuario actualizado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
  ) {
    return await this.usuariosService.update(id, updateUsuarioDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar o desactivar un usuario por ID' })
  @ApiParam({ name: 'id', description: 'ID del usuario a eliminar', example: 1 })
  @ApiResponse({ status: 200, description: 'Usuario eliminado' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.usuariosService.remove(id);
  }
}
