import React, { ReactElement } from 'react';
import { changeRoute, Route } from '../../Routes';

/**
 * A React component for the UI button to go back to the Home page.
 */
export const HomeButton = (): ReactElement => {
  return (
    <button type="button" id="goBackHomeBtn" onClick={() => changeRoute(Route.Home)}>
      Go back
    </button>
  );
};
