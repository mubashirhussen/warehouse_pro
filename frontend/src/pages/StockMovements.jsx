import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  ArrowLeftRight,
  ArrowDownRight,
  ArrowUpRight,
  ShieldAlert,
  Download,
  Filter,
  RefreshCw,
  Clock,
  Layers
} from 'lucide-react';
import StockActionModal from '../components/StockActionModal';

export default function StockMovements() {
  const { currentRole } = useAuth();
  const { addToast } = useToast();

  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedProductId, setSelectedProductId] = useState('');

  // Modals & Transfer State
  const [stockModal, setStockModal] = useState({ isOpen: false, mode: 'IN', product: null });
  const [transferState, setTransferState] = useState({
    isOpen: false,
    product_id: '',
    target_warehouse_id: '',
    target_bin: '',
    notes: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedType !== 'ALL') params.append('type', selectedType);
      if (selectedProductId) params.append('product_id', selectedProductId);
      params.append('limit', '100');

      const [movRes, prodRes, whRes] = await Promise.all([
        api.get(`/stock/movements?${params.toString()}`),
        api.get('/products'),
        api.get('/warehouses')
      ]);

      setMovements(movRes.data || []);
      setProducts(prodRes.data || []);
      setWarehouses(whRes.data || []);
    } catch (err) {
      addToast(`Failed to load movements: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleUpdate = () => fetchData();
    window.addEventListener('warehouse-stock-update', handleUpdate);
    return () => window.removeEventListener('warehouse-stock-update', handleUpdate);
  }, [selectedType, selectedProductId]);

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!transferState.product_id || !transferState.target_warehouse_id) {
      addToast('Please select both product and target warehouse', 'error');
      return;
    }

    try {
      await api.post('/stock/transfer', transferState);
      addToast('Stock transferred successfully', 'success');
      setTransferState({ isOpen: false, product_id: '', target_warehouse_id: '', target_bin: '', notes: '' });
      fetchData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const exportCSV = () => {
    if (movements.length === 0) {
      addToast('No movements available to export', 'error');
      return;
    }

    const headers = ['Timestamp', 'Type', 'Product Name', 'SKU', 'Quantity', 'Previous Stock', 'New Stock', 'Reference', 'User Role', 'Notes'];
    const rows = movements.map(m => [
      `"${m.created_at}"`,
      `"${m.type}"`,
      `"${m.product_name.replace(/"/g, '""')}"`,
      `"${m.product_sku}"`,
      m.quantity,
      m.previous_stock,
      m.new_stock,
      `"${m.reference || ''}"`,
      `"${m.user_role}"`,
      `"${(m.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `warehouse_stock_movements_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Stock movement audit CSV downloaded successfully', 'success');
  };

  return (
    <div className="content-body">
      {/* Header & Quick Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Stock Transactions & Movement History</h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Complete audit trail of all inbound, outbound, transfer, and adjustment transactions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setStockModal({ isOpen: true, mode: 'IN', product: null })}
            className="btn btn-success"
          >
            <ArrowDownRight size={16} /> New Stock IN
          </button>
          <button
            onClick={() => setStockModal({ isOpen: true, mode: 'OUT', product: null })}
            className="btn btn-primary"
          >
            <ArrowUpRight size={16} /> New Stock OUT
          </button>
          {currentRole !== 'Staff' && (
            <button
              onClick={() => setTransferState(prev => ({ ...prev, isOpen: true }))}
              className="btn btn-secondary"
            >
              <ArrowLeftRight size={16} /> Transfer Stock
            </button>
          )}
          <button onClick={exportCSV} className="btn btn-secondary" title="Export CSV Report">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Rules Notice / Zero Negative Safeguard Alert */}
      <div style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        padding: '0.85rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        fontSize: '0.82rem',
        color: '#334155'
      }}>
        <ShieldAlert size={20} color="#2563eb" style={{ flexShrink: 0 }} />
        <div>
          <strong>Integrity & Validation Rules Active:</strong> SQLite transactional guarantees prevent negative inventory levels (<code>quantity &gt;= 0</code> constraint). All Stock OUT deductions verify real-time available stock before database mutation.
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <label className="form-label" style={{ marginBottom: 0 }}>Filter Transaction Type:</label>
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="ALL">All Types (IN / OUT / TRANSFER / ADJUSTMENT)</option>
            <option value="IN">Stock IN (Inbound Intake)</option>
            <option value="OUT">Stock OUT (Outbound Dispatch)</option>
            <option value="TRANSFER">Transfer (Inter-facility / Bin)</option>
            <option value="ADJUSTMENT">Adjustment (Audit Correction)</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="form-label" style={{ marginBottom: 0 }}>Filter by Product:</label>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '220px' }}
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
          >
            <option value="">All Products</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setSelectedType('ALL');
              setSelectedProductId('');
            }}
            className="btn btn-secondary btn-sm"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Movements Table Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Clock size={18} color="#2563eb" />
            <span>Stock Ledger Audit Log ({movements.length} records)</span>
          </div>
          <button onClick={fetchData} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <RefreshCw size={20} className="status-dot pulse" style={{ display: 'inline-block', marginBottom: '0.5rem' }} />
            <div>Loading movement transactions...</div>
          </div>
        ) : movements.length === 0 ? (
          <div className="empty-state">
            <ArrowLeftRight size={40} className="empty-state-icon" />
            <div className="empty-state-title">No stock movements found</div>
            <div className="empty-state-text">
              Record a Stock IN or Stock OUT transaction using the buttons above.
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Type</th>
                  <th>Product & SKU</th>
                  <th>Quantity</th>
                  <th>Stock Change</th>
                  <th>Reference ID</th>
                  <th>Notes & Reason</th>
                  <th>Initiator</th>
                </tr>
              </thead>
              <tbody>
                {movements.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(m.created_at).toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge ${
                        m.type === 'IN' ? 'badge-movement-in' :
                        m.type === 'OUT' ? 'badge-movement-out' :
                        'badge-neutral'
                      }`}>
                        {m.type === 'IN' ? '↓ STOCK IN' : m.type === 'OUT' ? '↑ STOCK OUT' : m.type}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{m.product_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{m.product_sku}</div>
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '0.9rem', color: m.type === 'IN' ? '#059669' : '#2563eb' }}>
                      {m.type === 'IN' ? `+${m.quantity}` : `-${m.quantity}`} units
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>
                      <span style={{ color: '#64748b' }}>{m.previous_stock}</span>
                      <span style={{ margin: '0 4px', color: '#94a3b8' }}>➔</span>
                      <strong style={{ color: '#0f172a' }}>{m.new_stock} units</strong>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.78rem', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                        {m.reference || 'N/A'}
                      </code>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#475569', maxWidth: '240px' }}>
                      {m.notes || '-'}
                    </td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                        {m.user_role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock IN / Stock OUT Modal */}
      <StockActionModal
        isOpen={stockModal.isOpen}
        mode={stockModal.mode}
        product={stockModal.product}
        products={products}
        onClose={() => setStockModal({ isOpen: false, mode: 'IN', product: null })}
        onSuccess={() => fetchData()}
      />

      {/* Stock Transfer Modal */}
      {transferState.isOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowLeftRight size={20} color="#2563eb" />
                <span>Inter-Facility / Bin Stock Transfer</span>
              </div>
              <button
                onClick={() => setTransferState(prev => ({ ...prev, isOpen: false }))}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTransferSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Select Product to Transfer *</label>
                  <select
                    className="form-select"
                    value={transferState.product_id}
                    onChange={(e) => setTransferState(prev => ({ ...prev, product_id: e.target.value }))}
                    required
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — Currently in {p.warehouse_name} (Bin: {p.location_bin})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Destination Warehouse *</label>
                  <select
                    className="form-select"
                    value={transferState.target_warehouse_id}
                    onChange={(e) => setTransferState(prev => ({ ...prev, target_warehouse_id: e.target.value }))}
                    required
                  >
                    <option value="">-- Choose Target Facility --</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code}) — Capacity: {w.capacity} units
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">New Location Bin / Shelf Designation</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Zone B, Shelf 14, Rack 2"
                    value={transferState.target_bin}
                    onChange={(e) => setTransferState(prev => ({ ...prev, target_bin: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Transfer Notes & Dispatch Reference</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Reason for relocation or internal transfer authorization..."
                    value={transferState.notes}
                    onChange={(e) => setTransferState(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setTransferState(prev => ({ ...prev, isOpen: false }))}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Execute Relocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
