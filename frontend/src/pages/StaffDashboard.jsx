import React, { useState, useEffect } from 'react';
import ApiClient from '../api/client';
import { Award, Wallet, CreditCard, ChevronRight, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';

function StaffDashboard({ user }) {
  const [eligibility, setEligibility] = useState(null);
  const [va, setVa] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [formAccess, setFormAccess] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [loadingVa, setLoadingVa] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');

    // Fetch eligibility
    const eligRes = await ApiClient.get('/promotion/my-eligibility/');
    if (eligRes.success) setEligibility(eligRes.data);

    // Fetch payment status
    const payRes = await ApiClient.get('/virtual-accounts/status/');
    if (payRes.success) {
      setPaymentStatus(payRes.data);
      if (payRes.data.virtual_account) {
        setVa(payRes.data.virtual_account);
      }
    }

    // Fetch form access gate
    const accessRes = await ApiClient.get('/evaluation/access/');
    if (accessRes.success) setFormAccess(accessRes.data);

    setLoading(false);
  };

  const handleRequestVA = async () => {
    setLoadingVa(true);
    setError('');
    const res = await ApiClient.post('/virtual-accounts/request/');
    setLoadingVa(false);

    if (res.success) {
      setVa(res.data);
      // Refresh status
      const payRes = await ApiClient.get('/virtual-accounts/status/');
      if (payRes.success) setPaymentStatus(payRes.data);
      
      const accessRes = await ApiClient.get('/evaluation/access/');
      if (accessRes.success) setFormAccess(accessRes.data);
    } else {
      setError(res.error);
    }
  };

  const handleOpenEvaluationForm = () => {
    // Open the local evaluation form page directly
    // Save state to localStorage so appers_form.html can access authentication
    localStorage.setItem('appers_auth_token', localStorage.getItem('access_token'));
    localStorage.setItem('appers_payment_verified', 'true');
    window.open(window.location.origin + '/appers_form.html', '_blank');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <div>Loading dashboard metrics...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.03em' }}>Welcome, {user.full_name}</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Staff Promotion Dashboard &bull; MDA: {user.mda} &bull; GL: {user.grade_level}</p>
      </div>

      {error && (
        <div className="badge badge-danger" style={{ width: '100%', padding: '15px', textTransform: 'none', display: 'block' }}>
          {error}
        </div>
      )}

      {/* Grid of overview cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {/* Eligibility card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Promotion Eligibility</h3>
            <Award size={24} style={{ color: eligibility?.is_eligible ? 'var(--color-success)' : 'var(--color-warning)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>Maturity Period: <strong style={{ color: 'white' }}>{eligibility?.years_in_post} years</strong> in post</div>
            <div>Minimum Required: <strong style={{ color: 'white' }}>{eligibility?.required_years} years</strong></div>
            <div style={{ marginTop: '10px' }}>
              {eligibility?.is_eligible ? (
                <span className="badge badge-success">Maturity Cleared</span>
              ) : (
                <span className="badge badge-warning">Awaiting Maturity</span>
              )}
            </div>
          </div>
        </div>

        {/* Payment Gate Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>APPERS Fee Status</h3>
            <Wallet size={24} style={{ color: paymentStatus?.paid ? 'var(--color-success)' : 'var(--color-danger)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {paymentStatus?.paid ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
                  <strong style={{ color: 'white' }}>Payment Verified</strong>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Confirmed on {new Date(paymentStatus.confirmed_at).toLocaleDateString()}
                </div>
              </>
            ) : va ? (
              <>
                <div>Amount Due: <strong style={{ color: 'white' }}>₦5,000.00</strong></div>
                <div>Virtual Bank: <strong style={{ color: 'white' }}>APPERS Bank PLC</strong></div>
                <div>Account Number: <strong style={{ color: 'var(--color-primary)', fontSize: '1.15rem' }}>{va.account_number}</strong></div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
                  Please transfer ₦5,000.00 to this virtual account to unlock your evaluation form.
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  To access and submit your promotion evaluation form, you must generate a virtual bank account and complete payment.
                </p>
                <button className="btn btn-primary" onClick={handleRequestVA} disabled={loadingVa}>
                  {loadingVa ? 'Generating...' : 'Generate Virtual Account'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Form access gate panel */}
      <div className="card glass" style={{ padding: '30px', borderLeft: '4px solid var(--color-primary)' }}>
        <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileSpreadsheet style={{ color: 'var(--color-primary)' }} />
          Step 2: Self-Evaluation Form
        </h3>
        
        {formAccess?.access ? (
          <div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Your payment has been successfully confirmed and validated. You are eligible to access the digital APPERS self-evaluation form for cycle {formAccess.cycle}.
            </p>
            <button className="btn btn-primary btn-accent" onClick={handleOpenEvaluationForm}>
              Access Evaluation Form
              <ChevronRight size={18} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(239, 68, 68, 0.05)', padding: '20px', borderRadius: 'var(--border-radius-md)' }}>
            <AlertTriangle style={{ color: 'var(--color-danger)', flexShrink: 0 }} size={24} />
            <div>
              <h4 style={{ fontWeight: '700', color: 'white' }}>Form Access Locked</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {formAccess?.reason || 'Please generate a virtual account and make payment above to unlock this form.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StaffDashboard;
