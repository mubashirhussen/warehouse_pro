import React, { useState } from 'react';
import { useAuth, ROLES } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import {
  Activity,
  RotateCcw,
  Shield,
  LogOut,
  User,
  CheckCircle2
} from 'lucide-react';

export default function Navbar({ activeTabTitle }) {
  const { currentUser, currentRole, switchRole, logout, liveSimulationActive, setLiveSimulationActive } = useAuth();
  const { addToast } = useToast();
  const [isReseeding, setIsReseeding] = useState(false);

  const handleReseed = async () => {
    if (!window.confirm('Reset and reseed database with fresh demonstration dataset?')) return;
    try {
      setIsReseeding(true);
      await api.post('/system/reseed', {});
      addToast('Database successfully reseeded with clean baseline dataset.', 'success');
      window.dispatchEvent(new CustomEvent('warehouse-stock-update'));
    } catch (err) {
      addToast(`Reseed failed: ${err.message}`, 'error');
    } finally {
      setIsReseeding(false);
    }
  };

  const toggleSimulation = () => {
    const nextState = !liveSimulationActive;
    setLiveSimulationActive(nextState);
    if (nextState) {
      addToast('Live IoT & Stock tracking simulation active (automated updates every 7s)', 'info');
    } else {
      addToast('Live stock simulation paused', 'info');
    }
  };

  const handleLogout = () => {
    logout();
    addToast('Signed out successfully.', 'info');
  };

  const isGoogleUser = currentUser?.auth_provider === 'google';

  return (
    <header className="top-header">
      <div className="header-left">
        <h1 className="page-title-badge">{activeTabTitle}</h1>
      </div>

      <div className="header-right">
        {/* Real-time simulation toggle */}
        <button
          onClick={toggleSimulation}
          className={`btn btn-sm ${liveSimulationActive ? 'btn-success' : 'btn-secondary'}`}
          title="Simulate live automated warehouse scanning and stock movement"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Activity size={15} className={liveSimulationActive ? 'status-dot pulse' : ''} />
          <span>{liveSimulationActive ? 'Live Sync Active' : 'Simulate Live Stream'}</span>
        </button>

        {/* Reseed button (Only for Admin) */}
        {currentRole === 'Admin' && (
          <button
            onClick={handleReseed}
            disabled={isReseeding}
            className="btn btn-secondary btn-sm"
            title="Reset database to baseline real-world master dataset"
          >
            <RotateCcw size={14} />
            <span>{isReseeding ? 'Resetting...' : 'Initialize Master Data'}</span>
          </button>
        )}

        {/* Dynamic Role Selector */}
        <div className="role-badge-container">
          <Shield size={16} color={currentRole === 'Admin' ? '#2563eb' : currentRole === 'Warehouse Manager' ? '#d97706' : '#059669'} />
          <div>
            <div className="role-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Role:</span>
              <strong style={{ color: '#0f172a' }}>{currentRole}</strong>
            </div>
            <select
              className="role-select"
              value={currentRole}
              onChange={(e) => {
                switchRole(e.target.value);
                addToast(`Switched active view to ${e.target.value}. Data and permissions updated accordingly.`, 'info');
              }}
            >
              {ROLES.map(role => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* User Profile & Logout Button */}
        {currentUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#f1f5f9',
              padding: '0.25rem 0.65rem',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              fontSize: '0.82rem'
            }}>
              {currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.full_name}
                  style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <User size={14} color="#475569" />
              )}
              <div style={{ lineHeight: '1.2' }}>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>
                  {currentUser.full_name || currentUser.username}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  {currentUser.email || `${currentUser.username}@warehousepro.io`}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="btn btn-secondary btn-sm"
              title="Sign Out"
              style={{ color: '#dc2626' }}
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
