const express = require('express');
const router  = express.Router();

const authController = require('../../controllers/auth/authController');
const { verifyToken } = require('../../middleware/authMiddleware');

// ─── RUTAS PÚBLICAS ────────────────────────────────────────────────────────────

// Inicio de sesión
router.post('/login', authController.login);

// Recuperación de contraseña (3 pasos)
router.post('/recovery/enviar-codigo',   authController.enviarCodigo);
router.post('/recovery/verificar-codigo', authController.verificarCodigo);
router.post('/recovery/nueva-contrasena', authController.nuevaContrasena);

// ─── RUTAS PROTEGIDAS (requieren token) ───────────────────────────────────────

// Perfil del usuario autenticado
router.get('/perfil', verifyToken, authController.getPerfil);

module.exports = router;
