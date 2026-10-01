const { db, logActivity } = require('../config/database');

// GET /api/orders - List all purchase orders
exports.getOrders = (req, res) => {
  try {
    const { status, supplier_id } = req.query;

    let query = `
      SELECT 
        po.*,
        s.name AS supplier_name,
        s.email AS supplier_email,
        s.phone AS supplier_phone
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      WHERE 1=1
    `;

    const params = [];

    if (status && status !== 'ALL') {
      query += ` AND po.status = ?`;
      params.push(status);
    }

    if (supplier_id && supplier_id !== 'ALL') {
      query += ` AND po.supplier_id = ?`;
      params.push(supplier_id);
    }

    query += ` ORDER BY po.created_at DESC`;

    const orders = db.prepare(query).all(...params);

    // Parse items_json
    const formatted = orders.map(order => {
      let items = [];
      try {
        items = JSON.parse(order.items_json);
      } catch (e) {
        items = [];
      }
      return {
        ...order,
        items
      };
    });

    res.json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/orders - Create new purchase order
exports.createOrder = (req, res) => {
  try {
    const {
      supplier_id,
      order_date = new Date().toISOString().split('T')[0],
      expected_date,
      notes = '',
      items = []
    } = req.body;

    if (!supplier_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Supplier and at least one item are required to generate a Purchase Order.'
      });
    }

    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(supplier_id);
    if (!supplier) {
      return res.status(400).json({ success: false, error: 'Selected supplier does not exist' });
    }

    // Generate unique PO number
    const poNumber = `PO-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;

    let totalAmount = 0;
    const validatedItems = items.map(item => {
      const qty = parseInt(item.quantity, 10);
      const price = parseFloat(item.unit_price);
      if (isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
        throw new Error(`Invalid item quantities or pricing for item: ${item.name || 'Unknown'}`);
      }
      totalAmount += qty * price;
      return {
        product_id: item.product_id || null,
        name: item.name || 'Custom Item',
        quantity: qty,
        unit_price: price,
        subtotal: qty * price,
        received: 0
      };
    });

    const stmt = db.prepare(`
      INSERT INTO purchase_orders (po_number, supplier_id, order_date, expected_date, status, total_amount, notes, items_json)
      VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?)
    `);

    const result = stmt.run(
      poNumber,
      supplier.id,
      order_date,
      expected_date || null,
      parseFloat(totalAmount.toFixed(2)),
      notes.trim(),
      JSON.stringify(validatedItems)
    );

    logActivity(
      'PO_CREATED',
      'PURCHASE_ORDER',
      result.lastInsertRowid,
      `Created Purchase Order ${poNumber} for ${supplier.name} totaling $${totalAmount.toFixed(2)}`,
      req.user?.role || 'Admin'
    );

    const createdOrder = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: `Purchase order ${poNumber} generated successfully`,
      data: {
        ...createdOrder,
        items: validatedItems
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// POST /api/orders/:id/receive - Receive PO and auto-update stock
exports.receiveOrder = (req, res) => {
  try {
    const { id } = req.params;

    const receiveTx = db.transaction(() => {
      const order = db.prepare(`
        SELECT po.*, s.name as supplier_name 
        FROM purchase_orders po 
        JOIN suppliers s ON po.supplier_id = s.id 
        WHERE po.id = ?
      `).get(id);

      if (!order) {
        throw new Error('Purchase order not found');
      }

      if (order.status === 'RECEIVED') {
        throw new Error('Purchase order has already been fully received and inventory updated');
      }

      if (order.status === 'CANCELLED') {
        throw new Error('Cannot receive a cancelled purchase order');
      }

      let items = [];
      try {
        items = JSON.parse(order.items_json);
      } catch (e) {
        throw new Error('Invalid purchase order items data');
      }

      const updatedItems = [];

      for (const item of items) {
        if (item.product_id) {
          const product = db.prepare('SELECT id, name, sku, quantity FROM products WHERE id = ?').get(item.product_id);
          if (product) {
            const prevStock = product.quantity;
            const newStock = prevStock + item.quantity;

            // Increment stock
            db.prepare('UPDATE products SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, product.id);

            // Record Stock IN movement
            db.prepare(`
              INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reference, notes, user_role)
              VALUES (?, 'IN', ?, ?, ?, ?, ?, ?)
            `).run(
              product.id,
              item.quantity,
              prevStock,
              newStock,
              order.po_number,
              `Received via PO ${order.po_number} from ${order.supplier_name}`,
              req.user?.role || 'Warehouse Manager'
            );
          }
        }
        updatedItems.push({
          ...item,
          received: item.quantity
        });
      }

      // Update PO status to RECEIVED
      db.prepare(`
        UPDATE purchase_orders 
        SET status = 'RECEIVED', 
            received_at = CURRENT_TIMESTAMP, 
            items_json = ? 
        WHERE id = ?
      `).run(JSON.stringify(updatedItems), order.id);

      logActivity(
        'PO_RECEIVED',
        'PURCHASE_ORDER',
        order.id,
        `Marked ${order.po_number} as RECEIVED. Auto-stocked ${items.length} line item(s).`,
        req.user?.role || 'Warehouse Manager'
      );

      return {
        id: order.id,
        po_number: order.po_number,
        status: 'RECEIVED',
        items_count: items.length
      };
    });

    const result = receiveTx();
    res.json({
      success: true,
      message: `Purchase Order ${result.po_number} successfully received. Stock levels have been automatically updated.`,
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// PUT /api/orders/:id/cancel - Cancel PO
exports.cancelOrder = (req, res) => {
  try {
    const { id } = req.params;
    const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Purchase order not found' });
    }

    if (order.status === 'RECEIVED') {
      return res.status(400).json({ success: false, error: 'Cannot cancel an order that has already been received' });
    }

    db.prepare("UPDATE purchase_orders SET status = 'CANCELLED' WHERE id = ?").run(id);
    logActivity('PO_CANCELLED', 'PURCHASE_ORDER', id, `Cancelled PO ${order.po_number}`, req.user?.role || 'Admin');

    res.json({ success: true, message: `Purchase order ${order.po_number} cancelled.` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
