import {
  Configuration,
  ConnectionApi,
  CredentialDefinitionApi,
  IssueCredentialV10Api,
  LedgerApi,
  PresentProofV10Api,
  SchemaApi,
} from '@sudoplatform-labs/sudo-di-cloud-agent';
import { TAAInfo } from '@sudoplatform-labs/sudo-di-cloud-agent/lib/models';
import fetch from 'node-fetch';

/**
 * A wrapper around the Sudo DI Cloud Agent SDK, customized to suit the requirements of this application.
 */
export default class CloudAgent {
  private readonly configuration?: Configuration;

  constructor(adminApiEndpoint: string, adminApiKey: string) {
    /**
     * Set the Cloud Agent Service's admin API endpoint, and set the x-api-key header
     * which will be used to authenticate all requests to the API.
     */
    this.configuration = new Configuration({
      basePath: adminApiEndpoint,
      fetchApi: fetch,
      headers: { 'x-api-key': adminApiKey },
    });
  }

  /**
   * Accept the ledger's current TAA (Transaction Author Agreement).
   *
   * CAUTION: In a real application, strongly consider whether you want to auto-accept the TAA,
   * or require users to read the TAA and manually accept it.
   */
  async acceptLedgerTaa(): Promise<void> {
    const ledgerApi = new LedgerApi(this.configuration);

    /**
     * Get information about the current TAA.
     * NOTE: The TAA may be subject to change.
     */
    let taaGetResult = await ledgerApi.ledgerTaaGet();
    if (!taaGetResult.result) {
      throw new Error('Failed to get ledger TAA');
    }
    const taaInfo: TAAInfo = taaGetResult.result;

    // the TAA does not need to be accepted if the 'taa_required' attribute of TAAInfo is falsy
    if (!taaInfo.taa_required) {
      return;
    }

    /**
     * Skip the remainder of this function if the TAA is already accepted.
     * If the TAA is accepted, the 'taa_accepted' attribute of TAAInfo will be set to an object
     * which contains the time of acceptance and the mechanism used for acceptance.
     * If the TAA is not accepted, the 'taa_accepted' attribute will be undefined.
     */
    if (taaInfo.taa_accepted) {
      return;
    }

    /**
     * Select an appropriate 'mechanism' for the application use case.
     * The list of available mechanisms depends on which ledger your Cloud Agent Service is connected to.
     * To obtain this list, search for the AML (Acceptance Mechanism List) for the appropriate ledger.
     * Alternatively, you can place a breakpoint here and use a debugger to inspect the AML record
     * returned in the 'taaInfo' local variable.
     *  - 'taaInfo.aml_record.aml' contains the list of available mechanisms.
     *  - 'taaInfo.aml_record.amlContext' contains a link to more information about the mechanisms.
     *
     * The 'on_file' mechanism is used here under the assumption that the Cloud Agent Service
     * is using the Indicio TestNet ledger.
     */
    const mechanism = 'on_file';

    // accept the TAA
    await ledgerApi.ledgerTaaAcceptPost({
      body: {
        mechanism: mechanism,
        text: taaInfo.taa_record?.text,
        version: taaInfo.taa_record?.version,
      },
    });

    // confirm the TAA is accepted before allowing the application to proceed
    taaGetResult = await ledgerApi.ledgerTaaGet();
    if (!taaGetResult.result?.taa_accepted) {
      throw new Error('Failed to accept ledger TAA');
    }
  }

