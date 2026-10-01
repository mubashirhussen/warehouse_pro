import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  LogIn,
  UserPlus,
  Lock,
  User,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Mail
} from 'lucide-react';

export default function AuthPage() {
  const { login, register } = useAuth();
  const { addToast } = useToast();

  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Login form state
  const [loginData, setLoginData] = useState({
    username: 'admin',
    password: 'admin123'
  });

  // Signup form state
  const [signupData, setSignupData] = useState({
    full_name: '',
    username: '',
    email: '',
    role: 'Staff',
    password: '',
    confirm_password: ''
  });

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!loginData.username || !loginData.password) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    try {
      setLoading(true);
      const res = await login(loginData.username, loginData.password);
      addToast(res.message || 'Login successful!', 'success');
    } catch (err) {
      setErrorMsg(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!signupData.full_name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!signupData.username.trim()) {
      setErrorMsg('Please enter a username.');
      return;
    }
    if (!signupData.password || signupData.password.length < 4) {
      setErrorMsg('Password must be at least 4 characters long.');
      return;
    }
    if (signupData.password !== signupData.confirm_password) {
      setErrorMsg('Passwords do not match. Please re-enter confirm password.');
      return;
    }

    try {
      setLoading(true);
      const res = await register(signupData);
      addToast(`Account created! Welcome, ${res.user.full_name}`, 'success');
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const quickFillLogin = (user, pass) => {
    setLoginData({ username: user, password: pass });
    setErrorMsg('');
  };

  const isPasswordMismatch = mode === 'signup' && signupData.confirm_password && signupData.password !== signupData.confirm_password;

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        {/* Brand Header */}
        <div className="auth-header">
          <div className="auth-logo-icon">W</div>
          <h1 className="auth-title">WarehousePro</h1>
          <p className="auth-subtitle">Smart Inventory & Warehouse Management System</p>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setErrorMsg(''); }}
          >
            <LogIn size={16} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => { setMode('signup'); setErrorMsg(''); }}
          >
            <UserPlus size={16} />
            <span>Create Account</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="auth-error-alert">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {mode === 'login' ? (
          /* ================= LOGIN FORM ================= */
          <form onSubmit={handleLoginSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Username or Email</label>
              <div className="input-icon-wrapper">
                <User size={16} className="input-left-icon" />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.25rem' }}
                  placeholder="Enter username"
                  value={loginData.username}
                  onChange={(e) => setLoginData(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-icon-wrapper">
                <Lock size={16} className="input-left-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingLeft: '2.25rem', paddingRight: '2.25rem' }}
                  placeholder="Enter password"
                  value={loginData.password}
                  onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  className="input-right-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
              {loading ? (
                <span>Signing In...</span>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>Sign In to Dashboard</span>
                </>
              )}
            </button>

            {/* Fast Work Profile Access for the 3 roles */}
            <div className="demo-accounts-box">
              <div className="demo-accounts-title">Quick Role Access (Pre-Configured Accounts):</div>
              <div className="demo-accounts-grid">
                <button
                  type="button"
                  onClick={() => quickFillLogin('admin', 'admin123')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem' }}
                >
                  Admin (admin)
                </button>
                <button
                  type="button"
                  onClick={() => quickFillLogin('manager', 'manager123')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem' }}
                >
                  Manager (manager)
                </button>
                <button
                  type="button"
                  onClick={() => quickFillLogin('staff', 'staff123')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem' }}
                >
                  Staff (staff)
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* ================= SIGNUP / REGISTRATION FORM ================= */
          <form onSubmit={handleSignupSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <div className="input-icon-wrapper">
                <User size={16} className="input-left-icon" />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.25rem' }}
                  placeholder="Name"
                  value={signupData.full_name}
                  onChange={(e) => setSignupData(prev => ({ ...prev, full_name: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Username *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Username"
                  value={signupData.username}
                  onChange={(e) => setSignupData(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Assigned Role *</label>
                <select
                  className="form-select"
                  value={signupData.role}
                  onChange={(e) => setSignupData(prev => ({ ...prev, role: e.target.value }))}
                >
                  <option value="Staff">Staff (Floor Operations)</option>
                  <option value="Warehouse Manager">Warehouse Manager</option>
                  <option value="Admin">Admin (Full Access)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="input-icon-wrapper">
                <Mail size={16} className="input-left-icon" />
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '2.25rem' }}
                  placeholder="Email"
                  value={signupData.email}
                  onChange={(e) => setSignupData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>

            {/* Create Password */}
            <div className="form-group">
              <label className="form-label">Create Password *</label>
              <div className="input-icon-wrapper">
                <KeyRound size={16} className="input-left-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingLeft: '2.25rem', paddingRight: '2.25rem' }}
                  placeholder="Minimum 8 characters"
                  value={signupData.password}
                  onChange={(e) => setSignupData(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  className="input-right-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <div className="input-icon-wrapper">
                <Lock size={16} className="input-left-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{
                    paddingLeft: '2.25rem',
                    borderColor: isPasswordMismatch ? '#ef4444' : undefined
                  }}
                  placeholder="Re-enter your password"
                  value={signupData.confirm_password}
                  onChange={(e) => setSignupData(prev => ({ ...prev, confirm_password: e.target.value }))}
                  required
                />
              </div>
              {isPasswordMismatch && (
                <small style={{ color: '#ef4444', marginTop: '3px', fontSize: '0.75rem' }}>
                  ⚠️ Passwords do not match
                </small>
              )}
              {signupData.confirm_password && !isPasswordMismatch && signupData.password.length >= 4 && (
                <small style={{ color: '#059669', marginTop: '3px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <CheckCircle2 size={12} /> Passwords match
                </small>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary auth-submit-btn"
              disabled={loading || isPasswordMismatch}
            >
              {loading ? (
                <span>Registering Account...</span>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>Create Account & Sign In</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="auth-footer">
          {mode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => { setMode('signup'); setErrorMsg(''); }}
              >
                Create an account
              </button>
            </p>
          ) : (
            <p>
              Already registered?{' '}
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => { setMode('login'); setErrorMsg(''); }}
              >
                Sign in with existing credentials
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
