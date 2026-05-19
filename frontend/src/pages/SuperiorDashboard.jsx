import React, { useState, useEffect } from 'react';
import ApiClient from '../api/client';
import { UserCheck, Star, FileText, CheckCircle } from 'lucide-react';

const ASPECTS = [
  'foresight', 'penetration', 'judgment', 'paper', 'oral',
  'numerical', 'colleagues', 'public', 'responsibility',
  'pressure', 'drive', 'professional', 'management', 'output',
  'quality', 'punctuality'
];

function SuperiorDashboard({ user }) {
  const [subordinates, setSubordinates] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState('');
  const [promotability, setPromotability] = useState('promote');
  const [promoGrade, setPromoGrade] = useState('08');
  const [servedYears, setServedYears] = useState('3');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSubordinates();
  }, []);

  const fetchSubordinates = async () => {
    setLoading(true);
    const res = await ApiClient.get('/superior/subordinates/');
    setLoading(false);
    if (res.success) {
      setSubordinates(res.data);
    }
  };

  const handleOpenEvaluate = async (sub) => {
    setSelectedSub(sub);
    setError('');
    setMessage('');
    
    // Reset form fields
    const initialRatings = {};
    ASPECTS.forEach(asp => { initialRatings[asp] = 'C'; });
    setRatings(initialRatings);
    setComments('');

    // Try fetching existing evaluation
    const res = await ApiClient.get(`/superior/evaluate/${sub.id}/`);
    if (res.success && res.data.ratings) {
      setRatings(res.data.ratings);
      setComments(res.data.comments || '');
      setPromotability(res.data.promotability || 'promote');
      setPromoGrade(res.data.promo_grade || '08');
    }
  };

  const handleRatingChange = (aspect, value) => {
    setRatings(prev => ({
      ...prev,
      [aspect]: value
    }));
  };

  const handleSubmitEvaluation = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    const res = await ApiClient.post(`/superior/evaluate/${selectedSub.id}/`, {
      ratings,
      comments,
      promotability,
      promo_grade: promoGrade,
      served_years: servedYears
    });
    setSubmitting(false);

    if (res.success) {
      setMessage('Evaluation submitted successfully!');
      fetchSubordinates();
      setTimeout(() => setSelectedSub(null), 1500);
    } else {
      setError(res.error);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>Loading subordinates...</div>;
  }

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.03em' }}>Superior Officer Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Supervise, evaluate, and recommend staff under your direct reporting line.</p>
      </div>

      {selectedSub ? (
        /* Evaluation Form Page */
        <div className="card glass animate-fade" style={{ padding: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
            <div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '700' }}>Evaluating: {selectedSub.full_name}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>MDA: {selectedSub.mda} &bull; Current GL: {selectedSub.grade_level}</p>
            </div>
            <button className="btn btn-secondary" onClick={() => setSelectedSub(null)}>Back to List</button>
          </div>

          {error && <div className="badge badge-danger" style={{ width: '100%', padding: '12px', marginBottom: '20px', textTransform: 'none', display: 'block' }}>{error}</div>}
          {message && <div className="badge badge-success" style={{ width: '100%', padding: '12px', marginBottom: '20px', textTransform: 'none', display: 'block' }}>{message}</div>}

          <form onSubmit={handleSubmitEvaluation} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            <div>
              <h4 style={{ fontWeight: '700', marginBottom: '15px', color: 'var(--color-primary)' }}>Performance Matrix (A-E Ratings)</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
                {ASPECTS.map(aspect => (
                  <div key={aspect} style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', textTransform: 'capitalize' }}>
                      {aspect}
                    </label>
                    <select value={ratings[aspect] || 'C'} onChange={(e) => handleRatingChange(aspect, e.target.value)}>
                      <option value="A">A - Outstanding</option>
                      <option value="B">B - Very Good</option>
                      <option value="C">C - Good</option>
                      <option value="D">D - Fair</option>
                      <option value="E">E - Poor</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Overall Recommendation</label>
                <select value={promotability} onChange={(e) => setPromotability(e.target.value)}>
                  <option value="promote">Recommend for Promotion</option>
                  <option value="retain">Retain in Post</option>
                  <option value="defer">Defer Promotion</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Proposed Grade Level</label>
                <select value={promoGrade} onChange={(e) => setPromoGrade(e.target.value)}>
                  {Array.from({ length: 16 }, (_, i) => String(i + 1).padStart(2, '0')).map(gl => (
                    <option key={gl} value={gl}>GL {gl}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Years Served on Current GL</label>
                <input type="number" min="0" max="30" value={servedYears} onChange={(e) => setServedYears(e.target.value)} required />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Comments / Justification Remarks</label>
              <textarea rows="4" placeholder="Enter detailed comments explaining your rating..." value={comments} onChange={(e) => setComments(e.target.value)} required />
            </div>

            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '12px 30px' }} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Evaluation'}
            </button>
          </form>
        </div>
      ) : (
        /* Subordinates List View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Direct Reports</h3>
          
          {subordinates.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              No direct reports assigned to you in the system.
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Email Address</th>
                    <th>Grade Level</th>
                    <th>Self-Eval Submitted</th>
                    <th>Superior Evaluation</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {subordinates.map(sub => (
                    <tr key={sub.id}>
                      <td style={{ fontWeight: '600' }}>{sub.full_name}</td>
                      <td>{sub.email}</td>
                      <td>GL {sub.grade_level}</td>
                      <td>
                        {sub.has_self_eval ? (
                          <span className="badge badge-success">Completed</span>
                        ) : (
                          <span className="badge badge-warning">Pending</span>
                        )}
                      </td>
                      <td>
                        {sub.has_superior_eval ? (
                          <span className="badge badge-success">Completed</span>
                        ) : (
                          <span className="badge badge-danger">Awaiting You</span>
                        )}
                      </td>
                      <td>
                        <button className="btn btn-primary btn-secondary" onClick={() => handleOpenEvaluate(sub)}>
                          <FileText size={16} />
                          Evaluate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SuperiorDashboard;
