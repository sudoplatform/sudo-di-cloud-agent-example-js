import React, { ReactElement, useEffect, useState } from 'react';
import HttpToBackend from '../../HttpToBackend';
import { focusOnStep, renderPointerOnStep, sleep } from '../../util';

/**
 * This enum defines a sequence of steps used to guide the user through the example flow of this UI section.
 */
export enum ExampleStep {
  StandbyUntilReadyToReceive,
  WaitToReceiveProofRequest,
  SendProofPresentation,
  WaitForSendProofPresentation,
  WaitForPresentationExchangeDoneState,
  Done,
}

interface Props {
  step: ExampleStep;
  setStep: (step: ExampleStep) => void;
  connectionId: string;
  credentialId: string;
}

/**
 * A React component for the UI section "Present Credential".
 */
export const PresentCredential = (props: Props): ReactElement => {
  // the following state is inherited from the over-arching application
  const step = props.step;
  const setStep = props.setStep;
  const connectionId = props.connectionId;
  const credentialId = props.credentialId;

  // the following state is unique to this component
  const [presentationExchangeId, setPresentationExchangeId] = useState('');
  const [presentationExchangeState, setPresentationExchangeState] = useState('');
  const [sendProofPresentationStatus, setSendProofPresentationStatus] = useState('');

  /**
   * When the right moment in the flow has come, poll the backend until a proof request is received.
   */
  useEffect(() => {
    if (step === ExampleStep.WaitToReceiveProofRequest) {
      void pollForProofRequest();
    }
  }, [step]);

  /**
   * Poll the backend, waiting for the holder's wallet app to receive a proof request.
   */
  const pollForProofRequest = async () => {
    let isReceived = false;
    let responseData;

    while (!isReceived) {
      responseData = await HttpToBackend.getW3cProofRequest(connectionId);
      isReceived = responseData.presentationExchangeId !== undefined;
      await sleep(1000);
    }

    setPresentationExchangeId(responseData?.presentationExchangeId ?? '');

    setStep(ExampleStep.SendProofPresentation);
  };

  /**
   * Event handler.
   * Contact the backend to send the proof presentation when the "Send Proof Presentation" button is clicked.
   */
  const handleOnClickSendProofPresentation = async () => {
    if (step !== ExampleStep.SendProofPresentation) {
      return;
    }

    setSendProofPresentationStatus('In Progress');
    setStep(ExampleStep.WaitForSendProofPresentation);

    const responseData = await HttpToBackend.sendW3cProofPresentation(presentationExchangeId, credentialId);
    setPresentationExchangeState(responseData.state);

    setSendProofPresentationStatus('Done');
    setStep(ExampleStep.WaitForPresentationExchangeDoneState);
  };

  /**
   * When the right moment in the flow has come, poll the backend until the presentation exchange
   * enters the "done" state.
   */
  useEffect(() => {
    if (step === ExampleStep.WaitForPresentationExchangeDoneState) {
      void pollProofPresentationExchangeState();
    }
  }, [step]);

  /**
   * Poll the backend, waiting for acknowledgement from the verifier that the proof presentation has been received
   * and waiting for the presentation exchange state to change to "done".
   * Also, for visibility, keep the value of "Presentation Exchange State" up-to-date in the UI.
   *
   * NOTE: The prover does not receive any notification from the verifier on whether the sent proof presentation was
   * actually accepted/verified.
   */
  const pollProofPresentationExchangeState = async () => {
    let isExchangeComplete = false;
    let responseData;

    while (!isExchangeComplete) {
      responseData = await HttpToBackend.getW3cProofPresentationExchangeState(presentationExchangeId);
      isExchangeComplete = responseData.state === 'done';
      setPresentationExchangeState(responseData.state);
      await sleep(1000);
    }

    setStep(ExampleStep.Done);
  };

  return (
    <div id="presentCredential">
      <table>
        <tbody>
          <tr>
            <th colSpan={3}>Present Credential</th>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.WaitToReceiveProofRequest)}>
            <td>{renderPointerOnStep(step, ExampleStep.WaitToReceiveProofRequest)}</td>
            <td>Receive Proof Request:</td>
            <td>
              <span id="receiveProofRequestInstructions">
                Use the connection with the verifier to send a proof request to this holder/prover.
              </span>
            </td>
          </tr>
          <tr
            className={focusOnStep(step, [
              ExampleStep.SendProofPresentation,
              ExampleStep.WaitForSendProofPresentation,
              ExampleStep.WaitForPresentationExchangeDoneState,
            ])}>
            <td></td>
            <td></td>
            <td>
              Presentation Exchange State:&nbsp;
              <span id="presentationExchangeState">
                {presentationExchangeState.length > 0 ? presentationExchangeState : '-'}
              </span>
            </td>
          </tr>
          <tr className={focusOnStep(step, [ExampleStep.SendProofPresentation])}>
            <td>
              {renderPointerOnStep(step, [ExampleStep.SendProofPresentation, ExampleStep.WaitForSendProofPresentation])}
            </td>
            <td>
              <button
                type="button"
                id="sendProofPresentationBtn"
                onClick={handleOnClickSendProofPresentation}
                disabled={step !== ExampleStep.SendProofPresentation}>
                Send Proof Presentation
              </button>
            </td>
            <td>
              <span id="sendProofPresentationStatus">
                {sendProofPresentationStatus.length > 0 ? `[${sendProofPresentationStatus}]` : '-'}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
