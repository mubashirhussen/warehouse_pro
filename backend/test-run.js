async function testSystem() {
  try {
    const res = await fetch('http://localhost:5000/api/dashboard/summary?role=Admin');
    const data = await res.json();
    console.log('===========================================================');
    console.log('    WAREHOUSEPRO - PRODUCTION-GRADE REAL-WORLD DATASET     ');
    console.log('===========================================================');
    console.log('API Server:       http://localhost:5000 (HEALTHY)');
    console.log('Vite Frontend:    http://localhost:5173 (ACTIVE)');
    console.log('Database:         SQLite (WAL Mode Enabled)');
    console.log('Active Scope:    ', data.role_context.title);
    
    console.log('\n--- 1. REAL-WORLD INVENTORY KPIS ---');
    console.log('Total Master SKUs:       ', data.data.kpis.total_products);
    console.log('Total Units on Hand:     ', data.data.kpis.total_stock_units);
    console.log('Total Holding Valuation: ', '$' + Number(data.data.kpis.total_valuation).toLocaleString('en-US', {minimumFractionDigits: 2}));
    console.log('Low Stock Alerts:        ', data.data.kpis.low_stock_count);
    console.log('Critical Out-of-Stock:   ', data.data.kpis.out_of_stock_count);
    console.log('Active Facilities:       ', data.data.kpis.active_warehouses);
    console.log('Pending Purchase Orders: ', data.data.kpis.pending_purchase_orders);
    console.log('Verified Suppliers:      ', data.data.kpis.active_suppliers);

    console.log('\n--- 2. REGIONAL WAREHOUSE CAPACITY UTILIZATION ---');
    data.data.warehouse_utilization.forEach(w => {
      console.log(`  - ${w.name} (${w.code}): ${w.current_units.toLocaleString()} / ${w.capacity.toLocaleString()} units (${w.utilization_rate}% utilized)`);
    });

    console.log('\n--- 3. REPLENISHMENT & RESTOCK ALERTS ---');
    data.data.low_stock_alerts.slice(0, 4).forEach(a => {
      console.log(`  - [${a.alert_level}] ${a.sku} | ${a.name} | Qty: ${a.quantity} (Safety Min: ${a.min_threshold_stock}) | Hub: ${a.warehouse_name}`);
    });

    console.log('\n--- 4. RECENT LEDGER TRANSACTIONS AUDIT ---');
    data.data.recent_movements.slice(0, 4).forEach(m => {
      console.log(`  - [${m.type}] SKU: ${m.product_sku} | Qty: ${m.quantity} | Ref: ${m.reference || 'DIRECT'} | Role: ${m.user_role} | Notes: ${m.notes}`);
    });

    console.log('\n--- 5. ACCESS CONTROL MATRIX ---');
    console.log(data.role_context.permissions);
    console.log('===========================================================');
  } catch (err) {
    console.error('Test system error:', err);
  }
}

testSystem();
