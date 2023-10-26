import React, { ReactElement, useEffect, useState } from 'react';
import { getFullyQualifiedRoute, Route } from '../../Routes';
import { ConnectionDetails, ConnectionStepAsInvitee, EstablishConnectionAsInvitee, HomeButton } from '../common';
import { AcceptCredentialOffer, ExampleStep as AcceptOfferStep } from './AcceptCredentialOffer';
import { PresentCredential, ExampleStep as PresentStep } from './PresentCredential';

/**
 * A React component for the example flow "Hold & prove W3C Verifiable Credential".
 * Manages the steps of this flow.
 */
export const HoldAndProveExampleFlow = (): ReactElement => {
  // the step the user is currently up to in the example flow of each UI section
  const [connectionStep, setConnectionStep] = useState(ConnectionStepAsInvitee.SetConnectionAlias);
  const [acceptOfferStep, setAcceptOfferStep] = useState(AcceptOfferStep.StandbyUntilReadyToReceive);
  const [presentStep, setPresentStep] = useState(PresentStep.StandbyUntilReadyToReceive);

  // details of the active connection (if a connection is established)
  const [connectionAlias, setConnectionAlias] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [connectionState, setConnectionState] = useState('');

  const [credentialId, setCredentialId] = useState('');

  /**
   * Ensure a connection is established before attempting to fetch a credential offer.
   */
  useEffect(() => {
    if (connectionStep === ConnectionStepAsInvitee.Done) {
      setAcceptOfferStep(AcceptOfferStep.WaitToReceiveCredentialOffer);
    }
  }, [connectionStep]);

  /**
   * Ensure a credential is received, before allowing the user to attempt to present a credential.
   */
  useEffect(() => {
    if (acceptOfferStep === AcceptOfferStep.Done) {
      setPresentStep(PresentStep.WaitToReceiveProofRequest);
    }
  }, [acceptOfferStep]);

  return (
    <div id="w3cHoldAndProveExampleFlow">
      <HomeButton />
      <h2>Example flow: hold & prove W3C Verifiable Credential</h2>
      <a href={getFullyQualifiedRoute(Route.W3CIssueAndVerifyExampleFlow)} target="_blank">
        Open mirrored flow: issue & verify W3C Verifiable Credential
      </a>
      <br />
      <br />
      <ConnectionDetails
        connectionAlias={connectionAlias}
        connectionId={connectionId}
        connectionState={connectionState}
        focusOnConnectionState={connectionStep === ConnectionStepAsInvitee.WaitForConnectionActive}
      />
      <br />
      <EstablishConnectionAsInvitee
        step={connectionStep}
        setStep={setConnectionStep}
        connectionAlias={connectionAlias}
        connectionId={connectionId}
        setConnectionAlias={setConnectionAlias}
        setConnectionId={setConnectionId}
        setConnectionState={setConnectionState}
      />
      <br />
      <AcceptCredentialOffer
        step={acceptOfferStep}
        setStep={setAcceptOfferStep}
        connectionId={connectionId}
        setCredentialId={setCredentialId}
      />
      <br />
      <PresentCredential
        step={presentStep}
        setStep={setPresentStep}
        connectionId={connectionId}
        credentialId={credentialId}
      />
    </div>
  );
};
