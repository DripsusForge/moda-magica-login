const express = require('express')
const router  = express.Router()
const crypto  = require('crypto')
const bcrypt  = require('bcrypt')
const db      = require('../config/db')      // ← usa TU ruta de db
const mailer  = require('../config/mailer')  // ← usa TU ruta de mailer

const codigos = new Map()

router.post('/enviar-codigo', async (req, res) => {
  const { correo } = req.body
  const key = correo.trim().toLowerCase()
  const result = await db.query('SELECT id_usuario FROM usuario WHERE correo = $1', [key])
  const codigo = crypto.randomInt(100000, 999999).toString()
  const expira = Date.now() + 10 * 60 * 1000
  if (result.rows.length > 0) {
    codigos.set(key, { codigo, expira })
    try {
      await mailer.sendMail({
        from: process.env.EMAIL_USER,
        to: correo,
        subject: 'Código de recuperación — Moda Mágica',
        html: `<div style="font-family:sans-serif">
          <h2 style="color:#b8972a">✦ Moda Mágica ✦</h2>
          <p>Tu código de verificación es:</p>
          <h1 style="letter-spacing:10px">${codigo}</h1>
          <p style="color:#888">Expira en <strong>10 minutos</strong>.</p>
        </div>`,
      })
    } catch (err) { console.error('Error correo:', err.message) }
  }
  res.json({ message: 'Si el correo está registrado, recibirás el código.' })
})

router.post('/verificar-codigo', (req, res) => {
  const { correo, codigo } = req.body
  const registro = codigos.get(correo.trim().toLowerCase())
  if (!registro || Date.now() > registro.expira)
    return res.status(400).json({ message: 'El código expiró. Solicita uno nuevo.' })
  if (registro.codigo !== codigo)
    return res.status(400).json({ message: 'Código incorrecto.' })
  res.json({ message: 'Código válido.' })
})

router.post('/nueva-contrasena', async (req, res) => {
  const { correo, codigo, contrasena } = req.body
  const key = correo.trim().toLowerCase()
  const registro = codigos.get(key)
  if (!registro || Date.now() > registro.expira || registro.codigo !== codigo)
    return res.status(400).json({ message: 'El código es inválido o expiró.' })
  const hash = await bcrypt.hash(contrasena, 10)
  await db.query('UPDATE usuario SET contrasena = $1 WHERE correo = $2', [hash, key])
  codigos.delete(key)
  res.json({ message: 'Contraseña actualizada correctamente.' })
})

module.exports = router