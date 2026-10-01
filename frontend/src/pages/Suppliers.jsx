import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Truck,
  Plus,
  FileCheck2,
  PackageCheck,
  Ban,
  Building,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  PlusCircle,
  Trash2,
  RefreshCw,
  Clock
} from 'lucide-react';

export default function Suppliers() {
  const { currentRole } = useAuth();
  const { addToast } = useToast();

  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active View Tab: 'orders' or 'directory'
  const [subTab, setSubTab] = useState('orders');

  // Modals
  const [createPoModal, setCreatePoModal] = useState(false);
  const [createSupplierModal, setCreateSupplierModal] = useState(false);

  // New Supplier Form
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    category: 'Electronics'
  });

  // New PO Form
  const [poForm, setPoForm] = useState({
    supplier_id: '',
    expected_date: '',
    notes: '',
    items: [{ product_id: '', name: '', quantity: 10, unit_price: 25 }]
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [supRes, ordRes, prodRes] = await Promise.all([
        api.get('/suppliers'),
        api.get('/orders'),
        api.get('/products')
      ]);

      setSuppliers(supRes.data || []);
      setOrders(ordRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      addToast(`Failed to load data: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleUpdate = () => fetchData();
    window.addEventListener('warehouse-stock-update', handleUpdate);
    return () => window.removeEventListener('warehouse-stock-update', handleUpdate);
  }, []);

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) {
      addToast('Supplier company name is required', 'error');
      return;
    }

    try {
      await api.post('/suppliers', supplierForm);
      addToast(`Supplier ${supplierForm.name} registered successfully`, 'success');
      setCreateSupplierModal(false);
      setSupplierForm({ name: '', contact_name: '', email: '', phone: '', address: '', category: 'Electronics' });
      fetchData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleAddItemToPo = () => {
    setPoForm(prev => ({
      ...prev,
      items: [...prev.items, { product_id: '', name: '', quantity: 10, unit_price: 20 }]
    }));
  };

  const handleRemoveItemFromPo = (index) => {
    setPoForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handlePoItemChange = (index, field, value) => {
    setPoForm(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };

      if (field === 'product_id') {
        const matched = products.find(p => String(p.id) === String(value));
        if (matched) {
          newItems[index].name = matched.name;
          newItems[index].unit_price = matched.unit_price;
        }
      }
      return { ...prev, items: newItems };
    });
  };

  const handleCreatePo = async (e) => {
    e.preventDefault();
    if (!poForm.supplier_id) {
      addToast('Please select a supplier for the Purchase Order', 'error');
      return;
    }

    try {
      await api.post('/orders', poForm);
      addToast('Purchase Order generated successfully', 'success');
      setCreatePoModal(false);
      setPoForm({
        supplier_id: '',
        expected_date: '',
        notes: '',
        items: [{ product_id: '', name: '', quantity: 10, unit_price: 25 }]
      });
      fetchData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleReceiveOrder = async (order) => {
    if (!window.confirm(`Confirm receipt for Purchase Order ${order.po_number}? This will automatically increase inventory stock in SQLite.`)) {
      return;
    }

    try {
      const res = await api.post(`/orders/${order.id}/receive`, {});
      addToast(res.message, 'success');
      fetchData();
      window.dispatchEvent(new CustomEvent('warehouse-stock-update'));
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleCancelOrder = async (order) => {
    if (!window.confirm(`Are you sure you want to cancel ${order.po_number}?`)) return;

    try {
      await api.put(`/orders/${order.id}/cancel`, {});
      addToast(`Purchase Order ${order.po_number} cancelled`, 'info');
      fetchData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const poTotalCalculated = poForm.items.reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
  }, 0);

  const isStaff = currentRole === 'Staff';

  return (
    <div className="content-body">
      {/* Header & Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Suppliers & Purchase Orders</h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Manage approved vendor accounts and process inventory replenishment orders.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {!isStaff && (
            <>
              {currentRole === 'Admin' && (
                <button onClick={() => setCreateSupplierModal(true)} className="btn btn-secondary">
                  <Building size={16} /> Add Supplier
                </button>
              )}
              <button
                onClick={() => {
                  setPoForm({
                    supplier_id: suppliers[0] ? suppliers[0].id : '',
                    expected_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                    notes: '',
                    items: [{ product_id: products[0] ? products[0].id : '', name: products[0] ? products[0].name : '', quantity: 20, unit_price: products[0] ? products[0].unit_price : 30 }]
                  });
                  setCreatePoModal(true);
                }}
                className="btn btn-primary"
              >
                <Plus size={16} /> Create Purchase Order
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          onClick={() => setSubTab('orders')}
          className={`btn ${subTab === 'orders' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <FileCheck2 size={15} /> Purchase Orders ({orders.length})
        </button>
        <button
          onClick={() => setSubTab('directory')}
          className={`btn ${subTab === 'directory' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <Building size={15} /> Approved Suppliers ({suppliers.length})
        </button>
      </div>

      {subTab === 'orders' ? (
        /* Purchase Orders View */
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <FileCheck2 size={18} color="#2563eb" />
              <span>Purchase Orders Ledger</span>
            </div>
            <button onClick={fetchData} className="btn btn-secondary btn-sm">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              <RefreshCw size={20} className="status-dot pulse" style={{ display: 'inline-block', marginBottom: '0.5rem' }} />
              <div>Loading purchase orders...</div>
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <FileCheck2 size={40} className="empty-state-icon" />
              <div className="empty-state-title">No purchase orders found</div>
              <div className="empty-state-text">Create a new purchase order to replenish low stock.</div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PO Number</th>
                    <th>Supplier</th>
                    <th>Order Date</th>
                    <th>Status</th>
                    <th>Items Ordered</th>
                    <th>Total Value</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{order.po_number}</div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Ref: #{order.id}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{order.supplier_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{order.supplier_email || order.supplier_phone}</div>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#475569' }}>
                        <div>Ordered: {order.order_date}</div>
                        {order.expected_date && (
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Due: {order.expected_date}</div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${
                          order.status === 'RECEIVED' ? 'badge-in-stock' :
                          order.status === 'PENDING' ? 'badge-low-stock' :
                          'badge-out-of-stock'
                        }`}>
                          {order.status === 'RECEIVED' ? '✓ RECEIVED' : order.status === 'PENDING' ? '⏳ PENDING' : '✗ CANCELLED'}
                        </span>
                        {order.received_at && (
                          <div style={{ fontSize: '0.7rem', color: '#059669', marginTop: '2px' }}>
                            Auto-stocked on {new Date(order.received_at).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.82rem' }}>
                          {order.items && order.items.map((it, idx) => (
                            <div key={idx} style={{ color: '#334155' }}>
                              • <strong>{it.quantity}x</strong> {it.name}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: '#059669', fontSize: '0.9rem' }}>
                        ${Number(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td>
                        {order.status === 'PENDING' && (
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              onClick={() => handleReceiveOrder(order)}
                              className="btn btn-success btn-sm"
                              title="Receive Order and Auto-Update Stock"
                            >
                              <PackageCheck size={14} /> Receive & Auto-Stock
                            </button>
                            {!isStaff && (
                              <button
                                onClick={() => handleCancelOrder(order)}
                                className="btn btn-secondary btn-sm"
                                title="Cancel PO"
                                style={{ color: '#dc2626' }}
                              >
                                <Ban size={14} />
                              </button>
                            )}
                          </div>
                        )}
                        {order.status === 'RECEIVED' && (
                          <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>Completed</span>
                        )}
                        {order.status === 'CANCELLED' && (
                          <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>Cancelled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Supplier Directory View */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {suppliers.map(s => (
            <div key={s.id} className="card" style={{ marginBottom: 0 }}>
              <div className="card-header">
                <div>
                  <span className="badge badge-neutral" style={{ marginBottom: '4px' }}>{s.category}</span>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>{s.name}</h3>
                </div>
                <span className="badge badge-in-stock">{s.status}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building size={16} color="#64748b" />
                  <span>Contact: <strong>{s.contact_name || 'Primary Representative'}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail size={16} color="#64748b" />
                  <span>{s.email || 'orders@supplier.com'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Phone size={16} color="#64748b" />
                  <span>{s.phone || '+1 (800) 555-0100'}</span>
                </div>
              </div>

              <div style={{
                marginTop: '1rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.8rem'
              }}>
                <span style={{ color: '#64748b' }}>Lifetime POs: <strong>{s.total_orders || 0}</strong></span>
                <span style={{ color: s.pending_orders > 0 ? '#b45309' : '#64748b' }}>
                  Active Pending: <strong>{s.pending_orders || 0}</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Purchase Order Modal */}
      {createPoModal && (
        <div className="modal-backdrop">
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileCheck2 size={20} color="#2563eb" />
                <span>Generate Supplier Purchase Order</span>
              </div>
              <button onClick={() => setCreatePoModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePo}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Select Supplier *</label>
                    <select
                      className="form-select"
                      value={poForm.supplier_id}
                      onChange={(e) => setPoForm(prev => ({ ...prev, supplier_id: e.target.value }))}
                      required
                    >
                      <option value="">-- Choose Supplier --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Expected Delivery Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={poForm.expected_date}
                      onChange={(e) => setPoForm(prev => ({ ...prev, expected_date: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Line Items Builder */}
                <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className="form-label" style={{ marginBottom: 0, fontWeight: 700 }}>
                      Order Line Items ({poForm.items.length})
                    </label>
                    <button
                      type="button"
                      onClick={handleAddItemToPo}
                      className="btn btn-secondary btn-sm"
                    >
                      <PlusCircle size={14} /> Add Line Item
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {poForm.items.map((item, idx) => (
                      <div key={idx} style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr auto',
                        gap: '0.5rem',
                        alignItems: 'center',
                        backgroundColor: '#f8fafc',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div>
                          <label style={{ fontSize: '0.72rem', color: '#64748b' }}>Item Product</label>
                          <select
                            className="form-select"
                            value={item.product_id}
                            onChange={(e) => handlePoItemChange(idx, 'product_id', e.target.value)}
                            required
                          >
                            <option value="">-- Select Product --</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.72rem', color: '#64748b' }}>Quantity</label>
                          <input
                            type="number"
                            min="1"
                            className="form-input"
                            value={item.quantity}
                            onChange={(e) => handlePoItemChange(idx, 'quantity', e.target.value)}
                            required
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.72rem', color: '#64748b' }}>Unit Cost ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="form-input"
                            value={item.unit_price}
                            onChange={(e) => handlePoItemChange(idx, 'unit_price', e.target.value)}
                            required
                          />
                        </div>

                        {poForm.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemFromPo(idx)}
                            className="btn btn-secondary btn-sm btn-icon-only"
                            style={{ color: '#dc2626', marginTop: '16px' }}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Calculated PO Total */}
                  <div style={{
                    marginTop: '1rem',
                    textAlign: 'right',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#0f172a'
                  }}>
                    Estimated Order Total: <span style={{ color: '#059669' }}>${poTotalCalculated.toFixed(2)}</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Order Instructions / Notes</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Delivery instructions, freight carrier, PO terms..."
                    value={poForm.notes}
                    onChange={(e) => setPoForm(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setCreatePoModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Supplier Modal */}
      {createSupplierModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building size={20} color="#2563eb" />
                <span>Register New Supplier</span>
              </div>
              <button onClick={() => setCreateSupplierModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSupplier}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Supplier Company Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Apex Industrial Solutions"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Contact Person</label>
                    <input
                      type="text"
                      className="form-input"
                      value={supplierForm.contact_name}
                      onChange={(e) => setSupplierForm(prev => ({ ...prev, contact_name: e.target.value }))}
                      placeholder="e.g. Marcus Vance"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={supplierForm.category}
                      onChange={(e) => setSupplierForm(prev => ({ ...prev, category: e.target.value }))}
                    >
                      <option value="Electronics">Electronics</option>
                      <option value="Hardware">Hardware</option>
                      <option value="Packaging">Packaging</option>
                      <option value="Apparel">Apparel</option>
                      <option value="Industrial">Industrial</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-input"
                      value={supplierForm.email}
                      onChange={(e) => setSupplierForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="orders@supplier.com"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      type="text"
                      className="form-input"
                      value={supplierForm.phone}
                      onChange={(e) => setSupplierForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 019-2831"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Facility Address</label>
                  <input
                    type="text"
                    className="form-input"
                    value={supplierForm.address}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="City, State / Region"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setCreateSupplierModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Register Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
