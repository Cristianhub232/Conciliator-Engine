const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || '10.78.30.63',
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE || 'xmls',
  user: process.env.PG_USER || 'ont',
  password: process.env.PG_PASSWORD || '123456',
  ssl: false
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Creating schema motor_app...');
    await client.query('CREATE SCHEMA IF NOT EXISTS motor_app;');

    console.log('Creating table motor_app.usuarios...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS motor_app.usuarios (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        rol VARCHAR(50) NOT NULL DEFAULT 'ANALISTA',
        estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
        ultimo_acceso TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Creating table motor_app.sesiones_audit...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS motor_app.sesiones_audit (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES motor_app.usuarios(id) ON DELETE CASCADE,
        ip_address VARCHAR(45),
        user_agent TEXT,
        fecha_ingreso TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        fecha_salida TIMESTAMPTZ,
        token_hash VARCHAR(255)
      );
    `);

    // Check if admin user exists
    const checkAdmin = await client.query('SELECT id FROM motor_app.usuarios WHERE email = $1', ['admin@sirumatek.com']);
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('venezuela1', salt);

    if (checkAdmin.rows.length === 0) {
      console.log('Seeding initial admin user admin@sirumatek.com...');
      await client.query(`
        INSERT INTO motor_app.usuarios (email, nombre, apellido, password_hash, rol, estado)
        VALUES ($1, $2, $3, $4, $5, $6);
      `, ['admin@sirumatek.com', 'Administrador', 'SIRONT', hash, 'ADMIN', 'ACTIVO']);
      console.log('Initial admin created successfully!');
    } else {
      console.log('Admin user already exists. Updating password hash...');
      await client.query('UPDATE motor_app.usuarios SET password_hash = $1, estado = $2 WHERE email = $3', [hash, 'ACTIVO', 'admin@sirumatek.com']);
      console.log('Admin password hash refreshed to venezuela1.');
    }

    const allUsers = await client.query('SELECT id, email, nombre, apellido, rol, estado, created_at FROM motor_app.usuarios;');
    console.log('Current users in motor_app.usuarios:');
    console.table(allUsers.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
