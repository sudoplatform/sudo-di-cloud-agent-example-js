import React, { ChangeEvent, KeyboardEvent, ReactElement, useEffect, useState } from 'react';
import HttpToBackend from '../../HttpToBackend';
import { focusOnStep, renderPointerOnStep, sleep } from '../../util';

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
  issuerDid: string;
  setIssuerDid: (issuerDid: string) => void;
}

/**
 * A React component for the UI section "Issue Credential".
 */
export const IssueCredential = (props: Props): ReactElement => {
  // the following state is inherited from the over-arching application
  const step = props.step;
  const setStep = props.setStep;
  const connectionId = props.connectionId;
  const issuerDid = props.issuerDid;
  const setIssuerDid = props.setIssuerDid;

  // the following state is unique to this component
  const [attributeGivenName, setAttributeGivenName] = useState('');
  const [attributeFamilyName, setAttributeFamilyName] = useState('');
  const [credentialExchangeId, setCredentialExchangeId] = useState('');
  const [credentialExchangeState, setCredentialExchangeState] = useState('');
  const [sendCredentialOfferStatus, setSendCredentialOfferStatus] = useState('');
  const [acceptCredentialOfferStatus, setAcceptCredentialOfferStatus] = useState('');

  /**
   * Event handler.
   * Keep the value in the "Enter Credential Data > given name" text field up-to-date with the user's input.
   */
  const handleOnChangeAttributeGivenName = (event: ChangeEvent<HTMLInputElement>) => {
    if (![ExampleStep.SetCredentialData, ExampleStep.SendCredentialOffer].includes(step)) {
      return;
    }

    const newAttributeGivenName = event.target.value;
    setAttributeGivenName(newAttributeGivenName);

    const nextStep =
      newAttributeGivenName.length > 0 && attributeFamilyName.length > 0
        ? ExampleStep.SendCredentialOffer
        : ExampleStep.SetCredentialData;
    setStep(nextStep);
  };

  /**
   * Event handler.
   * Keep the value in the "Enter Credential Data > family name" text field up-to-date with the user's input.
   */
  const handleOnChangeAttributeFamilyName = (event: ChangeEvent<HTMLInputElement>) => {
    if (![ExampleStep.SetCredentialData, ExampleStep.SendCredentialOffer].includes(step)) {
      return;
    }

    const newAttributeFamilyName = event.target.value;
    setAttributeFamilyName(newAttributeFamilyName);

    const nextStep =
      newAttributeFamilyName.length > 0 && attributeGivenName.length > 0
        ? ExampleStep.SendCredentialOffer
        : ExampleStep.SetCredentialData;
    setStep(nextStep);
  };

  /**
   * Event handler.
   * While the browser focus is on the "given name" text field, allow the user to press the "Enter" key
   * to jump to the "family name" text field.
   */
  const handleOnEnterKeyUpGivenName = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    const textField = document.getElementById('attributeFamilyNameTxt');
    if (textField) {
      textField.focus();
    }
  };

  /**
   * Event handler.
   * While the browser focus is on the "family name" text field, allow the user to press the "Enter" key
   * to trigger the "Send Credential Offer" button.
   */
  const handleOnEnterKeyUpFamilyName = (event: KeyboardEvent<HTMLInputElement>) => {
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
      givenName: attributeGivenName,
      familyName: attributeFamilyName,
    };

    const responseData = await HttpToBackend.sendW3cCredentialOffer(connectionId, credentialData);
    setCredentialExchangeId(responseData.credentialExchangeId);
    setIssuerDid(responseData.issuerDid);

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
   * credential exchange state to change to "credential-issued" or "done". Note that agents are not required
   * to respond with an "ack", although it is preferable that they do. Also, for visibility, keep the value of
   * "Credential Exchange State" up-to-date in the UI.
   */
  const pollCredentialExchangeState = async () => {
    let isAccepted = false;
    let responseData;

    while (!isAccepted) {
      responseData = await HttpToBackend.getW3cCredentialExchangeState(credentialExchangeId);
      isAccepted = responseData.state === 'credential-issued' || responseData.state === 'done';
      setCredentialExchangeState(responseData.state);
      await sleep(1000);
    }

    setAcceptCredentialOfferStatus('Credential Issued');
    setStep(ExampleStep.Done);

    /**
     * The "Issue Credential" step of the example flow is done at this point. However, for visibility,
     * continue polling the backend and update the exchange state in the UI until the final state
     * is reached (i.e. "done").
     */
    let isAcked = false;
    while (!isAcked) {
      responseData = await HttpToBackend.getW3cCredentialExchangeState(credentialExchangeId);
      isAcked = responseData.state === 'done';
      setCredentialExchangeState(responseData.state);
      await sleep(1000);
    }
  };

  return (
    <div id="issueCredential">
      <table>
        <tbody>
          <tr>
            <th colSpan={3}>Issue Credential</th>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.SetCredentialData)}>
            <td>{renderPointerOnStep(step, ExampleStep.SetCredentialData)}</td>
            <td colSpan={2}>Enter data for the new "Resident" credential:</td>
            <td></td>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.SetCredentialData)}>
            <td></td>
            <td className="credential-attribute">
              <label htmlFor="attributeGivenNameTxt">given name:</label>
            </td>
            <td>
              <input
                type="text"
                id="attributeGivenNameTxt"
                value={attributeGivenName}
                onChange={handleOnChangeAttributeGivenName}
                onKeyUp={handleOnEnterKeyUpGivenName}
                disabled={![ExampleStep.SetCredentialData, ExampleStep.SendCredentialOffer].includes(step)}
              />
            </td>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.SetCredentialData)}>
            <td></td>
            <td className="credential-attribute">
              <label htmlFor="attributeFamilyNameTxt">family name:</label>
            </td>
            <td>
              <input
                type="text"
                id="attributeFamilyNameTxt"
                value={attributeFamilyName}
                onChange={handleOnChangeAttributeFamilyName}
                onKeyUp={handleOnEnterKeyUpFamilyName}
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
              Issuer DID: &nbsp;
              <span id="issuerDid" className="encodedString">
                {issuerDid.length > 0 ? issuerDid : '-'}
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
        </tbody>
      </table>
    </div>
  );
};
