import React, { ReactElement, useState } from 'react';
import HttpToBackend from '../../HttpToBackend';
import { focusOnStep, renderPointerOnStep } from '../../util';
import { ExampleStep } from './PrepareToIssueCredentials';

interface Props {
  step: ExampleStep;
  setStep: (step: ExampleStep) => void;
  schemaId: string;
  credDefId: string;
  setCredDefId: (credDefId: string) => void;
}

/**
 * A React component for the UI section to publish a credDef (credential definition).
 */
export const PublishCredDef = (props: Props): ReactElement => {
  // the following state is inherited from the over-arching application
  const step = props.step;
  const setStep = props.setStep;
  const schemaId = props.schemaId;
  const credDefId = props.credDefId;
  const setCredDefId = props.setCredDefId;

  // the following state is unique to this component
  const [publishCredDefStatus, setPublishCredDefStatus] = useState('');

  /**
   * Event handler.
   * Contact the backend to publish a new credDef to the ledger when the "Publish CredDef" button is clicked.
   */
  const handleOnClickPublishCredDef = async () => {
    if (step !== ExampleStep.PublishCredDef) {
      return;
    }

    setPublishCredDefStatus('In Progress');
    setStep(ExampleStep.WaitForPublishCredDef);

    const responseData = await HttpToBackend.publishAnoncredsCredDef(schemaId);
    setCredDefId(responseData.credDefId);

    setPublishCredDefStatus('Done');
    setStep(ExampleStep.Done);
  };

  return (
    <div id="publishCredDef">
      <table>
        <tbody>
          <tr className={focusOnStep(step, ExampleStep.PublishCredDef)}>
            <td>{renderPointerOnStep(step, [ExampleStep.PublishCredDef, ExampleStep.WaitForPublishCredDef])}</td>
            <td>
              <button
                type="button"
                id="publishCredDefBtn"
                onClick={handleOnClickPublishCredDef}
                disabled={step !== ExampleStep.PublishCredDef}>
                Publish CredDef
              </button>
            </td>
            <td>
              <span id="publishCredDefStatus">
                {publishCredDefStatus.length > 0 ? `[${publishCredDefStatus}]` : '-'}
              </span>
            </td>
          </tr>
          <tr>
            <td></td>
            <td>CredDef ID:</td>
            <td>
              <span id="credDefId">{credDefId.length > 0 ? credDefId : '-'}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
