import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUsuarioDto {
  @ApiProperty({ description: 'Correo electrónico institucional', example: 'tibisayrivas@seniat.gob.ve' })
  email!: string;

  @ApiProperty({ description: 'Nombre del usuario', example: 'Tibisay' })
  nombre!: string;

  @ApiProperty({ description: 'Apellido del usuario', example: 'Rivas' })
  apellido!: string;

  @ApiProperty({ description: 'Contraseña de acceso inicial', example: 'Pass1234!' })
  password!: string;

  @ApiPropertyOptional({ description: 'Rol asignado', example: 'REVISOR', enum: ['ADMIN', 'SUPERVISOR', 'REVISOR', 'ANALISTA', 'TRANSCRIPTOR'] })
  rol?: string;

  @ApiPropertyOptional({ description: 'Estado del usuario', example: 'ACTIVO', enum: ['ACTIVO', 'INACTIVO'] })
  estado?: string;
}