  /**
   * Create a connection invitation. A `connection invitation` is an invitation for an Edge Agent
   * (a personal wallet app) to connect to the Cloud Agent Service.
   *
   * NOTE: A connection is required in order for the Cloud Agent Service to exchange credentials with an Edge Agent.
   *
   * @param connectionAlias The human-readable name which users of this application can use to identify the connection.
   * @returns object {
   *   connectionId: New id which can be used to identify the pending connection.
   *   invitationUrl: URL which an Edge Agent can use to accept the invitation and establish the connection.
   * }
   */
  async createConnectionInvitation(connectionAlias: string): Promise<{ connectionId: string; invitationUrl: string }> {
    /**
     * The alias (or name) you want to associate with the connection.
     *
     * This is a human-readable name which users of this Cloud Agent Service admin application can use to identify
     * the connection.
     */
    const alias = connectionAlias;

    /**
     * Your label in the invitation.
     *
     * This is a human-readable name of the author of the invitation. This is generally set to the name of
     * your organisation. This is displayed to the user of the Edge Agent wallet app so that they can identify
     * who created the invitation.
     *
     * The value set below is only for demonstrative purposes. A timestamp is not needed in a real application
     * - it is only used here to help you differentiate between connections in your Edge Agent wallet app when
     * you replay this example app.
     */
    const my_label = `Example Org ${this.generateTimeStamp()}`;

    // call the SDK
    const connectionApi = new ConnectionApi(this.configuration);
    const result = await connectionApi.connectionsCreateInvitationPost({
      alias,
      body: { my_label },
      autoAccept: true,
      multiUse: false,
      _public: false,
    });

    if (!result.connection_id || !result.invitation_url) {
      throw new Error('Failed to create connection invitation');
    }

    return {
      connectionId: result.connection_id,
      invitationUrl: result.invitation_url,
    };
  }

  /**
   * Get the state of a connection. The connection is identified by a connection id.
   *
   * NOTE: A connection with either state='response' or state='active' is ready to be used to exchange credentials.
   * The connection state transitions from 'response' to 'active' when an ack (which may be any message)
   * is received from the connection after the initial connection exchange protocol has completed.
   *
   * @param connectionId The id of the connection to get the state of.
   * @returns object {
   *   connectionId: Matches the @param connectionId, for convenience.
   *   state: The state of the connection.
   * }
   */
  async getConnectionState(connectionId: string): Promise<{ connectionId: string; state: string }> {
    if (connectionId.length === 0) {
      throw new Error('Missing required param "connectionId"');
    }

    // call the SDK, to get details of the connection
    const connectionApi = new ConnectionApi(this.configuration);
    const result = await connectionApi.connectionsConnIdGet({
      connId: connectionId,
    });

    if (!result.state) {
      throw new Error('Failed to get connection state');
    }

    // only return the values the frontend is interested in: the id and the state of the connection
    return {
      connectionId: connectionId,
      state: result.state,
    };
  }

  /**
   * Publish a new schema to the ledger. A schema defines the attributes which can later be used
   * in a credDef (credential definition). A credDef can then be used to issue credentials
   * which contain values for these attributes.
   *
   * @returns object {
   *   schemaId: The id of the new schema.
   * }
   */
  async publishSchema(): Promise<{ schemaId: string }> {
    /**
     * The name of the schema.
     *
     * NOTE: Every combination of 'schema_name' and 'schema_version' must be unique.
     *
     * The schema name set below is only for demonstrative purposes. A timestamp is not needed in a real application
     * - it is only used here to support replay-ability of this example app.
     */
    const schema_name = `Registration ${this.generateTimeStamp()}`;

    /**
     * The version of the schema.
     *
     * NOTE: Once a schema is published to the ledger, that version of the schema cannot be modified
     * (published schemas are immutable). However, a new version of the schema can be published.
     * The new version should use the same 'schema_name' but update the 'schema_version',
     * and update its attributes as necessary.
     *
     * NOTE: Every combination of 'schema_name' and 'schema_version' must be unique.
     *
     * The version set below is only for demonstrative purposes.
     */
    const schema_version = '1.0.0';

    /**
     * The attributes of the schema. This is an array of attribute names.
     *
     * The attributes set below are only for demonstrative purposes.
     */
    const attributes = ['name', 'expiry'];

    // call the SDK
    const schemaApi = new SchemaApi(this.configuration);
    const result = await schemaApi.schemasPost({
      body: {
        schema_name,
        schema_version,
        attributes,
      },
    });

    if (!result.sent) {
      throw new Error('Failed to publish schema');
    }

    return {
      schemaId: result.sent.schema_id,
    };
  }

