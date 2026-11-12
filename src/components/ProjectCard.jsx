import { Link } from 'react-router-dom';
import { assetUrl } from '../services/projects.js';

export default function ProjectCard({ project }) {
  return (
    <li className="card project-card">
      <img src={assetUrl(project.image)} alt={`Illustration of the ${project.title} project`} width="400" height="300" loading="lazy" />
      <div className="project-card-body">
        <h2>{project.title}</h2>
        <p>{project.description}</p>
        <ul className="tags" aria-label="Difficulty and time">
          <li>{project.difficulty}</li>
          <li>{project.estimatedTime}</li>
        </ul>
        <p className="tools"><span className="muted">Tools:</span> {project.requiredTools.join(', ')}</p>
        <Link to={`/ideas/${project.id}`} className="btn btn-secondary">
          View Project<span className="visually-hidden">: {project.title}</span>
        </Link>
      </div>
    </li>
  );
}
