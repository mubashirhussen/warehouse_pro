import React, { useState, useEffect } from 'react';
import { X, ArrowDownRight, ArrowUpRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';

export default function StockActionModal({ isOpen, onClose, mode = 'IN', product = null, products = [], onSuccess }) {
  const { addToast } = useToast();
  const [selectedProductId, setSelectedProductId] = useState(product ? product.id : '');
  const [quantity, setQuantity] = useState(1);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (product) {
      setSelectedProductId(product.id);
    } else if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
    setQuantity(1);
    setReference(mode === 'IN' ? 'PO-RECV-BATCH' : 'DISPATCH-REQ');
    setNotes('');
    setErrorMsg('');
  }, [product, products, mode, isOpen]);

  if (!isOpen) return null;

  const activeProduct = products.find(p => String(p.id) === String(selectedProductId)) || product;
  const currentStock = activeProduct ? activeProduct.quantity : 0;
  const isStockOut = mode === 'OUT';
  const wouldBeNegative = isStockOut && currentStock < Number(quantity);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const qty = parseInt(quantity, 10);
    if (!selectedProductId || isNaN(qty) || qty <= 0) {
      setErrorMsg('Please select a valid product and enter a positive quantity.');
      return;
    }

    if (isStockOut && qty > currentStock) {
      setErrorMsg(`Cannot remove ${qty} units. Only ${currentStock} units available in stock. Negative stock levels are strictly prevented.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const endpoint = isStockOut ? '/stock/out' : '/stock/in';
      const payload = {
        product_id: parseInt(selectedProductId, 10),
        quantity: qty,
        reference: reference.trim() || (isStockOut ? 'MANUAL_OUT' : 'MANUAL_IN'),
        notes: notes.trim()
      };

      const res = await api.post(endpoint, payload);
      addToast(res.message || `Successfully processed Stock ${mode}`, 'success');
      if (onSuccess) onSuccess(res.data);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Transaction failed. Please check inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isStockOut ? (
              <>
                <ArrowUpRight color="#2563eb" size={22} />
                <span>Record Stock OUT (Dispatch / Issue)</span>
              </>
            ) : (
              <>
                <ArrowDownRight color="#059669" size={22} />
                <span>Record Stock IN (Intake / Receiving)</span>
              </>
            )}
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
                alignItems: 'flex-start',
                gap: '0.5rem',
                color: '#991b1b',
                fontSize: '0.85rem'
              }}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Product selection */}
            <div className="form-group">
              <label className="form-label">Select Inventory Product</label>
              <select
                className="form-select"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                disabled={Boolean(product)}
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — Available Stock: {p.quantity} units
                  </option>
                ))}
              </select>
            </div>

            {/* Live Product Status Preview */}
            {activeProduct && (
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                fontSize: '0.83rem',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem'
              }}>
                <div>
                  <span style={{ color: '#64748b' }}>Current Stock: </span>
                  <strong style={{ color: currentStock <= activeProduct.min_threshold_stock ? '#b45309' : '#0f172a' }}>
                    {currentStock} units
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Min Threshold: </span>
                  <strong>{activeProduct.min_threshold_stock} units</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Warehouse: </span>
                  <span>{activeProduct.warehouse_name || 'Central Facility'}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Location Bin: </span>
                  <code>{activeProduct.location_bin || 'Standard'}</code>
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="form-group">
              <label className="form-label">
                Transaction Quantity <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                min="1"
                max={isStockOut ? currentStock : 99999}
                className="form-input"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
              {isStockOut && (
                <small style={{ color: wouldBeNegative ? '#ef4444' : '#64748b', marginTop: '4px' }}>
                  {wouldBeNegative
                    ? `⚠️ Error: Value exceeds current available stock (${currentStock})`
                    : `Remaining balance after transaction: ${Math.max(0, currentStock - Number(quantity))} units`}
                </small>
              )}
            </div>

            {/* Reference */}
            <div className="form-group">
              <label className="form-label">Reference ID / Document #</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. PO-2026-004, ORD-8819, INVOICE-442"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">Transaction Notes</label>
              <textarea
                className="form-textarea"
                placeholder="Reason or destination details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className={`btn ${isStockOut ? 'btn-primary' : 'btn-success'}`}
              disabled={isSubmitting || wouldBeNegative}
            >
              {isSubmitting ? 'Processing...' : isStockOut ? 'Confirm Stock OUT' : 'Confirm Stock IN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
