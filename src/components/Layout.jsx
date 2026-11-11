import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import NavBar from './NavBar.jsx';

/**
 * Every page: navigation bar, then the page body. Pages render their own
 * <ActionBar> for the main button pinned to the bottom of the screen.
 */
export default function Layout() {
  const { pathname } = useLocation();
  const firstRender = useRef(true);

  // After client-side navigation, start at the top and move focus to the new
  // page's heading so screen reader and keyboard users know the page changed.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    const heading = document.querySelector('main h1');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }, [pathname]);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <NavBar />
      {/* data-path names the route currently drawn, so tests can wait for a page change to finish. */}
      <main id="main" className="page" tabIndex={-1} data-path={pathname}>
        <Outlet />
      </main>
    </>
  );
}
