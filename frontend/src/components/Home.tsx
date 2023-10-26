import React, { ReactElement } from 'react';
import { changeRoute, Route } from '../Routes';

/**
 * A React component for the landing page of the application.
 */
export const Home = (): ReactElement => {
  return (
    <div id="home">
      <h2>
        <u>Sudo DI Cloud Agent Example JS</u>
      </h2>
      Welcome! Select an example flow to continue...
      <br />
      <br />
      <table>
        <tbody>
          <tr>
            <th colSpan={3}>AnonCreds example flows:</th>
          </tr>
          <tr>
            <td>
              <button
                type="button"
                id="anoncredsIssueAndVerifyExampleFlowBtn"
                onClick={() => changeRoute(Route.AnoncredsIssueAndVerifyExampleFlow)}>
                Issue & verify AnonCreds credential
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <br />
      <table>
        <tbody>
          <tr>
            <th colSpan={3}>W3C example flows:</th>
          </tr>
          <tr>
            <td>
              <button
                type="button"
                id="w3cIssueAndVerifyExampleFlowBtn"
                onClick={() => changeRoute(Route.W3CIssueAndVerifyExampleFlow)}>
                Issue & verify W3C Verifiable Credential
              </button>
            </td>
          </tr>
          <tr>
            <td>
              <button
                type="button"
                id="w3cHoldAndProveExampleFlowBtn"
                onClick={() => changeRoute(Route.W3CHoldAndProveExampleFlow)}>
                Hold & prove W3C Verifiable Credential
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
