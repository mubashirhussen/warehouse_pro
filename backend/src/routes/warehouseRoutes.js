const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehouseController');
const { requireRole } = require('../middleware/auth');

router.get('/', warehouseController.getWarehouses);
router.get('/:id', warehouseController.getWarehouseById);
router.post('/', requireRole(['Admin']), warehouseController.createWarehouse);
router.put('/:id', requireRole(['Admin', 'Warehouse Manager']), warehouseController.updateWarehouse);

module.exports = router;
