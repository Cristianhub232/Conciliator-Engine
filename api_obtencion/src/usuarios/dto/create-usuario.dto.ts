export class CreateUsuarioDto {
  email: string;
  nombre: string;
  apellido: string;
  password: string;
  rol?: string; // 'ADMIN' | 'SUPERVISOR' | 'ANALISTA' | 'TRANSCRIPTOR'
  estado?: string; // 'ACTIVO' | 'INACTIVO'
}
