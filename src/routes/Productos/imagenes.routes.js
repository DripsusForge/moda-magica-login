const router     = require('express').Router();
const controller = require('../../controllers/Productos/imagenes.controller');
const upload     = require('../../config/upload');

router.get('/:id_producto',          controller.getByProducto);
router.post('/:id_producto',         upload.array('imagenes'), controller.upload);
router.put('/principal/:id_imagen',  controller.setPrincipal);
router.delete('/:id_imagen',         controller.remove);

module.exports = router;