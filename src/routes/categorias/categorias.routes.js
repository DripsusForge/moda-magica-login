const router = require("express").Router();
const controller = require("../../controllers/Categorias/categorias.controller");


router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove); // ⚠️ Express v5 usa .del()

module.exports = router;