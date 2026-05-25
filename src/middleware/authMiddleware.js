const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'modamagica_secreto_super_seguro';

// ──────────────────────────────────────────────────────────────────────────────
// Verifica que el token JWT sea válido
// ──────────────────────────────────────────────────────────────────────────────
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(403).json({ message: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1]; // Formato: "Bearer <token>"

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Token inválido o expirado' });
    }
    req.user = decoded; // { id, correo, rol, id_rol }
    next();
  });
};

// ──────────────────────────────────────────────────────────────────────────────
// Solo admins (superAdmin, admin)
// ──────────────────────────────────────────────────────────────────────────────
const isAdmin = (req, res, next) => {
  const rolesPermitidos = ['superAdmin', 'admin'];
  if (!rolesPermitidos.includes(req.user.rol)) {
    return res.status(403).json({ message: 'Acceso denegado: se requiere rol de administrador' });
  }
  next();
};

// ──────────────────────────────────────────────────────────────────────────────
// Solo superAdmin
// ──────────────────────────────────────────────────────────────────────────────
const isSuperAdmin = (req, res, next) => {
  if (req.user.rol !== 'superAdmin') {
    return res.status(403).json({ message: 'Acceso denegado: se requiere rol superAdmin' });
  }
  next();
};

module.exports = { verifyToken, isAdmin, isSuperAdmin };
