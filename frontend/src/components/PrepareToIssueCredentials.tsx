import React, { useState } from 'react';
import { PublishSchema } from './PublishSchema';
import { PublishCredDef } from './PublishCredDef';

/**
 * This enum defines a sequence of steps used to guide the user through the example flow of this UI section.
 */
export enum ExampleStep {
  PublishSchema,
  WaitForPublishSchema,
  PublishCredDef,
  WaitForPublishCredDef,
  Done,
}

interface Props {
  step: ExampleStep;
  setStep: (step: ExampleStep) => void;
  credDefId: string;
  setCredDefId: (credDefId: string) => void;
}

/**
 * A React component for the UI section "Prepare to Issue Credentials".
 */
export const PrepareToIssueCredentials: React.FC<Props> = (props) => {
  // the following state is inherited from the over-arching application
  const step = props.step;
  const setStep = props.setStep;
  const credDefId = props.credDefId;
  const setCredDefId = props.setCredDefId;

  // the following state is unique to this component
  const [schemaId, setSchemaId] = useState('');

  return (
    <div id="prepareToIssueCredentials">
      <table>
        <tr>
          <th colSpan={3}>Prepare to Issue Credentials</th>
        </tr>
      </table>
      <PublishSchema step={step} setStep={setStep} schemaId={schemaId} setSchemaId={setSchemaId} />
      <br />
      <PublishCredDef
        step={step}
        setStep={setStep}
        schemaId={schemaId}
        credDefId={credDefId}
        setCredDefId={setCredDefId}
      />
    </div>
  );
};
