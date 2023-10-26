import React, { ReactElement, useEffect, useState } from 'react';
import { ConnectionDetails, ConnectionStepAsInviter, EstablishConnectionAsInviter, HomeButton } from '../common';
import { ExampleStep as IssueStep, IssueCredential } from './IssueCredential';
import { ExampleStep as PublishStep, PrepareToIssueCredentials } from './PrepareToIssueCredentials';
import { ExampleStep as VerifyStep, VerifyCredential } from './VerifyCredential';

/**
 * A React component for the example flow "Issue & verify AnonCreds credential".
 * Manages the steps of this flow.
 */
export const IssueAndVerifyExampleFlow = (): ReactElement => {
  // the step the user is currently up to in the example flow of each UI section
  const [connectionStep, setConnectionStep] = useState(ConnectionStepAsInviter.SetConnectionAlias);
  const [publishStep, setPublishStep] = useState(PublishStep.PublishSchema);
  const [issueStep, setIssueStep] = useState(IssueStep.StandbyUntilReadyToIssue);
  const [verifyStep, setVerifyStep] = useState(VerifyStep.StandbyUntilReadyToVerify);

  // details of the active connection (if a connection is established)
  const [connectionAlias, setConnectionAlias] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [connectionState, setConnectionState] = useState('');

  const [credDefId, setCredDefId] = useState('');

  /**
   * Ensure that a connection is established and a schema and credDef are published,
   * before allowing the user to attempt to issue a credential.
   */
  useEffect(() => {
    if (connectionStep === ConnectionStepAsInviter.Done && publishStep === PublishStep.Done) {
      setIssueStep(IssueStep.SetCredentialData);
    }
  }, [connectionStep, publishStep]);

  /**
   * Ensure a credential is issued, before allowing the user to attempt to verify a credential.
   */
  useEffect(() => {
    if (issueStep === IssueStep.Done) {
      setVerifyStep(VerifyStep.RequestProofPresentation);
    }
  }, [issueStep]);

  return (
    <div id="anoncredsIssueAndVerifyExampleFlow">
      <HomeButton />
      <h2>Example flow: issue & verify AnonCreds credential</h2>
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
      <PrepareToIssueCredentials
        step={publishStep}
        setStep={setPublishStep}
        credDefId={credDefId}
        setCredDefId={setCredDefId}
      />
      <br />
      <IssueCredential step={issueStep} setStep={setIssueStep} connectionId={connectionId} credDefId={credDefId} />
      <br />
      <VerifyCredential step={verifyStep} setStep={setVerifyStep} connectionId={connectionId} credDefId={credDefId} />
    </div>
  );
};
