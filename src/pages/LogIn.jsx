import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ActionBar, Alert, usePageTitle } from '../components/ui.jsx';

const MESSAGES = {
  'email-required': 'Enter your email.',
  'password-required': 'Enter your password.',
  'incorrect-credentials': 'Incorrect email or password.',
};

const FIELD_FOR = {
  'email-required': 'email',
  'password-required': 'password',
};

/** L1–L8 */
export default function LogIn() {
  usePageTitle('Log in');
  const { logIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await logIn(email, password);
      navigate('/upload');
    } catch (problem) {
      setError(problem.code || 'unknown');
      setBusy(false);
    }
  }

  const invalid = FIELD_FOR[error];

  return (
    <>
      <p className="eyebrow">Welcome to ReWear</p>
      <h1>Welcome back</h1>
      <p className="lead">Log in to continue your next upcycling project.</p>

      {error && <Alert id="login-error">{MESSAGES[error] || 'Something went wrong. Please try again.'}</Alert>}

      <form id="login-form" className="form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={invalid === 'email' || error === 'incorrect-credentials' || undefined}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </div>
        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={invalid === 'password' || error === 'incorrect-credentials' || undefined}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </div>
        <p className="form-switch">
          <Link to="/signup">Create an account</Link>
        </p>
      </form>

      <ActionBar>
        <button type="submit" form="login-form" className="btn btn-primary" disabled={busy}>
          Log In
        </button>
      </ActionBar>
    </>
  );
}
