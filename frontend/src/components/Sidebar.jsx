import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  Truck,
  Warehouse,
  FileBarChart2,
  ScanLine,
  Shield,
  CheckCircle2,
  Lock
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { currentRole, currentUser } = useAuth();

  // Role-specific navigation items and sections
  let menuItems = [];
  let sections = [];

  if (currentRole === 'Staff') {
    menuItems = [
      { id: 'dashboard', label: 'Floor Dashboard', icon: LayoutDashboard, section: 'Floor Workspace' },
      { id: 'barcode', label: 'Barcode Terminal', icon: ScanLine, section: 'Floor Workspace' },
      { id: 'movements', label: 'Intake & Dispatch', icon: ArrowLeftRight, section: 'Stock Actions' },
      { id: 'products', label: 'Stock Lookup', icon: Boxes, section: 'Stock Actions' }
    ];
    sections = ['Floor Workspace', 'Stock Actions'];
  } else if (currentRole === 'Warehouse Manager') {
    menuItems = [
      { id: 'dashboard', label: 'Manager Dashboard', icon: LayoutDashboard, section: 'Overview' },
      { id: 'products', label: 'Product Inventory', icon: Boxes, section: 'Inventory' },
      { id: 'movements', label: 'Stock Movements', icon: ArrowLeftRight, section: 'Inventory' },
      { id: 'barcode', label: 'Barcode Scanner', icon: ScanLine, section: 'Inventory' },
      { id: 'suppliers', label: 'Suppliers & POs', icon: Truck, section: 'Procurement' },
      { id: 'warehouses', label: 'Facilities & Capacity', icon: Warehouse, section: 'Procurement' },
      { id: 'reports', label: 'Restock & Reorder', icon: FileBarChart2, section: 'Analytics' }
    ];
    sections = ['Overview', 'Inventory', 'Procurement', 'Analytics'];
  } else {
    // Admin (Full System Access)
    menuItems = [
      { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard, section: 'Overview' },
      { id: 'products', label: 'Products & Master SKUs', icon: Boxes, section: 'Master Data' },
      { id: 'movements', label: 'Ledger & Transfers', icon: ArrowLeftRight, section: 'Master Data' },
      { id: 'barcode', label: 'Barcode Terminal', icon: ScanLine, section: 'Master Data' },
      { id: 'suppliers', label: 'Vendors & PO System', icon: Truck, section: 'Operations' },
      { id: 'warehouses', label: 'Warehouse Facilities', icon: Warehouse, section: 'Operations' },
      { id: 'reports', label: 'Valuation & Audit Logs', icon: FileBarChart2, section: 'Executive Analytics' }
    ];
    sections = ['Overview', 'Master Data', 'Operations', 'Executive Analytics'];
  }

  const roleColor = currentRole === 'Admin' ? '#2563eb' : currentRole === 'Warehouse Manager' ? '#d97706' : '#16a34a';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">W</div>
        <div>
          <span className="sidebar-brand-name">WarehousePro</span>
          <span className="sidebar-sub">Smart Inventory</span>
        </div>
      </div>

      {/* Role Badge Indicator */}
      <div style={{
        margin: '0 0.85rem 0.75rem',
        padding: '0.5rem 0.75rem',
        borderRadius: '6px',
        backgroundColor: currentRole === 'Admin' ? '#1e293b' : currentRole === 'Warehouse Manager' ? '#272015' : '#14291e',
        border: `1px solid ${roleColor}40`,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <Shield size={16} color={roleColor} />
        <div>
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
            Logged-In Persona
          </div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: roleColor }}>
            {currentRole}
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {sections.map(section => (
          <div key={section} style={{ marginBottom: '0.5rem' }}>
            <div className="nav-section-title">{section}</div>
            {menuItems
              .filter(item => item.section === section)
              .map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-btn-${item.id}`}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveTab(item.id)}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="system-status">
          <div className="status-dot pulse"></div>
          <div>
            <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.8rem' }}>Role Enforced</div>
            <div style={{ fontSize: '0.72rem' }}>{currentRole} Mode Active</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
