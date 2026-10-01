const { db, logActivity } = require('../config/database');

// GET /api/products - List products with multi-filter (search, category, stock level, warehouse)
exports.getProducts = (req, res) => {
  try {
    const { search, category, stock_level, warehouse_id, sort_by, order } = req.query;

    let query = `
      SELECT 
        p.*,
        w.name AS warehouse_name,
        w.code AS warehouse_code,
        (p.quantity * p.unit_price) AS total_valuation,
        CASE
          WHEN p.quantity = 0 THEN 'OUT_OF_STOCK'
          WHEN p.quantity <= p.min_threshold_stock THEN 'LOW_STOCK'
          ELSE 'IN_STOCK'
        END AS stock_status
      FROM products p
      LEFT JOIN warehouses w ON p.warehouse_id = w.id
      WHERE 1=1
    `;

    const params = [];

    if (search && search.trim() !== '') {
      query += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR p.location_bin LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (category && category !== 'ALL') {
      query += ` AND p.category = ?`;
      params.push(category);
    }

    if (warehouse_id && warehouse_id !== 'ALL') {
      query += ` AND p.warehouse_id = ?`;
      params.push(warehouse_id);
    }

    if (stock_level) {
      if (stock_level === 'LOW_STOCK') {
        query += ` AND p.quantity > 0 AND p.quantity <= p.min_threshold_stock`;
      } else if (stock_level === 'OUT_OF_STOCK') {
        query += ` AND p.quantity = 0`;
      } else if (stock_level === 'IN_STOCK') {
        query += ` AND p.quantity > p.min_threshold_stock`;
      } else if (stock_level === 'NEEDS_ATTENTION') {
        query += ` AND p.quantity <= p.min_threshold_stock`;
      }
    }

    // Sorting
    const allowedSortCols = ['name', 'sku', 'category', 'quantity', 'unit_price', 'total_valuation', 'created_at'];
    const sortCol = allowedSortCols.includes(sort_by) ? `p.${sort_by}` : 'p.id';
    const sortOrder = order && order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${sortCol} ${sortOrder}`;

    const stmt = db.prepare(query);
    const products = stmt.all(...params);

    // Get list of distinct categories for filters
    const categories = db.prepare('SELECT DISTINCT category FROM products ORDER BY category ASC').all().map(c => c.category);

    res.json({
      success: true,
      count: products.length,
      categories,
      data: products
    });
  } catch (error) {
    console.error('getProducts error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/products/:id - Product detail with movement history
exports.getProductById = (req, res) => {
  try {
    const { id } = req.params;
    const product = db.prepare(`
      SELECT 
        p.*,
        w.name AS warehouse_name,
        w.code AS warehouse_code,
        (p.quantity * p.unit_price) AS total_valuation,
        CASE
          WHEN p.quantity = 0 THEN 'OUT_OF_STOCK'
          WHEN p.quantity <= p.min_threshold_stock THEN 'LOW_STOCK'
          ELSE 'IN_STOCK'
        END AS stock_status
      FROM products p
      LEFT JOIN warehouses w ON p.warehouse_id = w.id
      WHERE p.id = ?
    `).get(id);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Get recent movements for this product
    const movements = db.prepare(`
      SELECT * FROM stock_movements 
      WHERE product_id = ? 
      ORDER BY created_at DESC 
      LIMIT 20
    `).all(id);

    res.json({
      success: true,
      data: {
        ...product,
        recent_movements: movements
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/products - Create new product
exports.createProduct = (req, res) => {
  try {
    const {
      sku,
      name,
      category,
      quantity = 0,
      min_threshold_stock = 10,
      unit_price = 0,
      warehouse_id,
      location_bin = 'Unassigned',
      barcode,
      description = ''
    } = req.body;

    // Validation
    if (!sku || !name || !category || !warehouse_id) {
      return res.status(400).json({
        success: false,
        error: 'Required fields missing: sku, name, category, warehouse_id'
      });
    }

    const qty = parseInt(quantity, 10);
    const minThreshold = parseInt(min_threshold_stock, 10);
    const price = parseFloat(unit_price);

    if (isNaN(qty) || qty < 0) {
      return res.status(400).json({ success: false, error: 'Quantity must be a non-negative integer' });
    }
    if (isNaN(minThreshold) || minThreshold < 0) {
      return res.status(400).json({ success: false, error: 'Min threshold must be a non-negative integer' });
    }
    if (isNaN(price) || price < 0) {
      return res.status(400).json({ success: false, error: 'Unit price must be a non-negative number' });
    }

    // Check SKU uniqueness
    const existingSku = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku.trim());
    if (existingSku) {
      return res.status(400).json({ success: false, error: `SKU '${sku}' already exists in inventory.` });
    }

    // Verify warehouse exists
    const wh = db.prepare('SELECT id, name FROM warehouses WHERE id = ?').get(warehouse_id);
    if (!wh) {
      return res.status(400).json({ success: false, error: 'Selected warehouse does not exist' });
    }

    const generatedBarcode = barcode && barcode.trim() !== '' 
      ? barcode.trim() 
      : `BAR-${sku.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')}`;

    const insertTx = db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO products (sku, name, category, quantity, min_threshold_stock, unit_price, warehouse_id, location_bin, barcode, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        sku.trim().toUpperCase(),
        name.trim(),
        category.trim(),
        qty,
        minThreshold,
        price,
        warehouse_id,
        location_bin.trim(),
        generatedBarcode,
        description.trim()
      );

      const productId = result.lastInsertRowid;

      // If initial quantity > 0, log an initial Stock IN movement
      if (qty > 0) {
        db.prepare(`
          INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reference, notes, user_role)
          VALUES (?, 'IN', ?, 0, ?, 'INITIAL_SETUP', 'Initial product catalog registration', ?)
        `).run(productId, qty, qty, req.user?.role || 'Admin');
      }

      logActivity('PRODUCT_CREATED', 'PRODUCT', productId, `Created product ${name} (${sku}) with initial stock ${qty}`, req.user?.role || 'Admin');

      return productId;
    });

    const newId = insertTx();
    const createdProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(newId);

    res.status(201).json({
      success: true,
      message: 'Product successfully added to inventory',
      data: createdProduct
    });
  } catch (error) {
    console.error('createProduct error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// PUT /api/products/:id - Update product
exports.updateProduct = (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      min_threshold_stock,
      unit_price,
      warehouse_id,
      location_bin,
      barcode,
      description
    } = req.body;

    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const updatedName = name !== undefined ? name.trim() : existing.name;
    const updatedCategory = category !== undefined ? category.trim() : existing.category;
    const updatedMinThreshold = min_threshold_stock !== undefined ? parseInt(min_threshold_stock, 10) : existing.min_threshold_stock;
    const updatedPrice = unit_price !== undefined ? parseFloat(unit_price) : existing.unit_price;
    const updatedWarehouseId = warehouse_id !== undefined ? parseInt(warehouse_id, 10) : existing.warehouse_id;
    const updatedLocationBin = location_bin !== undefined ? location_bin.trim() : existing.location_bin;
    const updatedBarcode = barcode !== undefined ? barcode.trim() : existing.barcode;
    const updatedDesc = description !== undefined ? description.trim() : existing.description;

    const stmt = db.prepare(`
      UPDATE products SET
        name = ?,
        category = ?,
        min_threshold_stock = ?,
        unit_price = ?,
        warehouse_id = ?,
        location_bin = ?,
        barcode = ?,
        description = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      updatedName,
      updatedCategory,
      updatedMinThreshold,
      updatedPrice,
      updatedWarehouseId,
      updatedLocationBin,
      updatedBarcode,
      updatedDesc,
      id
    );

    logActivity('PRODUCT_UPDATED', 'PRODUCT', id, `Updated product details for ${updatedName} (SKU: ${existing.sku})`, req.user?.role || 'Admin');

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json({
      success: true,
      message: 'Product updated successfully',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE /api/products/:id - Delete product (Admin / Manager only)
exports.deleteProduct = (req, res) => {
  try {
    const { id } = req.params;
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    if (product.quantity > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete product with active inventory (${product.quantity} units). Remove or adjust stock to 0 first.`
      });
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    logActivity('PRODUCT_DELETED', 'PRODUCT', id, `Deleted product ${product.name} (${product.sku})`, req.user?.role || 'Admin');

    res.json({
      success: true,
      message: `Product ${product.name} deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
