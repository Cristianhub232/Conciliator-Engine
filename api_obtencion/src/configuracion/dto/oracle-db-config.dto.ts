import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OracleDbConfigDto {
  @ApiProperty({ description: 'Usuario de conexión Oracle DB', example: 'SIGE1' })
  user!: string;

  @ApiProperty({ description: 'Contraseña de conexión Oracle DB', example: 'SecretDBPass!' })
  password!: string;

  @ApiProperty({ description: 'IP o Host del servidor Oracle DB', example: '10.79.6.247' })
  host!: string;

  @ApiProperty({ description: 'Puerto del listener Oracle', example: 1521 })
  port!: number;

  @ApiPropertyOptional({ description: 'SID de la base de datos Oracle', example: 'sige' })
  sid?: string;

  @ApiPropertyOptional({ description: 'Service Name de la base de datos Oracle', example: 'sige.seniat.gob.ve' })
  service_name?: string;
}
