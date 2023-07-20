import React from 'react';
import { focusOnStep } from '../util/exampleFlow';
import { ExampleStep } from './EstablishConnection';

interface Props {
  step: ExampleStep;
  connectionAlias: string;
  connectionId: string;
  connectionState: string;
}

/**
 * A React component for the UI section "Connection Details".
 */
export const ConnectionDetails: React.FC<Props> = (props) => {
  // the following state is inherited from the over-arching application
  const step = props.step;
  const connectionAlias = props.connectionAlias;
  const connectionId = props.connectionId;
  const connectionState = props.connectionState;

  return (
    <div id="connectionDetails">
      <table>
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
        <tr className={focusOnStep(step, ExampleStep.AcceptInvitation)}>
          <td></td>
          <td>Connection State:</td>
          <td>
            <span id="connectionState">{connectionState.length > 0 ? connectionState : '-'}</span>
          </td>
        </tr>
      </table>
    </div>
  );
};
