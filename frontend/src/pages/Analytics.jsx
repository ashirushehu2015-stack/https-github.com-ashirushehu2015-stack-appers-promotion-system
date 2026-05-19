import React, { useState, useEffect } from 'react';
import ApiClient from '../api/client';
import { BarChart3, FileText, Download, TrendingUp, Layers, Coins } from 'lucide-react';

function Analytics({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    const res = await ApiClient.get('/analytics/dashboard/');
    setLoading(false);
    if (res.success) {
      setData(res.data);
    } else {
      setError(res.error);
    }
  };

  const handleExportCSV = () => {
    const token = localStorage.getItem('access_token');
    window.open(`http://localhost:8000/api/analytics/export/csv/?token=${token}`, '_blank');
  };

  const handleExportExcel = () => {
    const token = localStorage.getItem('access_token');
    window.open(`http://localhost:8000/api/analytics/export/excel/?token=${token}`, '_blank');
  };

  const handleExportPDF = (candId) => {
    const token = localStorage.getItem('access_token');
    window.open(`http://localhost:8000/api/analytics/export/pdf/${candId}/?token=${token}`, '_blank');
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>Loading analytics metrics...</div>;
  }

  if (error) {
    return <div className="badge badge-danger">{error}</div>;
  }

  // Calculate percentages for SVG dashboards
  const promo = data.recommendations.promote || 0;
  const retain = data.recommendations.retain || 0;
  const defer = data.recommendations.defer || 0;
  const pending = data.recommendations.pending || 0;
  const totalRecs = promo + retain + defer + pending || 1;

  const promoPercent = (promo / totalRecs) * 100;
  const retainPercent = (retain / totalRecs) * 100;
  const deferPercent = (defer / totalRecs) * 100;
  const pendingPercent = (pending / totalRecs) * 100;

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.03em' }}>System Analytics & Reports</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Live visual insights on revenue, staff evaluations, and official cycle metrics.</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <Download size={16} />
            Export CSV
          </button>
          <button className="btn btn-primary" onClick={handleExportExcel}>
            <BarChart3 size={16} />
            Export styled Excel (openpyxl)
          </button>
        </div>
      </div>

      {/* Overview metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <div className="card" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
            <Coins size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Revenue Collected</div>
            <h3 style={{ fontSize: '1.6rem', fontWeight: '800', marginTop: '2px' }}>₦{data.payments.total_revenue.toLocaleString()}</h3>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)' }}>
            <Layers size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Self Evaluations Submitted</div>
            <h3 style={{ fontSize: '1.6rem', fontWeight: '800', marginTop: '2px' }}>{data.evaluations.self_submitted}</h3>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-warning)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Maturity Eligible Count</div>
            <h3 style={{ fontSize: '1.6rem', fontWeight: '800', marginTop: '2px' }}>{data.eligibility.eligible}</h3>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        
        {/* Recommendation Breakdown SVG Chart */}
        <div className="card glass">
          <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '20px' }}>Official Cycle Panel Decisions</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {/* Promote bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                <span>Recommend Promote</span>
                <strong>{promo} ({promoPercent.toFixed(0)}%)</strong>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ width: `${promoPercent}%`, height: '100%', background: 'var(--color-success)', borderRadius: '10px' }}></div>
              </div>
            </div>

            {/* Retain bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                <span>Retain in Post</span>
                <strong>{retain} ({retainPercent.toFixed(0)}%)</strong>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ width: `${retainPercent}%`, height: '100%', background: 'var(--color-warning)', borderRadius: '10px' }}></div>
              </div>
            </div>

            {/* Defer bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                <span>Defer Promotion</span>
                <strong>{defer} ({deferPercent.toFixed(0)}%)</strong>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ width: `${deferPercent}%`, height: '100%', background: 'var(--color-danger)', borderRadius: '10px' }}></div>
              </div>
            </div>

            {/* Pending bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                <span>Awaiting Review</span>
                <strong>{pending} ({pendingPercent.toFixed(0)}%)</strong>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ width: `${pendingPercent}%`, height: '100%', background: 'var(--color-info)', borderRadius: '10px' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* MDA Breakdown list */}
        <div className="card glass" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '15px' }}>Ministry & Agency Performance Metrics</h3>
          <div style={{ flexGrow: 1, overflowY: 'auto', maxHeight: '240px' }} className="table-container">
            <table>
              <thead>
                <tr>
                  <th>MDA Agency</th>
                  <th>Compiled Candidates</th>
                  <th>Avg Mark</th>
                </tr>
              </thead>
              <tbody>
                {data.mda_breakdown.map((mda, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: '600' }}>{mda.staff__mda || 'General MDA'}</td>
                    <td>{mda.count} staff</td>
                    <td><strong style={{ color: 'var(--color-primary)' }}>{mda.avg_score ? mda.avg_score.toFixed(2) : '0.00'}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Analytics;
