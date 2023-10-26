/**
 * This enum defines the routes of the application.
 * The right-hand string value of the enum is the fragment identifier (#) which appends to the base URL.
 */
export enum Route {
  Home = 'home',
  AnoncredsIssueAndVerifyExampleFlow = 'anoncreds-issue-and-verify',
  W3CIssueAndVerifyExampleFlow = 'w3c-issue-and-verify',
  W3CHoldAndProveExampleFlow = 'w3c-hold-and-prove',
}

/**
 * This is a single-page application (SPA), so change routes using a fragment identifier (#) on the same HTML page.
 * Use of the fragment identifier (#) allows the user to refresh the browser window to reset an example flow
 * without returning them to the home/landing page.
 */
export const changeRoute = (route: Route) => {
  window.location.hash = route;
};

/**
 * Returns the fully qualified route. For example:
 *  input: home
 *  output: http://localhost:3000/#home
 */
export const getFullyQualifiedRoute = (route: Route) => {
  return `${window.location.origin}/#${route}`;
};
