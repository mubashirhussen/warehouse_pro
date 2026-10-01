import React, { useState, useEffect } from 'react';
import { X, PackagePlus, Edit3, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';

export default function ProductFormModal({ isOpen, onClose, product = null, warehouses = [], onSuccess }) {
  const { addToast } = useToast();
  const isEditing = Boolean(product);

  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: 'Electronics',
    quantity: 0,
    min_threshold_stock: 10,
    unit_price: 0,
    warehouse_id: '',
    location_bin: 'A-01-01',
    barcode: '',
    description: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku || '',
        name: product.name || '',
        category: product.category || 'Electronics',
        quantity: product.quantity || 0,
        min_threshold_stock: product.min_threshold_stock || 10,
        unit_price: product.unit_price || 0,
        warehouse_id: product.warehouse_id || (warehouses[0] ? warehouses[0].id : ''),
        location_bin: product.location_bin || '',
        barcode: product.barcode || '',
        description: product.description || ''
      });
    } else {
      setFormData({
        sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        name: '',
        category: 'Electronics',
        quantity: 10,
        min_threshold_stock: 10,
        unit_price: 29.99,
        warehouse_id: warehouses[0] ? warehouses[0].id : 1,
        location_bin: 'A-01-01',
        barcode: '',
        description: ''
      });
    }
    setErrorMsg('');
  }, [product, warehouses, isOpen]);

  if (!isOpen) return null;

  const categories = ['Electronics', 'Hardware', 'Packaging', 'Apparel', 'Industrial', 'Raw Materials', 'Office Supplies'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.name.trim() || !formData.sku.trim() || !formData.warehouse_id) {
      setErrorMsg('Please provide product SKU, Name, and assigned Warehouse.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (isEditing) {
        await api.put(`/products/${product.id}`, formData);
        addToast(`Product ${formData.name} updated successfully`, 'success');
      } else {
        await api.post('/products', formData);
        addToast(`Product ${formData.name} added to inventory`, 'success');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Operation failed. Please review values.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content modal-lg">
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isEditing ? <Edit3 size={20} color="#2563eb" /> : <PackagePlus size={20} color="#2563eb" />}
            <span>{isEditing ? `Edit Product: ${product.name}` : 'Register New Inventory Item'}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} color="#64748b" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errorMsg && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                padding: '0.75rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#991b1b',
                fontSize: '0.85rem'
              }}>
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">SKU (Stock Keeping Unit) *</label>
                <input
                  type="text"
                  name="sku"
                  className="form-input"
                  value={formData.sku}
                  onChange={handleChange}
                  placeholder="e.g. SKU-ELEC-501"
                  required
                  disabled={isEditing}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category *</label>
                <select
                  name="category"
                  className="form-select"
                  value={formData.category}
                  onChange={handleChange}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input
                type="text"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Industrial Pressure Gauge 500 PSI"
                required
              />
            </div>

            <div className="form-row">
              {!isEditing && (
                <div className="form-group">
                  <label className="form-label">Initial Stock Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    min="0"
                    className="form-input"
                    value={formData.quantity}
                    onChange={handleChange}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Min Threshold Alert Level *</label>
                <input
                  type="number"
                  name="min_threshold_stock"
                  min="1"
                  className="form-input"
                  value={formData.min_threshold_stock}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Unit Price ($ USD) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="unit_price"
                  className="form-input"
                  value={formData.unit_price}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Warehouse Facility *</label>
                <select
                  name="warehouse_id"
                  className="form-select"
                  value={formData.warehouse_id}
                  onChange={handleChange}
                  required
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Location Bin / Shelf Tag</label>
                <input
                  type="text"
                  name="location_bin"
                  className="form-input"
                  value={formData.location_bin}
                  onChange={handleChange}
                  placeholder="e.g. A-02-14"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Barcode / UPC Identifier</label>
              <input
                type="text"
                name="barcode"
                className="form-input"
                value={formData.barcode}
                onChange={handleChange}
                placeholder="Auto-generated if empty (e.g. BAR-8912401)"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Item Specifications & Description</label>
              <textarea
                name="description"
                className="form-textarea"
                value={formData.description}
                onChange={handleChange}
                placeholder="Product technical specifications, storage guidelines..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
