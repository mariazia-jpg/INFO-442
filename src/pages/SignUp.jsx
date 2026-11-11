import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ActionBar, Alert, usePageTitle } from '../components/ui.jsx';
import { MIN_PASSWORD_LENGTH } from '../lib/constants.js';

const MESSAGES = {
  'email-required': 'Enter your email.',
  'password-required': 'Enter a password.',
  'invalid-email': 'Enter a valid email address, like name@example.com.',
  'weak-password': `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
  'email-in-use': 'This email is already in use.',
};

const FIELD_FOR = {
  'email-required': 'email',
  'invalid-email': 'email',
  'email-in-use': 'email',
  'password-required': 'password',
  'weak-password': 'password',
};

/** S1–S12 */
export default function SignUp() {
  usePageTitle('Create your account');
  const { signUp } = useAuth();
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
      await signUp(email, password);
      navigate('/questions/1');
    } catch (problem) {
      setError(problem.code || 'unknown');
      setBusy(false);
    }
  }

  const invalid = FIELD_FOR[error];

  return (
    <>
      <p className="eyebrow">Welcome to ReWear</p>
      <h1>Create your account</h1>
      <p className="lead">Save your style preferences and favorite upcycling projects.</p>

      {error && <Alert id="signup-error">{MESSAGES[error] || 'Something went wrong. Please try again.'}</Alert>}

      <form id="signup-form" className="form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={invalid === 'email' || undefined}
            aria-describedby={invalid === 'email' ? 'signup-error' : undefined}
          />
        </div>
        <div className="field">
          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={invalid === 'password' || undefined}
            aria-describedby={`signup-password-hint${invalid === 'password' ? ' signup-error' : ''}`}
          />
          <p id="signup-password-hint" className={`hint${error === 'weak-password' ? ' hint-error' : ''}`}>
            Password must contain {MIN_PASSWORD_LENGTH} or more characters.
          </p>
        </div>
        <p className="form-switch">
          <Link to="/login">Already have an account? Log in</Link>
        </p>
      </form>

      <ActionBar>
        <button type="submit" form="signup-form" className="btn btn-primary" disabled={busy}>
          Create Account
        </button>
      </ActionBar>
    </>
  );
}
