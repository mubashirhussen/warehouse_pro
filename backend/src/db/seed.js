const { db, logActivity } = require('../config/database');

function seedDatabase() {
  console.log('Seeding Smart Warehouse Database with production-grade real-world enterprise data...');

  // Begin transaction
  const seedTx = db.transaction(() => {
    // Clear all tables in foreign-key safe order
    db.prepare('DELETE FROM inventory_logs').run();
    db.prepare('DELETE FROM stock_movements').run();
    db.prepare('DELETE FROM purchase_orders').run();
    db.prepare('DELETE FROM products').run();
    db.prepare('DELETE FROM warehouses').run();
    db.prepare('DELETE FROM suppliers').run();
    db.prepare('DELETE FROM users').run();

    // Reset autoincrement sequences
    try {
      db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('inventory_logs', 'stock_movements', 'purchase_orders', 'products', 'warehouses', 'suppliers', 'users')").run();
    } catch (e) {
      // Ignored if sqlite_sequence table is empty
    }

    // 1. Seed Real-World Users
    const insertUser = db.prepare(`
      INSERT INTO users (id, username, password, email, full_name, role, avatar_url, auth_provider)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(
      1,
      'admin',
      'admin123',
      'admin@warehousepro.io',
      'Sarah Jenkins',
      'Admin',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      'local'
    );
    insertUser.run(
      2,
      'manager',
      'manager123',
      'manager@warehousepro.io',
      'David Miller',
      'Warehouse Manager',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      'local'
    );
    insertUser.run(
      3,
      'staff',
      'staff123',
      'staff@warehousepro.io',
      'Alex Rodriguez',
      'Staff',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      'local'
    );

    // 2. Seed Real-World Logistics Facilities / Warehouses
    const insertWarehouse = db.prepare(`
      INSERT INTO warehouses (id, name, code, location, capacity, manager_name, contact_number, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertWarehouse.run(1, 'Midwest Central Logistics Hub', 'WH-CHI-01', 'Chicago, IL (Zone A)', 50000, 'David Miller', '+1 (312) 555-0143', 'ACTIVE');
    insertWarehouse.run(2, 'West Coast Advanced Distribution Center', 'WH-NV-02', 'Reno, NV (Zone B)', 80000, 'Elena Vance', '+1 (775) 555-0188', 'ACTIVE');
    insertWarehouse.run(3, 'East Coast Port Fulfillment Hub', 'WH-PA-03', 'Allentown, PA (Zone C)', 60000, 'Marcus Brody', '+1 (610) 555-0199', 'ACTIVE');
    insertWarehouse.run(4, 'Southern Regional Transit Depot', 'WH-TX-04', 'Dallas, TX (Zone D)', 45000, 'Chloe Martinez', '+1 (214) 555-0112', 'ACTIVE');

    // 3. Seed Real-World Verified Suppliers
    const insertSupplier = db.prepare(`
      INSERT INTO suppliers (id, name, contact_name, email, phone, address, category, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertSupplier.run(1, 'Apex Industrial Electronics & Sensors Corp.', 'Robert Chang', 'procurement@apexelectronics.com', '+1 (408) 555-7821', 'Silicon Valley, CA 95054', 'Electronics', 'ACTIVE');
    insertSupplier.run(2, 'Titan Torque & Precision Tooling Inc.', 'Kurt Wagner', 'orders@titanindustrial.com', '+1 (216) 555-3419', 'Cleveland, OH 44114', 'Hardware', 'ACTIVE');
    insertSupplier.run(3, 'Nordic Eco-Logistics Packaging Ltd.', 'Astrid Lind', 'operations@nordicpackaging.com', '+1 (612) 555-8910', 'Minneapolis, MN 55401', 'Packaging', 'ACTIVE');
    insertSupplier.run(4, 'Summit Industrial Safety & PPE Systems', 'Karen Walker', 'corporate-sales@summitworkwear.com', '+1 (704) 555-4422', 'Charlotte, NC 28202', 'Apparel', 'ACTIVE');
    insertSupplier.run(5, 'Omni Microelectronics & Telemetry LLC', 'Dr. Liam Vance', 'enterprise@omnisensors.io', '+1 (512) 555-9034', 'Austin, TX 78701', 'Electronics', 'ACTIVE');
    insertSupplier.run(6, 'Vanguard Material Handling & Hydraulics', 'Jonathan Vance', 'dispatch@vanguardhydraulics.com', '+1 (412) 555-6670', 'Pittsburgh, PA 15222', 'Industrial', 'ACTIVE');

    // 4. Seed Real-World Industrial Products Catalog (20 SKUs)
    const insertProduct = db.prepare(`
      INSERT INTO products (id, sku, name, category, quantity, min_threshold_stock, unit_price, warehouse_id, location_bin, barcode, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const products = [
      // Electronics & Telemetry
      [1, 'SKU-ELEC-101', 'High-Gain Industrial Dual-Band Router AX500', 'Electronics', 64, 15, 249.99, 1, 'A-01-04', '893520182741', 'Gigabit DIN-rail industrial router with dual SFP ports and ruggedized housing.'],
      [2, 'SKU-ELEC-102', 'Precision Thermal & Vibration Sensor Array V3 (10-Pack)', 'Electronics', 8, 25, 89.50, 1, 'A-02-11', '893520182742', 'Calibrated industrial IoT condition monitoring sensor package.'],
      [3, 'SKU-ELEC-103', 'Industrial LiFePO4 Energy Storage Module 48V 100Ah', 'Electronics', 24, 10, 650.00, 2, 'B-01-01', '893520182743', 'High-discharge battery pack engineered for autonomous guided vehicles (AGVs).'],
      [4, 'SKU-ELEC-104', 'Single-Mode 10G SFP+ Optical Transceiver (1310nm)', 'Electronics', 140, 30, 45.00, 1, 'A-03-08', '893520182744', 'Hot-pluggable 10 Gigabit optical transceiver for high-speed switch backplanes.'],
      [5, 'SKU-ELEC-105', 'Ruggedized IP67 Barcode Scanner Terminal with Laser Engine', 'Electronics', 35, 12, 420.00, 3, 'C-01-03', '893520182745', 'Wireless 2D handheld imager with drop-resistant shock casing and cradle.'],

      // Precision Tools & Hardware
      [6, 'SKU-TOOL-201', 'Calibrated Hydraulic Flange Torque Wrench (5000 Nm)', 'Hardware', 16, 6, 1150.00, 3, 'C-02-15', '893520182746', 'Precision low-profile hydraulic torque tool for pipeline and heavy flange assembly.'],
      [7, 'SKU-TOOL-202', 'Industrial Bluetooth Laser Distance Meter 100M', 'Hardware', 9, 20, 120.00, 1, 'C-01-09', '893520182747', 'Digital measurement meter with real-time floor plan export telemetry.'],
      [8, 'SKU-TOOL-203', 'Chrome-Molybdenum Impact Socket Set (24-Piece)', 'Hardware', 52, 15, 185.00, 2, 'C-03-02', '893520182748', 'Heavy-duty 1/2-inch drive metric and SAE high-torque impact sockets.'],
      [9, 'SKU-TOOL-204', 'Digital Torque Multiplier 1:5 Ratio Gear Set', 'Hardware', 12, 5, 890.00, 2, 'C-03-10', '893520182749', 'Precision planetary gear torque multiplier for tight clearance fastening.'],

      // Packaging & Logistics Supplies
      [10, 'SKU-PACK-301', 'Heavy-Duty Corrugated Shipping Boxes (Bundle of 50)', 'Packaging', 280, 60, 62.50, 2, 'D-01-01', '893520182750', 'Double-wall ECT-48 certified shipping cartons (18x18x16 inches).'],
      [11, 'SKU-PACK-302', 'Biodegradable High-Tension Pallet Stretch Film (80 Gauge)', 'Packaging', 14, 40, 78.00, 3, 'D-02-04', '893520182751', 'Eco-friendly high-puncture pallet wrapping rolls for secure transport.'],
      [12, 'SKU-PACK-303', 'Direct Thermal Perforated Shipping Labels (Roll of 1,000)', 'Packaging', 380, 80, 18.25, 1, 'D-03-12', '893520182752', '4x6 inch smudge-proof logistics barcode labels for thermal printers.'],
      [13, 'SKU-PACK-304', 'Heavy-Duty Void-Fill Kraft Paper Rolls (30 lb)', 'Packaging', 95, 25, 38.00, 4, 'D-04-02', '893520182753', '100% recycled packaging cushioning paper for fragile parts protection.'],

      // Safety & PPE Equipment
      [14, 'SKU-SAFE-401', 'Puncture-Resistant Steel-Toe Work Boots (Size 10.5)', 'Apparel', 48, 15, 135.00, 4, 'E-01-06', '893520182754', 'ASTM F2413 certified slip-resistant safety boots with composite shank.'],
      [15, 'SKU-SAFE-402', 'ANSI Class 3 LED Rechargeable Hi-Vis Safety Vest', 'Apparel', 110, 30, 34.50, 4, 'E-02-03', '893520182755', 'Reflective safety vest with 3-mode illuminated optical fiber piping.'],
      [16, 'SKU-SAFE-403', 'Nitrile Micro-Foam Palm Coated Work Gloves (Pack of 12)', 'Apparel', 6, 35, 24.00, 4, 'E-03-01', '893520182756', 'High-dexterity Level 3 cut-resistant breathable assembly gloves.'],
      [17, 'SKU-SAFE-404', 'Full-Face Respirator Mask with Organic Vapor Cartridges', 'Apparel', 28, 10, 145.00, 1, 'E-04-05', '893520182757', 'NIOSH approved silicone facepiece for hazardous environment protection.'],

      // Material Handling & Heavy Machinery
      [18, 'SKU-IND-501', 'Manual Hydraulic Pallet Truck 5,500 lbs Capacity', 'Industrial', 18, 6, 480.00, 1, 'F-01-01', '893520182758', 'Heavy-gauge steel hand truck with dual polyurethane steering wheels.'],
      [19, 'SKU-IND-502', 'Industrial Clean-Air HEPA H14 Dust Extractor', 'Industrial', 11, 4, 890.00, 2, 'F-02-08', '893520182759', 'Commercial 3-stage filtration unit with continuous 24/7 duty cycle.'],
      [20, 'SKU-IND-503', 'Modular Aluminum Gravity Roller Conveyor Section (10 ft)', 'Industrial', 22, 5, 340.00, 3, 'F-03-02', '893520182760', 'Adjustable height smooth-bearing gravity conveyor for order sorting.']
    ];

    for (const p of products) {
      insertProduct.run(...p);
    }

    // 5. Seed Real-World Stock Movements Audit Ledger
    const insertMovement = db.prepare(`
      INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reference, notes, user_role, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
    `);

    insertMovement.run(1, 'IN', 80, 0, 80, 'PO-2026-0819', 'Initial inventory intake from Apex Electronics', 'Admin', '-6 days');
    insertMovement.run(1, 'OUT', 16, 80, 64, 'DISP-882190', 'Dispatched to West Regional Facility assembly', 'Staff', '-3 days');
    insertMovement.run(2, 'IN', 30, 0, 30, 'PO-2026-0820', 'Received shipment from Omni Microelectronics', 'Warehouse Manager', '-5 days');
    insertMovement.run(2, 'OUT', 22, 30, 8, 'ORD-KIT-991', 'Allocated to robotic automated assembly line (Safety stock warning)', 'Staff', '-1 day');
    insertMovement.run(10, 'IN', 350, 0, 350, 'PO-2026-0821', 'Bulk pallet shipment from Nordic Packaging', 'Warehouse Manager', '-4 days');
    insertMovement.run(10, 'OUT', 70, 350, 280, 'BATCH-SHIP-401', 'Outbound dispatch for e-commerce client fulfillment', 'Staff', '-2 days');
    insertMovement.run(16, 'OUT', 34, 40, 6, 'MAINT-CREW-104', 'Dispatched to regional maintenance crews (Low Stock Threshold Breached)', 'Staff', '-5 hours');
    insertMovement.run(18, 'IN', 20, 0, 20, 'PO-2026-0822', 'Received 20 units of heavy duty pallet trucks from Vanguard', 'Admin', '-2 days');
    insertMovement.run(18, 'OUT', 2, 20, 18, 'FACILITY-DEPLOY', 'Deployed to Zone A unloading bays', 'Staff', '-8 hours');

    // 6. Seed Real-World Purchase Orders
    const insertPO = db.prepare(`
      INSERT INTO purchase_orders (id, po_number, supplier_id, order_date, expected_date, status, total_amount, notes, items_json, created_at, received_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), ?)
    `);

    insertPO.run(
      1,
      'PO-2026-0819',
      1,
      '2026-09-20',
      '2026-09-24',
      'RECEIVED',
      19999.20,
      'Quarterly high-gain industrial router replenishment',
      JSON.stringify([{ product_id: 1, name: 'High-Gain Industrial Dual-Band Router AX500', quantity: 80, unit_price: 249.99, received: 80 }]),
      '-10 days',
      '2026-09-24 14:30:00'
    );

    insertPO.run(
      2,
      'PO-2026-0823',
      2,
      '2026-09-28',
      '2026-10-05',
      'PENDING',
      7000.00,
      'Scheduled replenishment for hydraulic torque wrenches & laser meters',
      JSON.stringify([
        { product_id: 6, name: 'Calibrated Hydraulic Flange Torque Wrench (5000 Nm)', quantity: 4, unit_price: 1150.00, received: 0 },
        { product_id: 7, name: 'Industrial Bluetooth Laser Distance Meter 100M', quantity: 20, unit_price: 120.00, received: 0 }
      ]),
      '-2 days',
      null
    );

    insertPO.run(
      3,
      'PO-2026-0824',
      4,
      '2026-09-30',
      '2026-10-04',
      'PENDING',
      2400.00,
      'Priority replenishment for Level 3 cut-resistant nitrile work gloves',
      JSON.stringify([
        { product_id: 16, name: 'Nitrile Micro-Foam Palm Coated Work Gloves (Pack of 12)', quantity: 100, unit_price: 24.00, received: 0 }
      ]),
      '-1 day',
      null
    );

    // 7. Seed System Audit Logs
    logActivity('SYSTEM_INIT', 'SYSTEM', 0, 'Production enterprise database initialized with verified master datasets', 'Admin');
    logActivity('STOCK_IN', 'PRODUCT', 1, 'Inbound intake of 80 units (Reference: PO-2026-0819)', 'Admin');
    logActivity('STOCK_OUT', 'PRODUCT', 2, 'Outbound dispatch of 22 units - Low safety stock threshold reached', 'Staff');
    logActivity('PO_CREATED', 'PURCHASE_ORDER', 2, 'Generated PO-2026-0823 for Titan Torque & Tooling ($7,000.00)', 'Warehouse Manager');
    logActivity('PO_CREATED', 'PURCHASE_ORDER', 3, 'Generated PO-2026-0824 for Summit Safety & PPE ($2,400.00)', 'Warehouse Manager');
  });

  seedTx();
  console.log('Database successfully seeded with production-grade enterprise data!');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
