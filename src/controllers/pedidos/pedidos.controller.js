const pool = require('../../config/db');

const ESTADOS_VALIDOS     = ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'];
const METODOS_PAGO_VALIDOS = ['PSE', 'Nequi', 'Daviplata', 'Tarjeta', 'Efectivo'];

function validar(body) {
  const errores = {};
  const { id_usuario, estado, metodo_pago, total } = body;

  if (!id_usuario)                          errores.id_usuario  = 'El usuario es obligatorio.';
  if (!estado)                              errores.estado      = 'El estado es obligatorio.';
  else if (!ESTADOS_VALIDOS.includes(estado)) errores.estado    = 'El estado no es válido.';
  if (!metodo_pago)                         errores.metodo_pago = 'El método de pago es obligatorio.';
  else if (!METODOS_PAGO_VALIDOS.includes(metodo_pago)) errores.metodo_pago = 'El método de pago no es válido.';
  if (total === '' || total === null || total === undefined) errores.total = 'El total es obligatorio.';
  else if (Number(total) < 0)               errores.total       = 'El total debe ser un número positivo.';

  return errores;
}

exports.getAll = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM pedidos ORDER BY id_pedido');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getById = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM pedidos WHERE id_pedido = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Pedido no encontrado.' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
  const errores = validar(req.body);
  if (Object.keys(errores).length) return res.status(400).json({ errores });
  const { id_usuario, estado, metodo_pago, total } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO pedidos (id_usuario, estado, metodo_pago, total) VALUES ($1,$2,$3,$4) RETURNING *',
      [id_usuario, estado, metodo_pago, total]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
  const errores = validar(req.body);
  if (Object.keys(errores).length) return res.status(400).json({ errores });
  const { id_usuario, estado, metodo_pago, total } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE pedidos SET id_usuario=$1, estado=$2, metodo_pago=$3, total=$4 WHERE id_pedido=$5 RETURNING *',
      [id_usuario, estado, metodo_pago, total, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Pedido no encontrado.' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM pedidos WHERE id_pedido=$1 RETURNING *', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Pedido no encontrado.' });
    res.json({ mensaje: 'Pedido eliminado correctamente.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};