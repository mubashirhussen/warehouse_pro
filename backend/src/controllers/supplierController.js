const { db, logActivity } = require('../config/database');

// GET /api/suppliers - List all suppliers with active PO count
exports.getSuppliers = (req, res) => {
  try {
    const suppliers = db.prepare(`
      SELECT 
        s.*,
        COUNT(po.id) AS total_orders,
        SUM(CASE WHEN po.status = 'PENDING' THEN 1 ELSE 0 END) AS pending_orders
      FROM suppliers s
      LEFT JOIN purchase_orders po ON s.id = po.supplier_id
      GROUP BY s.id
      ORDER BY s.name ASC
    `).all();

    res.json({
      success: true,
      count: suppliers.length,
      data: suppliers
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/suppliers - Create supplier
exports.createSupplier = (req, res) => {
  try {
    const { name, contact_name, email, phone, address, category, status = 'ACTIVE' } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, error: 'Supplier company name is required' });
    }

    const stmt = db.prepare(`
      INSERT INTO suppliers (name, contact_name, email, phone, address, category, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name.trim(),
      contact_name ? contact_name.trim() : '',
      email ? email.trim() : '',
      phone ? phone.trim() : '',
      address ? address.trim() : '',
      category ? category.trim() : 'General',
      status || 'ACTIVE'
    );

    logActivity('SUPPLIER_CREATED', 'SUPPLIER', result.lastInsertRowid, `Added supplier "${name}"`, req.user?.role || 'Admin');

    const created = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: created
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// PUT /api/suppliers/:id - Update supplier
exports.updateSupplier = (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact_name, email, phone, address, category, status } = req.body;

    const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }

    db.prepare(`
      UPDATE suppliers SET
        name = ?,
        contact_name = ?,
        email = ?,
        phone = ?,
        address = ?,
        category = ?,
        status = ?
      WHERE id = ?
    `).run(
      name ? name.trim() : existing.name,
      contact_name !== undefined ? contact_name.trim() : existing.contact_name,
      email !== undefined ? email.trim() : existing.email,
      phone !== undefined ? phone.trim() : existing.phone,
      address !== undefined ? address.trim() : existing.address,
      category !== undefined ? category.trim() : existing.category,
      status || existing.status,
      id
    );

    logActivity('SUPPLIER_UPDATED', 'SUPPLIER', id, `Updated supplier info for "${name || existing.name}"`, req.user?.role || 'Admin');

    const updated = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    res.json({ success: true, message: 'Supplier updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE /api/suppliers/:id - Delete supplier
exports.deleteSupplier = (req, res) => {
  try {
    const { id } = req.params;
    const poCount = db.prepare('SELECT COUNT(*) as count FROM purchase_orders WHERE supplier_id = ?').get(id).count;
    if (poCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete supplier with ${poCount} existing purchase orders.`
      });
    }

    db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
    logActivity('SUPPLIER_DELETED', 'SUPPLIER', id, `Deleted supplier ID ${id}`, req.user?.role || 'Admin');

    res.json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
