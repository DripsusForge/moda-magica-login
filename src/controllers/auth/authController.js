const pool = require('../../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'modamagica_secreto_super_seguro';

// ──────────────────────────────────────────────────────────────────────────────
// CONFIGURAR CORREO (ajusta las credenciales en tu .env)
// ──────────────────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'jugando1404@gmail.com',
    pass: process.env.EMAIL_PASS || 'wnyq kwar vgmw glly',
  },
});

// ──────────────────────────────────────────────────────────────────────────────
// LOGIN
// ──────────────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  const { correo, contrasena } = req.body;

  try {
    // Busca el usuario junto con su rol (JOIN con rol_usuario)
    const resultado = await pool.query(
      `SELECT u.*, r.nombre_rol
       FROM usuario u
       JOIN rol_usuario r ON u.id_rol = r.id_rol
       WHERE u.correo = $1`,
      [correo]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({ message: 'Correo o contraseña incorrectos' });
    }

    const usuario = resultado.rows[0];

    if (usuario.estado !== 'activo') {
      return res.status(403).json({ message: 'Tu cuenta está inactiva. Contacta al administrador.' });
    }

    const passwordValida = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!passwordValida) {
      return res.status(401).json({ message: 'Correo o contraseña incorrectos' });
    }

    const token = jwt.sign(
      {
        id:      usuario.id_usuario,
        correo:  usuario.correo,
        rol:     usuario.nombre_rol,
        id_rol:  usuario.id_rol,
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Devuelve sólo los datos que necesita el frontend
    res.json({
      message: 'Bienvenido',
      token,
      usuario: {
        id:             usuario.id_usuario,
        primer_nombre:  usuario.primer_nombre,
        segundo_nombre: usuario.segundo_nombre,
        primer_apellido:  usuario.primer_apellido,
        segundo_apellido: usuario.segundo_apellido,
        correo:         usuario.correo,
        telefono:       usuario.telefono,
        rol:            usuario.nombre_rol,
        id_rol:         usuario.id_rol,
        estado:         usuario.estado,
        fecha_creacion: usuario.fecha_creacion,
      },
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// OBTENER PERFIL (ruta protegida — necesita token)
// ──────────────────────────────────────────────────────────────────────────────
exports.getPerfil = async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT u.id_usuario, u.primer_nombre, u.segundo_nombre,
              u.primer_apellido, u.segundo_apellido,
              u.correo, u.telefono, u.estado, u.fecha_creacion,
              r.nombre_rol
       FROM usuario u
       JOIN rol_usuario r ON u.id_rol = r.id_rol
       WHERE u.id_usuario = $1`,
      [req.user.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error('Error en getPerfil:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// RECUPERAR CONTRASEÑA — PASO 1: enviar código por correo
// ──────────────────────────────────────────────────────────────────────────────
exports.enviarCodigo = async (req, res) => {
  const { correo } = req.body;

  try {
    const resultado = await pool.query(
      'SELECT * FROM usuario WHERE correo = $1',
      [correo]
    );

    // Respondemos igual aunque no exista (seguridad)
    if (resultado.rows.length === 0) {
      return res.json({ message: 'Si el correo existe, recibirás un código' });
    }

    const usuario = resultado.rows[0];

    // Código numérico de 6 dígitos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expira = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    // Guardamos el código en la tabla change_pass (reutilizamos la estructura del módulo login)
    await pool.query(
      `UPDATE usuario
       SET reset_token = $1, reset_token_expira = $2
       WHERE id_usuario = $3`,
      [codigo, expira, usuario.id_usuario]
    );

    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'jugando1404@gmail.com',
      to: correo,
      subject: 'Código de verificación — Moda Mágica',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#C9962A">✦ Moda Mágica ✦</h2>
          <p>Hola <strong>${usuario.primer_nombre}</strong>,</p>
          <p>Tu código de verificación es:</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:10px;
                      color:#C9962A;text-align:center;padding:20px 0">${codigo}</div>
          <p style="color:#666">Este código expira en <strong>10 minutos</strong>.</p>
          <p style="color:#666">Si no solicitaste esto, ignora este correo.</p>
        </div>
      `,
    });

    res.json({ message: 'Si el correo existe, recibirás un código 📧' });

  } catch (error) {
    console.error('Error en enviarCodigo:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// RECUPERAR CONTRASEÑA — PASO 2: verificar código
// ──────────────────────────────────────────────────────────────────────────────
exports.verificarCodigo = async (req, res) => {
  const { correo, codigo } = req.body;

  try {
    const resultado = await pool.query(
      `SELECT * FROM usuario
       WHERE correo = $1
         AND reset_token = $2
         AND reset_token_expira > NOW()`,
      [correo, codigo]
    );

    if (resultado.rows.length === 0) {
      return res.status(400).json({ message: 'Código inválido o expirado' });
    }

    res.json({ message: 'Código válido', ok: true });

  } catch (error) {
    console.error('Error en verificarCodigo:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// RECUPERAR CONTRASEÑA — PASO 3: guardar nueva contraseña
// ──────────────────────────────────────────────────────────────────────────────
exports.nuevaContrasena = async (req, res) => {
  const { correo, codigo, contrasena } = req.body;

  try {
    const resultado = await pool.query(
      `SELECT * FROM usuario
       WHERE correo = $1
         AND reset_token = $2
         AND reset_token_expira > NOW()`,
      [correo, codigo]
    );

    if (resultado.rows.length === 0) {
      return res.status(400).json({ message: 'El enlace ya no es válido. Solicita uno nuevo.' });
    }

    const hash = await bcrypt.hash(contrasena, 10);

    await pool.query(
      `UPDATE usuario
       SET contrasena = $1, reset_token = NULL, reset_token_expira = NULL
       WHERE correo = $2`,
      [hash, correo]
    );

    res.json({ message: 'Contraseña actualizada correctamente ✅' });

  } catch (error) {
    console.error('Error en nuevaContrasena:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};
