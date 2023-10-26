import React, { ReactElement, useEffect, useState } from 'react';
import HttpToBackend from '../../HttpToBackend';
import { focusOnStep, renderPointerOnStep, sleep } from '../../util';

/**
 * This enum defines a sequence of steps used to guide the user through the example flow of this UI section.
 */
export enum ExampleStep {
  StandbyUntilReadyToReceive,
  WaitToReceiveCredentialOffer,
  AcceptCredentialOffer,
  WaitForAcceptCredentialOffer,
  WaitToReceiveCredential,
  Done,
}

interface Props {
  step: ExampleStep;
  setStep: (step: ExampleStep) => void;
  connectionId: string;
  setCredentialId: (credentialId: string) => void;
}

/**
 * A React component for the UI section "Accept Credential Offer".
 */
export const AcceptCredentialOffer = (props: Props): ReactElement => {
  // the following state is inherited from the over-arching application
  const step = props.step;
  const setStep = props.setStep;
  const connectionId = props.connectionId;
  const setCredentialId = props.setCredentialId;

  // the following state is unique to this component
  const [attributeGivenName, setAttributeGivenName] = useState('');
  const [attributeFamilyName, setAttributeFamilyName] = useState('');
  const [credentialExchangeId, setCredentialExchangeId] = useState('');
  const [credentialExchangeState, setCredentialExchangeState] = useState('');
  const [acceptCredentialOfferStatus, setAcceptCredentialOfferStatus] = useState('');
  const [credentialReceivedStatus, setCredentialReceivedStatus] = useState('');
  const [holderDid, setHolderDid] = useState('');

  /**
   * When the right moment in the flow has come, poll the backend until a credential offer is received.
   */
  useEffect(() => {
    if (step === ExampleStep.WaitToReceiveCredentialOffer) {
      void pollForCredentialOffer();
    }
  }, [step]);

  /**
   * Poll the backend, waiting for the holder's wallet app to receive a credential offer.
   */
  const pollForCredentialOffer = async () => {
    let isReceived = false;
    let responseData;

    while (!isReceived) {
      responseData = await HttpToBackend.getW3cCredentialOffer(connectionId);
      isReceived = responseData.credentialExchangeId !== undefined && responseData.credentialData !== undefined;
      await sleep(1000);
    }

    setCredentialExchangeId(responseData?.credentialExchangeId ?? '');
    setAttributeGivenName(responseData?.credentialData?.givenName ?? '');
    setAttributeFamilyName(responseData?.credentialData?.familyName ?? '');

    setStep(ExampleStep.AcceptCredentialOffer);
  };

  /**
   * Event handler.
   * Contact the backend to accept the credential when the "Accept Credential Offer" button is clicked.
   */
  const handleOnClickAcceptCredentialOffer = async () => {
    if (step !== ExampleStep.AcceptCredentialOffer) {
      return;
    }

    setAcceptCredentialOfferStatus('In Progress');
    setStep(ExampleStep.WaitForAcceptCredentialOffer);

    const responseData = await HttpToBackend.acceptW3cCredentialOffer(credentialExchangeId);
    setHolderDid(responseData.holderDid);

    setAcceptCredentialOfferStatus('Done');
    setCredentialReceivedStatus('Waiting For Issuer');
    setStep(ExampleStep.WaitToReceiveCredential);
  };

  /**
   * When the right moment in the flow has come, poll the backend until the accepted/requested credential is received.
   */
  useEffect(() => {
    if (step === ExampleStep.WaitToReceiveCredential) {
      void pollCredentialExchangeState();
    }
  }, [step]);

  /**
   * Poll the backend, waiting for the issuer's app to return the credential and waiting for the
   * credential exchange state to change to "done".
   * Also, for visibility, keep the value of "Credential Exchange State" up-to-date in the UI.
   */
  const pollCredentialExchangeState = async () => {
    let isReceived = false;
    let responseData;

    while (!isReceived) {
      responseData = await HttpToBackend.getW3cCredentialExchangeState(credentialExchangeId);
      isReceived = responseData.state === 'done';
      setCredentialExchangeState(responseData.state);
      setCredentialId(responseData.credentialId ?? '');
      await sleep(1000);
    }

    setCredentialReceivedStatus('Credential Received');
    setStep(ExampleStep.Done);
  };

  return (
    <div id="acceptCredentialOffer">
      <table>
        <tbody>
          <tr>
            <th colSpan={3}>Accept Credential Offer</th>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.WaitToReceiveCredentialOffer)}>
            <td>{renderPointerOnStep(step, ExampleStep.WaitToReceiveCredentialOffer)}</td>
            <td>Receive Credential Offer:</td>
            <td>
              <span id="receiveCredentialOfferInstructions">
                Use the connection with the issuer to send a credential offer to this holder.
              </span>
            </td>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.AcceptCredentialOffer)}>
            <td></td>
            <td colSpan={2}>Received data for the new "Resident" credential:</td>
            <td></td>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.AcceptCredentialOffer)}>
            <td></td>
            <td className="credential-attribute">
              <label htmlFor="attributeGivenName">given name:</label>
            </td>
            <td>
              <span id="attributeGivenName">{attributeGivenName.length > 0 ? attributeGivenName : '-'}</span>
            </td>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.AcceptCredentialOffer)}>
            <td></td>
            <td className="credential-attribute">
              <label htmlFor="attributeFamilyName">family name:</label>
            </td>
            <td>
              <span id="attributeFamilyName">{attributeFamilyName.length > 0 ? attributeFamilyName : '-'}</span>
            </td>
          </tr>
          <tr className={focusOnStep(step, [ExampleStep.AcceptCredentialOffer])}>
            <td>
              {renderPointerOnStep(step, [ExampleStep.AcceptCredentialOffer, ExampleStep.WaitForAcceptCredentialOffer])}
            </td>
            <td>
              <button
                type="button"
                id="acceptCredentialOfferBtn"
                onClick={handleOnClickAcceptCredentialOffer}
                disabled={step !== ExampleStep.AcceptCredentialOffer}>
                Accept Credential Offer
              </button>
            </td>
            <td>
              <span id="acceptCredentialOfferStatus">
                {acceptCredentialOfferStatus.length > 0 ? `[${acceptCredentialOfferStatus}]` : '-'}
              </span>
            </td>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.WaitToReceiveCredential)}>
            <td>{renderPointerOnStep(step, ExampleStep.WaitToReceiveCredential)}</td>
            <td>Receive Credential:</td>
            <td>
              <span id="receiveCredentialInstructions">
                Wait for the issuer to complete issuance of the credential.
              </span>
            </td>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.WaitToReceiveCredential)}>
            <td></td>
            <td></td>
            <td>
              Holder DID for credential: &nbsp;
              <span id="holderDid" className="encodedString">
                {holderDid.length > 0 ? holderDid : '-'}
              </span>
            </td>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.WaitToReceiveCredential)}>
            <td></td>
            <td></td>
            <td>
              Credential Exchange State:&nbsp;
              <span id="credentialExchangeState">
                {credentialExchangeState.length > 0 ? credentialExchangeState : '-'}
              </span>
            </td>
          </tr>
          <tr className={focusOnStep(step, ExampleStep.WaitToReceiveCredential)}>
            <td></td>
            <td>Status:</td>
            <td>
              <span id="credentialReceivedStatus">
                {credentialReceivedStatus.length > 0 ? `[${credentialReceivedStatus}]` : '-'}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
