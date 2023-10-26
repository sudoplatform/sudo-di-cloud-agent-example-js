import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { AnoncredsIssueAndVerifyExampleFlow } from './components/anoncreds';
import { Home } from './components/Home';
import { W3CHoldAndProveExampleFlow, W3CIssueAndVerifyExampleFlow } from './components/w3c';
import { changeRoute, Route } from './Routes';

/**
 * A React component containing the entire frontend application.
 * This is a single-page application (SPA). Routing is handled by this component.
 */
export const App = (): ReactElement => {
  // the route which the user is currently viewing
  const [activeRoute, setActiveRoute] = useState(Route.Home);

  // on app initialization
  useEffect(() => {
    window.addEventListener('load', router);
    window.addEventListener('hashchange', router);
  }, []);

  const router = useCallback(() => {
    const url = window.location.hash.slice(1); // slice removes the hash character
    resolveRoute(url);
  }, []);

  const resolveRoute = useCallback((url: string) => {
    for (const [key, value] of Object.entries(Route)) {
      if (url === value) {
        setActiveRoute(Route[key as keyof typeof Route]);
        return;
      }
    }
    // if the requested url matches no defined routes, then re-route to the home page
    changeRoute(Route.Home);
  }, []);

  return (
    <div id="app">
      {activeRoute === Route.Home && <Home />}
      {activeRoute === Route.AnoncredsIssueAndVerifyExampleFlow && <AnoncredsIssueAndVerifyExampleFlow />}
      {activeRoute === Route.W3CIssueAndVerifyExampleFlow && <W3CIssueAndVerifyExampleFlow />}
      {activeRoute === Route.W3CHoldAndProveExampleFlow && <W3CHoldAndProveExampleFlow />}
    </div>
  );
};
