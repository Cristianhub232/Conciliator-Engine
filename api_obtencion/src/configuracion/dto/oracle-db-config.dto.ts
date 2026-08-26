export class OracleDbConfigDto {
  user: string;
  password: string;
  host: string;
  port: number;
  sid?: string;
  service_name?: string;
}
