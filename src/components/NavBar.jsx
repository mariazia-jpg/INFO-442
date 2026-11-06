import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function MenuIcon({ open }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}

/** N1–N10: ReWear name, menu icon, and options that depend on whether the user is logged in. */
export default function NavBar() {
  const { user, logOut } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Hide the menu after navigating anywhere.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  async function handleLogOut() {
    await logOut();
    setOpen(false);
    navigate('/');
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">ReWear</Link>
        <button
          type="button"
          className="menu-button"
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((value) => !value)}
        >
          <MenuIcon open={open} />
        </button>
      </div>
      {open && (
        // Closing on click also covers choosing the page you're already on.
        <nav
          id="site-menu"
          className="site-menu"
          aria-label="Site"
          onClick={(event) => event.target.closest('a') && setOpen(false)}
        >
          <ul>
            <li><Link to="/">Home</Link></li>
            {user ? (
              <>
                <li><Link to="/upload">Start Upcycling</Link></li>
                <li><button type="button" className="menu-link" onClick={handleLogOut}>Log Out</button></li>
              </>
            ) : (
              <li><Link to="/login">Log In</Link></li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
