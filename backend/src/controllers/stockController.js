const { db, logActivity } = require('../config/database');

// POST /api/stock/in - Record incoming stock
exports.stockIn = (req, res) => {
  try {
    const { product_id, quantity, reference = 'MANUAL_IN', notes = '' } = req.body;

    const qty = parseInt(quantity, 10);
    if (!product_id || isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid product_id and a positive integer quantity greater than zero.'
      });
    }

    const stockInTx = db.transaction(() => {
      // Fetch product with row lock
      const product = db.prepare('SELECT id, name, sku, quantity, warehouse_id FROM products WHERE id = ?').get(product_id);
      if (!product) {
        throw new Error('Product not found in inventory');
      }

      const previousStock = product.quantity;
      const newStock = previousStock + qty;

      // Update product stock
      db.prepare('UPDATE products SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, product.id);

      // Insert stock movement record
      const movementStmt = db.prepare(`
        INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reference, notes, user_role)
        VALUES (?, 'IN', ?, ?, ?, ?, ?, ?)
      `);
      const movementResult = movementStmt.run(
        product.id,
        qty,
        previousStock,
        newStock,
        reference.trim(),
        notes.trim(),
        req.user?.role || 'Admin'
      );

      // Log activity
      logActivity(
        'STOCK_IN',
        'PRODUCT',
        product.id,
        `Stock IN: +${qty} units of "${product.name}" (${product.sku}). Old stock: ${previousStock}, New stock: ${newStock}. Ref: ${reference}`,
        req.user?.role || 'Admin'
      );

      return {
        movement_id: movementResult.lastInsertRowid,
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        previous_stock: previousStock,
        added_quantity: qty,
        new_stock: newStock,
        reference: reference.trim()
      };
    });

    const result = stockInTx();
    res.status(200).json({
      success: true,
      message: `Successfully received ${qty} units for ${result.product_name}`,
      data: result
    });
  } catch (error) {
    console.error('stockIn error:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
};

// POST /api/stock/out - Record outgoing stock (STRICT ZERO-FLOOR ENFORCEMENT)
exports.stockOut = (req, res) => {
  try {
    const { product_id, quantity, reference = 'MANUAL_OUT', notes = '' } = req.body;

    const qty = parseInt(quantity, 10);
    if (!product_id || isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid product_id and a positive integer quantity greater than zero.'
      });
    }

    const stockOutTx = db.transaction(() => {
      // 1. Fetch current product stock
      const product = db.prepare('SELECT id, name, sku, quantity, min_threshold_stock, warehouse_id FROM products WHERE id = ?').get(product_id);
      if (!product) {
        throw new Error('Product not found in inventory.');
      }

      const previousStock = product.quantity;

      // 2. CRITICAL VALIDATION: Prevent stock going below zero
      if (previousStock < qty) {
        throw new Error(
          `Insufficient stock! Requested ${qty} units of "${product.name}" (${product.sku}), but only ${previousStock} units are currently available. Negative stock levels are strictly prevented.`
        );
      }

      const newStock = previousStock - qty;

      // 3. Update stock in SQLite
      db.prepare('UPDATE products SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, product.id);

      // 4. Insert stock movement record
      const movementStmt = db.prepare(`
        INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reference, notes, user_role)
        VALUES (?, 'OUT', ?, ?, ?, ?, ?, ?)
      `);
      const movementResult = movementStmt.run(
        product.id,
        qty,
        previousStock,
        newStock,
        reference.trim(),
        notes.trim(),
        req.user?.role || 'Staff'
      );

      // 5. Check if stock falls below minimum threshold
      const isLowStock = newStock <= product.min_threshold_stock;

      // 6. Log audit activity
      logActivity(
        'STOCK_OUT',
        'PRODUCT',
        product.id,
        `Stock OUT: -${qty} units of "${product.name}" (${product.sku}). Old stock: ${previousStock}, New stock: ${newStock}. ${isLowStock ? '[LOW STOCK ALERT TRIGGERED]' : ''} Ref: ${reference}`,
        req.user?.role || 'Staff'
      );

      return {
        movement_id: movementResult.lastInsertRowid,
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        previous_stock: previousStock,
        deducted_quantity: qty,
        new_stock: newStock,
        min_threshold_stock: product.min_threshold_stock,
        is_low_stock: isLowStock,
        reference: reference.trim()
      };
    });

    const result = stockOutTx();
    res.status(200).json({
      success: true,
      message: `Successfully dispatched ${qty} units of ${result.product_name}`,
      data: result
    });
  } catch (error) {
    console.error('stockOut error:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
};

// POST /api/stock/adjust - Manual inventory reconciliation
exports.adjustStock = (req, res) => {
  try {
    const { product_id, new_quantity, reason = 'Physical inventory audit' } = req.body;
    const targetQty = parseInt(new_quantity, 10);

    if (!product_id || isNaN(targetQty) || targetQty < 0) {
      return res.status(400).json({ success: false, error: 'Valid product_id and non-negative new_quantity are required' });
    }

    const adjustTx = db.transaction(() => {
      const product = db.prepare('SELECT id, name, sku, quantity FROM products WHERE id = ?').get(product_id);
      if (!product) {
        throw new Error('Product not found');
      }

      const previousStock = product.quantity;
      const difference = targetQty - previousStock;
      if (difference === 0) {
        return { message: 'Stock level is already at target count', product };
      }

      db.prepare('UPDATE products SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(targetQty, product.id);

      db.prepare(`
        INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reference, notes, user_role)
        VALUES (?, 'ADJUSTMENT', ?, ?, ?, 'AUDIT_ADJUST', ?, ?)
      `).run(
        product.id,
        Math.abs(difference),
        previousStock,
        targetQty,
        `Adjustment (${difference > 0 ? '+' : ''}${difference}): ${reason}`,
        req.user?.role || 'Warehouse Manager'
      );

      logActivity(
        'STOCK_ADJUSTMENT',
        'PRODUCT',
        product.id,
        `Adjusted stock for "${product.name}" from ${previousStock} to ${targetQty}. Reason: ${reason}`,
        req.user?.role || 'Warehouse Manager'
      );

      return {
        product_id: product.id,
        product_name: product.name,
        previous_stock: previousStock,
        new_stock: targetQty,
        difference
      };
    });

    const result = adjustTx();
    res.json({ success: true, message: 'Stock adjusted successfully', data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// POST /api/stock/transfer - Transfer product location or warehouse
exports.transferStock = (req, res) => {
  try {
    const { product_id, target_warehouse_id, target_bin, notes = '' } = req.body;
    if (!product_id || !target_warehouse_id) {
      return res.status(400).json({ success: false, error: 'product_id and target_warehouse_id are required' });
    }

    const transferTx = db.transaction(() => {
      const product = db.prepare(`
        SELECT p.*, w.name as current_wh_name 
        FROM products p 
        LEFT JOIN warehouses w ON p.warehouse_id = w.id 
        WHERE p.id = ?
      `).get(product_id);

      if (!product) throw new Error('Product not found');

      const targetWh = db.prepare('SELECT id, name FROM warehouses WHERE id = ?').get(target_warehouse_id);
      if (!targetWh) throw new Error('Target warehouse does not exist');

      const newBin = target_bin && target_bin.trim() !== '' ? target_bin.trim() : product.location_bin;

      db.prepare(`
        UPDATE products SET 
          warehouse_id = ?, 
          location_bin = ?, 
          updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(targetWh.id, newBin, product.id);

      db.prepare(`
        INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reference, notes, user_role)
        VALUES (?, 'TRANSFER', ?, ?, ?, 'WH_TRANSFER', ?, ?)
      `).run(
        product.id,
        product.quantity,
        product.quantity,
        product.quantity,
        `Transferred from ${product.current_wh_name} to ${targetWh.name} (Bin: ${newBin}). ${notes}`,
        req.user?.role || 'Warehouse Manager'
      );

      logActivity(
        'STOCK_TRANSFER',
        'PRODUCT',
        product.id,
        `Transferred ${product.name} (${product.quantity} units) to ${targetWh.name}`,
        req.user?.role || 'Warehouse Manager'
      );

      return {
        product_id: product.id,
        product_name: product.name,
        from_warehouse: product.current_wh_name,
        to_warehouse: targetWh.name,
        new_bin: newBin
      };
    });

    const result = transferTx();
    res.json({ success: true, message: 'Stock transferred successfully', data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// GET /api/stock/movements - Query stock movement log
exports.getMovements = (req, res) => {
  try {
    const { product_id, type, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        sm.*,
        p.name AS product_name,
        p.sku AS product_sku,
        p.category AS product_category,
        w.name AS warehouse_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      LEFT JOIN warehouses w ON p.warehouse_id = w.id
      WHERE 1=1
    `;

    const params = [];

    if (product_id) {
      query += ` AND sm.product_id = ?`;
      params.push(product_id);
    }

    if (type && type !== 'ALL') {
      query += ` AND sm.type = ?`;
      params.push(type);
    }

    query += ` ORDER BY sm.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const movements = db.prepare(query).all(...params);

    const totalCount = db.prepare(`
      SELECT COUNT(*) as total FROM stock_movements sm 
      WHERE (1=1) ${product_id ? 'AND sm.product_id = ' + parseInt(product_id, 10) : ''}
      ${type && type !== 'ALL' ? "AND sm.type = '" + type + "'" : ''}
    `).get().total;

    res.json({
      success: true,
      total: totalCount,
      count: movements.length,
      data: movements
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/stock/simulate-live-event - Simulated real-time tracking trigger
exports.simulateLiveEvent = (req, res) => {
  try {
    // Pick a random product
    const products = db.prepare('SELECT id, name, sku, quantity, min_threshold_stock FROM products WHERE quantity > 2').all();
    if (products.length === 0) {
      return res.status(400).json({ success: false, error: 'No suitable products found for simulation' });
    }

    const randomProduct = products[Math.floor(Math.random() * products.length)];
    const isStockIn = Math.random() > 0.45; // 55% chance of Stock IN, 45% Stock OUT
    const randomQty = Math.floor(Math.random() * 5) + 1;

    let movementType = 'IN';
    let previousStock = randomProduct.quantity;
    let newStock = previousStock + randomQty;
    let ref = `SIM-IN-${Date.now().toString().slice(-4)}`;
    let note = 'Automated IoT smart scanner telemetry intake';

    if (!isStockIn) {
      if (previousStock >= randomQty) {
        movementType = 'OUT';
        newStock = previousStock - randomQty;
        ref = `SIM-OUT-${Date.now().toString().slice(-4)}`;
        note = 'Automated automated dispatch simulation';
      }
    }

    const simTx = db.transaction(() => {
      db.prepare('UPDATE products SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, randomProduct.id);

      const m = db.prepare(`
        INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reference, notes, user_role)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'System-IoT')
      `).run(randomProduct.id, movementType, randomQty, previousStock, newStock, ref, note);

      logActivity(
        movementType === 'IN' ? 'STOCK_IN' : 'STOCK_OUT',
        'PRODUCT',
        randomProduct.id,
        `[SIMULATED] ${movementType} of ${randomQty} units for ${randomProduct.name} (${randomProduct.sku})`,
        'System-IoT'
      );

      return {
        id: m.lastInsertRowid,
        product_id: randomProduct.id,
        product_name: randomProduct.name,
        sku: randomProduct.sku,
        type: movementType,
        quantity: randomQty,
        previous_stock: previousStock,
        new_stock: newStock,
        reference: ref,
        notes: note,
        created_at: new Date().toISOString()
      };
    });

    const simEvent = simTx();
    res.json({
      success: true,
      message: 'Simulated real-time stock event executed',
      data: simEvent
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
