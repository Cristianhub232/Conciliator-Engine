import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Correo electrónico institucional del usuario',
    example: 'maira_0018@seniat.gob.ve',
  })
  email!: string;

  @ApiProperty({
    description: 'Contraseña de acceso',
    example: 'Secret123!',
  })
  password!: string;
}

