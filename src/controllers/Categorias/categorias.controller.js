const pool = require('../../config/db');

const validar = ({ nombre_categoria, descripcion }) => {
  const errores = {};
  const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;

  if (!nombre_categoria || !nombre_categoria.trim())
    errores.nombre_categoria = 'El nombre es obligatorio.';
  else if (!soloLetras.test(nombre_categoria.trim()))
    errores.nombre_categoria = 'El nombre solo puede contener letras.';
  else if (nombre_categoria.trim().length > 100)
    errores.nombre_categoria = 'El nombre no puede superar 100 caracteres.';

  if (!descripcion || !descripcion.trim())
    errores.descripcion = 'La descripción es obligatoria.';
  else if (descripcion.trim().length > 255)
    errores.descripcion = 'La descripción no puede superar 255 caracteres.';

  return errores;
};

const getAll = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM categoria_producto ORDER BY id_categoria ASC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM categoria_producto WHERE id_categoria = $1',
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Categoría no encontrada.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const create = async (req, res) => {
  const errores = validar(req.body);
  if (Object.keys(errores).length > 0)
    return res.status(400).json({ errores });

  const { nombre_categoria, descripcion } = req.body;
  try {
    const existe = await pool.query(
      'SELECT id_categoria FROM categoria_producto WHERE LOWER(nombre_categoria) = LOWER($1)',
      [nombre_categoria.trim()]
    );
    if (existe.rows.length > 0)
      return res.status(400).json({ error: 'Ya existe una categoría con ese nombre.' });

    const result = await pool.query(
      'INSERT INTO categoria_producto (nombre_categoria, descripcion, estado) VALUES ($1, $2, $3) RETURNING *',
      [nombre_categoria.trim(), descripcion.trim(), 'activo']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const update = async (req, res) => {
  const errores = validar(req.body);
  if (Object.keys(errores).length > 0)
    return res.status(400).json({ errores });

  const { nombre_categoria, descripcion, estado } = req.body;
  try {
    const existe = await pool.query(
      'SELECT id_categoria FROM categoria_producto WHERE LOWER(nombre_categoria) = LOWER($1) AND id_categoria != $2',
      [nombre_categoria.trim(), req.params.id]
    );
    if (existe.rows.length > 0)
      return res.status(400).json({ error: 'Ya existe otra categoría con ese nombre.' });

    const result = await pool.query(
      `UPDATE categoria_producto 
       SET nombre_categoria = $1, descripcion = $2, estado = $3
       WHERE id_categoria = $4 RETURNING *`,
      [nombre_categoria.trim(), descripcion.trim(), estado, req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Categoría no encontrada.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    // const productos = await pool.query(
    //   'SELECT id_producto FROM producto WHERE id_categoria = $1 LIMIT 1',
    //   [req.params.id]
    // );
    // if (productos.rows.length > 0)
    //   return res.status(400).json({ error: 'No se puede eliminar, la categoría tiene productos asociados.' });

    const result = await pool.query(
      'DELETE FROM categoria_producto WHERE id_categoria = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Categoría no encontrada.' });
    res.json({ mensaje: 'Categoría eliminada correctamente.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, getById, create, update, remove };