const pool = require('../../config/db');

const validar = ({ codigo, descripcion, valor_descuento, fecha_inicio, fecha_cierre, limite_usos }) => {
  const errores = {};

  if (!codigo || !codigo.trim())
    errores.codigo = 'El código es obligatorio.';
  else if (codigo.trim().length > 50)
    errores.codigo = 'El código no puede superar 50 caracteres.';

  if (descripcion && descripcion.trim().length > 255)
    errores.descripcion = 'La descripción no puede superar 255 caracteres.';

  if (valor_descuento === undefined || valor_descuento === null || valor_descuento === '')
    errores.valor_descuento = 'El valor del descuento es obligatorio.';
  else if (isNaN(valor_descuento) || Number(valor_descuento) <= 0)
    errores.valor_descuento = 'El valor debe ser un número mayor a 0.';
  else if (Number(valor_descuento) > 100)
    errores.valor_descuento = 'El porcentaje no puede ser mayor a 100.';

  if (!fecha_inicio)
    errores.fecha_inicio = 'La fecha de inicio es obligatoria.';

  if (!fecha_cierre)
    errores.fecha_cierre = 'La fecha de cierre es obligatoria.';

  if (fecha_inicio && fecha_cierre && new Date(fecha_inicio) >= new Date(fecha_cierre))
    errores.fecha_cierre = 'La fecha de cierre debe ser posterior a la fecha de inicio.';

  if (limite_usos === undefined || limite_usos === null || limite_usos === '')
    errores.limite_usos = 'El límite de usos es obligatorio.';
  else if (isNaN(limite_usos) || !Number.isInteger(Number(limite_usos)) || Number(limite_usos) <= 0)
    errores.limite_usos = 'El límite de usos debe ser un número entero mayor a 0.';

  return errores;
};

const getAll = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM descuento ORDER BY id_descuento ASC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM descuento WHERE id_descuento = $1',
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Descuento no encontrado.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const create = async (req, res) => {
  const errores = validar(req.body);
  if (Object.keys(errores).length > 0)
    return res.status(400).json({ errores });

  const { codigo, descripcion, valor_descuento, fecha_inicio, fecha_cierre, limite_usos } = req.body;
  try {
    const existe = await pool.query(
      'SELECT id_descuento FROM descuento WHERE LOWER(codigo) = LOWER($1)',
      [codigo.trim()]
    );
    if (existe.rows.length > 0)
      return res.status(400).json({ error: 'Ya existe un descuento con ese código.' });

    const result = await pool.query(
      `INSERT INTO descuento (codigo, descripcion, valor_descuento, fecha_inicio, fecha_cierre, limite_usos, usos_actuales, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        codigo.trim().toUpperCase(),
        descripcion ? descripcion.trim() : null,
        Number(valor_descuento),
        fecha_inicio,
        fecha_cierre,
        Number(limite_usos),
        0,
        'activo'
      ]
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

  const { codigo, descripcion, valor_descuento, fecha_inicio, fecha_cierre, limite_usos, estado } = req.body;
  try {
    const existe = await pool.query(
      'SELECT id_descuento FROM descuento WHERE LOWER(codigo) = LOWER($1) AND id_descuento != $2',
      [codigo.trim(), req.params.id]
    );
    if (existe.rows.length > 0)
      return res.status(400).json({ error: 'Ya existe otro descuento con ese código.' });

    const result = await pool.query(
      `UPDATE descuento
       SET codigo = $1, descripcion = $2, valor_descuento = $3,
           fecha_inicio = $4, fecha_cierre = $5, limite_usos = $6, estado = $7
       WHERE id_descuento = $8 RETURNING *`,
      [
        codigo.trim().toUpperCase(),
        descripcion ? descripcion.trim() : null,
        Number(valor_descuento),
        fecha_inicio,
        fecha_cierre,
        Number(limite_usos),
        estado,
        req.params.id
      ]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Descuento no encontrado.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM descuento WHERE id_descuento = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Descuento no encontrado.' });
    res.json({ mensaje: 'Descuento eliminado correctamente.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, getById, create, update, remove };