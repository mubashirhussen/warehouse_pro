import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  Edit2,
  Trash2,
  AlertTriangle,
  RefreshCw,
  ScanLine
} from 'lucide-react';
import ProductFormModal from '../components/ProductFormModal';
import StockActionModal from '../components/StockActionModal';

export default function Products() {
  const { currentRole } = useAuth();
  const { addToast } = useToast();

  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStockLevel, setSelectedStockLevel] = useState('ALL');
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');

  // Modals state
  const [formModal, setFormModal] = useState({ isOpen: false, product: null });
  const [stockModal, setStockModal] = useState({ isOpen: false, mode: 'IN', product: null });

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (selectedStockLevel !== 'ALL') params.append('stock_level', selectedStockLevel);
      if (selectedWarehouse !== 'ALL') params.append('warehouse_id', selectedWarehouse);

      const [prodRes, whRes] = await Promise.all([
        api.get(`/products?${params.toString()}`),
        api.get('/warehouses')
      ]);

      setProducts(prodRes.data || []);
      setCategories(prodRes.categories || []);
      setWarehouses(whRes.data || []);
    } catch (err) {
      addToast(`Failed to load products: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleUpdate = () => fetchData();
    window.addEventListener('warehouse-stock-update', handleUpdate);
    return () => window.removeEventListener('warehouse-stock-update', handleUpdate);
  }, [searchTerm, selectedCategory, selectedStockLevel, selectedWarehouse]);

  const handleDelete = async (product) => {
    if (product.quantity > 0) {
      addToast(`Cannot delete ${product.name} because it has ${product.quantity} units in stock. Adjust stock to 0 first.`, 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete product "${product.name}" (${product.sku})?`)) {
      return;
    }

    try {
      await api.delete(`/products/${product.id}`);
      addToast(`Product ${product.name} removed from inventory`, 'success');
      fetchData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const isStaff = currentRole === 'Staff';
  const isAdmin = currentRole === 'Admin';

  return (
    <div className="content-body">
      {/* Header & New Product CTA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Product & Inventory Master</h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Manage warehouse SKUs, monitor thresholds, and execute fast stock movements.
          </p>
        </div>

        {!isStaff && (
          <button
            onClick={() => setFormModal({ isOpen: true, product: null })}
            className="btn btn-primary"
          >
            <Plus size={16} /> Add New Product
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="form-input"
            placeholder="Search SKU, name, barcode, bin..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          {/* Category Filter */}
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Stock Level Filter */}
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={selectedStockLevel}
            onChange={(e) => setSelectedStockLevel(e.target.value)}
          >
            <option value="ALL">All Stock Levels</option>
            <option value="IN_STOCK">In Stock (Healthy)</option>
            <option value="LOW_STOCK">Low Stock (At/Below Threshold)</option>
            <option value="OUT_OF_STOCK">Out of Stock (0 units)</option>
          </select>

          {/* Warehouse Filter */}
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
          >
            <option value="ALL">All Warehouses</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
            ))}
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('ALL');
              setSelectedStockLevel('ALL');
              setSelectedWarehouse('ALL');
            }}
            className="btn btn-secondary btn-sm"
            title="Reset Filters"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Boxes size={18} color="#2563eb" />
            <span>Inventory Catalog ({products.length} Products)</span>
          </div>
          <button onClick={fetchData} className="btn btn-secondary btn-sm" title="Refresh Table">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <RefreshCw size={20} className="status-dot pulse" style={{ display: 'inline-block', marginBottom: '0.5rem' }} />
            <div>Fetching products from SQLite database...</div>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <Boxes size={40} className="empty-state-icon" />
            <div className="empty-state-title">No products match current criteria</div>
            <div className="empty-state-text">
              Try adjusting your search query or reset the filter settings above.
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th>Category</th>
                  <th>Warehouse / Bin</th>
                  <th>Available Stock</th>
                  <th>Min Limit</th>
                  {!isStaff && <th>Unit Price</th>}
                  {!isStaff && <th>Valuation</th>}
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '2px' }}>
                        <span>SKU: <strong>{p.sku}</strong></span>
                        <span>•</span>
                        <span>Barcode: <code>{p.barcode || 'N/A'}</code></span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{p.category}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{p.warehouse_name || 'Central'}</div>
                      <code style={{ fontSize: '0.72rem', backgroundColor: '#f1f5f9', padding: '1px 5px', borderRadius: '3px' }}>
                        Bin: {p.location_bin || 'Standard'}
                      </code>
                    </td>
                    <td>
                      <div>
                        <span className={`badge ${
                          p.quantity === 0 ? 'badge-out-of-stock' :
                          p.quantity <= p.min_threshold_stock ? 'badge-low-stock' :
                          'badge-in-stock'
                        }`}>
                          {p.quantity} units
                        </span>
                        {p.quantity <= p.min_threshold_stock && (
                          <div style={{ fontSize: '0.7rem', color: '#b45309', marginTop: '2px', fontWeight: 600 }}>
                            {p.quantity === 0 ? '⚠️ Out of Stock' : '⚠️ Low Stock'}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {p.min_threshold_stock} units
                    </td>
                    {!isStaff && (
                      <td style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                        ${Number(p.unit_price).toFixed(2)}
                      </td>
                    )}
                    {!isStaff && (
                      <td style={{ fontSize: '0.85rem', fontWeight: 600, color: '#059669' }}>
                        ${Number(p.total_valuation || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    )}
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        {/* Quick Stock IN */}
                        <button
                          onClick={() => setStockModal({ isOpen: true, mode: 'IN', product: p })}
                          className="btn btn-success btn-sm btn-icon-only"
                          title="Stock IN (Add Stock)"
                        >
                          <ArrowDownRight size={14} />
                        </button>

                        {/* Quick Stock OUT */}
                        <button
                          onClick={() => setStockModal({ isOpen: true, mode: 'OUT', product: p })}
                          className="btn btn-primary btn-sm btn-icon-only"
                          title="Stock OUT (Dispatch)"
                          disabled={p.quantity === 0}
                        >
                          <ArrowUpRight size={14} />
                        </button>

                        {/* Edit Product */}
                        {!isStaff && (
                          <button
                            onClick={() => setFormModal({ isOpen: true, product: p })}
                            className="btn btn-secondary btn-sm btn-icon-only"
                            title="Edit Product"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}

                        {/* Delete Product */}
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(p)}
                            className="btn btn-secondary btn-sm btn-icon-only"
                            style={{ color: '#dc2626' }}
                            title="Delete Product (Only if 0 stock)"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Add/Edit Modal */}
      <ProductFormModal
        isOpen={formModal.isOpen}
        product={formModal.product}
        warehouses={warehouses}
        onClose={() => setFormModal({ isOpen: false, product: null })}
        onSuccess={() => fetchData()}
      />

      {/* Stock IN / OUT Action Modal */}
      <StockActionModal
        isOpen={stockModal.isOpen}
        mode={stockModal.mode}
        product={stockModal.product}
        products={products}
        onClose={() => setStockModal({ isOpen: false, mode: 'IN', product: null })}
        onSuccess={() => fetchData()}
      />
    </div>
  );
}
