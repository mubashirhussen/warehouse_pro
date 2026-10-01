import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import BarcodeModal from '../components/BarcodeModal';

export default function BarcodePage() {
  const [products, setProducts] = useState([]);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data || []);
    } catch (err) {
      console.error('Failed to fetch products for barcode scanner', err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="content-body">
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Barcode Scanning & Dispatch Terminal</h2>
        <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
          Simulated optical handheld scanner for ultra-fast intake, dispatch, and physical shelf label verification.
        </p>
      </div>

      <BarcodeModal products={products} onStockChanged={fetchProducts} />
    </div>
  );
}
