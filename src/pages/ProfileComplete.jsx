import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ActionBar, StatusIcon, usePageTitle } from '../components/ui.jsx';
import { loadPreferencesOrEmpty } from '../services/preferences.js';

const NOT_SET = 'Not set';

/** PC1–PC5 */
export default function ProfileComplete() {
  usePageTitle('Profile complete');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState(null);

  useEffect(() => {
    loadPreferencesOrEmpty(user.id).then(setPrefs);
  }, [user.id]);

  const rows = prefs
    ? [
        ['Style', prefs.styles.length ? prefs.styles.join(', ') : NOT_SET],
        ['Experience', prefs.experienceLevel || NOT_SET],
        ['Tools', prefs.tools.length ? prefs.tools.join(', ') : NOT_SET],
      ]
    : [];

  return (
    <div className="centered">
      <StatusIcon>
        <svg width="32" height="32" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </StatusIcon>
      <p className="eyebrow">Profile complete</p>
      <h1>You&rsquo;re all set!</h1>
      <p className="lead">Your recommendations will be shaped around your style, experience, and the tools you have.</p>

      {prefs && (
        <dl className="summary">
          {rows.map(([label, value]) => (
            <div key={label} className="summary-row">
              <dt>{label}</dt>
              <dd className={value === NOT_SET ? 'not-set' : undefined}>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <ActionBar>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/upload')}>
          Start Upcycling
        </button>
      </ActionBar>
    </div>
  );
}
