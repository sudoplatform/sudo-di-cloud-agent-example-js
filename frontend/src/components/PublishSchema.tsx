import React, { useState } from 'react';
import { focusOnStep, renderPointerOnStep } from '../util/exampleFlow';
import { ExampleStep } from './PrepareToIssueCredentials';
import HttpToBackend from '../util/httpToBackend';

interface Props {
  step: ExampleStep;
  setStep: (step: ExampleStep) => void;
  schemaId: string;
  setSchemaId: (schemaId: string) => void;
}

/**
 * A React component for the UI section to publish a schema.
 */
export const PublishSchema: React.FC<Props> = (props) => {
  // the following state is inherited from the over-arching application
  const step = props.step;
  const setStep = props.setStep;
  const schemaId = props.schemaId;
  const setSchemaId = props.setSchemaId;

  // the following state is unique to this component
  const [publishSchemaStatus, setPublishSchemaStatus] = useState('');

  /**
   * Event handler.
   * Contact the backend to publish a new schema to the ledger when the "Publish Schema" button is clicked.
   */
  const handleOnClickPublishSchema = async () => {
    if (step !== ExampleStep.PublishSchema) {
      return;
    }

    setPublishSchemaStatus('In Progress');
    setStep(ExampleStep.WaitForPublishSchema);

    const responseData = await HttpToBackend.publishSchema();
    setSchemaId(responseData.schemaId);

    setPublishSchemaStatus('Done');
    setStep(ExampleStep.PublishCredDef);
  };

  return (
    <div id="publishSchema">
      <table>
        <tr className={focusOnStep(step, ExampleStep.PublishSchema)}>
          <td>{renderPointerOnStep(step, [ExampleStep.PublishSchema, ExampleStep.WaitForPublishSchema])}</td>
          <td>
            <button
              type="button"
              id="publishSchemaBtn"
              onClick={handleOnClickPublishSchema}
              disabled={step !== ExampleStep.PublishSchema}>
              Publish Schema
            </button>
          </td>
          <td>
            <span id="publishSchemaStatus">{publishSchemaStatus.length > 0 ? `[${publishSchemaStatus}]` : '-'}</span>
          </td>
        </tr>
        <tr>
          <td></td>
          <td>Schema ID:</td>
          <td>
            <span id="schemaId">{schemaId.length > 0 ? schemaId : '-'}</span>
          </td>
        </tr>
      </table>
    </div>
  );
};
