import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import ProjectCard from '../components/ProjectCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ActionBar, Alert, ProgressTracker, Spinner, StatusIcon, usePageTitle } from '../components/ui.jsx';
import { hasSearchablePreferences, recommendProjects, summarizePreferences } from '../lib/recommend.js';
import { yourItem } from '../lib/wording.js';
import { loadPreferences } from '../services/preferences.js';
import { loadProjects } from '../services/projects.js';
import { getUpload } from '../services/upload.js';

/** Recommendations (R1–R18). */
export default function Recommendations() {
  const clothingType = getUpload().confirmedType; // RequireConfirmedType guarantees this
  usePageTitle(`Ideas for ${yourItem(clothingType)}`);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    let prefs;
    try {
      prefs = await loadPreferences(user.id);
    } catch {
      setState({ status: 'needs-preferences' });
      return;
    }
    if (!hasSearchablePreferences(prefs)) {
      setState({ status: 'needs-preferences' });
      return;
    }
    try {
      const projects = await loadProjects();
      const matches = recommendProjects(projects, { clothingType, ...prefs });
      setState({ status: 'ready', prefs, matches });
    } catch (error) {
      console.warn('Project data failed to load:', error);
      setState({ status: 'error', prefs });
    }
  }, [user.id, clothingType]);

  useEffect(() => {
    load();
  }, [load]);

  // Preferences without a level or tools can't be searched; Preferences explains what's missing.
  if (state.status === 'needs-preferences') return <Navigate to="/preferences" replace />;

  const { prefs, matches } = state;

  return (
    <>
      <ProgressTracker current="Ideas" />
      <p className="eyebrow">Your matches</p>
      <h1>Ideas for {yourItem(clothingType)}</h1>

      {prefs && (
        <div className="prefs-bar">
          <span><span className="visually-hidden">Your preferences: </span>{summarizePreferences(prefs)}</span>
          <Link to="/preferences" className="text-link">Edit<span className="visually-hidden"> preferences</span></Link>
        </div>
      )}

      {state.status === 'loading' && <Spinner label="Finding projects" />}

      {state.status === 'error' && (
        <>
          <Alert>We couldn&rsquo;t load project ideas. Check your connection and try again.</Alert>
          <button type="button" className="btn btn-secondary" onClick={load}>Try again</button>
        </>
      )}

      {state.status === 'ready' && matches.length > 0 && (
        <ul className="project-list">
          {matches.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </ul>
      )}

      {state.status === 'ready' && matches.length === 0 && (
        <>
          <div className="centered empty-state">
            <StatusIcon>?</StatusIcon>
            <h2>No projects match your preferences.</h2>
            <p className="lead">Try choosing another skill level or adding more tools.</p>
          </div>
          <ActionBar>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/preferences')}>
              Change Preferences
            </button>
          </ActionBar>
        </>
      )}
    </>
  );
}
