const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const dir = 'uploads/productos';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => {
    const ext    = path.extname(file.originalname);
    const nombre = `producto_${Date.now()}${ext}`;
    cb(null, nombre);
  }
});

const fileFilter = (req, file, cb) => {
  const permitidos = /jpeg|jpg|png|webp/;
  const esValido   = permitidos.test(path.extname(file.originalname).toLowerCase())
                  && permitidos.test(file.mimetype);
  esValido ? cb(null, true) : cb(new Error('Solo se permiten imágenes jpg, png o webp'));
};

module.exports = multer({ storage, fileFilter });