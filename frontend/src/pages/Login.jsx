import React, { useState } from 'react';
import ApiClient from '../api/client';
import { 
  Lock, Mail, User, ShieldCheck, Key, ArrowRight, Landmark, BadgeCheck, 
  HelpCircle, ChevronDown, CheckCircle2, Award, FileSpreadsheet, Users, 
  Settings, Phone, BookOpen 
} from 'lucide-react';
import logoImg from '../assets/zamfara_logo.png';

function Login({ onLoginSuccess }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false); // Authentication Modal Toggle
  const [openFaq, setOpenFaq] = useState(null); // FAQ Accordion State
  
  // Registration Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [fullName, setFullName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('07');
  const [mda, setMda] = useState('');
  const [department, setDepartment] = useState('');
  
  // 2FA Flow
  const [requires2FA, setRequires2FA] = useState(false);
  const [preAuthUserId, setPreAuthUserId] = useState(null);
  const [totpToken, setTotpToken] = useState('');
  
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const res = await ApiClient.post('/auth/login/', { email, password });
    setLoading(false);

    if (res.success) {
      if (res.data['2fa_required']) {
        setRequires2FA(true);
        setPreAuthUserId(res.data.pre_auth_user_id);
      } else {
        localStorage.setItem('access_token', res.data.access);
        localStorage.setItem('refresh_token', res.data.refresh);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        onLoginSuccess(res.data.user);
      }
    } else {
      setError(typeof res.error === 'object' ? JSON.stringify(res.error) : res.error);
    }
  };

  const handle2FAVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await ApiClient.post('/auth/2fa/verify/', {
      user_id: preAuthUserId,
      token: totpToken
    });
    setLoading(false);

    if (res.success) {
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onLoginSuccess(res.data.user);
    } else {
      setError(res.error);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const res = await ApiClient.post('/auth/register/', {
      email,
      full_name: fullName,
      grade_level: gradeLevel,
      mda,
      department,
      password,
      password2: passwordConfirm
    });
    setLoading(false);

    if (res.success) {
      setMessage('Registration successful! Please log in.');
      setIsRegistering(false);
      setPassword('');
      setPasswordConfirm('');
    } else {
      setError(typeof res.error === 'object' ? JSON.stringify(res.error) : res.error);
    }
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div style={{ 
      backgroundColor: '#070b12', 
      color: '#f8fafc',
      fontFamily: 'var(--font-family-sans)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      
      {/* ── 1. NAVIGATION BAR ── */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 80px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        backgroundColor: 'rgba(7, 11, 18, 0.85)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={logoImg} alt="Zamfara Seal" style={{ width: '48px', height: '48px' }} />
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#fff' }}>ZAMFARA CSC</h1>
            <span style={{ fontSize: '0.65rem', color: '#198754', fontWeight: '800', letterSpacing: '0.05em' }}>PROMOTION PORTAL</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
          <a href="#how-it-works" style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem', transition: 'color 0.2s' }} onMouseEnter={(e)=>e.target.style.color='#fff'} onMouseLeave={(e)=>e.target.style.color='#94a3b8'}>How It Works</a>
          <a href="#rules" style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem', transition: 'color 0.2s' }} onMouseEnter={(e)=>e.target.style.color='#fff'} onMouseLeave={(e)=>e.target.style.color='#94a3b8'}>Maturity Guidelines</a>
          <a href="#faqs" style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem', transition: 'color 0.2s' }} onMouseEnter={(e)=>e.target.style.color='#fff'} onMouseLeave={(e)=>e.target.style.color='#94a3b8'}>FAQs</a>
          <button 
            className="btn" 
            onClick={() => { setShowAuthModal(true); setIsRegistering(false); }}
            style={{ padding: '8px 20px', background: 'transparent', border: '1px solid #198754', color: '#198754', borderRadius: '8px' }}
          >
            Sign In
          </button>
          <button 
            className="btn" 
            onClick={() => { setShowAuthModal(true); setIsRegistering(true); }}
            style={{ padding: '8px 20px', background: '#198754', color: '#fff', borderRadius: '8px' }}
          >
            Register
          </button>
        </div>
      </nav>

      {/* ── 2. HERO SECTION ── */}
      <header style={{
        padding: '120px 80px',
        background: 'radial-gradient(circle at 10% 20%, rgba(25, 135, 84, 0.1) 0%, rgba(7, 11, 18, 0.95) 70%)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow Spheres */}
        <div style={{ position: 'absolute', top: '10%', left: '15%', width: '300px', height: '300px', background: 'rgba(25, 135, 84, 0.08)', filter: 'blur(80px)', borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: '300px', height: '300px', background: 'rgba(255, 193, 7, 0.04)', filter: 'blur(90px)', borderRadius: '50%' }}></div>

        <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div className="badge badge-success" style={{ background: 'rgba(25, 135, 84, 0.15)', color: '#198754', padding: '8px 16px', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '25px', letterSpacing: '0.05em' }}>
            CIVIL SERVICE STATE ADVANCEMENT SYSTEM
          </div>
          
          <h1 style={{ fontSize: '3.6rem', fontWeight: '800', letterSpacing: '-0.04em', lineHeight: '1.1', color: '#fff', marginBottom: '25px' }}>
            Zamfara State Public Service <br />
            <span style={{ background: 'linear-gradient(135deg, #198754, #ffc107)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Staff Promotion & Evaluation Portal
            </span>
          </h1>

          <p style={{ color: '#94a3b8', fontSize: '1.2rem', lineHeight: '1.6', maxWidth: '750px', margin: '0 auto 40px auto' }}>
            Welcome to the official digital APPERS platform. Securely record personal evaluation reports, generate unique payment virtual accounts, and process promotions transparently across all ministries.
          </p>

          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button 
              className="btn btn-primary" 
              onClick={() => { setShowAuthModal(true); setIsRegistering(false); }}
              style={{ padding: '16px 36px', background: 'linear-gradient(135deg, #198754, #146c43)', fontSize: '1.05rem', boxShadow: '0 4px 20px rgba(25, 135, 84, 0.3)' }}
            >
              Access Candidate Portal
              <ArrowRight size={18} />
            </button>
            <a href="#how-it-works" className="btn btn-secondary" style={{ padding: '16px 36px', fontSize: '1.05rem' }}>
              Learn System Mechanics
            </a>
          </div>
        </div>
      </header>

      {/* ── 3. PORTAL STATISTICS ── */}
      <section style={{
        padding: '60px 80px',
        backgroundColor: '#0c1322',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '30px', maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <div>
            <h3 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#198754' }}>36+</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '5px' }}>Ministries & MDAs Configured</p>
          </div>
          <div>
            <h3 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#ffc107' }}>100%</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '5px' }}>Idempotent Hook Accuracy</p>
          </div>
          <div>
            <h3 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#38bdf8' }}>GL 1-16</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '5px' }}>Grade Levels Evaluated</p>
          </div>
          <div>
            <h3 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#ef4444' }}>&lt; 5 min</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '5px' }}>Form Unlocks After Payment</p>
          </div>
        </div>
      </section>

      {/* ── 4. HOW IT WORKS ── */}
      <section id="how-it-works" style={{ padding: '100px 80px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: '800' }}>Portal Step-by-Step Flow</h2>
          <p style={{ color: '#94a3b8', marginTop: '8px' }}>Follow these simple phases to process your career advancement evaluation</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '25px' }}>
          <div className="card" style={{ background: '#111827', position: 'relative' }}>
            <div style={{ width: '40px', height: '40px', background: '#198754', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '20px' }}>1</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '10px' }}>Secure Registration</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.5' }}>Create your public servant account and enter your substantive grade level parameters.</p>
          </div>

          <div className="card" style={{ background: '#111827' }}>
            <div style={{ width: '40px', height: '40px', background: '#ffc107', color: '#000', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '20px' }}>2</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '10px' }}>Generate Virtual Account</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.5' }}>Request a unique virtual account and transfer the exact fee of ₦5,000 for automatic matching.</p>
          </div>

          <div className="card" style={{ background: '#111827' }}>
            <div style={{ width: '40px', height: '40px', background: '#38bdf8', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '20px' }}>3</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '10px' }}>Digital APERS</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.5' }}>Complete your personal record and answer performance aspect ratings to generate a submission slip.</p>
          </div>

          <div className="card" style={{ background: '#111827' }}>
            <div style={{ width: '40px', height: '40px', background: '#8b5cf6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '20px' }}>4</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '10px' }}>Superior Evaluation</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.5' }}>Your direct superior officer rates your performance metrics and submits promotion recommendations.</p>
          </div>
        </div>
      </section>

      {/* ── 5. PROMOTION MATURITY RULES ── */}
      <section id="rules" style={{ padding: '100px 80px', backgroundColor: '#0c1322' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '20px' }}>Dynamic Grade Level Maturity Criteria</h2>
            <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '30px' }}>
              The Zamfara State Civil Service Commission calculates promotion candidacy based on precise periods since your last substantive promotion. All guidelines are verified automatically by the APPERS rule engine.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <CheckCircle2 style={{ color: '#198754' }} />
                <span><strong>GL 01 - 06:</strong> Minimum 2 years in substantive grade level.</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <CheckCircle2 style={{ color: '#198754' }} />
                <span><strong>GL 07 - 13:</strong> Minimum 3 years in substantive grade level.</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <CheckCircle2 style={{ color: '#198754' }} />
                <span><strong>GL 14 - 16:</strong> Minimum 4 years in substantive grade level.</span>
              </div>
            </div>
          </div>

          <div className="card glass" style={{ padding: '30px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '20px', color: '#ffc107' }}>Workflow & Routing Exceptions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', borderLeft: '3px solid #198754' }}>
                <strong style={{ display: 'block', color: '#fff', fontSize: '0.9rem' }}>Civil Service Commission (CSC)</strong>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>Promotions require physical external validation before approval is updated in D7 decisions registry.</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', borderLeft: '3px solid #ffc107' }}>
                <strong style={{ display: 'block', color: '#fff', fontSize: '0.9rem' }}>Head of Service (HoS)</strong>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>Senior officers in GL 14-16 are flagged automatically and sent to the Head of Service workflow inbox.</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', borderLeft: '3px solid #38bdf8' }}>
                <strong style={{ display: 'block', color: '#fff', fontSize: '0.9rem' }}>Tertiary Institutions</strong>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>Exempted from standard rules. Admins can configure custom maturity criteria on a per-institution basis.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. ACCORDION FAQS ── */}
      <section id="faqs" style={{ padding: '100px 80px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: '800' }}>Frequently Asked Questions</h2>
          <p style={{ color: '#94a3b8', marginTop: '8px' }}>Answers to common queries regarding payments, forms, and rules.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {[
            {
              q: "How long is a generated virtual account valid for?",
              a: "Virtual accounts expire after exactly 7 days. If your account expires before payment is completed, you can request a new one on your Staff Dashboard."
            },
            {
              q: "What happens if I transfer an amount different from the ₦5,000 fee?",
              a: "The system enforces exact payment matching. Partial payments or overpayments are automatically flagged as failed, and a notification is sent to your email. You will need to request a reconciliation or pay the exact amount."
            },
            {
              q: "Can I edit my evaluation form after it is submitted?",
              a: "No. Once you submit your digital APERS form, it is locked for security and routed immediately to your direct Superior Officer."
            },
            {
              q: "How does the system ensure data security?",
              a: "All personal candidate identifiers (Full Name, MDA, Grade Level, Department) are encrypted at rest using highly secure 32-byte AES keys. All changes are logged in the secure system audit trail."
            }
          ].map((faq, idx) => (
            <div 
              key={idx} 
              style={{ background: '#111827', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', cursor: 'pointer' }}
              onClick={() => toggleFaq(idx)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', fontWeight: '600' }}>
                <span>{faq.q}</span>
                <ChevronDown size={18} style={{ transform: openFaq === idx ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: '#198754' }} />
              </div>
              {openFaq === idx && (
                <div style={{ padding: '0 20px 20px 20px', color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── 7. FOOTER ── */}
      <footer style={{
        marginTop: 'auto',
        backgroundColor: '#040810',
        padding: '40px 80px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        textAlign: 'center'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={logoImg} alt="Zamfara Logo" style={{ width: '36px', height: '36px' }} />
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Zamfara State Civil Service Commission (CSC). All rights reserved.</span>
          </div>
          <div style={{ display: 'flex', gap: '20px', fontSize: '0.85rem', color: '#64748b' }}>
            <span>Portal Helpdesk: support@csc.zamfara.gov.ng</span>
            <span>Motto: Farming is Our Pride</span>
          </div>
        </div>
      </footer>


      {/* ── 8. AUTHENTICATION MODAL (SLIDING OVERLAY) ── */}
      {showAuthModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(4, 8, 16, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }} className="animate-fade">
          
          <div className="card glass animate-fade" style={{ width: '100%', maxWidth: '460px', padding: '40px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#fff' }}>
                {requires2FA ? 'Identity Verification' : isRegistering ? 'Register Candidate' : 'Portal Sign In'}
              </h3>
              <button 
                onClick={() => { setShowAuthModal(false); setRequires2FA(false); setError(''); setMessage(''); }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer', fontWeight: 'bold' }}
              >
                &times;
              </button>
            </div>

            {error && (
              <div className="badge badge-danger animate-fade" style={{ width: '100%', padding: '12px', borderRadius: 'var(--border-radius-sm)', marginBottom: '20px', textTransform: 'none', display: 'block', textAlign: 'center' }}>
                {error}
              </div>
            )}

            {message && (
              <div className="badge badge-success animate-fade" style={{ width: '100%', padding: '12px', borderRadius: 'var(--border-radius-sm)', marginBottom: '20px', textTransform: 'none', display: 'block', textAlign: 'center' }}>
                {message}
              </div>
            )}

            {requires2FA ? (
              <form onSubmit={handle2FAVerify} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center' }}>
                  A 2FA authentication code is required. Enter the 6-digit token from your Google Authenticator app.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>2FA Device Token</label>
                  <div style={{ position: 'relative' }}>
                    <Key size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: '#64748b' }} />
                    <input type="text" placeholder="e.g. 123456" value={totpToken} onChange={(e) => setTotpToken(e.target.value)} style={{ paddingLeft: '48px' }} required />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', background: '#198754' }} disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </button>
              </form>
            ) : isRegistering ? (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '16px', top: '14px', color: '#64748b' }} />
                    <input type="email" placeholder="yourname@zamfara.gov.ng" value={email} onChange={(e) => setEmail(e.target.value)} style={{ paddingLeft: '48px' }} required />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '16px', top: '14px', color: '#64748b' }} />
                    <input type="text" placeholder="Firstname Lastname" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ paddingLeft: '48px' }} required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Grade Level</label>
                    <select value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)}>
                      {Array.from({ length: 16 }, (_, i) => String(i + 1).padStart(2, '0')).map(gl => (
                        <option key={gl} value={gl}>GL {gl}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>MDA Agency</label>
                    <input type="text" placeholder="e.g. MOH-Zamfara" value={mda} onChange={(e) => setMda(e.target.value)} required />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Department</label>
                  <input type="text" placeholder="e.g. Administration" value={department} onChange={(e) => setDepartment(e.target.value)} required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <input type="password" placeholder="Confirm" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} required />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', background: '#198754' }} disabled={loading}>
                  {loading ? 'Creating Account...' : 'Register'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                  <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Already registered? </span>
                  <button type="button" onClick={() => setIsRegistering(false)} style={{ background: 'none', border: 'none', color: '#198754', fontWeight: 'bold', padding: 0 }}>Log In</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: '#64748b' }} />
                    <input type="email" placeholder="name@zamfara.gov.ng" value={email} onChange={(e) => setEmail(e.target.value)} style={{ paddingLeft: '48px' }} required />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Secret Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: '#64748b' }} />
                    <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={{ paddingLeft: '48px' }} required />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', background: '#198754' }} disabled={loading}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                  <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>New to portal? </span>
                  <button type="button" onClick={() => setIsRegistering(true)} style={{ background: 'none', border: 'none', color: '#198754', fontWeight: 'bold', padding: 0 }}>Register Here</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default Login;
