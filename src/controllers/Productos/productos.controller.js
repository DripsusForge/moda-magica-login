const pool = require('../../config/db');

const validar = ({ nombre_producto, id_categoria, precio_unitario }) => {
  const errores = {};
  if (!nombre_producto || !nombre_producto.trim())
    errores.nombre_producto = 'El nombre es obligatorio.';
  else if (nombre_producto.trim().length > 150)
    errores.nombre_producto = 'El nombre no puede superar 150 caracteres.';
  if (!id_categoria)
    errores.id_categoria = 'La categoría es obligatoria.';
  if (precio_unitario === undefined || precio_unitario === null || precio_unitario === '')
    errores.precio_unitario = 'El precio es obligatorio.';
  else if (isNaN(precio_unitario) || Number(precio_unitario) < 0)
    errores.precio_unitario = 'El precio debe ser un número mayor o igual a 0.';
  return errores;
};

// GET /api/productos
const getAll = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.nombre_categoria 
      FROM producto p
      JOIN categoria_producto c ON c.id_categoria = p.id_categoria
      ORDER BY p.id_producto ASC
    `);

    const productos = await Promise.all(result.rows.map(async (p) => {
      const colores = await pool.query(`
        SELECT pc.id_producto_color, co.id_color, co.nombre_color, co.hex_code
        FROM producto_color pc
        JOIN color co ON co.id_color = pc.id_color
        WHERE pc.id_producto = $1
        ORDER BY co.nombre_color ASC
      `, [p.id_producto]);

      const coloresConTallas = await Promise.all(colores.rows.map(async (c) => {
        const tallas = await pool.query(`
          SELECT ict.id, ict.id_talla, t.nombre_talla, ict.stock_actual
          FROM inventario_color_talla ict
          JOIN talla t ON t.id_talla = ict.id_talla
          WHERE ict.id_producto_color = $1
          ORDER BY t.id_talla ASC
        `, [c.id_producto_color]);
        return { ...c, tallas: tallas.rows };
      }));

      return { ...p, colores: coloresConTallas };
    }));

    res.json(productos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/productos/:id
const getById = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.nombre_categoria 
      FROM producto p
      JOIN categoria_producto c ON c.id_categoria = p.id_categoria
      WHERE p.id_producto = $1
    `, [req.params.id]);

    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Producto no encontrado.' });

    const p = result.rows[0];
    const colores = await pool.query(`
      SELECT pc.id_producto_color, co.id_color, co.nombre_color, co.hex_code
      FROM producto_color pc
      JOIN color co ON co.id_color = pc.id_color
      WHERE pc.id_producto = $1
      ORDER BY co.nombre_color ASC
    `, [p.id_producto]);

    const coloresConTallas = await Promise.all(colores.rows.map(async (c) => {
      const tallas = await pool.query(`
        SELECT ict.id, ict.id_talla, t.nombre_talla, ict.stock_actual
        FROM inventario_color_talla ict
        JOIN talla t ON t.id_talla = ict.id_talla
        WHERE ict.id_producto_color = $1
        ORDER BY t.id_talla ASC
      `, [c.id_producto_color]);
      return { ...c, tallas: tallas.rows };
    }));

    res.json({ ...p, colores: coloresConTallas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/productos
const create = async (req, res) => {
  const errores = validar(req.body);
  if (Object.keys(errores).length > 0)
    return res.status(400).json({ errores });

  const { nombre_producto, id_categoria, descripcion, precio_unitario, maneja_serial, colores } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existe = await client.query(
      'SELECT id_producto FROM producto WHERE LOWER(nombre_producto) = LOWER($1)',
      [nombre_producto.trim()]
    );
    if (existe.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ya existe un producto con ese nombre.' });
    }

    // 1. Insertar producto
    const prod = await client.query(`
      INSERT INTO producto (nombre_producto, id_categoria, descripcion, precio_unitario, maneja_serial, estado)
      VALUES ($1, $2, $3, $4, $5, 'activo') RETURNING *
    `, [nombre_producto.trim(), id_categoria, descripcion?.trim() || null, precio_unitario, maneja_serial ? 1 : 0]);

    const id_producto = prod.rows[0].id_producto;

    // 2. Insertar inventario general
    await client.query(`
      INSERT INTO inventario (id_producto, stock_minimo, stock_maximo)
      VALUES ($1, 0, 0)
    `, [id_producto]);

    // 3. Insertar colores, tallas y stock
    if (colores && colores.length > 0) {
      for (const c of colores) {
        const pc = await client.query(`
          INSERT INTO producto_color (id_producto, id_color)
          VALUES ($1, $2) RETURNING id_producto_color
        `, [id_producto, c.id_color]);

        const id_producto_color = pc.rows[0].id_producto_color;

        // Insertar también en inventario_color para compatibilidad
        await client.query(`
          INSERT INTO inventario_color (id_producto_color, stock_actual)
          VALUES ($1, $2)
        `, [id_producto_color, c.tallas?.reduce((a, t) => a + Number(t.stock_actual), 0) || 0]);

        // Insertar stock por talla
        if (c.tallas && c.tallas.length > 0) {
          for (const t of c.tallas) {
            await client.query(`
              INSERT INTO inventario_color_talla (id_producto_color, id_talla, stock_actual)
              VALUES ($1, $2, $3)
            `, [id_producto_color, t.id_talla, t.stock_actual || 0]);
          }
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json(prod.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// PUT /api/productos/:id
const update = async (req, res) => {
  const errores = validar(req.body);
  if (Object.keys(errores).length > 0)
    return res.status(400).json({ errores });

  const { nombre_producto, id_categoria, descripcion, precio_unitario, maneja_serial, estado, colores } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existe = await client.query(
      'SELECT id_producto FROM producto WHERE LOWER(nombre_producto) = LOWER($1) AND id_producto != $2',
      [nombre_producto.trim(), req.params.id]
    );
    if (existe.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ya existe otro producto con ese nombre.' });
    }

    // 1. Actualizar producto
    const result = await client.query(`
      UPDATE producto
      SET nombre_producto = $1, id_categoria = $2, descripcion = $3,
          precio_unitario = $4, maneja_serial = $5, estado = $6
      WHERE id_producto = $7 RETURNING *
    `, [nombre_producto.trim(), id_categoria, descripcion?.trim() || null, precio_unitario, maneja_serial ? 1 : 0, estado, req.params.id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    // 2. Actualizar colores y tallas
    if (colores && colores.length > 0) {
      for (const c of colores) {
        let id_producto_color = c.id_producto_color;

        if (!id_producto_color) {
          // Color nuevo
          const pc = await client.query(`
            INSERT INTO producto_color (id_producto, id_color)
            VALUES ($1, $2) RETURNING id_producto_color
          `, [req.params.id, c.id_color]);
          id_producto_color = pc.rows[0].id_producto_color;

          await client.query(`
            INSERT INTO inventario_color (id_producto_color, stock_actual)
            VALUES ($1, 0)
          `, [id_producto_color]);
        }

        // Actualizar tallas
        if (c.tallas && c.tallas.length > 0) {
          let stockTotal = 0;
          for (const t of c.tallas) {
            stockTotal += Number(t.stock_actual) || 0;
            await client.query(`
              INSERT INTO inventario_color_talla (id_producto_color, id_talla, stock_actual)
              VALUES ($1, $2, $3)
              ON CONFLICT (id_producto_color, id_talla)
              DO UPDATE SET stock_actual = $3, ultima_actualizacion = NOW()
            `, [id_producto_color, t.id_talla, t.stock_actual || 0]);
          }
          // Actualizar stock total en inventario_color
          await client.query(`
            UPDATE inventario_color SET stock_actual = $1, ultima_actualizacion = NOW()
            WHERE id_producto_color = $2
          `, [stockTotal, id_producto_color]);
        }
      }
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// DELETE /api/productos/:id
const remove = async (req, res) => {
  try {
    const enUso = await pool.query(
      'SELECT id_producto FROM producto_color WHERE id_producto = $1 LIMIT 1',
      [req.params.id]
    );
    if (enUso.rows.length > 0)
      return res.status(400).json({ error: 'No se puede eliminar, el producto tiene colores e inventario asociados.' });

    const result = await pool.query(
      'DELETE FROM producto WHERE id_producto = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Producto no encontrado.' });
    res.json({ mensaje: 'Producto eliminado correctamente.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, getById, create, update, remove };