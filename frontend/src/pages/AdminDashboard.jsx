import React, { useState, useEffect } from 'react';
import ApiClient from '../api/client';
import { Calendar, Award, ShieldAlert, Sparkles, RefreshCw, CheckCircle, FileSpreadsheet, Lock, Pencil, Trash2, Archive, Plus } from 'lucide-react';

function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('candidates'); // 'candidates', 'cycles', 'rules', 'payments', 'audit'
  
  // States
  const [candidates, setCandidates] = useState([]);
  const [payments, setPayments] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [rules, setRules] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  
  // Forms & Loading states
  const [loading, setLoading] = useState(true);
  const [compiling, setCompiling] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  
  // Decision Form state
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [recommendation, setRecommendation] = useState('promote');
  const [remarks, setRemarks] = useState('');
  
  // Manual Payment override state
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [overrideJustification, setOverrideJustification] = useState('');
  
  // Promotion Cycle form state
  const [editingCycle, setEditingCycle] = useState(null);
  const [newCycleYear, setNewCycleYear] = useState('2026');
  const [newCycleStart, setNewCycleStart] = useState('');
  const [newCycleDeadline, setNewCycleDeadline] = useState('');
  const [newCycleFee, setNewCycleFee] = useState('5000');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    if (activeTab === 'candidates') {
      const res = await ApiClient.get('/promotion/candidates/');
      if (res.success) setCandidates(res.data);
    } else if (activeTab === 'payments') {
      const res = await ApiClient.get('/admin-panel/payments/');
      if (res.success) setPayments(res.data);
    } else if (activeTab === 'cycles') {
      const res = await ApiClient.get('/admin-panel/cycles/');
      if (res.success) setCycles(res.data);
    } else if (activeTab === 'rules') {
      const res = await ApiClient.get('/admin-panel/rules/');
      if (res.success) setRules(res.data);
    } else if (activeTab === 'audit') {
      const res = await ApiClient.get('/analytics/audit-trail/');
      if (res.success) setAuditLogs(res.data);
    }

    setLoading(false);
  };

  const handleCompileCandidates = async () => {
    setCompiling(true);
    setError('');
    setMessage('');
    const res = await ApiClient.post('/promotion/cycle/compile/');
    setCompiling(false);
    if (res.success) {
      setMessage(res.data.message);
      fetchData();
    } else {
      setError(res.error);
    }
  };

  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const res = await ApiClient.post(`/promotion/candidates/${selectedCandidate.id}/decision/`, {
      recommendation,
      remarks
    });
    if (res.success) {
      setMessage('Decision submitted successfully!');
      setSelectedCandidate(null);
      fetchData();
    } else {
      setError(res.error);
    }
  };

  const handleManualReconcile = async () => {
    setReconciling(true);
    setError('');
    setMessage('');
    const res = await ApiClient.post('/admin-panel/transactions/reconcile/');
    setReconciling(false);
    if (res.success) {
      setMessage(res.data.message);
    } else {
      setError(res.error);
    }
  };

  const handleOverridePayment = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const res = await ApiClient.patch(`/admin-panel/payments/${selectedPayment.virtual_account.id}/override/`, {
      justification: overrideJustification
    });
    if (res.success) {
      setMessage('Payment manually confirmed!');
      setSelectedPayment(null);
      fetchData();
    } else {
      setError(res.error);
    }
  };

  const handleEditClick = (cycle) => {
    setEditingCycle(cycle);
    setNewCycleYear(cycle.year);
    setNewCycleStart(cycle.start_date);
    setNewCycleDeadline(cycle.deadline);
    setNewCycleFee(parseInt(cycle.fee_amount));
  };

  const handleCancelEdit = () => {
    setEditingCycle(null);
    setNewCycleYear('2026');
    setNewCycleStart('');
    setNewCycleDeadline('');
    setNewCycleFee('5000');
  };

  const handleSaveCycle = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    const payload = {
      year: newCycleYear,
      start_date: newCycleStart,
      deadline: newCycleDeadline,
      fee_amount: newCycleFee,
      is_active: editingCycle ? editingCycle.is_active : true
    };
    
    let res;
    if (editingCycle) {
      res = await ApiClient.patch(`/admin-panel/cycles/${editingCycle.id}/`, payload);
    } else {
      res = await ApiClient.post('/admin-panel/cycles/', payload);
    }
    
    if (res.success) {
      setMessage(editingCycle ? `Promotion cycle ${newCycleYear} updated successfully!` : `Promotion cycle ${newCycleYear} started!`);
      handleCancelEdit();
      fetchData();
    } else {
      setError(typeof res.error === 'object' ? JSON.stringify(res.error) : res.error);
    }
  };

  const handleToggleActive = async (cycle) => {
    setError('');
    setMessage('');
    const newActiveState = !cycle.is_active;
    const res = await ApiClient.patch(`/admin-panel/cycles/${cycle.id}/`, {
      is_active: newActiveState
    });
    if (res.success) {
      setMessage(`Promotion cycle ${cycle.year} is now ${newActiveState ? 'Active' : 'Archived'}.`);
      fetchData();
    } else {
      setError(typeof res.error === 'object' ? JSON.stringify(res.error) : res.error);
    }
  };

  const handleDeleteCycle = async (cycle) => {
    if (!window.confirm(`Are you sure you want to delete the promotion cycle for ${cycle.year}? This action cannot be undone.`)) {
      return;
    }
    setError('');
    setMessage('');
    const res = await ApiClient.delete(`/admin-panel/cycles/${cycle.id}/`);
    if (res.success) {
      setMessage(`Promotion cycle ${cycle.year} deleted successfully!`);
      if (editingCycle && editingCycle.id === cycle.id) {
        handleCancelEdit();
      }
      fetchData();
    } else {
      setError(typeof res.error === 'object' ? JSON.stringify(res.error) : res.error);
    }
  };

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.03em' }}>System Administrator Panel</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Configure system cycles, audit transactions, override errors, and approve promotions.</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handleManualReconcile} disabled={reconciling}>
            <RefreshCw size={16} />
            {reconciling ? 'Checking...' : 'Reconcile Webhooks'}
          </button>
          <button className="btn btn-primary" onClick={handleCompileCandidates} disabled={compiling}>
            <Sparkles size={16} />
            {compiling ? 'Compiling...' : 'Process Candidate Engine'}
          </button>
        </div>
      </div>

      {message && <div className="badge badge-success" style={{ width: '100%', padding: '15px', textTransform: 'none', display: 'block', textAlign: 'center' }}>{message}</div>}
      {error && <div className="badge badge-danger" style={{ width: '100%', padding: '15px', textTransform: 'none', display: 'block', textAlign: 'center' }}>{error}</div>}

      {/* Tabs navigation */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        {['candidates', 'payments', 'cycles', 'rules', 'audit'].map(tab => (
          <button
            key={tab}
            className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab(tab)}
            style={{ textTransform: 'capitalize' }}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>Loading panel parameters...</div>
      ) : activeTab === 'candidates' ? (
        /* Candidates Decision panel */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {selectedCandidate && (
            <div className="card glass animate-fade" style={{ padding: '25px', borderLeft: '4px solid var(--color-accent)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '15px' }}>Official Panel Recommendation for {selectedCandidate.staff_detail.full_name}</h3>
              <form onSubmit={handleDecisionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Panel Decision</label>
                    <select value={recommendation} onChange={(e) => setRecommendation(e.target.value)}>
                      <option value="promote">Recommend for Promotion</option>
                      <option value="retain">Retain in Post</option>
                      <option value="defer">Defer Promotion</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Justification Remarks</label>
                    <input type="text" placeholder="Explain the rationale behind this recommendation..." value={remarks} onChange={(e) => setRemarks(e.target.value)} required />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn btn-primary btn-accent">Submit Decision</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedCandidate(null)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>MDA</th>
                  <th>GL</th>
                  <th>Maturity</th>
                  <th>Self Score</th>
                  <th>Superior Score</th>
                  <th>Avg Score</th>
                  <th>Recommendation</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map(cand => (
                  <tr key={cand.id}>
                    <td style={{ fontWeight: '600' }}>{cand.staff_detail.full_name}</td>
                    <td>{cand.staff_detail.mda}</td>
                    <td>GL {cand.grade_level_at_eval}</td>
                    <td>
                      <span className={`badge ${cand.is_eligible_by_maturity ? 'badge-success' : 'badge-warning'}`}>
                        {cand.years_in_post}y
                      </span>
                    </td>
                    <td>{cand.self_score.toFixed(1)}/5.0</td>
                    <td>{cand.superior_score.toFixed(1)}/5.0</td>
                    <td style={{ fontWeight: 'bold' }}>{cand.average_score.toFixed(1)}/5.0</td>
                    <td>
                      <span className={`badge ${cand.recommendation === 'promote' ? 'badge-success' : cand.recommendation === 'pending' ? 'badge-info' : 'badge-danger'}`}>
                        {cand.recommendation}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-primary" onClick={() => { setSelectedCandidate(cand); setRemarks(cand.remarks || ''); }}>
                        Panel Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'payments' ? (
        /* Virtual Account Payment Overrides */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {selectedPayment && (
            <div className="card glass animate-fade" style={{ padding: '25px', borderLeft: '4px solid var(--color-danger)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '15px' }}>Force Payment Confirmation</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                You are manually overriding the payment state for {selectedPayment.staff_name} virtual account {selectedPayment.virtual_account.account_number}. This will trigger evaluation form unlocking.
              </p>
              <form onSubmit={handleOverridePayment} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Justification Override Reason</label>
                  <input type="text" placeholder="e.g. Verified transaction ref on bank bank statement..." value={overrideJustification} onChange={(e) => setOverrideJustification(e.target.value)} required />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn btn-primary" style={{ background: 'var(--color-danger)' }}>Override Payment Status</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedPayment(null)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Staff Name</th>
                  <th>Virtual Account</th>
                  <th>Amount</th>
                  <th>Paid Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(pay => (
                  <tr key={pay.id}>
                    <td style={{ fontWeight: '600' }}>{pay.staff_name}</td>
                    <td>{pay.virtual_account ? pay.virtual_account.account_number : 'None Requested'}</td>
                    <td>₦{pay.virtual_account ? pay.virtual_account.amount_due : '0.00'}</td>
                    <td>
                      <span className={`badge ${pay.paid ? 'badge-success' : 'badge-danger'}`}>
                        {pay.paid ? 'Confirmed' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      {!pay.paid && pay.virtual_account && (
                        <button className="btn btn-secondary" style={{ color: 'var(--color-danger)' }} onClick={() => setSelectedPayment(pay)}>
                          Force Confirm
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'cycles' ? (
        /* Cycles Management */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '15px' }}>
              {editingCycle ? `Edit Promotion Cycle ${editingCycle.year}` : 'Start Promotion Cycle'}
            </h3>
            <form onSubmit={handleSaveCycle} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Cycle Year</label>
                <input 
                  type="text" 
                  value={newCycleYear} 
                  onChange={(e) => setNewCycleYear(e.target.value)} 
                  required 
                  disabled={editingCycle !== null} 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Start Date</label>
                <input type="date" value={newCycleStart} onChange={(e) => setNewCycleStart(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Deadline</label>
                <input type="date" value={newCycleDeadline} onChange={(e) => setNewCycleDeadline(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Portal Fee (₦)</label>
                <input type="number" value={newCycleFee} onChange={(e) => setNewCycleFee(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }}>
                  {editingCycle ? 'Save Changes' : 'Start New Cycle'}
                </button>
                {editingCycle && (
                  <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Cycle Year</th>
                  <th>Start Date</th>
                  <th>Deadline</th>
                  <th>Fee Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map(cyc => (
                  <tr key={cyc.id}>
                    <td style={{ fontWeight: '700' }}>Cycle {cyc.year}</td>
                    <td>{cyc.start_date}</td>
                    <td>{cyc.deadline}</td>
                    <td>₦{parseFloat(cyc.fee_amount).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${cyc.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {cyc.is_active ? 'Active' : 'Archived'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => handleToggleActive(cyc)}
                          style={{ padding: '6px 12px', fontSize: '0.8rem', background: cyc.is_active ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: cyc.is_active ? 'var(--color-danger)' : 'var(--color-success)', borderColor: 'transparent' }}
                          title={cyc.is_active ? "Archive/Close Cycle" : "Activate Cycle"}
                        >
                          <Archive size={14} />
                          {cyc.is_active ? 'Close' : 'Activate'}
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => handleEditClick(cyc)}
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          title="Edit Cycle Details"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => handleDeleteCycle(cyc)}
                          style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--color-danger)', borderColor: 'transparent' }}
                          title="Delete Cycle"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'rules' ? (
        /* Rule Engine Maturity Configuration */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Grade Level Start</th>
                  <th>Grade Level End</th>
                  <th>Required Maturity (Years)</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {rules.map(rule => (
                  <tr key={rule.id}>
                    <td style={{ fontWeight: '700' }}>GL {rule.grade_level_start}</td>
                    <td>GL {rule.grade_level_end}</td>
                    <td><strong style={{ color: 'var(--color-primary)' }}>{rule.required_years} years</strong></td>
                    <td>{rule.description || 'Maturity standard rule'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Audit Logs View */
        <div className="table-container animate-fade">
          <table>
            <thead>
              <tr>
                <th>Admin/User</th>
                <th>Action</th>
                <th>Target</th>
                <th>IP Address</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map(log => (
                <tr key={log.id}>
                  <td style={{ fontWeight: '600' }}>{log.user_email}</td>
                  <td>
                    <span className="badge badge-info">{log.action}</span>
                  </td>
                  <td>{log.target_model} [ID: {log.target_id}]</td>
                  <td>{log.ip_address}</td>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
