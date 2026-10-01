const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { requireRole } = require('../middleware/auth');

router.get('/', supplierController.getSuppliers);
router.post('/', requireRole(['Admin', 'Warehouse Manager']), supplierController.createSupplier);
router.put('/:id', requireRole(['Admin', 'Warehouse Manager']), supplierController.updateSupplier);
router.delete('/:id', requireRole(['Admin']), supplierController.deleteSupplier);

module.exports = router;
