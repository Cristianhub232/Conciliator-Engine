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
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Controller('api/usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('rol') rol?: string,
    @Query('estado') estado?: string,
  ) {
    return await this.usuariosService.findAll(search, rol, estado);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.usuariosService.findOne(id);
  }

  @Post()
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
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
  ) {
    return await this.usuariosService.update(id, updateUsuarioDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.usuariosService.remove(id);
  }
}
