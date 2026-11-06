import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getUpload } from '../services/upload.js';

/**
 * A1 / A2: logged-out users who open a protected URL (or press Back after
 * logging out) see the Log In page instead.
 */
export function RequireAuth() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** A3: pages after Upload need a photo from this browser session. */
export function RequireUpload() {
  if (!getUpload()) return <Navigate to="/upload" replace />;
  return <Outlet />;
}

/** Preferences, Recommendations and Tutorial Details need a confirmed clothing type. */
export function RequireConfirmedType() {
  if (!getUpload()?.confirmedType) return <Navigate to="/identify" replace />;
  return <Outlet />;
}
