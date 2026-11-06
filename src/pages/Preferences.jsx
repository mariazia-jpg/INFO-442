import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ActionBar, Alert, ProgressTracker, Spinner, usePageTitle } from '../components/ui.jsx';
import { hasSearchablePreferences, summarizePreferences } from '../lib/recommend.js';
import { loadPreferences } from '../services/preferences.js';

/**
 * Preferences (P1–P9): review the saved experience level and tools before
 * searching. "Edit" reopens the style questions at Question 4 (P6).
 */
export default function Preferences() {
  usePageTitle('Confirm your preferences');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let active = true;
    loadPreferences(user.id)
      .then((prefs) => active && setState({ status: 'ready', prefs }))
      .catch(() => active && setState({ status: 'error' }));
    return () => {
      active = false;
    };
  }, [user.id]);

  const prefs = state.prefs;
  const canContinue = state.status === 'ready' && hasSearchablePreferences(prefs);

  return (
    <>
      <ProgressTracker current="Preferences" />
      <p className="eyebrow">Saved profile</p>
      <h1>Confirm your preferences</h1>
      <p className="lead">We&rsquo;ll use these to find projects that fit you.</p>

      {state.status === 'loading' && <Spinner label="Loading your preferences" />}

      {state.status === 'error' && (
        <Alert>
          <strong>We couldn&rsquo;t load your saved preferences.</strong> Edit your profile to add your experience
          and available tools.
        </Alert>
      )}

      {state.status === 'ready' && (
        <section className="card prefs-card" aria-label="Saved preferences">
          {canContinue ? (
            <>
              <p className="muted">Using your saved preferences:</p>
              <p className="prefs-summary">{summarizePreferences(prefs)}</p>
            </>
          ) : (
            <Alert tone="info">Add your experience level and the tools you have so we can find projects that fit you.</Alert>
          )}
          <dl className="summary">
            <div className="summary-row">
              <dt>Experience</dt>
              <dd className={prefs.experienceLevel ? undefined : 'not-set'}>{prefs.experienceLevel || 'Not set'}</dd>
            </div>
            <div className="summary-row">
              <dt>Tools</dt>
              <dd className={prefs.tools.length ? undefined : 'not-set'}>{prefs.tools.length ? prefs.tools.join(', ') : 'Not set'}</dd>
            </div>
          </dl>
        </section>
      )}

      {state.status !== 'loading' && (
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/questions/4?edit=1')}>
          Edit
        </button>
      )}

      <ActionBar>
        <button type="button" className="btn btn-primary" disabled={!canContinue} onClick={() => navigate('/ideas')}>
          Continue
        </button>
      </ActionBar>
    </>
  );
}
