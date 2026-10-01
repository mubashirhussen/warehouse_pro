const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/valuation', reportController.getValuationReport);
router.get('/low-stock', reportController.getLowStockReport);
router.get('/predictive-restock', reportController.getPredictiveRestock);
router.get('/audit-logs', reportController.getAuditLogs);

module.exports = router;
