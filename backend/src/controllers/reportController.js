const { db } = require('../config/database');

// GET /api/reports/valuation - Valuation report by SKU and Category
exports.getValuationReport = (req, res) => {
  try {
    const products = db.prepare(`
      SELECT 
        p.id,
        p.sku,
        p.name,
        p.category,
        p.quantity,
        p.unit_price,
        (p.quantity * p.unit_price) AS total_valuation,
        w.name AS warehouse_name
      FROM products p
      LEFT JOIN warehouses w ON p.warehouse_id = w.id
      ORDER BY total_valuation DESC
    `).all();

    const categorySummary = db.prepare(`
      SELECT 
        category,
        COUNT(id) AS total_items,
        SUM(quantity) AS total_quantity,
        SUM(quantity * unit_price) AS category_valuation
      FROM products
      GROUP BY category
      ORDER BY category_valuation DESC
    `).all();

    const totalValuation = products.reduce((acc, curr) => acc + curr.total_valuation, 0);

    res.json({
      success: true,
      summary: {
        total_valuation: totalValuation,
        total_skus: products.length,
        category_breakdown: categorySummary
      },
      data: products
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/reports/low-stock - Comprehensive Low Stock & Reorder Plan
exports.getLowStockReport = (req, res) => {
  try {
    const items = db.prepare(`
      SELECT 
        p.id,
        p.sku,
        p.name,
        p.category,
        p.quantity,
        p.min_threshold_stock,
        p.unit_price,
        (p.min_threshold_stock * 2 - p.quantity) AS suggested_reorder_qty,
        ((p.min_threshold_stock * 2 - p.quantity) * p.unit_price) AS estimated_reorder_cost,
        w.name AS warehouse_name,
        w.code AS warehouse_code
      FROM products p
      LEFT JOIN warehouses w ON p.warehouse_id = w.id
      WHERE p.quantity <= p.min_threshold_stock
      ORDER BY p.quantity ASC
    `).all();

    const totalEstimatedCost = items.reduce((acc, i) => acc + Math.max(0, i.estimated_reorder_cost), 0);

    res.json({
      success: true,
      summary: {
        critical_items_count: items.length,
        total_estimated_reorder_cost: totalEstimatedCost
      },
      data: items
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/reports/predictive-restock - AI & Heuristic Restocking Forecast
exports.getPredictiveRestock = (req, res) => {
  try {
    // 1. Get all products
    const products = db.prepare(`
      SELECT 
        p.id,
        p.sku,
        p.name,
        p.category,
        p.quantity AS current_stock,
        p.min_threshold_stock,
        p.unit_price,
        w.name AS warehouse_name
      FROM products p
      LEFT JOIN warehouses w ON p.warehouse_id = w.id
      ORDER BY p.name ASC
    `).all();

    // 2. Compute consumption velocity from stock_movements (OUT operations)
    const outMovements = db.prepare(`
      SELECT 
        product_id,
        SUM(quantity) AS total_out,
        COUNT(id) AS out_transactions
      FROM stock_movements
      WHERE type = 'OUT'
      GROUP BY product_id
    `).all();

    const movementMap = {};
    for (const m of outMovements) {
      movementMap[m.product_id] = m;
    }

    const predictions = products.map(product => {
      const movement = movementMap[product.id] || { total_out: 0, out_transactions: 0 };
      // Estimate daily burn rate (assume 14 day rolling sample if data present)
      const historicalDays = 14;
      const dailyConsumption = movement.total_out > 0 
        ? Math.max(0.2, parseFloat((movement.total_out / historicalDays).toFixed(2)))
        : 0.15; // default minimal baseline

      const daysRemaining = dailyConsumption > 0 
        ? Math.round(product.current_stock / dailyConsumption) 
        : 999;

      let riskLevel = 'OPTIMAL';
      let recommendation = 'Stock levels are healthy. No immediate action required.';
      let recommendedOrderQty = 0;

      if (product.current_stock === 0) {
        riskLevel = 'DEPLETED';
        recommendation = 'CRITICAL: Stock is 0. Issue emergency Purchase Order immediately.';
        recommendedOrderQty = Math.max(product.min_threshold_stock * 2, 20);
      } else if (daysRemaining <= 5 || product.current_stock <= product.min_threshold_stock) {
        riskLevel = 'URGENT';
        recommendation = `High stockout risk in ~${daysRemaining} days. Create PO for replenishment.`;
        recommendedOrderQty = Math.max(product.min_threshold_stock * 2 - product.current_stock, 15);
      } else if (daysRemaining <= 12) {
        riskLevel = 'MODERATE';
        recommendation = `Approaching threshold in ~${daysRemaining} days. Queue in next supplier order cycle.`;
        recommendedOrderQty = Math.max(product.min_threshold_stock - product.current_stock, 10);
      }

      return {
        product_id: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        current_stock: product.current_stock,
        min_threshold_stock: product.min_threshold_stock,
        unit_price: product.unit_price,
        warehouse_name: product.warehouse_name,
        daily_burn_rate: dailyConsumption,
        estimated_days_remaining: daysRemaining,
        risk_level: riskLevel,
        recommended_order_quantity: recommendedOrderQty,
        estimated_po_cost: recommendedOrderQty * product.unit_price,
        recommendation
      };
    });

    // Sort by risk urgency
    const riskWeights = { DEPLETED: 1, URGENT: 2, MODERATE: 3, OPTIMAL: 4 };
    predictions.sort((a, b) => (riskWeights[a.risk_level] || 99) - (riskWeights[b.risk_level] || 99));

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        critical_items: predictions.filter(p => p.risk_level === 'DEPLETED' || p.risk_level === 'URGENT').length,
        total_forecasted_items: predictions.length
      },
      data: predictions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/reports/audit-logs - Inventory transaction and audit history
exports.getAuditLogs = (req, res) => {
  try {
    const { limit = 50, offset = 0, action } = req.query;

    let query = `SELECT * FROM inventory_logs WHERE 1=1`;
    const params = [];

    if (action && action !== 'ALL') {
      query += ` AND action = ?`;
      params.push(action);
    }

    query += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const logs = db.prepare(query).all(...params);
    const total = db.prepare('SELECT COUNT(*) as count FROM inventory_logs').get().count;

    res.json({
      success: true,
      total,
      data: logs
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
