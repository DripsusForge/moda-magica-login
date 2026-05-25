const pool = require('../../config/db');

const getAll = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM talla ORDER BY id_talla ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll };