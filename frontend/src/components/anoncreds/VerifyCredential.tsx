import React, { ReactElement, useEffect, useState } from 'react';
import HttpToBackend from '../../HttpToBackend';
import { focusOnStep, renderPointerOnStep, sleep } from '../../util';

/**
 * This enum defines a sequence of steps used to guide the user through the example flow of this UI section.
 */
export enum ExampleStep {
  StandbyUntilReadyToVerify,
  RequestProofPresentation,
  WaitForRequestProofPresentation,
  PresentProof,
  Done,
}

interface Props {
  step: ExampleStep;
  setStep: (step: ExampleStep) => void;
  connectionId: string;
  credDefId: string;
}

/**
 * A React component for the UI section "Verify Credential".
 */
export const VerifyCredential = (props: Props): ReactElement => {
  // the following state is inherited from the over-arching application
  const step = props.step;
  const setStep = props.setStep;
  const connectionId = props.connectionId;
  const credDefId = props.credDefId;

  // the following state is unique to this component
  const [attributeName, setAttributeName] = useState('');
  const [attributeExpiry, setAttributeExpiry] = useState('');
  const [presentationExchangeId, setPresentationExchangeId] = useState('');
  const [presentationExchangeState, setPresentationExchangeState] = useState('');
  const [sendPresentationRequestStatus, setSendPresentationRequestStatus] = useState('');
  const [verifyPresentationStatus, setVerifyPresentationStatus] = useState('');

  /**
   * Event handler.
   * Contact the backend to verify a credential when the "Request Proof of Registration" button is clicked.
   */
  const handleOnClickRequestProofPresentation = async () => {
    if (step !== ExampleStep.RequestProofPresentation) {
      return;
    }

    setSendPresentationRequestStatus('In Progress');
    setStep(ExampleStep.WaitForRequestProofPresentation);

    const responseData = await HttpToBackend.sendAnoncredsProofRequest(connectionId, credDefId);
    setPresentationExchangeId(responseData.presentationExchangeId);

    setSendPresentationRequestStatus('Done');
    setVerifyPresentationStatus('Waiting For Holder');
    setStep(ExampleStep.PresentProof);
  };

  /**
   * Use React's "useEffect" hook to ensure React updates all of its state before polling the backend
   * when the Present Proof step begins. This is necessary to ensure "presentationExchangeId" is set before
   * using its value in requests to the backend.
   */
  useEffect(() => {
    if (step === ExampleStep.PresentProof) {
      void pollProofPresentationExchangeState();
    }
  }, [step]);

  /**
   * Poll the backend, waiting for the holder's wallet app to respond to the proof presentation request
   * and waiting for the presentation exchange state to change to "verified". Also, for visibility,
   * keep the value of "Presentation Exchange State" up-to-date in the UI.
   */
  const pollProofPresentationExchangeState = async () => {
    let isExchangeComplete = false;
    let isVerified = false;
    let responseData;

    while (!isExchangeComplete) {
      responseData = await HttpToBackend.getAnoncredsProofPresentationExchangeState(presentationExchangeId);
      isExchangeComplete = responseData.state === 'verified';
      isVerified = responseData.verified;
      setPresentationExchangeState(responseData.state);
      setAttributeName(responseData.revealedAttributes.name ?? '');
      setAttributeExpiry(responseData.revealedAttributes.expiry ?? '');
      await sleep(1000);
    }

    const displayedStatus = isVerified ? 'Credential Verified' : 'Credential Failed Verification';
    setVerifyPresentationStatus(displayedStatus);

    setStep(ExampleStep.Done);
  };

  return (
    <div id="verifyCredential">
      <table>
        <tbody>
          <tr>
            <th colSpan={3}>Verify Credential</th>
          </tr>
          <tr className={focusOnStep(step, [ExampleStep.RequestProofPresentation])}>
            <td>
              {renderPointerOnStep(step, [
                ExampleStep.RequestProofPresentation,
                ExampleStep.WaitForRequestProofPresentation,
              ])}
            </td>
            <td>
              <button
                type="button"
                id="requestProofPresentationBtn"
                onClick={handleOnClickRequestProofPresentation}
                disabled={step !== ExampleStep.RequestProofPresentation}>
                Request Proof of Registration
              </button>
            </td>
            <td>
              <span id="requestProofPresentationStatus">
                {sendPresentationRequestStatus.length > 0 ? `[${sendPresentationRequestStatus}]` : '-'}
              </span>
            </td>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.PresentProof)}>
            <td>{renderPointerOnStep(step, ExampleStep.PresentProof)}</td>
            <td>Present Proof:</td>
            <td>
              <span id="presentProofInstructions">
                Use your chosen holder's wallet app to present the issued "Registration" credential for verification.
              </span>
            </td>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.PresentProof)}>
            <td></td>
            <td></td>
            <td>
              Presentation Exchange State:&nbsp;
              <span id="proofPresentationExchangeState">
                {presentationExchangeState.length > 0 ? presentationExchangeState : '-'}
              </span>
            </td>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.PresentProof)}>
            <td></td>
            <td colSpan={2}>Data from the presented "Registration" credential:</td>
            <td></td>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.PresentProof)}>
            <td></td>
            <td className="credential-attribute">name:</td>
            <td>
              <span id="attributeName">{attributeName.length > 0 ? attributeName : '-'}</span>
            </td>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.PresentProof)}>
            <td></td>
            <td className="credential-attribute">expiry:</td>
            <td>
              <span id="attributeExpiry">{attributeExpiry.length > 0 ? attributeExpiry : '-'}</span>
            </td>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.PresentProof)}>
            <td></td>
            <td>Status:</td>
            <td>
              <span id="verifyPresentationStatus">
                {verifyPresentationStatus.length > 0 ? `[${verifyPresentationStatus}]` : '-'}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
