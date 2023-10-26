import React, { ChangeEvent, KeyboardEvent, ReactElement, useEffect, useState } from 'react';
import HttpToBackend from '../../HttpToBackend';
import { focusOnStep, renderPointerOnStep, sleep } from '../../util';

/**
 * This enum defines a sequence of steps used to guide the user through the example flow of this UI section.
 */
export enum ExampleStep {
  SetConnectionAlias,
  SetInvitationUrl,
  AcceptInvitation,
  WaitForInvitationAcceptance,
  WaitForConnectionActive,
  Done,
}

interface Props {
  step: ExampleStep;
  connectionAlias: string;
  connectionId: string;
  setStep: (step: ExampleStep) => void;
  setConnectionAlias: (connectionAlias: string) => void;
  setConnectionId: (connectionId: string) => void;
  setConnectionState: (connectionState: string) => void;
}

/**
 * A React component for the UI section "Establish Connection to Issuer/Verifier".
 */
export const EstablishConnectionAsInvitee = (props: Props): ReactElement => {
  // the following state is inherited from the over-arching application
  const step = props.step;
  const connectionAlias = props.connectionAlias;
  const connectionId = props.connectionId;
  const setStep = props.setStep;
  const setConnectionAlias = props.setConnectionAlias;
  const setConnectionId = props.setConnectionId;
  const setConnectionState = props.setConnectionState;

  // the following state is unique to this component
  const [invitationUrl, setInvitationUrl] = useState('');
  const [invitationAcceptanceStatus, setInvitationAcceptanceStatus] = useState('');
  const [invitationProgressStatus, setInvitationProgressStatus] = useState('');

  /**
   * Event handler.
   * Keep the value in the "Enter Connection Alias" text field up-to-date with the user's input.
   */
  const handleOnChangeConnectionAlias = (event: ChangeEvent<HTMLInputElement>) => {
    if (![ExampleStep.SetConnectionAlias, ExampleStep.SetInvitationUrl, ExampleStep.AcceptInvitation].includes(step)) {
      return;
    }

    const newConnectionAlias = event.target.value;
    setConnectionAlias(newConnectionAlias);

    const nextStep =
      newConnectionAlias.length > 0
        ? invitationUrl.length > 0
          ? ExampleStep.AcceptInvitation
          : ExampleStep.SetInvitationUrl
        : ExampleStep.SetConnectionAlias;
    setStep(nextStep);
  };

  /**
   * Event handler.
   * Keep the value in the "Enter Invitation URL" text field up-to-date with the user's input.
   */
  const handleOnChangeInvitationUrl = (event: ChangeEvent<HTMLInputElement>) => {
    if (![ExampleStep.SetConnectionAlias, ExampleStep.SetInvitationUrl, ExampleStep.AcceptInvitation].includes(step)) {
      return;
    }

    const newInvitationUrl = event.target.value;
    setInvitationUrl(newInvitationUrl);

    const nextStep =
      newInvitationUrl.length > 0
        ? connectionAlias.length > 0
          ? ExampleStep.AcceptInvitation
          : ExampleStep.SetConnectionAlias
        : ExampleStep.SetInvitationUrl;
    setStep(nextStep);
  };

  /**
   * Event handler.
   * While the browser focus is on the "Enter Connection Alias" text field, allow the user to press the "Enter" key
   * to jump to the "Enter Invitation URL" text field.
   */
  const handleOnEnterKeyUpConnectionAlias = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    const textField = document.getElementById('invitationUrlTxt');
    if (textField) {
      textField.focus();
    }
  };

  /**
   * Event handler.
   * While the browser focus is on the "Enter Invitation URL" text field, allow the user to press the "Enter" key
   * to trigger the "Accept Connection Invitation" button.
   */
  const handleOnEnterKeyUpInvitationUrl = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    const button = document.getElementById('acceptInvitationBtn');
    if (button) {
      button.click();
    }
  };

  /**
   * Event handler.
   * Contact the backend to accept the connection invitation when the "Accept Connection Invitation" button is clicked.
   */
  const handleOnClickAcceptInvitation = async () => {
    if (step !== ExampleStep.AcceptInvitation) {
      return;
    }

    setInvitationAcceptanceStatus('In Progress');
    setStep(ExampleStep.WaitForInvitationAcceptance);

    const responseData = await HttpToBackend.acceptConnectionInvitation(connectionAlias, invitationUrl);
    setConnectionId(responseData.connectionId);

    setInvitationAcceptanceStatus('Done');
    setInvitationProgressStatus('Waiting For Issuer/Verifier');
    setStep(ExampleStep.WaitForConnectionActive);
  };

  /**
   * Use React's "useEffect" hook to ensure React updates all of its state before polling the backend
   * when the WaitForConnectionActive step begins. This is necessary to ensure "connectionId" is set before
   * using its value in requests to the backend.
   */
  useEffect(() => {
    if (step === ExampleStep.WaitForConnectionActive) {
      void pollConnectionState();
    }
  }, [step]);

  /**
   * Poll the backend, waiting for the issuer/verifier to acknowledge acceptance of the invitation and waiting
   * for the connection state to change to "active". Also, for visibility, keep the value of "Connection State"
   * up-to-date in the UI.
   */
  const pollConnectionState = async () => {
    let isActive = false;
    let responseData;

    while (!isActive) {
      responseData = await HttpToBackend.getConnectionState(connectionId);
      isActive = responseData.state === 'active';
      setConnectionState(responseData.state);
      await sleep(1000);
    }

    setInvitationProgressStatus('Connection Established');
    setStep(ExampleStep.Done);
  };

  return (
    <div id="establishConnection">
      <table>
        <tbody>
          <tr>
            <th colSpan={3}>Establish Connection to Issuer/Verifier</th>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.SetConnectionAlias)}>
            <td>{renderPointerOnStep(step, ExampleStep.SetConnectionAlias)}</td>
            <td>
              <label htmlFor="connectionAliasTxt">Enter Connection Alias:</label>
            </td>
            <td>
              <input
                type="text"
                id="connectionAliasTxt"
                value={connectionAlias}
                onChange={handleOnChangeConnectionAlias}
                onKeyUp={handleOnEnterKeyUpConnectionAlias}
                disabled={
                  ![
                    ExampleStep.SetConnectionAlias,
                    ExampleStep.SetInvitationUrl,
                    ExampleStep.AcceptInvitation,
                  ].includes(step)
                }
              />
            </td>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.SetInvitationUrl)}>
            <td>{renderPointerOnStep(step, ExampleStep.SetInvitationUrl)}</td>
            <td>
              <label htmlFor="invitationUrlTxt">Enter Invitation URL:</label>
            </td>
            <td>
              <input
                type="text"
                id="invitationUrlTxt"
                value={invitationUrl}
                onChange={handleOnChangeInvitationUrl}
                onKeyUp={handleOnEnterKeyUpInvitationUrl}
                disabled={
                  ![
                    ExampleStep.SetConnectionAlias,
                    ExampleStep.SetInvitationUrl,
                    ExampleStep.AcceptInvitation,
                  ].includes(step)
                }
              />
            </td>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.AcceptInvitation)}>
            <td>
              {renderPointerOnStep(step, [ExampleStep.AcceptInvitation, ExampleStep.WaitForInvitationAcceptance])}
            </td>
            <td>
              <button
                type="button"
                id="acceptInvitationBtn"
                onClick={handleOnClickAcceptInvitation}
                disabled={step !== ExampleStep.AcceptInvitation}>
                Accept Connection Invitation
              </button>
            </td>
            <td>
              <span id="invitationAcceptanceStatus">
                {invitationAcceptanceStatus.length > 0 ? `[${invitationAcceptanceStatus}]` : '-'}
              </span>
            </td>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.WaitForConnectionActive)}>
            <td>{renderPointerOnStep(step, [ExampleStep.WaitForConnectionActive])}</td>
            <td>Status:</td>
            <td>
              <span id="invitationProgressStatus">
                {invitationProgressStatus.length > 0 ? `[${invitationProgressStatus}]` : '-'}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
