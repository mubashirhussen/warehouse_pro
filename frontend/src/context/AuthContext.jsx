import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext();

export const ROLES = [
  { id: 'Admin', label: 'Admin (Full Access & Global Analytics)', defaultUser: 'admin', name: 'Sarah Jenkins', email: 'admin@warehousepro.io' },
  { id: 'Warehouse Manager', label: 'Warehouse Manager (Facility & PO Operations)', defaultUser: 'manager', name: 'David Miller', email: 'manager@warehousepro.io' },
  { id: 'Staff', label: 'Staff (Floor Operations & Scanner)', defaultUser: 'staff', name: 'Alex Rodriguez', email: 'staff@warehousepro.io' }
];

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('warehouse_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [currentRole, setCurrentRole] = useState(() => {
    return currentUser?.role || localStorage.getItem('warehouse_role') || 'Admin';
  });

  const [liveSimulationActive, setLiveSimulationActive] = useState(false);
  const [simulationSpeed] = useState(7000); // 7s simulation cycle

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    if (res.user) {
      setCurrentUser(res.user);
      setCurrentRole(res.user.role);
      localStorage.setItem('warehouse_auth_user', JSON.stringify(res.user));
      localStorage.setItem('warehouse_role', res.user.role);
      localStorage.setItem('warehouse_username', res.user.username);
      window.dispatchEvent(new CustomEvent('warehouse-stock-update'));
    }
    return res;
  };

  const register = async (formData) => {
    const res = await api.post('/auth/register', formData);
    if (res.user) {
      setCurrentUser(res.user);
      setCurrentRole(res.user.role);
      localStorage.setItem('warehouse_auth_user', JSON.stringify(res.user));
      localStorage.setItem('warehouse_role', res.user.role);
      localStorage.setItem('warehouse_username', res.user.username);
      window.dispatchEvent(new CustomEvent('warehouse-stock-update'));
    }
    return res;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('warehouse_auth_user');
    localStorage.removeItem('warehouse_role');
    localStorage.removeItem('warehouse_username');
  };

  const switchRole = (newRole) => {
    const found = ROLES.find(r => r.id === newRole) || ROLES[0];
    const updatedUser = {
      id: currentUser ? currentUser.id : 1,
      username: found.defaultUser,
      email: found.email,
      full_name: found.name,
      role: found.id,
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(found.name)}&backgroundColor=2563eb`,
      auth_provider: currentUser?.auth_provider || 'local'
    };
    setCurrentUser(updatedUser);
    setCurrentRole(found.id);
    localStorage.setItem('warehouse_auth_user', JSON.stringify(updatedUser));
    localStorage.setItem('warehouse_role', found.id);
    localStorage.setItem('warehouse_username', found.defaultUser);

    // Notify all components that the active role and data scope has changed
    window.dispatchEvent(new CustomEvent('warehouse-stock-update'));
  };

  // Simulated live event engine
  useEffect(() => {
    if (!liveSimulationActive || !currentUser) return;

    const interval = setInterval(async () => {
      try {
        await api.post('/stock/simulate-live-event', {});
        window.dispatchEvent(new CustomEvent('warehouse-stock-update'));
      } catch (err) {
        console.warn('Simulation event failed:', err.message);
      }
    }, simulationSpeed);

    return () => clearInterval(interval);
  }, [liveSimulationActive, simulationSpeed, currentUser]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        login,
        register,
        logout,
        switchRole,
        liveSimulationActive,
        setLiveSimulationActive
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
