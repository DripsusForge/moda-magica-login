const pool = require('../../config/db');
const fs   = require('fs');
const path = require('path');

// GET /api/imagenes/:id_producto
const getByProducto = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM imagen_producto WHERE id_producto = $1 ORDER BY orden ASC',
      [req.params.id_producto]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/imagenes/:id_producto
const upload = async (req, res) => {
  if (!req.files || req.files.length === 0)
    return res.status(400).json({ error: 'No se enviaron imágenes.' });

  try {
    // Ver cuántas imágenes ya tiene el producto
    const existentes = await pool.query(
      'SELECT COUNT(*) FROM imagen_producto WHERE id_producto = $1',
      [req.params.id_producto]
    );
    let orden = parseInt(existentes.rows[0].count) + 1;

    const insertadas = [];
    for (const file of req.files) {
      const url        = `/uploads/productos/${file.filename}`;
      const esPrincipal = orden === 1 ? 1 : 0;

      const result = await pool.query(`
        INSERT INTO imagen_producto (id_producto, url_imagen, nombre_archivo, orden, es_principal, alt_text)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
      `, [req.params.id_producto, url, file.filename, orden, esPrincipal, file.originalname]);

      insertadas.push(result.rows[0]);
      orden++;
    }
    res.status(201).json(insertadas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/imagenes/principal/:id_imagen
const setPrincipal = async (req, res) => {
  try {
    const img = await pool.query(
      'SELECT id_producto FROM imagen_producto WHERE id_imagen = $1',
      [req.params.id_imagen]
    );
    if (img.rows.length === 0)
      return res.status(404).json({ error: 'Imagen no encontrada.' });

    const id_producto = img.rows[0].id_producto;

    // Quitar principal a todas
    await pool.query(
      'UPDATE imagen_producto SET es_principal = 0 WHERE id_producto = $1',
      [id_producto]
    );
    // Poner principal a la seleccionada
    await pool.query(
      'UPDATE imagen_producto SET es_principal = 1 WHERE id_imagen = $1',
      [req.params.id_imagen]
    );
    res.json({ mensaje: 'Imagen principal actualizada.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/imagenes/:id_imagen
const remove = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM imagen_producto WHERE id_imagen = $1 RETURNING *',
      [req.params.id_imagen]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Imagen no encontrada.' });

    // Eliminar archivo físico
    const filePath = path.join(__dirname, '../../', result.rows[0].url_imagen);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ mensaje: 'Imagen eliminada.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getByProducto, upload, setPrincipal, remove };