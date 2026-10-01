const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const { requireRole } = require('../middleware/auth');

router.post('/in', stockController.stockIn);
router.post('/out', stockController.stockOut);
router.post('/adjust', requireRole(['Admin', 'Warehouse Manager']), stockController.adjustStock);
router.post('/transfer', requireRole(['Admin', 'Warehouse Manager']), stockController.transferStock);
router.get('/movements', stockController.getMovements);
router.post('/simulate-live-event', stockController.simulateLiveEvent);

module.exports = router;
