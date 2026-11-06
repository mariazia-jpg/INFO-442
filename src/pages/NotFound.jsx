import { Link } from 'react-router-dom';
import { StatusIcon, usePageTitle } from '../components/ui.jsx';

/** E1–E2 */
export default function NotFound() {
  usePageTitle('Page not found');
  return (
    <div className="centered">
      <StatusIcon>?</StatusIcon>
      <h1>Page not found</h1>
      <p className="lead">We couldn&rsquo;t find the page you were looking for.</p>
      <p><Link to="/" className="btn btn-secondary">Go to the Home page</Link></p>
    </div>
  );
}
