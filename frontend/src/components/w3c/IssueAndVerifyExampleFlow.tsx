import React, { ReactElement, useEffect, useState } from 'react';
import { getFullyQualifiedRoute, Route } from '../../Routes';
import { ConnectionDetails, ConnectionStepAsInviter, EstablishConnectionAsInviter, HomeButton } from '../common';
import { IssueCredential, ExampleStep as IssueStep } from './IssueCredential';
import { VerifyCredential, ExampleStep as VerifyStep } from './VerifyCredential';

/**
 * A React component for the example flow "Issue & verify W3C Verifiable Credential".
 * Manages the steps of this flow.
 */
export const IssueAndVerifyExampleFlow = (): ReactElement => {
  // the step the user is currently up to in the example flow of each UI section
  const [connectionStep, setConnectionStep] = useState(ConnectionStepAsInviter.SetConnectionAlias);
  const [issueStep, setIssueStep] = useState(IssueStep.StandbyUntilReadyToIssue);
  const [verifyStep, setVerifyStep] = useState(VerifyStep.StandbyUntilReadyToVerify);

  // details of the active connection (if a connection is established)
  const [connectionAlias, setConnectionAlias] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [connectionState, setConnectionState] = useState('');

  const [issuerDid, setIssuerDid] = useState('');

  /**
   * Ensure a connection is established before allowing the user to attempt to issue a credential.
   */
  useEffect(() => {
    if (connectionStep === ConnectionStepAsInviter.Done) {
      setIssueStep(IssueStep.SetCredentialData);
    }
  }, [connectionStep]);

  /**
   * Ensure a credential is issued, before allowing the user to attempt to verify a credential.
   */
  useEffect(() => {
    if (issueStep === IssueStep.Done) {
      setVerifyStep(VerifyStep.RequestProofPresentation);
    }
  }, [issueStep]);

  return (
    <div id="w3cIssueAndVerifyExampleFlow">
      <HomeButton />
      <h2>Example flow: issue & verify W3C Verifiable Credential</h2>
      <a href={getFullyQualifiedRoute(Route.W3CHoldAndProveExampleFlow)} target="_blank">
        Open mirrored flow: hold & prove W3C Verifiable Credential
      </a>
      <br />
      <br />
      <ConnectionDetails
        connectionAlias={connectionAlias}
        connectionId={connectionId}
        connectionState={connectionState}
        focusOnConnectionState={connectionStep === ConnectionStepAsInviter.AcceptInvitation}
      />
      <br />
      <EstablishConnectionAsInviter
        step={connectionStep}
        setStep={setConnectionStep}
        connectionAlias={connectionAlias}
        connectionId={connectionId}
        setConnectionAlias={setConnectionAlias}
        setConnectionId={setConnectionId}
        setConnectionState={setConnectionState}
      />
      <br />
      <IssueCredential
        step={issueStep}
        setStep={setIssueStep}
        connectionId={connectionId}
        issuerDid={issuerDid}
        setIssuerDid={setIssuerDid}
      />
      <br />
      <VerifyCredential step={verifyStep} setStep={setVerifyStep} connectionId={connectionId} issuerDid={issuerDid} />
    </div>
  );
};
