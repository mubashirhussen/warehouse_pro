import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Warehouse,
  Plus,
  MapPin,
  User,
  Phone,
  Boxes,
  Layers,
  Edit,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export default function Warehouses() {
  const { currentRole } = useAuth();
  const { addToast } = useToast();

  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);
  const [warehouseDetails, setWarehouseDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location: '',
    capacity: 10000,
    manager_name: '',
    contact_number: ''
  });

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/warehouses');
      setWarehouses(res.data || []);
      if (res.data && res.data.length > 0 && !selectedWarehouseId) {
        setSelectedWarehouseId(res.data[0].id);
      }
    } catch (err) {
      addToast(`Failed to load warehouses: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouseDetails = async (id) => {
    try {
      const res = await api.get(`/warehouses/${id}`);
      setWarehouseDetails(res.data);
    } catch (err) {
      addToast(`Failed to load warehouse inventory: ${err.message}`, 'error');
    }
  };

  useEffect(() => {
    fetchWarehouses();

    const handleUpdate = () => {
      fetchWarehouses();
      if (selectedWarehouseId) fetchWarehouseDetails(selectedWarehouseId);
    };

    window.addEventListener('warehouse-stock-update', handleUpdate);
    return () => window.removeEventListener('warehouse-stock-update', handleUpdate);
  }, []);

  useEffect(() => {
    if (selectedWarehouseId) {
      fetchWarehouseDetails(selectedWarehouseId);
    }
  }, [selectedWarehouseId]);

  const handleCreateWarehouse = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim() || !formData.location.trim()) {
      addToast('Name, Code, and Location are required', 'error');
      return;
    }

    try {
      await api.post('/warehouses', formData);
      addToast(`Warehouse facility ${formData.name} registered`, 'success');
      setModalOpen(false);
      setFormData({ name: '', code: '', location: '', capacity: 10000, manager_name: '', contact_number: '' });
      fetchWarehouses();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const isAdmin = currentRole === 'Admin';

  return (
    <div className="content-body">
      {/* Header & New Facility Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Warehouse Facilities & Location Tracking</h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Monitor regional storage capacities, bin allocations, and facility managers.
          </p>
        </div>

        {isAdmin && (
          <button onClick={() => setModalOpen(true)} className="btn btn-primary">
            <Plus size={16} /> Register New Warehouse
          </button>
        )}
      </div>

      {/* Warehouse Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {warehouses.map(w => {
          const isSelected = selectedWarehouseId === w.id;
          return (
            <div
              key={w.id}
              onClick={() => setSelectedWarehouseId(w.id)}
              className="card"
              style={{
                marginBottom: 0,
                cursor: 'pointer',
                border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                backgroundColor: isSelected ? '#eff6ff' : '#ffffff'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>{w.code}</span>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{w.name}</h3>
                </div>
                <span className="badge badge-in-stock">{w.status}</span>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapPin size={14} color="#64748b" />
                  <span>{w.location}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <User size={14} color="#64748b" />
                  <span>Manager: <strong>{w.manager_name || 'Assigned Lead'}</strong></span>
                </div>
              </div>

              {/* Utilization Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                  <span style={{ color: '#64748b' }}>Capacity Utilization</span>
                  <strong style={{ color: w.utilization_percentage > 85 ? '#dc2626' : '#0f172a' }}>
                    {w.current_stock_count.toLocaleString()} / {w.capacity.toLocaleString()} ({w.utilization_percentage}%)
                  </strong>
                </div>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${Math.min(100, w.utilization_percentage)}%`,
                      backgroundColor: w.utilization_percentage > 85 ? '#dc2626' : w.utilization_percentage > 65 ? '#f59e0b' : '#2563eb'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Warehouse Inventory Explorer */}
      {warehouseDetails && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Boxes size={18} color="#2563eb" />
              <span>Inventory Stored at {warehouseDetails.name} ({warehouseDetails.products ? warehouseDetails.products.length : 0} SKUs)</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Facility Code: <strong>{warehouseDetails.code}</strong> • Location: <strong>{warehouseDetails.location}</strong>
            </div>
          </div>

          {!warehouseDetails.products || warehouseDetails.products.length === 0 ? (
            <div className="empty-state">
              <Boxes size={36} className="empty-state-icon" />
              <div className="empty-state-title">No products stored in this facility</div>
              <div className="empty-state-text">Transfer or stock items to allocate inventory to this facility.</div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product Name & SKU</th>
                    <th>Category</th>
                    <th>Location Bin / Shelf</th>
                    <th>Current Quantity</th>
                    <th>Threshold Limit</th>
                    <th>Unit Price</th>
                    <th>Valuation</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouseDetails.products.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.sku}</span>
                      </td>
                      <td>
                        <span className="badge badge-neutral">{p.category}</span>
                      </td>
                      <td>
                        <code style={{ fontSize: '0.8rem', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                          {p.location_bin || 'Unassigned'}
                        </code>
                      </td>
                      <td>
                        <span className={`badge ${
                          p.quantity === 0 ? 'badge-out-of-stock' :
                          p.quantity <= p.min_threshold_stock ? 'badge-low-stock' :
                          'badge-in-stock'
                        }`}>
                          {p.quantity} units
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{p.min_threshold_stock} units</td>
                      <td style={{ fontSize: '0.85rem' }}>${Number(p.unit_price).toFixed(2)}</td>
                      <td style={{ fontWeight: 600, color: '#059669' }}>
                        ${Number(p.total_valuation || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Warehouse Modal */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Warehouse size={20} color="#2563eb" />
                <span>Register Warehouse Facility</span>
              </div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWarehouse}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Facility Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Northwest Fulfillment Hub"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Warehouse Code *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                      placeholder="e.g. WH-SEA-05"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Location / City & State *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g. Seattle, WA (Zone E)"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Max Storage Capacity (Units) *</label>
                    <input
                      type="number"
                      min="100"
                      className="form-input"
                      value={formData.capacity}
                      onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Facility Manager</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.manager_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, manager_name: e.target.value }))}
                      placeholder="Manager Name"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Contact Telephone</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.contact_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_number: e.target.value }))}
                      placeholder="+1 (555) 012-9988"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Facility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
