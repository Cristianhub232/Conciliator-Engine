const { Pool } = require('pg');

const pool = new Pool({
  host: '10.78.30.63',
  port: 5432,
  database: 'xmls',
  user: 'ont',
  password: '[CONFIGURADA]',
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('--- Migrando esquema motor_app para depuración ---');

    await client.query(`
      CREATE TABLE IF NOT EXISTS motor_app.formas_depuracion (
        id SERIAL PRIMARY KEY,
        cod_forma VARCHAR(20) NOT NULL UNIQUE,
        descripcion VARCHAR(255),
        motivo VARCHAR(255),
        estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const initialFormas = [
      ['79984', 'Forma 79984 - No procesable en conciliación', 'Forma marcada para depuración'],
      ['99008', 'Forma 99008 - No procesable en conciliación', 'Forma marcada para depuración'],
      ['00084', 'Forma 00084 - No procesable en conciliación', 'Forma marcada para depuración'],
      ['84',    'Forma 84 - No procesable en conciliación',    'Forma marcada para depuración'],
      ['79084', 'Forma 79084 - No procesable en conciliación', 'Forma marcada para depuración'],
      ['99001', 'Forma 99001 - Registro bancario no tributario', 'Forma excluida de SIGECOF']
    ];

    for (const [cod, desc, mot] of initialFormas) {
      await client.query(`
        INSERT INTO motor_app.formas_depuracion (cod_forma, descripcion, motivo, estado)
        VALUES ($1, $2, $3, 'ACTIVO')
        ON CONFLICT (cod_forma) DO NOTHING
      `, [cod, desc, mot]);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS motor_app.depuracion_audit (
        id SERIAL PRIMARY KEY,
        fecha_depuracion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        usuario_email VARCHAR(150) NOT NULL,
        usuario_nombre VARCHAR(150),
        fecha_recaudacion VARCHAR(20),
        banco_codigo VARCHAR(20),
        total_registros_eliminados INTEGER NOT NULL DEFAULT 0,
        monto_total_depurado NUMERIC(18, 2) DEFAULT 0,
        formas_afectadas TEXT,
        planillas_afectadas JSONB,
        motivo_autorizacion TEXT NOT NULL,
        ip_address VARCHAR(50),
        detalles JSONB
      )
    `);

    const res = await client.query('SELECT id, cod_forma, descripcion, estado FROM motor_app.formas_depuracion ORDER BY id');
    console.log('✅ Formas en catálogo de depuración creadas en motor_app:');
    console.table(res.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
