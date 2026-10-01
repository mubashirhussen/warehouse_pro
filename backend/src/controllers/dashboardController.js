const { db } = require('../config/database');

// GET /api/dashboard/summary - Role-Aware Comprehensive warehouse analytics
exports.getDashboardSummary = (req, res) => {
  try {
    const userRole = req.user?.role || 'Admin';

    // 1. Core KPIs
    const totals = db.prepare(`
      SELECT 
        COUNT(id) AS total_products,
        COALESCE(SUM(quantity), 0) AS total_stock_units,
        COALESCE(SUM(quantity * unit_price), 0.0) AS total_inventory_valuation,
        SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) AS out_of_stock_count,
        SUM(CASE WHEN quantity > 0 AND quantity <= min_threshold_stock THEN 1 ELSE 0 END) AS low_stock_count
      FROM products
    `).get();

    const whCount = db.prepare("SELECT COUNT(*) as count FROM warehouses WHERE status = 'ACTIVE'").get().count;
    const pendingPoCount = db.prepare("SELECT COUNT(*) as count FROM purchase_orders WHERE status = 'PENDING'").get().count;
    const supplierCount = db.prepare("SELECT COUNT(*) as count FROM suppliers WHERE status = 'ACTIVE'").get().count;

    // 2. Critical Low-Stock Alerts
    const lowStockAlerts = db.prepare(`
      SELECT 
        p.id,
        p.sku,
        p.name,
        p.category,
        p.quantity,
        p.min_threshold_stock,
        p.unit_price,
        p.location_bin,
        w.name AS warehouse_name,
        CASE 
          WHEN p.quantity = 0 THEN 'CRITICAL_OUT_OF_STOCK'
          WHEN p.quantity <= (p.min_threshold_stock / 2) THEN 'URGENT_REORDER'
          ELSE 'LOW_STOCK'
        END AS alert_level
      FROM products p
      LEFT JOIN warehouses w ON p.warehouse_id = w.id
      WHERE p.quantity <= p.min_threshold_stock
      ORDER BY p.quantity ASC, p.min_threshold_stock DESC
      LIMIT 10
    `).all();

    // 3. Recent Stock Movements (Role tailored)
    let movementsQuery = `
      SELECT 
        sm.*,
        p.name AS product_name,
        p.sku AS product_sku,
        p.category AS product_category,
        w.name AS warehouse_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      LEFT JOIN warehouses w ON p.warehouse_id = w.id
    `;
    const movementsParams = [];

    if (userRole === 'Staff') {
      movementsQuery += ` WHERE sm.user_role IN ('Staff', 'System-IoT') `;
    }

    movementsQuery += ` ORDER BY sm.created_at DESC LIMIT 8`;
    const recentMovements = db.prepare(movementsQuery).all(...movementsParams);

    // 4. Category Breakdown
    const categoryStats = db.prepare(`
      SELECT 
        category,
        COUNT(id) AS product_count,
        SUM(quantity) AS total_units,
        SUM(quantity * unit_price) AS valuation
      FROM products
      GROUP BY category
      ORDER BY valuation DESC
    `).all();

    // 5. Warehouse capacity summary
    const warehouseUtilization = db.prepare(`
      SELECT 
        w.id,
        w.name,
        w.code,
        w.capacity,
        COALESCE(SUM(p.quantity), 0) AS current_units,
        ROUND((CAST(COALESCE(SUM(p.quantity), 0) AS REAL) / w.capacity) * 100, 1) AS utilization_rate
      FROM warehouses w
      LEFT JOIN products p ON w.id = p.warehouse_id
      GROUP BY w.id
      ORDER BY utilization_rate DESC
    `).all();

    // Role-specific operational insights
    const roleInsights = {
      role: userRole,
      title: userRole === 'Admin' 
        ? 'Executive Overview (Full Organization Scope)'
        : userRole === 'Warehouse Manager'
        ? 'Facility Management Scope (Replenishment & Capacity Focus)'
        : 'Floor Operations View (Intake, Dispatch & Scanning Focus)',
      permissions: {
        can_delete_products: userRole === 'Admin',
        can_add_products: userRole === 'Admin' || userRole === 'Warehouse Manager',
        can_create_warehouse: userRole === 'Admin',
        can_create_po: userRole === 'Admin' || userRole === 'Warehouse Manager',
        can_stock_in_out: true,
        can_view_financials: userRole === 'Admin' || userRole === 'Warehouse Manager'
      }
    };

    res.json({
      success: true,
      role_context: roleInsights,
      data: {
        kpis: {
          total_products: totals.total_products || 0,
          total_stock_units: totals.total_stock_units || 0,
          total_valuation: totals.total_inventory_valuation || 0,
          low_stock_count: totals.low_stock_count || 0,
          out_of_stock_count: totals.out_of_stock_count || 0,
          active_warehouses: whCount,
          pending_purchase_orders: pendingPoCount,
          active_suppliers: supplierCount
        },
        low_stock_alerts: lowStockAlerts,
        recent_movements: recentMovements,
        category_stats: categoryStats,
        warehouse_utilization: warehouseUtilization
      }
    });
  } catch (error) {
    console.error('getDashboardSummary error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
