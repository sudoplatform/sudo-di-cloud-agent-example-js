import React, { ChangeEvent, KeyboardEvent, useEffect, useState } from 'react';
import { focusOnStep, renderPointerOnStep } from '../util/exampleFlow';
import HttpToBackend from '../util/httpToBackend';
import { sleep } from '../util/helperFunctions';

/**
 * This enum defines a sequence of steps used to guide the user through the example flow of this UI section.
 */
export enum ExampleStep {
  StandbyUntilReadyToIssue,
  SetCredentialData,
  SendCredentialOffer,
  WaitForSendCredentialOffer,
  AcceptCredential,
  Done,
}

interface Props {
  step: ExampleStep;
  setStep: (step: ExampleStep) => void;
  connectionId: string;
  credDefId: string;
}

/**
 * A React component for the UI section "Issue Credential".
 */
export const IssueCredential: React.FC<Props> = (props) => {
  // the following state is inherited from the over-arching application
  const step = props.step;
  const setStep = props.setStep;
  const connectionId = props.connectionId;
  const credDefId = props.credDefId;

  // the following state is unique to this component
  const [attributeName, setAttributeName] = useState('');
  const [attributeExpiry, setAttributeExpiry] = useState('');
  const [credentialExchangeId, setCredentialExchangeId] = useState('');
  const [credentialExchangeState, setCredentialExchangeState] = useState('');
  const [sendCredentialOfferStatus, setSendCredentialOfferStatus] = useState('');
  const [acceptCredentialOfferStatus, setAcceptCredentialOfferStatus] = useState('');

  /**
   * Event handler.
   * Keep the value in the "Enter Credential Data > name" text field up-to-date with the user's input.
   */
  const handleOnChangeAttributeName = (event: ChangeEvent<HTMLInputElement>) => {
    if (![ExampleStep.SetCredentialData, ExampleStep.SendCredentialOffer].includes(step)) {
      return;
    }

    const newAttributeName = event.target.value;
    setAttributeName(newAttributeName);

    const nextStep =
      newAttributeName.length > 0 && attributeExpiry.length > 0
        ? ExampleStep.SendCredentialOffer
        : ExampleStep.SetCredentialData;
    setStep(nextStep);
  };

  /**
   * Event handler.
   * Keep the value in the "Enter Credential Data > expiry" text field up-to-date with the user's input.
   */
  const handleOnChangeAttributeExpiry = (event: ChangeEvent<HTMLInputElement>) => {
    if (![ExampleStep.SetCredentialData, ExampleStep.SendCredentialOffer].includes(step)) {
      return;
    }

    const newAttributeExpiry = event.target.value;
    setAttributeExpiry(newAttributeExpiry);

    const nextStep =
      newAttributeExpiry.length > 0 && attributeName.length > 0
        ? ExampleStep.SendCredentialOffer
        : ExampleStep.SetCredentialData;
    setStep(nextStep);
  };

  /**
   * Event handler.
   * While the browser focus is on the "Enter Connection Data" text fields, allow the user to press the "Enter" key
   * to trigger the "Send Credential Offer" button.
   */
  const handleOnEnterKeyUpCredentialData = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    const button = document.getElementById('sendCredentialOfferBtn');
    if (button) {
      button.click();
    }
  };

  /**
   * Event handler.
   * Contact the backend to issue a credential when the "Send Credential Offer" button is clicked.
   */
  const handleOnClickSendCredentialOffer = async () => {
    if (step !== ExampleStep.SendCredentialOffer) {
      return;
    }

    setSendCredentialOfferStatus('In Progress');
    setStep(ExampleStep.WaitForSendCredentialOffer);

    const credentialData = {
      name: attributeName,
      expiry: attributeExpiry,
    };

    const responseData = await HttpToBackend.sendCredentialOffer(connectionId, credDefId, credentialData);
    setCredentialExchangeId(responseData.credentialExchangeId);

    setSendCredentialOfferStatus('Done');
    setAcceptCredentialOfferStatus('Waiting For Holder');
    setStep(ExampleStep.AcceptCredential);
  };

  /**
   * Use React's "useEffect" hook to ensure React updates all of its state before polling the backend
   * when the Accept Credential step begins. This is necessary to ensure "credentialExchangeId" is set before
   * using its value in requests to the backend.
   */
  useEffect(() => {
    if (step === ExampleStep.AcceptCredential) {
      void pollCredentialExchangeState();
    }
  }, [step]);

  /**
   * Poll the backend, waiting for the holder's wallet app to accept the credential and waiting for the
   * credential exchange state to change to "credential_issued". Also, for visibility, keep the value of
   * "Credential Exchange State" up-to-date in the UI.
   */
  const pollCredentialExchangeState = async () => {
    let isAccepted = false;
    let responseData;

    while (!isAccepted) {
      responseData = await HttpToBackend.getCredentialExchangeState(credentialExchangeId);
      isAccepted = responseData.state === 'credential_issued';
      setCredentialExchangeState(responseData.state);
      await sleep(1000);
    }

    setAcceptCredentialOfferStatus('Credential Issued');
    setStep(ExampleStep.Done);
  };

  return (
    <div id="issueCredential">
      <table>
        <tr>
          <th colSpan={3}>Issue Credential</th>
        </tr>
        <tr className={focusOnStep(step, ExampleStep.SetCredentialData)}>
          <td>{renderPointerOnStep(step, ExampleStep.SetCredentialData)}</td>
          <td colSpan={2}>Enter data for the new "Registration" credential:</td>
          <td></td>
        </tr>
        <tr className={focusOnStep(step, ExampleStep.SetCredentialData)}>
          <td></td>
          <td className="credential-attribute">
            <label htmlFor="attributeNameTxt">name:</label>
          </td>
          <td>
            <input
              type="text"
              id="attributeNameTxt"
              value={attributeName}
              onChange={handleOnChangeAttributeName}
              onKeyUp={handleOnEnterKeyUpCredentialData}
              disabled={![ExampleStep.SetCredentialData, ExampleStep.SendCredentialOffer].includes(step)}
            />
          </td>
        </tr>
        <tr className={focusOnStep(step, ExampleStep.SetCredentialData)}>
          <td></td>
          <td className="credential-attribute">
            <label htmlFor="attributeExpiryTxt">expiry:</label>
          </td>
          <td>
            <input
              type="text"
              id="attributeExpiryTxt"
              value={attributeExpiry}
              onChange={handleOnChangeAttributeExpiry}
              onKeyUp={handleOnEnterKeyUpCredentialData}
              disabled={![ExampleStep.SetCredentialData, ExampleStep.SendCredentialOffer].includes(step)}
            />
          </td>
        </tr>
        <tr className={focusOnStep(step, [ExampleStep.SendCredentialOffer])}>
          <td>
            {renderPointerOnStep(step, [ExampleStep.SendCredentialOffer, ExampleStep.WaitForSendCredentialOffer])}
          </td>
          <td>
            <button
              type="button"
              id="sendCredentialOfferBtn"
              onClick={handleOnClickSendCredentialOffer}
              disabled={step !== ExampleStep.SendCredentialOffer}>
              Send Credential Offer
            </button>
          </td>
          <td>
            <span id="sendCredentialOfferStatus">
              {sendCredentialOfferStatus.length > 0 ? `[${sendCredentialOfferStatus}]` : '-'}
            </span>
          </td>
        </tr>
        <tr className={focusOnStep(step, ExampleStep.AcceptCredential)}>
          <td>{renderPointerOnStep(step, ExampleStep.AcceptCredential)}</td>
          <td>Accept Credential:</td>
          <td>
            <span id="acceptCredentialInstructions">
              Use your chosen holder's wallet app to accept the credential offer and complete issuance of the
              credential.
            </span>
          </td>
        </tr>
        <tr className={focusOnStep(step, ExampleStep.AcceptCredential)}>
          <td></td>
          <td></td>
          <td>
            Credential Exchange State:&nbsp;
            <span id="credentialExchangeState">
              {credentialExchangeState.length > 0 ? credentialExchangeState : '-'}
            </span>
          </td>
        </tr>
        <tr className={focusOnStep(step, ExampleStep.AcceptCredential)}>
          <td></td>
          <td>Status:</td>
          <td>
            <span id="acceptCredentialOfferStatus">
              {acceptCredentialOfferStatus.length > 0 ? `[${acceptCredentialOfferStatus}]` : '-'}
            </span>
          </td>
        </tr>
      </table>
    </div>
  );
};
