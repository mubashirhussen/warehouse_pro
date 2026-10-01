const { db, logActivity } = require('../config/database');

// GET /api/warehouses - List warehouses with product count and utilization
exports.getWarehouses = (req, res) => {
  try {
    const warehouses = db.prepare(`
      SELECT 
        w.*,
        COUNT(p.id) AS total_skus,
        COALESCE(SUM(p.quantity), 0) AS current_stock_count,
        ROUND((CAST(COALESCE(SUM(p.quantity), 0) AS REAL) / w.capacity) * 100, 1) AS utilization_percentage
      FROM warehouses w
      LEFT JOIN products p ON w.id = p.warehouse_id
      GROUP BY w.id
      ORDER BY w.name ASC
    `).all();

    res.json({
      success: true,
      count: warehouses.length,
      data: warehouses
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/warehouses/:id - Warehouse details with product inventory
exports.getWarehouseById = (req, res) => {
  try {
    const { id } = req.params;
    const warehouse = db.prepare(`
      SELECT 
        w.*,
        COUNT(p.id) AS total_skus,
        COALESCE(SUM(p.quantity), 0) AS current_stock_count,
        ROUND((CAST(COALESCE(SUM(p.quantity), 0) AS REAL) / w.capacity) * 100, 1) AS utilization_percentage
      FROM warehouses w
      LEFT JOIN products p ON w.id = p.warehouse_id
      WHERE w.id = ?
      GROUP BY w.id
    `).get(id);

    if (!warehouse) {
      return res.status(404).json({ success: false, error: 'Warehouse not found' });
    }

    const products = db.prepare(`
      SELECT p.*, (p.quantity * p.unit_price) AS total_valuation
      FROM products p
      WHERE p.warehouse_id = ?
      ORDER BY p.name ASC
    `).all(id);

    res.json({
      success: true,
      data: {
        ...warehouse,
        products
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/warehouses - Create warehouse
exports.createWarehouse = (req, res) => {
  try {
    const { name, code, location, capacity = 1000, manager_name = '', contact_number = '', status = 'ACTIVE' } = req.body;

    if (!name || !code || !location) {
      return res.status(400).json({ success: false, error: 'Name, code, and location are required' });
    }

    const cap = parseInt(capacity, 10);
    if (isNaN(cap) || cap <= 0) {
      return res.status(400).json({ success: false, error: 'Capacity must be a positive number' });
    }

    const existingCode = db.prepare('SELECT id FROM warehouses WHERE code = ?').get(code.trim().toUpperCase());
    if (existingCode) {
      return res.status(400).json({ success: false, error: `Warehouse code '${code}' already exists` });
    }

    const stmt = db.prepare(`
      INSERT INTO warehouses (name, code, location, capacity, manager_name, contact_number, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name.trim(),
      code.trim().toUpperCase(),
      location.trim(),
      cap,
      manager_name.trim(),
      contact_number.trim(),
      status || 'ACTIVE'
    );

    logActivity('WAREHOUSE_CREATED', 'WAREHOUSE', result.lastInsertRowid, `Created warehouse facility ${name} (${code})`, req.user?.role || 'Admin');

    const created = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, message: 'Warehouse created successfully', data: created });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// PUT /api/warehouses/:id - Update warehouse
exports.updateWarehouse = (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, capacity, manager_name, contact_number, status } = req.body;

    const existing = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Warehouse not found' });
    }

    db.prepare(`
      UPDATE warehouses SET
        name = ?,
        location = ?,
        capacity = ?,
        manager_name = ?,
        contact_number = ?,
        status = ?
      WHERE id = ?
    `).run(
      name ? name.trim() : existing.name,
      location ? location.trim() : existing.location,
      capacity ? parseInt(capacity, 10) : existing.capacity,
      manager_name !== undefined ? manager_name.trim() : existing.manager_name,
      contact_number !== undefined ? contact_number.trim() : existing.contact_number,
      status || existing.status,
      id
    );

    logActivity('WAREHOUSE_UPDATED', 'WAREHOUSE', id, `Updated warehouse ${name || existing.name}`, req.user?.role || 'Admin');

    const updated = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(id);
    res.json({ success: true, message: 'Warehouse updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
