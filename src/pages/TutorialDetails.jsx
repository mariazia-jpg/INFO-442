import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ActionBar, Alert, ProgressTracker, Spinner, usePageTitle } from '../components/ui.jsx';
import { assetUrl, findProject } from '../services/projects.js';

/** Tutorial Details (T1–T12). */
export default function TutorialDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    findProject(projectId)
      .then((project) => active && setState(project ? { status: 'ready', project } : { status: 'not-found' }))
      .catch(() => active && setState({ status: 'error' }));
    return () => {
      active = false;
    };
  }, [projectId]);

  const project = state.project;
  usePageTitle(project ? project.title : state.status === 'not-found' ? 'Project not found' : 'Project');

  const backToIdeas = (
    <button type="button" className="btn btn-secondary" onClick={() => navigate('/ideas')}>
      Back to Ideas
    </button>
  );

  if (state.status === 'loading') {
    return (
      <>
        <ProgressTracker current="Ideas" />
        <Spinner label="Loading project" />
      </>
    );
  }

  if (state.status !== 'ready') {
    const notFound = state.status === 'not-found';
    return (
      <>
        <ProgressTracker current="Ideas" />
        <h1>{notFound ? 'Project not found' : 'We couldn’t load this project'}</h1>
        <Alert>
          {notFound
            ? 'We couldn’t find that project. It may have been removed.'
            : 'Check your connection and try again.'}
        </Alert>
        <p><Link to="/" className="text-link">Go to the Home page</Link></p>
        <ActionBar>{backToIdeas}</ActionBar>
      </>
    );
  }

  const available = project.tutorialAvailable !== false && Boolean(project.tutorialUrl);

  return (
    <>
      <ProgressTracker current="Ideas" />
      {!available && (
        <Alert tone="info">
          <strong>Tutorial unavailable.</strong> This tutorial may not be available right now. Try another project.
        </Alert>
      )}
      <img className="hero-image" src={assetUrl(project.image)} alt={`Illustration of the ${project.title} project`} width="400" height="300" />
      <p className="eyebrow">{project.projectType}</p>
      <h1>{project.title}</h1>
      <ul className="tags" aria-label="Difficulty and time">
        <li>{project.difficulty}</li>
        <li>{project.estimatedTime}</li>
      </ul>
      <p className="lead">{project.transformation}</p>
      <p className="tools"><span className="muted">Tools:</span> {project.requiredTools.join(', ')}</p>
      {available && project.tutorialSource && <p className="muted small">Tutorial by {project.tutorialSource}</p>}

      <ActionBar>
        {available ? (
          <a className="btn btn-primary" href={project.tutorialUrl} target="_blank" rel="noopener noreferrer">
            Open Tutorial <span aria-hidden="true">↗</span>
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        ) : (
          <button type="button" className="btn btn-primary" disabled>
            Open Tutorial <span aria-hidden="true">↗</span>
          </button>
        )}
        {backToIdeas}
      </ActionBar>
    </>
  );
}
