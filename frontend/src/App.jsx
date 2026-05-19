import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import StaffDashboard from './pages/StaffDashboard';
import SuperiorDashboard from './pages/SuperiorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Analytics from './pages/Analytics';
import { LogOut, Shield, Award, User, Layers, BarChart } from 'lucide-react';
import ApiClient from './api/client';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'analytics', 'profile'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    ApiClient.logout();
    setCurrentUser(null);
    setCurrentView('dashboard');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b111e' }}>
        <div className="spinner">Loading APPERS...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const renderDashboardByRole = () => {
    switch (currentUser.role) {
      case 'staff':
        return <StaffDashboard user={currentUser} />;
      case 'superior':
        return <SuperiorDashboard user={currentUser} />;
      case 'admin':
        return <AdminDashboard user={currentUser} />;
      default:
        return <div>Unknown role</div>;
    }
  };

  return (
    <div className="dashboard-layout animate-fade">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <Shield style={{ color: '#3b82f6', width: '32px', height: '32px' }} />
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '800', tracking: '-0.02em' }}>APPERS</h2>
            <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 'bold' }}>PROMOTION PORTAL</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
          <button 
            className={`btn ${currentView === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setCurrentView('dashboard')}
            style={{ width: '100%', justifyContent: 'flex-start' }}
          >
            <Layers size={18} />
            Dashboard
          </button>

          {(currentUser.role === 'admin' || currentUser.role === 'superior') && (
            <button 
              className={`btn ${currentView === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCurrentView('analytics')}
              style={{ width: '100%', justifyContent: 'flex-start' }}
            >
              <BarChart size={18} />
              Analytics & Reports
            </button>
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {currentUser.full_name ? currentUser.full_name[0] : 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: '600', fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{currentUser.full_name}</div>
              <span className="badge badge-success" style={{ fontSize: '0.65rem', marginTop: '4px' }}>{currentUser.role}</span>
            </div>
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={handleLogout}
            style={{ width: '100%', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'transparent' }}
          >
            <LogOut size={16} />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="main-content">
        {currentView === 'dashboard' && renderDashboardByRole()}
        {currentView === 'analytics' && <Analytics user={currentUser} />}
      </main>
    </div>
  );
}

export default App;
