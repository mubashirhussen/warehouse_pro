const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { requireRole } = require('../middleware/auth');

router.get('/', orderController.getOrders);
router.post('/', requireRole(['Admin', 'Warehouse Manager']), orderController.createOrder);
router.post('/:id/receive', requireRole(['Admin', 'Warehouse Manager', 'Staff']), orderController.receiveOrder);
router.put('/:id/cancel', requireRole(['Admin', 'Warehouse Manager']), orderController.cancelOrder);

module.exports = router;