  /**
   * Publish a new credDef (credential definition) to the ledger. Credentials can then be issued based on that credDef.
   * The attributes of a credDef are defined by a referenced schema.
   *
   * @param schemaId The id of the schema to use for the new credDef.
   * @returns object {
   *   credDefId: The id of the new credDef.
   * }
   */
  async publishCredDef(schemaId: string): Promise<{ credDefId: string }> {
    if (schemaId.length === 0) {
      throw new Error('Missing required param "schemaId"');
    }

    /**
     * The id of the schema which defines the attributes to be used by the new credDef.
     *
     * NOTE: The schema id uniquely identifies a schema with a specific name and version combination. Therefore,
     * if a new schema version is published, then a new credDef which references the id of that new schema version
     * must also be published, in order to issue credentials based on the new version.
     */
    const schema_id = schemaId;

    /**
     * A tag which provides a name for the credDef.
     *
     * NOTE: Every combination of 'schema_id' and 'tag' must be unique.
     *
     * The tag set below is only for demonstrative purposes. A timestamp is not needed in a real application
     * - it is only used here to support replay-ability of this example app.
     */
    const tag = `Registration ${this.generateTimeStamp()}`;

    // call the SDK
    const credDefApi = new CredentialDefinitionApi(this.configuration);
    const result = await credDefApi.credentialDefinitionsPost({
      body: {
        schema_id,
        tag,
        support_revocation: false,
      },
    });

    if (!result.sent?.credential_definition_id) {
      throw new Error('Failed to publish credDef');
    }

    return {
      credDefId: result.sent.credential_definition_id,
    };
  }

  /**
   * Send a credential offer to an existing connection. The connection must then use their Edge Agent wallet app
   * to accept the credential offer and store the resulting credential.
   *
   * @param connectionId The id of the connection to send the credential offer to.
   * @param credDefId The id of the credDef (credential definition) to use as the base for the new credential.
   * @param credentialData Data values for the attributes listed in the credDef.
   * @returns object {
   *   credentialExchangeId: The id of the new credential exchange associated with the credential offer.
   *     A credential exchange tracks the current state of the protocol for issuing a credential.
   * }
   */
  async sendCredentialOffer(
    connectionId: string,
    credDefId: string,
    credentialData: { name: string; expiry: string },
  ): Promise<{ credentialExchangeId: string }> {
    if (connectionId.length === 0) {
      throw new Error('Missing required param "connectionId"');
    }

    if (credDefId.length === 0) {
      throw new Error('Missing required param "credDefId"');
    }

    /**
     * The id of the connection to send the credential offer to. If the connection accepts the credential offer
     * and the credential is issued to the connection, then the connection will be known as the "credential holder".
     */
    const connection_id = connectionId;

    /**
     * The id of the credDef to use as the base for the new credential.
     */
    const cred_def_id = credDefId;

    /**
     * Data values for the attributes listed in the credDef identified by 'cred_def_id'.
     *
     * NOTE: The attributes included in the credential must match the attributes in the associated credDef.
     * Unlike a credDef, a credential also contains values for its attributes, and those values are tailored
     * to the individual connection to whom it will be issued.
     *
     * The attributes and values set below are only for demonstrative purposes.
     */
    const attributes = [
      { name: 'name', value: credentialData.name },
      { name: 'expiry', value: credentialData.expiry },
    ];

    // call the SDK
    const issueCredentialApi = new IssueCredentialV10Api(this.configuration);
    const result = await issueCredentialApi.issueCredentialSendOfferPost({
      body: {
        connection_id,
        cred_def_id,
        auto_issue: true,
        credential_preview: {
          type: 'issue-credential/1.0/credential-preview',
          attributes,
        },
      },
    });

    if (!result.credential_exchange_id) {
      throw new Error('Failed to send credential offer');
    }

    return {
      credentialExchangeId: result.credential_exchange_id,
    };
  }

  /**
   * Get the state of a credential exchange. The credential exchange is identified by an id.
   *
   * @param credentialExchangeId The id of the credential exchange to get the state of.
   * @returns object {
   *   credentialExchangeId: Matches the @param credentialExchangeId, for convenience.
   *   state: The state of the credential exchange.
   * }
   */
  async getCredentialExchangeState(
    credentialExchangeId: string,
  ): Promise<{ credentialExchangeId: string; state: string }> {
    if (credentialExchangeId.length === 0) {
      throw new Error('Missing required param "credentialExchangeId"');
    }

    // call the SDK
    const issueCredentialApi = new IssueCredentialV10Api(this.configuration);
    const result = await issueCredentialApi.issueCredentialRecordsCredExIdGet({
      credExId: credentialExchangeId,
    });

    if (!result.state) {
      throw new Error('Failed to get credential exchange state');
    }

    return {
      credentialExchangeId: credentialExchangeId,
      state: result.state,
    };
  }

