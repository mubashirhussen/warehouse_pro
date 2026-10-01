import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import StockMovements from './pages/StockMovements';
import Suppliers from './pages/Suppliers';
import Warehouses from './pages/Warehouses';
import Reports from './pages/Reports';
import BarcodePage from './pages/BarcodePage';

function MainAppLayout() {
  const { currentUser, currentRole } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!currentUser) {
    return <AuthPage />;
  }

  // Allowed tabs per role
  const roleAllowedTabs = {
    Admin: ['dashboard', 'products', 'movements', 'barcode', 'suppliers', 'warehouses', 'reports'],
    'Warehouse Manager': ['dashboard', 'products', 'movements', 'barcode', 'suppliers', 'warehouses', 'reports'],
    Staff: ['dashboard', 'barcode', 'movements', 'products']
  };

  const allowedTabs = roleAllowedTabs[currentRole] || roleAllowedTabs.Staff;
  const isTabAllowed = allowedTabs.includes(activeTab);

  const tabTitles = {
    dashboard: currentRole === 'Staff' ? 'Floor Operations Workspace' : currentRole === 'Warehouse Manager' ? 'Facility Manager Dashboard' : 'Executive Overview & Master Ledger',
    products: currentRole === 'Staff' ? 'Stock Catalog Lookup' : 'Inventory & Product Management',
    movements: currentRole === 'Staff' ? 'Floor Intake & Dispatch' : 'Stock Movements & Ledger',
    barcode: 'Barcode Terminal Scanner',
    suppliers: 'Suppliers & Purchase Orders',
    warehouses: 'Warehouse Facilities & Locations',
    reports: 'Reports & Predictive Analytics'
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-layout">
        <Navbar activeTabTitle={tabTitles[activeTab] || 'Dashboard'} />
        <main>
          {!isTabAllowed ? (
            <div className="content-body" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <div style={{
                maxWidth: '480px',
                margin: '0 auto',
                backgroundColor: '#fff',
                padding: '2rem',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔒</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                  Access Restricted
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
                  The <strong>{tabTitles[activeTab] || activeTab}</strong> module is restricted for the <strong>{currentRole}</strong> role. You only have access to designated floor operations.
                </p>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  Return to My Workspace
                </button>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
              {activeTab === 'products' && <Products />}
              {activeTab === 'movements' && <StockMovements />}
              {activeTab === 'barcode' && <BarcodePage />}
              {activeTab === 'suppliers' && <Suppliers />}
              {activeTab === 'warehouses' && <Warehouses />}
              {activeTab === 'reports' && <Reports />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainAppLayout />
      </ToastProvider>
    </AuthProvider>
  );
}
