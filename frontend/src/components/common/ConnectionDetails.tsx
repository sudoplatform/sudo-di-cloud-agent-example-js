import React, { ReactElement } from 'react';
import { focusOnStep } from '../../util';

interface Props {
  connectionAlias: string;
  connectionId: string;
  connectionState: string;
  focusOnConnectionState: boolean;
}

/**
 * A React component for the UI section "Connection Details".
 */
export const ConnectionDetails = (props: Props): ReactElement => {
  // the following state is inherited from the over-arching application
  const connectionAlias = props.connectionAlias;
  const connectionId = props.connectionId;
  const connectionState = props.connectionState;
  const focusOnConnectionState = props.focusOnConnectionState;

  return (
    <div id="connectionDetails">
      <table>
        <tbody>
          <tr>
            <th colSpan={3}>Connection Details</th>
          </tr>
          <tr>
            <td></td>
            <td>Connection Alias:</td>
            <td>
              <span id="connectionAlias">{connectionAlias.length > 0 ? connectionAlias : '-'}</span>
            </td>
          </tr>
          <tr>
            <td></td>
            <td>Connection ID:</td>
            <td>
              <span id="connectionId">{connectionId.length > 0 ? connectionId : '-'}</span>
            </td>
          </tr>
          <tr className={focusOnStep(focusOnConnectionState, true)}>
            <td></td>
            <td>Connection State:</td>
            <td>
              <span id="connectionState">{connectionState.length > 0 ? connectionState : '-'}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