  /**
   * Request a proof presentation from an existing connection. The connection/holder must then present proofs,
   * in the form of attribute values, from their wallet.
   *
   * @param connectionId The id of the connection to request the proof presentation from.
   * @param credDefId The id of the credDef (credential definition) to restrict which credentials can be used
   *                  to satisfy the proof presentation request.
   * @returns object {
   *   presentationExchangeId: The id of the new presentation exchange associated with the proof presentation request.
   *     A presentation exchange tracks the current state of the protocol for requesting a proof presentation.
   * }
   */
  async requestProofPresentation(connectionId: string, credDefId: string): Promise<{ presentationExchangeId: string }> {
    if (connectionId.length === 0) {
      throw new Error('Missing required param "connectionId"');
    }

    if (credDefId.length === 0) {
      throw new Error('Missing required param "credDefId"');
    }

    /**
     * The id of the connection to request the proof presentation from.
     */
    const connection_id = connectionId;

    /**
     * The attributes to request from the connection, for the purpose of verification.
     *
     * NOTE: The 'cred_def_id' restriction for each attribute restricts the set of credentials which are allowed
     * to be used to supply that attribute. In other words, the connection cannot use a credential to supply an
     * attribute unless that credential is derived from the credDef with the specified id.
     *
     * The attributes set below ('name' and 'expiry') are only for demonstrative purposes.
     */
    const requested_attributes = {
      name: {
        name: 'name',
        restrictions: [{ cred_def_id: credDefId }],
      },
      expiry: {
        name: 'expiry',
        restrictions: [{ cred_def_id: credDefId }],
      },
    };

    // call the SDK
    const presentProofApi = new PresentProofV10Api(this.configuration);
    const result = await presentProofApi.presentProofSendRequestPost({
      body: {
        connection_id,
        auto_verify: true,
        proof_request: {
          name: `Proof presentation requested at ${this.generateTimeStamp()}`,
          version: '1.0',
          requested_attributes,
          requested_predicates: {},
        },
      },
    });

    if (!result.presentation_exchange_id) {
      throw new Error('Failed to send proof presentation request');
    }

    return {
      presentationExchangeId: result.presentation_exchange_id,
    };
  }

  /**
   * Get the state of a proof presentation exchange. The presentation exchange is identified by an id.
   *
   * @param presentationExchangeId The id of the presentation exchange to get the state of.
   * @returns object {
   *   presentationExchangeId: Matches the @param presentationExchangeId, for convenience.
   *   state: The state of the presentation exchange protocol.
   *   revealedAttributes: The attributes revealed by the connection in the proof presentation,
   *     if the proof presentation has been received.
   *   verified: When state==="verified", this will be true if the revealedAttributes have been verified
   *     as being cryptographically secure. Otherwise, this will be false.
   * }
   */
  async getProofPresentationExchangeState(presentationExchangeId: string): Promise<{
    presentationExchangeId: string;
    state: string;
    revealedAttributes: { name?: string; expiry?: string };
    verified: boolean;
  }> {
    if (presentationExchangeId.length === 0) {
      throw new Error('Missing required param "presentationExchangeId"');
    }

    // call the SDK
    const presentProofApi = new PresentProofV10Api(this.configuration);
    const result = await presentProofApi.presentProofRecordsPresExIdGet({
      presExId: presentationExchangeId,
    });

    if (!result.state) {
      throw new Error('Failed to get proof presentation exchange state');
    }

    const response = {
      presentationExchangeId: presentationExchangeId,
      state: result.state,
      revealedAttributes: {},
      verified: result.verified === 'true',
    };

    const revealedAttributes = result.presentation?.requested_proof?.revealed_attrs ?? {};
    response.revealedAttributes = {
      name: revealedAttributes['name']?.raw,
      expiry: revealedAttributes['expiry']?.raw,
    };

    return response;
  }

  /**
   * Return a timestamp of the current date and time. This is only used to support replay-ability of this example app.
   */
  private generateTimeStamp(): string {
    return new Date().toISOString().split('.')[0].replace(/\D/gi, '');
  }
}
