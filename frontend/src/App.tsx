import React, { ReactElement, useEffect, useState } from 'react';
import { EstablishConnection, ExampleStep as ConnectionStep } from './components/EstablishConnection';
import { ConnectionDetails } from './components/ConnectionDetails';
import { PrepareToIssueCredentials, ExampleStep as PublishStep } from './components/PrepareToIssueCredentials';
import { IssueCredential, ExampleStep as IssueStep } from './components/IssueCredential';
import { VerifyCredential, ExampleStep as VerifyStep } from './components/VerifyCredential';

/**
 * A React component containing the entire frontend application.
 * Manages the flow/steps of the example app.
 */
export const App = (): ReactElement => {
  // the step the user is currently up to in the example flow of each UI section
  const [connectionStep, setConnectionStep] = useState(ConnectionStep.SetConnectionAlias);
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
    if (connectionStep === ConnectionStep.Done && publishStep === PublishStep.Done) {
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
    <div id="app">
      <ConnectionDetails
        step={connectionStep}
        connectionAlias={connectionAlias}
        connectionId={connectionId}
        connectionState={connectionState}
      />
      <br />
      <EstablishConnection
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
