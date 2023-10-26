import React, { ChangeEvent, KeyboardEvent, ReactElement, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import HttpToBackend from '../../HttpToBackend';
import { focusOnStep, renderPointerOnStep, sleep } from '../../util';

/**
 * This enum defines a sequence of steps used to guide the user through the example flow of this UI section.
 */
export enum ExampleStep {
  SetConnectionAlias,
  CreateInvitation,
  WaitForInvitationCreation,
  AcceptInvitation,
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
 * A React component for the UI section "Establish Connection to Holder's Wallet".
 */
export const EstablishConnectionAsInviter = (props: Props): ReactElement => {
  // the following state is inherited from the over-arching application
  const step = props.step;
  const connectionAlias = props.connectionAlias;
  const connectionId = props.connectionId;
  const setStep = props.setStep;
  const setConnectionAlias = props.setConnectionAlias;
  const setConnectionId = props.setConnectionId;
  const setConnectionState = props.setConnectionState;

  // the following state is unique to this component
  const [invitationCreationStatus, setInvitationCreationStatus] = useState('');
  const [invitationUrl, setInvitationUrl] = useState('');
  const [invitationProgressStatus, setInvitationProgressStatus] = useState('');

  /**
   * Event handler.
   * Keep the value in the "Enter Connection Alias" text field up-to-date with the user's input.
   */
  const handleOnChangeConnectionAlias = (event: ChangeEvent<HTMLInputElement>) => {
    if (![ExampleStep.SetConnectionAlias, ExampleStep.CreateInvitation].includes(step)) {
      return;
    }

    const newConnectionAlias = event.target.value;
    setConnectionAlias(newConnectionAlias);

    const nextStep = newConnectionAlias.length > 0 ? ExampleStep.CreateInvitation : ExampleStep.SetConnectionAlias;
    setStep(nextStep);
  };

  /**
   * Event handler.
   * While the browser focus is on the "Enter Connection Alias" text field, allow the user to press the "Enter" key
   * to trigger the "Create Connection Invitation" button.
   */
  const handleOnEnterKeyUpConnectionAlias = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    const button = document.getElementById('createInvitationBtn');
    if (button) {
      button.click();
    }
  };

  /**
   * Event handler.
   * Contact the backend to create a connection invitation when the "Create Connection Invitation" button is clicked.
   */
  const handleOnClickCreateInvitation = async () => {
    if (step !== ExampleStep.CreateInvitation) {
      return;
    }

    setInvitationCreationStatus('In Progress');
    setStep(ExampleStep.WaitForInvitationCreation);

    const responseData = await HttpToBackend.createConnectionInvitation(connectionAlias);
    setConnectionId(responseData.connectionId);
    setInvitationUrl(responseData.invitationUrl);

    setInvitationCreationStatus('Done');
    setInvitationProgressStatus('Waiting For Holder');
    setStep(ExampleStep.AcceptInvitation);
  };

  /**
   * Use React's "useEffect" hook to ensure React updates all of its state before polling the backend
   * when the Accept Invitation step begins. This is necessary to ensure "connectionId" is set before
   * using its value in requests to the backend.
   */
  useEffect(() => {
    if (step === ExampleStep.AcceptInvitation) {
      void pollConnectionState();
    }
  }, [step]);

  /**
   * Poll the backend, waiting for the holder's wallet app to accept the invitation and waiting for the connection state
   * to change to "response" or "active". Also, for visibility, keep the value of "Connection State" up-to-date
   * in the UI.
   */
  const pollConnectionState = async () => {
    let isReady = false;
    let responseData;

    while (!isReady) {
      responseData = await HttpToBackend.getConnectionState(connectionId);
      isReady = responseData.state === 'response' || responseData.state === 'active';
      setConnectionState(responseData.state);
      await sleep(1000);
    }

    setInvitationProgressStatus('Connection Established');
    setStep(ExampleStep.Done);

    /**
     * The "Establish Connection" step of the example flow is done at this point. However, for visibility,
     * continue polling the backend and update the connection state in the UI until the final state
     * is reached (i.e. "active").
     */
    let isActive = false;
    while (!isActive) {
      responseData = await HttpToBackend.getConnectionState(connectionId);
      isActive = responseData.state === 'active';
      setConnectionState(responseData.state);
      await sleep(1000);
    }
  };

  return (
    <div id="establishConnection">
      <table>
        <tbody>
          <tr>
            <th colSpan={3}>Establish Connection to Holder's Wallet</th>
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
                disabled={![ExampleStep.SetConnectionAlias, ExampleStep.CreateInvitation].includes(step)}
              />
            </td>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.CreateInvitation)}>
            <td>{renderPointerOnStep(step, [ExampleStep.CreateInvitation, ExampleStep.WaitForInvitationCreation])}</td>
            <td>
              <button
                type="button"
                id="createInvitationBtn"
                onClick={handleOnClickCreateInvitation}
                disabled={step !== ExampleStep.CreateInvitation}>
                Create Connection Invitation
              </button>
            </td>
            <td>
              <span id="invitationCreationStatus">
                {invitationCreationStatus.length > 0 ? `[${invitationCreationStatus}]` : '-'}
              </span>
            </td>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.AcceptInvitation)}>
            <td>{renderPointerOnStep(step, ExampleStep.AcceptInvitation)}</td>
            <td rowSpan={5}>Accept Invitation:</td>
            <td>
              <span id="invitationInstructions">
                Use your chosen app for the holder to accept the invitation and complete the connection. You can either
                scan the below QR code using a mobile wallet app, or enter the below URL into a web app.
              </span>
            </td>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.AcceptInvitation)}>
            <td></td>
            <td>&nbsp;</td>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.AcceptInvitation)}>
            <td></td>
            <td>{invitationUrl.length > 0 ? <QRCodeSVG value={invitationUrl} size={256} /> : '-'}</td>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.AcceptInvitation)}>
            <td></td>
            <td>
              <span id="invitationUrl" className="encodedString">
                {invitationUrl.length > 0 ? invitationUrl : '-'}
              </span>
            </td>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.AcceptInvitation)}>
            <td></td>
            <td>&nbsp;</td>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.AcceptInvitation)}>
            <td></td>
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
