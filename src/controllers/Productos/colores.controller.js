const pool = require('../../config/db');

const getAll = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM color ORDER BY nombre_color ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const create = async (req, res) => {
  const { nombre_color, hex_code } = req.body;
  if (!nombre_color || !nombre_color.trim())
    return res.status(400).json({ error: 'El nombre del color es obligatorio.' });
  if (!hex_code || !/^#[0-9A-Fa-f]{6}$/.test(hex_code))
    return res.status(400).json({ error: 'El código hex no es válido. Ej: #FF5733' });

  try {
    const existe = await pool.query(
      'SELECT id_color FROM color WHERE LOWER(nombre_color) = LOWER($1)',
      [nombre_color.trim()]
    );
    if (existe.rows.length > 0)
      return res.status(400).json({ error: 'Ya existe un color con ese nombre.' });

    const result = await pool.query(
      'INSERT INTO color (nombre_color, hex_code) VALUES ($1, $2) RETURNING *',
      [nombre_color.trim(), hex_code]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, create };