import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Boxes,
  DollarSign,
  AlertTriangle,
  PackageX,
  Warehouse,
  Truck,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  PlusCircle,
  ArrowRight,
  Shield,
  ScanLine,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import StockActionModal from '../components/StockActionModal';

export default function Dashboard({ setActiveTab }) {
  const { currentRole, currentUser } = useAuth();
  const [data, setData] = useState(null);
  const [roleContext, setRoleContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [productsList, setProductsList] = useState([]);
  const [stockModal, setStockModal] = useState({ isOpen: false, mode: 'IN', product: null });

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [dashRes, prodRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/products')
      ]);
      setData(dashRes.data);
      setRoleContext(dashRes.role_context);
      setProductsList(prodRes.data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    const handleUpdate = () => {
      fetchDashboard();
    };

    window.addEventListener('warehouse-stock-update', handleUpdate);
    return () => window.removeEventListener('warehouse-stock-update', handleUpdate);
  }, [currentRole]);

  const openQuickStockIn = (product) => {
    setStockModal({ isOpen: true, mode: 'IN', product });
  };

  if (loading && !data) {
    return (
      <div className="content-body">
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>
          <RefreshCw size={24} className="status-dot pulse" style={{ display: 'inline-block', marginBottom: '0.5rem' }} />
          <div>Updating role-tailored dashboard metrics and telemetry...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-body">
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '1rem', borderRadius: '8px', color: '#991b1b' }}>
          <strong>Error loading dashboard:</strong> {error}
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const alerts = data?.low_stock_alerts || [];
  const movements = data?.recent_movements || [];
  const categories = data?.category_stats || [];
  const warehouses = data?.warehouse_utilization || [];

  return (
    <div className="content-body">
      {/* Dynamic Role Scope Banner */}
      <div style={{
        backgroundColor: currentRole === 'Admin' ? '#eff6ff' : currentRole === 'Warehouse Manager' ? '#fffbeb' : '#f0fdf4',
        border: `1px solid ${currentRole === 'Admin' ? '#bfdbfe' : currentRole === 'Warehouse Manager' ? '#fde68a' : '#bbf7d0'}`,
        borderRadius: '8px',
        padding: '0.85rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Shield size={22} color={currentRole === 'Admin' ? '#2563eb' : currentRole === 'Warehouse Manager' ? '#d97706' : '#16a34a'} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>
              Active View: <span style={{ color: currentRole === 'Admin' ? '#2563eb' : currentRole === 'Warehouse Manager' ? '#d97706' : '#16a34a' }}>{currentRole}</span>
              {' • '}{currentUser?.full_name || 'Operator'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '1px' }}>
              {currentRole === 'Admin' && 'Executive Scope: Full visibility of multi-warehouse assets, company valuation ($), catalog administration, and data controls.'}
              {currentRole === 'Warehouse Manager' && 'Procurement & Capacity Scope: Monitoring replenishment buffers, vendor purchase orders, and regional facility utilization.'}
              {currentRole === 'Staff' && 'Floor Operations Scope: Rapid Stock IN/OUT dispatch, optical barcode terminal scanning, and bin storage verification.'}
            </div>
          </div>
        </div>

        {/* Quick Role Shortcut Tools */}
        <div>
          {currentRole === 'Staff' && (
            <button onClick={() => setActiveTab('barcode')} className="btn btn-secondary btn-sm" style={{ backgroundColor: '#fff' }}>
              <ScanLine size={14} /> Open Barcode Scanner
            </button>
          )}
          {currentRole === 'Warehouse Manager' && (
            <button onClick={() => setActiveTab('suppliers')} className="btn btn-secondary btn-sm" style={{ backgroundColor: '#fff' }}>
              <Truck size={14} /> Open Purchase Orders ({kpis.pending_purchase_orders} Pending)
            </button>
          )}
          {currentRole === 'Admin' && (
            <button onClick={() => setActiveTab('reports')} className="btn btn-secondary btn-sm" style={{ backgroundColor: '#fff' }}>
              <Sparkles size={14} /> View Predictive AI Restock
            </button>
          )}
        </div>
      </div>

      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Warehouse Operations Overview</h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Real-time stock status, low-inventory alerts, and warehouse capacity metrics.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setStockModal({ isOpen: true, mode: 'IN', product: null })}
            className="btn btn-success btn-sm"
          >
            <ArrowDownRight size={15} /> Quick Stock IN
          </button>
          <button
            onClick={() => setStockModal({ isOpen: true, mode: 'OUT', product: null })}
            className="btn btn-primary btn-sm"
          >
            <ArrowUpRight size={15} /> Quick Stock OUT
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-header">
            <span>{currentRole === 'Staff' ? 'ACCESSIBLE STOCK UNITS' : 'TOTAL STOCK UNITS'}</span>
            <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
              <Boxes size={18} />
            </div>
          </div>
          <div className="stat-value">{Number(kpis.total_stock_units).toLocaleString()}</div>
          <div className="stat-caption">Across {kpis.total_products} unique warehouse SKUs</div>
        </div>

        {currentRole === 'Staff' ? (
          <div className="stat-box">
            <div className="stat-header">
              <span>ACTIVE SCANNER & INTAKE</span>
              <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                <ScanLine size={18} />
              </div>
            </div>
            <div className="stat-value" style={{ color: '#059669' }}>READY</div>
            <div className="stat-caption">Optical barcode terminal active for floor operations</div>
          </div>
        ) : (
          <div className="stat-box">
            <div className="stat-header">
              <span>INVENTORY VALUATION</span>
              <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                <DollarSign size={18} />
              </div>
            </div>
            <div className="stat-value">${Number(kpis.total_valuation).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="stat-caption">Total warehouse holding asset value</div>
          </div>
        )}

        <div className="stat-box">
          <div className="stat-header">
            <span>LOW STOCK ALERTS</span>
            <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: kpis.low_stock_count > 0 ? '#d97706' : '#0f172a' }}>
            {kpis.low_stock_count}
          </div>
          <div className="stat-caption">Items at or below safety reorder threshold</div>
        </div>

        <div className="stat-box">
          <div className="stat-header">
            <span>{currentRole === 'Warehouse Manager' ? 'PENDING PO ORDERS' : 'OUT OF STOCK'}</span>
            <div className="stat-icon" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
              <PackageX size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: (currentRole === 'Warehouse Manager' ? kpis.pending_purchase_orders : kpis.out_of_stock_count) > 0 ? '#dc2626' : '#0f172a' }}>
            {currentRole === 'Warehouse Manager' ? kpis.pending_purchase_orders : kpis.out_of_stock_count}
          </div>
          <div className="stat-caption">
            {currentRole === 'Warehouse Manager'
              ? `${kpis.pending_purchase_orders} Pending supplier shipments to receive`
              : `${kpis.pending_purchase_orders} Pending supplier purchase orders`}
          </div>
        </div>
      </div>

      {/* Main Grid: Critical Alerts & Live Movements */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Low Stock Alerts Feed */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title">
              <AlertTriangle size={18} color="#d97706" />
              <span>Low-Stock & Reorder Alerts ({alerts.length})</span>
            </div>
            <button onClick={() => setActiveTab('reports')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}>
              View Analysis
            </button>
          </div>

          {alerts.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <div style={{ color: '#059669', fontWeight: 600 }}>All items have healthy stock levels.</div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product & SKU</th>
                    <th>Current Stock</th>
                    <th>Min Limit</th>
                    <th>Warehouse Bin</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.sku}</span>
                      </td>
                      <td>
                        <span className={`badge ${item.quantity === 0 ? 'badge-out-of-stock' : 'badge-low-stock'}`}>
                          {item.quantity} units
                        </span>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{item.min_threshold_stock} units</td>
                      <td>
                        <code style={{ fontSize: '0.75rem', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                          {item.location_bin || 'Bin A-1'}
                        </code>
                      </td>
                      <td>
                        <button
                          onClick={() => openQuickStockIn(item)}
                          className="btn btn-success btn-sm"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          + Restock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Live Recent Stock Movement Feed */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title">
              <ArrowDownRight size={18} color="#2563eb" />
              <span>Recent Movements ({currentRole} Activity Feed)</span>
            </div>
            <button onClick={() => setActiveTab('movements')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}>
              Full History
            </button>
          </div>

          {movements.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>No recent stock movements recorded.</div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Balance</th>
                    <th>Ref / User</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map(m => (
                    <tr key={m.id}>
                      <td>
                        <span className={`badge ${m.type === 'IN' ? 'badge-movement-in' : m.type === 'OUT' ? 'badge-movement-out' : 'badge-neutral'}`}>
                          {m.type === 'IN' ? '↓ IN' : m.type === 'OUT' ? '↑ OUT' : m.type}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{m.product_name}</div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{m.product_sku}</span>
                      </td>
                      <td style={{ fontWeight: 700, color: m.type === 'IN' ? '#059669' : '#2563eb' }}>
                        {m.type === 'IN' ? `+${m.quantity}` : `-${m.quantity}`}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#475569' }}>
                        {m.new_stock} units
                      </td>
                      <td>
                        <div style={{ fontSize: '0.78rem', fontWeight: 500 }}>{m.reference || 'DIRECT'}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{m.user_role}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Warehouse Utilization & Category Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Warehouse Utilization */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Warehouse size={18} color="#2563eb" />
              <span>Facility Capacity Utilization</span>
            </div>
            <button onClick={() => setActiveTab('warehouses')} className="btn btn-secondary btn-sm">
              Manage
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {warehouses.map(wh => (
              <div key={wh.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600 }}>{wh.name} ({wh.code})</span>
                  <span style={{ color: '#64748b' }}>
                    {wh.current_units.toLocaleString()} / {wh.capacity.toLocaleString()} units ({wh.utilization_rate}%)
                  </span>
                </div>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${Math.min(100, wh.utilization_rate)}%`,
                      backgroundColor: wh.utilization_rate > 90 ? '#ef4444' : wh.utilization_rate > 70 ? '#f59e0b' : '#2563eb'
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Boxes size={18} color="#2563eb" />
              <span>Inventory by Category</span>
            </div>
            <button onClick={() => setActiveTab('products')} className="btn btn-secondary btn-sm">
              View Items
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>SKUs</th>
                  <th>Total Units</th>
                  <th>Valuation</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(c => (
                  <tr key={c.category}>
                    <td>
                      <span className="badge badge-neutral">{c.category}</span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{c.product_count} items</td>
                    <td style={{ fontWeight: 600 }}>{c.total_units.toLocaleString()}</td>
                    <td style={{ fontWeight: 600, color: '#059669' }}>
                      ${Number(c.valuation).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Stock Action Modal */}
      <StockActionModal
        isOpen={stockModal.isOpen}
        mode={stockModal.mode}
        product={stockModal.product}
        products={productsList}
        onClose={() => setStockModal({ isOpen: false, mode: 'IN', product: null })}
        onSuccess={() => fetchDashboard()}
      />
    </div>
  );
}
