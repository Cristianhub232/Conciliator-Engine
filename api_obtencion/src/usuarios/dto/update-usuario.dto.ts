import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUsuarioDto {
  @ApiPropertyOptional({ description: 'Correo electrónico', example: 'tibisayrivas@seniat.gob.ve' })
  email?: string;

  @ApiPropertyOptional({ description: 'Nombre', example: 'Tibisay' })
  nombre?: string;

  @ApiPropertyOptional({ description: 'Apellido', example: 'Rivas' })
  apellido?: string;

  @ApiPropertyOptional({ description: 'Nueva contraseña', example: 'NewPass123!' })
  password?: string;

  @ApiPropertyOptional({ description: 'Rol asignado', example: 'REVISOR' })
  rol?: string;

  @ApiPropertyOptional({ description: 'Estado', example: 'ACTIVO' })
  estado?: string;
}
