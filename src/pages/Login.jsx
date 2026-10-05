import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useRoomMate } from '../context/useRoomMate';
import sharedLivingRoomImage from '../assets/shared-living-room.jpg';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Login() {
  const navigate = useNavigate();
  const { setAuthSession, isLoggedIn, authLoading, error: sessionError, clearError } = useRoomMate();
  const [mode, setMode] = useState('login');
  const [loginRole, setLoginRole] = useState('owner');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (isLoggedIn && !authLoading) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    clearError();
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginForm.email,
          password: loginForm.password,
          role: loginRole,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'Invalid email or password');
      }

      setAuthSession(data);
      navigate('/dashboard');
    } catch (loginError) {
      setError(loginError instanceof TypeError
        ? 'Cannot reach the backend. Start the RoomMate server and try again.'
        : loginError.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    clearError();

    if (!signupForm.fullName || !signupForm.email || !signupForm.password || !signupForm.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupForm.fullName,
          email: signupForm.email,
          password: signupForm.password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      setSuccess('Account created successfully. Please login.');
      setSignupForm({ fullName: '', email: '', password: '', confirmPassword: '' });
      setLoginForm({ email: '', password: '' });
      setMode('login');
    } catch (signupError) {
      setError(signupError instanceof TypeError
        ? 'Cannot reach the backend. Start the RoomMate server and try again.'
        : signupError.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-visual">
          <div className="brand-row">
            <div className="brand-mark small">R</div>
            <div>
              <h2>RoomMate</h2>
              <p>Better Together</p>
            </div>
          </div>

          <h1>Shared Home, Better Life</h1>
          <p className="auth-subtitle">
            Manage your expenses, tasks and shopping — all in one place.
          </p>

          <div className="illustration-wrap">
            <img className="mini-room" src={sharedLivingRoomImage} alt="Bright shared apartment living room" />
          </div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => setMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={mode === 'signup' ? 'active' : ''}
              onClick={() => setMode('signup')}
            >
              Sign Up
            </button>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="auth-form">
              <h3>{loginRole === 'owner' ? 'Owner Login' : 'Member Login'}</h3>
              <p className="muted">Choose the account role to continue</p>
              {success && <p className="success-message" role="status">{success}</p>}

              <div className="auth-role-options" role="group" aria-label="Login as">
                <button
                  type="button"
                  className={loginRole === 'owner' ? 'active' : ''}
                  aria-pressed={loginRole === 'owner'}
                  onClick={() => setLoginRole('owner')}
                >
                  Owner Login
                </button>
                <button
                  type="button"
                  className={loginRole === 'member' ? 'active' : ''}
                  aria-pressed={loginRole === 'member'}
                  onClick={() => setLoginRole('member')}
                >
                  Member Login
                </button>
              </div>

              <label>
                <span>Email address</span>
                <input
                  type="email"
                  required
                  value={loginForm.email}
                  onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                  placeholder="you@example.com"
                />
              </label>

              <label>
                <span>Password</span>
                <input
                  type="password"
                  required
                  value={loginForm.password}
                  onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                  placeholder="Enter your password"
                />
              </label>

              {(error || sessionError) && <p className="auth-error">{error || sessionError}</p>}
              <button type="submit" className="primary-btn wide" disabled={loading}>
                {loading ? 'Please wait...' : 'Login'}
              </button>
              <p className="switch-text">
                Don&apos;t have an account? <button type="button" onClick={() => setMode('signup')}>Sign Up</button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="auth-form">
              <h3>Create Account</h3>
              <p className="muted">Join your shared home</p>

              <label>
                <span>Full Name</span>
                <input
                  type="text"
                  required
                  value={signupForm.fullName}
                  onChange={(event) => setSignupForm({ ...signupForm, fullName: event.target.value })}
                  placeholder="Enter your full name"
                />
              </label>

              <label>
                <span>Email</span>
                <input
                  type="email"
                  required
                  value={signupForm.email}
                  onChange={(event) => setSignupForm({ ...signupForm, email: event.target.value })}
                  placeholder="you@example.com"
                />
              </label>

              <label>
                <span>Password</span>
                <input
                  type="password"
                  minLength={6}
                  required
                  value={signupForm.password}
                  onChange={(event) => setSignupForm({ ...signupForm, password: event.target.value })}
                  placeholder="Create a password"
                />
              </label>

              <label>
                <span>Confirm Password</span>
                <input
                  type="password"
                  minLength={6}
                  required
                  value={signupForm.confirmPassword}
                  onChange={(event) => setSignupForm({ ...signupForm, confirmPassword: event.target.value })}
                  placeholder="Confirm your password"
                />
              </label>

              {(error || sessionError) && <p className="auth-error">{error || sessionError}</p>}
              <button type="submit" className="primary-btn wide" disabled={loading}>
                {loading ? 'Creating account...' : 'Sign Up'}
              </button>
              <p className="switch-text">
                Already have an account? <button type="button" onClick={() => setMode('login')}>Login</button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
