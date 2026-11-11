import { useEffect } from 'react';
import { FLOW_STEPS } from '../lib/constants.js';

/** Sets the browser tab title for the current page. */
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ReWear` : 'ReWear';
  }, [title]);
}

/** The bar pinned to the bottom of the screen that holds the page's main button(s). */
export function ActionBar({ children }) {
  return (
    <div className="action-bar">
      <div className="action-bar-inner">{children}</div>
    </div>
  );
}

/** PT1–PT5: Upload → Identify → Preferences → Ideas, with the current step marked. */
export function ProgressTracker({ current }) {
  const currentIndex = FLOW_STEPS.indexOf(current);
  return (
    <nav className="progress" aria-label="Upcycling progress">
      <ol>
        {FLOW_STEPS.map((step, index) => (
          <li
            key={step}
            className={index < currentIndex ? 'done' : index === currentIndex ? 'current' : undefined}
            aria-current={index === currentIndex ? 'step' : undefined}
          >
            {step}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * An error or notice. role="alert" makes screen readers announce it when it
 * appears (NF-A5).
 */
export function Alert({ children, tone = 'error', id }) {
  return (
    <div id={id} className={`alert alert-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span className="alert-icon" aria-hidden="true">{tone === 'error' ? '!' : 'i'}</span>
      <div>{children}</div>
    </div>
  );
}

export function Spinner({ label }) {
  return <span className="spinner" role="img" aria-label={label || 'Loading'} />;
}

/** Big round icon used on status screens (success, error, no results). */
export function StatusIcon({ children }) {
  return <div className="status-icon" aria-hidden="true">{children}</div>;
}
