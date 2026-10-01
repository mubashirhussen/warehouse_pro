const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { requireRole } = require('../middleware/auth');

router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
router.post('/', requireRole(['Admin', 'Warehouse Manager']), productController.createProduct);
router.put('/:id', requireRole(['Admin', 'Warehouse Manager']), productController.updateProduct);
router.delete('/:id', requireRole(['Admin']), productController.deleteProduct);

module.exports = router;
