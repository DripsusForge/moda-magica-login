const router     = require('express').Router();
const controller = require('../../controllers/Productos/productos.controller');

router.get('/', controller.getAll);

module.exports = router;