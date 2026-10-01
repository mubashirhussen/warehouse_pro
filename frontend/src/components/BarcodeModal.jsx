import React, { useState } from 'react';
import { ScanLine, Search, ArrowDownRight, ArrowUpRight, Printer, CheckCircle, Package } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';

export default function BarcodeModal({ products = [], onStockChanged }) {
  const { addToast } = useToast();
  const [scanInput, setScanInput] = useState('');
  const [matchedProduct, setMatchedProduct] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleScan = (codeToScan) => {
    const term = (codeToScan || scanInput).trim().toLowerCase();
    if (!term) return;

    const found = products.find(
      p => (p.barcode && p.barcode.toLowerCase() === term) ||
           (p.sku && p.sku.toLowerCase() === term) ||
           (p.name && p.name.toLowerCase().includes(term))
    );

    if (found) {
      setMatchedProduct(found);
      addToast(`Scanned: ${found.name} (${found.sku})`, 'info');
    } else {
      setMatchedProduct(null);
      addToast(`No product matched barcode "${term}"`, 'error');
    }
  };

  const handleQuickMovement = async (type, amount) => {
    if (!matchedProduct) return;
    try {
      setIsProcessing(true);
      const endpoint = type === 'IN' ? '/stock/in' : '/stock/out';
      const payload = {
        product_id: matchedProduct.id,
        quantity: amount,
        reference: `SCAN-TERMINAL-${type}`,
        notes: `Quick barcode terminal dispatch of ${amount} units`
      };

      const res = await api.post(endpoint, payload);
      addToast(res.message, 'success');

      // Update local state with latest stock count
      setMatchedProduct(prev => ({
        ...prev,
        quantity: res.data.new_stock
      }));

      if (onStockChanged) onStockChanged();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <ScanLine size={20} color="#2563eb" />
          <span>Barcode Scanner & Quick Warehouse Terminal</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Scanner Terminal Input */}
        <div>
          <div style={{
            backgroundColor: '#0f172a',
            borderRadius: '8px',
            padding: '1.5rem',
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
            marginBottom: '1rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
              borderBottom: '1px solid #334155',
              paddingBottom: '0.5rem'
            }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Handheld Optical Terminal Sim
              </span>
              <span className="badge badge-in-stock" style={{ fontSize: '0.7rem' }}>READY FOR SCAN</span>
            </div>

            {/* Visual scan target line */}
            <div style={{
              height: '80px',
              border: '2px dashed #475569',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              marginBottom: '1rem',
              backgroundColor: '#1e293b'
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '10%',
                right: '10%',
                height: '2px',
                backgroundColor: '#ef4444',
                boxShadow: '0 0 8px #ef4444'
              }}></div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', zIndex: 2 }}>Scan Barcode / SKU</span>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleScan(); }} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-input"
                style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                placeholder="Scan or enter barcode/SKU..."
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>
                <Search size={16} /> Scan
              </button>
            </form>
          </div>

          {/* Quick preset badges for test demonstration */}
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
              Click Sample Barcodes to Test Scanner:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
              {products.slice(0, 5).map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setScanInput(p.barcode || p.sku);
                    handleScan(p.barcode || p.sku);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                >
                  {p.barcode || p.sku} ({p.name.slice(0, 15)}...)
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scanned Item Results & Quick Actions */}
        <div>
          {matchedProduct ? (
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.25rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <span className="badge badge-neutral" style={{ marginBottom: '0.25rem' }}>{matchedProduct.category}</span>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{matchedProduct.name}</h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>SKU: <strong>{matchedProduct.sku}</strong> | Barcode: <code>{matchedProduct.barcode}</code></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: matchedProduct.quantity <= matchedProduct.min_threshold_stock ? '#b45309' : '#059669' }}>
                    {matchedProduct.quantity} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#64748b' }}>units in stock</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Min Threshold: {matchedProduct.min_threshold_stock}</div>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                backgroundColor: '#f8fafc',
                padding: '0.75rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                marginBottom: '1.25rem'
              }}>
                <div><strong>Location Bin:</strong> {matchedProduct.location_bin || 'Unassigned'}</div>
                <div><strong>Warehouse:</strong> {matchedProduct.warehouse_name || 'Central Depot'}</div>
                <div><strong>Unit Price:</strong> ${Number(matchedProduct.unit_price).toFixed(2)}</div>
                <div><strong>Total Value:</strong> ${(matchedProduct.quantity * matchedProduct.unit_price).toFixed(2)}</div>
              </div>

              {/* Quick 1-Click Operations */}
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>
                  Quick 1-Click Scanner Operations:
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleQuickMovement('IN', 1)}
                    disabled={isProcessing}
                    className="btn btn-success btn-sm"
                  >
                    <ArrowDownRight size={14} /> +1 Stock IN
                  </button>
                  <button
                    onClick={() => handleQuickMovement('IN', 5)}
                    disabled={isProcessing}
                    className="btn btn-success btn-sm"
                  >
                    <ArrowDownRight size={14} /> +5 Stock IN
                  </button>
                  <button
                    onClick={() => handleQuickMovement('OUT', 1)}
                    disabled={isProcessing || matchedProduct.quantity < 1}
                    className="btn btn-primary btn-sm"
                  >
                    <ArrowUpRight size={14} /> -1 Stock OUT
                  </button>
                  <button
                    onClick={() => handleQuickMovement('OUT', 5)}
                    disabled={isProcessing || matchedProduct.quantity < 5}
                    className="btn btn-primary btn-sm"
                  >
                    <ArrowUpRight size={14} /> -5 Stock OUT
                  </button>
                </div>
              </div>

              {/* Shelf Tag Barcode Visualizer */}
              <div style={{
                marginTop: '1.25rem',
                border: '1px solid #cbd5e1',
                padding: '0.75rem',
                borderRadius: '6px',
                textAlign: 'center',
                backgroundColor: '#fff'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  SHELF INVENTORY TAG
                </div>
                <div style={{
                  fontFamily: 'monospace',
                  letterSpacing: '5px',
                  fontSize: '1.2rem',
                  fontWeight: 900,
                  backgroundColor: '#f1f5f9',
                  padding: '6px',
                  display: 'inline-block',
                  borderRadius: '4px'
                }}>
                  ||| | |||| || ||| | |||
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  {matchedProduct.barcode} • {matchedProduct.sku}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '2rem', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
              <Package size={36} className="empty-state-icon" />
              <div className="empty-state-title">No Product Scanned Yet</div>
              <div className="empty-state-text">
                Point handheld scanner, enter an SKU or click any of the sample barcodes on the left to inspect stock details.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
