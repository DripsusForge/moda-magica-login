const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Test de conexión al arrancar
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err); // quita el .message
  } else {
    console.log('Conexión a PostgreSQL exitosa');
    release();
  }
});

module.exports = pool;