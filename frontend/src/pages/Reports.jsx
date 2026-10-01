import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  FileBarChart2,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  Download,
  Printer,
  RefreshCw,
  ShieldCheck,
  Package
} from 'lucide-react';

export default function Reports() {
  const { currentRole } = useAuth();
  const { addToast } = useToast();
  
  const [activeReport, setActiveReport] = useState(() => {
    return currentRole === 'Warehouse Manager' ? 'low_stock' : 'valuation';
  });
  const [loading, setLoading] = useState(true);

  const [valuationData, setValuationData] = useState(null);
  const [lowStockData, setLowStockData] = useState(null);
  const [predictiveData, setPredictiveData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      if (activeReport === 'valuation') {
        const res = await api.get('/reports/valuation');
        setValuationData(res);
      } else if (activeReport === 'low_stock') {
        const res = await api.get('/reports/low-stock');
        setLowStockData(res);
      } else if (activeReport === 'predictive') {
        const res = await api.get('/reports/predictive-restock');
        setPredictiveData(res);
      } else if (activeReport === 'audit') {
        const res = await api.get('/reports/audit-logs');
        setAuditLogs(res.data || []);
      }
    } catch (err) {
      addToast(`Report loading error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [activeReport]);

  const handlePrint = () => {
    window.print();
  };

  const exportValuationCSV = () => {
    if (!valuationData || !valuationData.data) return;
    const headers = ['Product Name', 'SKU', 'Category', 'Quantity', 'Unit Price ($)', 'Total Valuation ($)', 'Warehouse'];
    const rows = valuationData.data.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.sku}"`,
      `"${p.category}"`,
      p.quantity,
      p.unit_price,
      p.total_valuation,
      `"${p.warehouse_name || ''}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadBlob(csvContent, `warehouse_valuation_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportPredictiveCSV = () => {
    if (!predictiveData || !predictiveData.data) return;
    const headers = ['Product', 'SKU', 'Current Stock', 'Burn Rate/Day', 'Days Remaining', 'Risk Level', 'Recommended Order Qty', 'Est. PO Cost ($)'];
    const rows = predictiveData.data.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.sku}"`,
      p.current_stock,
      p.daily_burn_rate,
      p.estimated_days_remaining,
      `"${p.risk_level}"`,
      p.recommended_order_quantity,
      p.estimated_po_cost
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadBlob(csvContent, `predictive_restocking_forecast_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const downloadBlob = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Report CSV exported successfully', 'success');
  };

  return (
    <div className="content-body">
      {/* Header & Export Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Inventory Reports & Predictive Analytics</h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Comprehensive valuation, restocking demand forecasts, and SQLite audit trail.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handlePrint} className="btn btn-secondary btn-sm">
            <Printer size={15} /> Print Report
          </button>
          {activeReport === 'valuation' && (
            <button onClick={exportValuationCSV} className="btn btn-primary btn-sm">
              <Download size={15} /> Export Valuation CSV
            </button>
          )}
          {activeReport === 'predictive' && (
            <button onClick={exportPredictiveCSV} className="btn btn-primary btn-sm">
              <Download size={15} /> Export Forecast CSV
            </button>
          )}
        </div>
      </div>

      {/* Report Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {currentRole === 'Admin' && (
          <button
            onClick={() => setActiveReport('valuation')}
            className={`btn ${activeReport === 'valuation' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          >
            <DollarSign size={15} /> Inventory Valuation (Executive)
          </button>
        )}
        <button
          onClick={() => setActiveReport('low_stock')}
          className={`btn ${activeReport === 'low_stock' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <AlertTriangle size={15} /> Low Stock & Reorder Plan
        </button>
        <button
          onClick={() => setActiveReport('predictive')}
          className={`btn ${activeReport === 'predictive' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <Sparkles size={15} /> Predictive Restocking Engine
        </button>
        {currentRole === 'Admin' && (
          <button
            onClick={() => setActiveReport('audit')}
            className={`btn ${activeReport === 'audit' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          >
            <ShieldCheck size={15} /> System Audit Logs
          </button>
        )}
      </div>

      {/* 1. Valuation Report View */}
      {activeReport === 'valuation' && (
        <div>
          {valuationData?.summary && (
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-header">
                  <span>TOTAL INVENTORY VALUE</span>
                  <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                    <DollarSign size={18} />
                  </div>
                </div>
                <div className="stat-value" style={{ color: '#059669' }}>
                  ${Number(valuationData.summary.total_valuation).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="stat-caption">Across {valuationData.summary.total_skus} cataloged SKUs</div>
              </div>
            </div>
          )}

          {/* Category Summary Cards */}
          {valuationData?.summary?.category_breakdown && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Valuation by Category</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {valuationData.summary.category_breakdown.map(cat => (
                  <div key={cat.category} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '1rem' }}>
                    <span className="badge badge-neutral">{cat.category}</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '0.5rem' }}>
                      ${Number(cat.category_valuation).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {cat.total_quantity.toLocaleString()} units ({cat.total_items} items)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Item Valuation Table */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">SKU Level Valuation Ledger</div>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                <RefreshCw size={20} className="status-dot pulse" /> Loading valuation data...
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>SKU</th>
                      <th>Category</th>
                      <th>Warehouse</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Total Valuation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {valuationData?.data?.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                        <td><code>{p.sku}</code></td>
                        <td><span className="badge badge-neutral">{p.category}</span></td>
                        <td>{p.warehouse_name || 'Central'}</td>
                        <td style={{ fontWeight: 600 }}>{p.quantity.toLocaleString()}</td>
                        <td>${Number(p.unit_price).toFixed(2)}</td>
                        <td style={{ fontWeight: 700, color: '#059669' }}>
                          ${Number(p.total_valuation).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Low Stock & Reorder Report View */}
      {activeReport === 'low_stock' && (
        <div>
          {lowStockData?.summary && (
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-header">
                  <span>ITEMS REQUIRING REORDER</span>
                  <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
                    <AlertTriangle size={18} />
                  </div>
                </div>
                <div className="stat-value" style={{ color: '#d97706' }}>
                  {lowStockData.summary.critical_items_count}
                </div>
                <div className="stat-caption">Products below safety min threshold</div>
              </div>

              <div className="stat-box">
                <div className="stat-header">
                  <span>ESTIMATED REORDER CAPITAL</span>
                  <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                    <DollarSign size={18} />
                  </div>
                </div>
                <div className="stat-value" style={{ color: '#2563eb' }}>
                  ${Number(lowStockData.summary.total_estimated_reorder_cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="stat-caption">Projected cost to restore 2x safety buffers</div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <div className="card-title">Reorder Priority Action Plan</div>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                <RefreshCw size={20} className="status-dot pulse" /> Loading reorder analysis...
              </div>
            ) : lowStockData?.data?.length === 0 ? (
              <div className="empty-state">
                <div style={{ color: '#059669', fontWeight: 600 }}>All items are currently above safety threshold.</div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product & SKU</th>
                      <th>Current Stock</th>
                      <th>Min Threshold</th>
                      <th>Suggested Order Qty</th>
                      <th>Unit Cost</th>
                      <th>Est. Reorder Cost</th>
                      <th>Facility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockData?.data?.map(item => (
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
                        <td style={{ color: '#64748b' }}>{item.min_threshold_stock} units</td>
                        <td style={{ fontWeight: 700, color: '#2563eb' }}>
                          +{item.suggested_reorder_qty} units
                        </td>
                        <td>${Number(item.unit_price).toFixed(2)}</td>
                        <td style={{ fontWeight: 600, color: '#059669' }}>
                          ${Number(item.estimated_reorder_cost).toFixed(2)}
                        </td>
                        <td>{item.warehouse_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Predictive Restocking Engine (Bonus Feature) */}
      {activeReport === 'predictive' && (
        <div>
          <div style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.85rem',
            color: '#1e40af'
          }}>
            <Sparkles size={22} color="#2563eb" style={{ flexShrink: 0 }} />
            <div>
              <strong>Predictive Restocking Intelligence:</strong> Evaluates historical Stock OUT transaction velocity and consumption burn rates to forecast stockout runways (days remaining) and calculate optimized replenishment orders.
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Sparkles size={18} color="#2563eb" />
                <span>Demand Forecast & Stock Runway Projections</span>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                <RefreshCw size={20} className="status-dot pulse" /> Running predictive analytics algorithm...
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product & SKU</th>
                      <th>Current Stock</th>
                      <th>Burn Rate / Day</th>
                      <th>Runway Days Remaining</th>
                      <th>Urgency Status</th>
                      <th>Recommended Reorder</th>
                      <th>AI / Operational Advice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictiveData?.data?.map(p => (
                      <tr key={p.product_id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.sku} • {p.category}</span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{p.current_stock} units</td>
                        <td style={{ color: '#475569', fontSize: '0.85rem' }}>
                          ~{p.daily_burn_rate} units/day
                        </td>
                        <td>
                          <div style={{
                            fontWeight: 700,
                            color: p.estimated_days_remaining <= 5 ? '#dc2626' : p.estimated_days_remaining <= 12 ? '#d97706' : '#059669'
                          }}>
                            {p.estimated_days_remaining > 365 ? '> 1 Year' : `${p.estimated_days_remaining} Days`}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${
                            p.risk_level === 'DEPLETED' ? 'badge-out-of-stock' :
                            p.risk_level === 'URGENT' ? 'badge-low-stock' :
                            p.risk_level === 'MODERATE' ? 'badge-warning-border' :
                            'badge-in-stock'
                          }`}>
                            {p.risk_level}
                          </span>
                        </td>
                        <td>
                          {p.recommended_order_quantity > 0 ? (
                            <div>
                              <strong style={{ color: '#2563eb' }}>+{p.recommended_order_quantity} units</strong>
                              <div style={{ fontSize: '0.72rem', color: '#059669' }}>(${p.estimated_po_cost.toFixed(2)})</div>
                            </div>
                          ) : (
                            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Buffer Optimal</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#334155', maxWidth: '260px' }}>
                          {p.recommendation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. System Audit Logs View */}
      {activeReport === 'audit' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <ShieldCheck size={18} color="#2563eb" />
              <span>Immutable Inventory Audit Trail ({auditLogs.length} entries)</span>
            </div>
            <button onClick={fetchReportData} className="btn btn-secondary btn-sm">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              <RefreshCw size={20} className="status-dot pulse" /> Loading audit logs...
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="empty-state">No audit logs recorded yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Entity Type</th>
                    <th>Details</th>
                    <th>User Role</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontWeight: 600 }}>{log.action}</span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{log.entity_type} #{log.entity_id}</td>
                      <td style={{ fontSize: '0.82rem', color: '#1e293b' }}>{log.details}</td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>{log.user_role}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
