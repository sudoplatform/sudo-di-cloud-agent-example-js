import {
  Configuration,
  ConnectionApi,
  CredentialDefinitionApi,
  DIDCreateOptionsKeyTypeEnum,
  DIFHolderDirectiveEnum,
  IssueCredentialV10Api,
  IssueCredentialV20Api,
  LedgerApi,
  PresentProofV10Api,
  PresentProofV20Api,
  ReceiveInvitationRequest,
  SchemaApi,
  TAAInfo,
  V10PresentationExchangeVerifiedEnum,
  V20PresExRecordStateEnum,
  V20PresExRecordVerifiedEnum,
  WalletApi,
} from '@sudoplatform-labs/sudo-di-cloud-agent';
import { randomUUID } from 'crypto';
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
   * Accept a connection invitation. This endpoint can be used when the Cloud Agent Service intends to establish
   * a connection with another agent, where the other agent has already generated the connection invitation.
   *
   * @param connectionAlias The human-readable name which users of this application can use to identify the connection.
   * @param invitationUrl The invitation URL generated by the other agent (the inviter), which contains the
   *                      base64 encoded invitation object.
   * @returns object {
   *   connectionId: New id which can be used to identify the pending connection.
   * }
   */
  async acceptConnectionInvitation(connectionAlias: string, invitationUrl: string): Promise<{ connectionId: string }> {
    /**
     * The alias (or name) you want to associate with the connection.
     *
     * This is a human-readable name which users of this Cloud Agent Service admin application can use to identify
     * the connection.
     */
    const alias = connectionAlias;

    /**
     * The connection invitation.
     *
     * The invitation itself is an object containing information on how to connect to the inviter. When the
     * Cloud Agent Service generates an invitation, it base64 encodes it so that it may be passed around in a URL.
     * Here we base64 decode it before passing it to the SDK endpoint.
     */
    let invitation: ReceiveInvitationRequest;
    try {
      const invitationBase64Encoded = invitationUrl.replace(/(https?:\/\/.*\?c_i=)?/i, '');
      invitation = JSON.parse(Buffer.from(invitationBase64Encoded, 'base64').toString());
    } catch {
      throw new Error('Invalid invitationUrl: it is not base64 encoded');
    }

    // call the SDK
    const connectionApi = new ConnectionApi(this.configuration);
    const result = await connectionApi.connectionsReceiveInvitationPost({
      alias,
      body: invitation,
      autoAccept: true,
    });

    if (!result.connection_id) {
      throw new Error('Failed to accept connection invitation');
    }

    return {
      connectionId: result.connection_id,
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
  async publishAnoncredsSchema(): Promise<{ schemaId: string }> {
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
  async publishAnoncredsCredDef(schemaId: string): Promise<{ credDefId: string }> {
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
  async sendAnoncredsCredentialOffer(
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
   * Send a W3C credential offer to an existing connection. The connection must then use their holder wallet app
   * to accept the credential offer and store the resulting credential.
   *
   * @param connectionId The id of the connection to send the credential offer to.
   * @param credentialData Data values for the attributes of the credential.
   * @returns object {
   *   credentialExchangeId: The id of the new credential exchange associated with the credential offer.
   *     A credential exchange tracks the current state of the protocol for issuing a credential.
   *   issuerDid: The DID of the issuer, returned so it may be displayed in the UI.
   * }
   */
  async sendW3cCredentialOffer(
    connectionId: string,
    credentialData: { givenName: string; familyName: string },
  ): Promise<{ credentialExchangeId: string; issuerDid: string }> {
    if (connectionId.length === 0) {
      throw new Error('Missing required param "connectionId"');
    }

    /**
     * The id of the connection to send the W3C credential offer to. If the connection accepts the credential offer
     * and the credential is issued to the connection, then the connection will be known as the "credential holder".
     */
    const connection_id = connectionId;

    // call the SDK
    const walletApi = new WalletApi(this.configuration);
    const issuerDidResult = await walletApi.walletDidPublicGet();

    if (!issuerDidResult.result?.did || !issuerDidResult.result?.method) {
      throw new Error('Failed to fetch issuer DID');
    }

    /**
     * The Issuer DID is used to sign the credential, therefore producing a VC (verifiable credential).
     */
    const issuerDid = `did:${issuerDidResult.result.method}:${issuerDidResult.result.did}`;

    // create a timestamp for the new credential
    const currentTimeInSeconds = Math.floor(new Date().getTime() / 1000);
    const validFrom = new Date();
    validFrom.setTime(currentTimeInSeconds * 1000);
    const issuanceDate = validFrom.toISOString();

    // call the SDK
    const issueCredentialApi = new IssueCredentialV20Api(this.configuration);
    const sendOfferResult = await issueCredentialApi.issueCredential20SendOfferPost({
      body: {
        connection_id,
        auto_issue: true,
        comment: `Resident credential ${this.generateTimeStamp()}`,
        filter: {
          ld_proof: {
            /**
             * Data for the new credential.
             * The data set below is only for demonstrative purposes.
             */
            credential: {
              /**
               * The first context is always required to be 'https://www.w3.org/2018/credentials/v1'.
               * This is the W3C VC context.
               */
              context: [
                new String('https://www.w3.org/2018/credentials/v1'),
                new String('https://w3id.org/citizenship/v1'),
              ],
              /**
               * The first type is always required to be 'VerifiableCredential'. This is the W3C VC type.
               * This type is defined in the aforementioned context 'https://www.w3.org/2018/credentials/v1'.
               */
              type: ['VerifiableCredential', 'PermanentResident'],
              issuer: {
                id: issuerDid,
              },
              issuanceDate,
              /**
               * This is the data which describes the subject (e.g. the holder) of the credential.
               * The attributes 'givenName' and 'familyName' are properties of the 'PermanentResident' type
               * which is defined in the context 'https://w3id.org/citizenship/v1'.
               */
              credentialSubject: {
                type: ['PermanentResident'],
                givenName: credentialData.givenName,
                familyName: credentialData.familyName,
              },
            },
            options: {
              /**
               * The signature type to be used to sign the credential. This signature type must be compatible with the
               * key type which was used to generate the Issuer DID.
               */
              proofType: 'Ed25519Signature2018',
            },
          },
        },
      },
    });

    if (!sendOfferResult.cred_ex_id) {
      throw new Error('Failed to send credential offer');
    }

    return {
      credentialExchangeId: sendOfferResult.cred_ex_id,
      issuerDid,
    };
  }

  /**
   * Get a W3C credential offer received from an existing connection.
   *
   * @param connectionId The id of the connection to check for received credential offers.
   * @returns object {
   *   credentialExchangeId: The id of the credential exchange associated with the received credential offer.
   *     A credential exchange tracks the current state of the protocol for issuing a credential.
   *   credentialData: Data values for the attributes in the offered credential, returned for display in the UI.
   * }
   */
  async getW3cCredentialOffer(connectionId: string): Promise<{
    credentialExchangeId?: string;
    credentialData?: { givenName: string; familyName: string };
  }> {
    if (connectionId.length === 0) {
      throw new Error('Missing required param "connectionId"');
    }

    /**
     * To get all credential exchanges, regardless of state or connectionId, simply pass an empty object {} into
     * the below SDK call.
     */
    // call the SDK
    const issueCredentialApi = new IssueCredentialV20Api(this.configuration);
    const result = await issueCredentialApi.issueCredential20RecordsGet({
      connectionId,
    });

    // for the purposes of the example flow, we assume the first result is the only result
    const credentialExchange = result.results?.length === 1 ? result.results[0].cred_ex_record : undefined;
    if (!credentialExchange) {
      return {};
    }

    // for the purposes of the example flow, extract and return the two attributes we are interested in
    const credentialSubject =
      (credentialExchange.by_format?.cred_offer as CredOffer)?.ld_proof?.credential?.credentialSubject ?? {};
    const givenName = credentialSubject?.['givenName'] as string | undefined;
    const familyName = credentialSubject?.['familyName'] as string | undefined;

    if (!givenName || !familyName) {
      throw new Error('Failed to fetch expected credential exchange');
    }

    return {
      credentialExchangeId: credentialExchange.cred_ex_id,
      credentialData: {
        givenName: givenName,
        familyName: familyName,
      },
    };
  }

  /**
   * Send a W3C credential request, in response to a received W3C credential offer.
   *
   * @param credentialExchangeId: The id of the credential exchange to advance.
   *   This credential exchange should be in the 'offer-received' state.
   * @returns object {
   *   holderDid: The DID of the holder, generated especially for this credential.
   *     It is returned so it may be displayed in the UI.
   * }
   */
  async postW3cCredentialRequest(credentialExchangeId: string): Promise<{ holderDid: string }> {
    if (credentialExchangeId.length === 0) {
      throw new Error('Missing required param "credentialExchangeId"');
    }

    // call the SDK
    const walletApi = new WalletApi(this.configuration);
    const holderDidResult = await walletApi.walletDidCreatePost({
      body: {
        method: 'key',
        options: {
          key_type: DIDCreateOptionsKeyTypeEnum.Ed25519,
        },
      },
    });

    if (!holderDidResult.result?.did) {
      throw new Error('Failed to create holder DID for credential');
    }

    /**
     * The Holder DID is injected into the credential before the issuer finally signs the credential and passes the
     * end result back to the holder. This process creates proof that the issuer intended the credential to be issued
     * to this holder. After the signed credential is finally issued to the holder, the holder may create a
     * corresponding VP (verifiable presentation) and sign it using this same Holder DID, thereby proving to a verifier
     * that they are the intended owner of the credential.
     *
     * For the sake of increased holder privacy, it is a good idea to generate a new Holder DID for each new
     * credential received, so that another party cannot correlate two credentials by comparing the contained
     * Holder DIDs.
     */
    const holder_did = holderDidResult.result.did;

    // call the SDK
    const issueCredentialApi = new IssueCredentialV20Api(this.configuration);
    const sendRequestResult = await issueCredentialApi.issueCredential20RecordsCredExIdSendRequestPost({
      credExId: credentialExchangeId,
      body: {
        holder_did,
      },
    });

    if (sendRequestResult.error_msg) {
      throw new Error('Failed to send credential request');
    }

    return { holderDid: holder_did };
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
  async getAnoncredsCredentialExchangeState(
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
   * Get the state of a W3C credential exchange. The credential exchange is identified by an id.
   *
   * @param credentialExchangeId The id of the W3C credential exchange to get the state of.
   * @returns object {
   *   credentialExchangeId: Matches the @param credentialExchangeId, for convenience.
   *   state: The state of the credential exchange.
   *   credentialId: If a credential was received and stored as a result of this exchange,
   *                 then this will be set to the id of the credential.
   * }
   */
  async getW3cCredentialExchangeState(
    credentialExchangeId: string,
  ): Promise<{ credentialExchangeId: string; state: string; credentialId?: string }> {
    if (credentialExchangeId.length === 0) {
      throw new Error('Missing required param "credentialExchangeId"');
    }

    // call the SDK
    const issueCredentialApi = new IssueCredentialV20Api(this.configuration);
    const result = await issueCredentialApi.issueCredential20RecordsCredExIdGet({
      credExId: credentialExchangeId,
    });

    if (!result.cred_ex_record?.state) {
      throw new Error('Failed to get credential exchange state');
    }

    return {
      credentialExchangeId: credentialExchangeId,
      state: result.cred_ex_record.state,
      credentialId: result.ld_proof?.cred_id_stored ?? undefined,
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
  async sendAnoncredsProofRequest(
    connectionId: string,
    credDefId: string,
  ): Promise<{ presentationExchangeId: string }> {
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
   * Request a W3C proof presentation from an existing connection. The connection/holder must then present proofs
   * from their wallet.
   *
   * @param connectionId The id of the connection to request the proof presentation from.
   * @param issuerDid The id of the expected issuer to restrict which credentials can be used
   *                  to satisfy the proof presentation request.
   * @returns object {
   *   presentationExchangeId: The id of the new presentation exchange associated with the proof presentation request.
   *     A presentation exchange tracks the current state of the protocol for requesting a proof presentation.
   * }
   */
  async sendW3cProofRequest(connectionId: string, issuerDid: string): Promise<{ presentationExchangeId: string }> {
    if (connectionId.length === 0) {
      throw new Error('Missing required param "connectionId"');
    }

    /**
     * The id of the connection to request the proof presentation from.
     */
    const connection_id = connectionId;

    /**
     * UUIDs to uniquely identify each field constraint in the proof request.
     */
    const fieldId1 = randomUUID();
    const fieldId2 = randomUUID();
    const fieldId3 = randomUUID();

    // call the SDK
    const presentProofApi = new PresentProofV20Api(this.configuration);
    const result = await presentProofApi.presentProof20SendRequestPost({
      body: {
        connection_id,
        auto_verify: true,
        comment: `Proof presentation requested at ${this.generateTimeStamp()}`,
        presentation_request: {
          dif: {
            options: {
              challenge: randomUUID(),
            },
            presentation_definition: {
              /**
               * An id for the proof request. This id is shared by both the verifier and the prover.
               */
              id: randomUUID(),
              format: {
                ldp_vp: {
                  proof_type: ['Ed25519Signature2018'],
                },
              },
              input_descriptors: [
                {
                  id: 'resident_name_input',
                  purpose: "The requested data is needed to verify the subject's residency",
                  /**
                   * A "schema" specifies where to find the definition of an attribute in the proof request.
                   * The schemas set below are only for demonstrative purposes.
                   * The first schema 'https://www.w3.org/2018/credentials#VerifiableCredential'
                   * defines '$.issuer.id' whilst the second schema 'https://w3id.org/citizenship#PermanentResident'
                   * defines '$.credentialSubject.givenName' and '$.credentialSubject.familyName'.
                   */
                  schema: {
                    uri_groups: [
                      [
                        {
                          uri: 'https://www.w3.org/2018/credentials#VerifiableCredential',
                        },
                        {
                          uri: 'https://w3id.org/citizenship#PermanentResident',
                        },
                      ],
                    ],
                  },
                  constraints: {
                    /**
                     * This constraint requires that the data presented must come from a credential in which the holder
                     * is the subject. That is, the holder DID used to sign the proof presentation must be equal to
                     * the DID found in the credential's "credentialSubject.id" attribute.
                     */
                    is_holder: [
                      {
                        directive: DIFHolderDirectiveEnum.Required,
                        field_id: [fieldId1, fieldId2, fieldId3],
                      },
                    ],
                    /**
                     * The data to request from the connection, for the purpose of verification.
                     * The first item set below places the restriction that the credential used to present the data
                     * must have been issued by the specified issuer.
                     * The second and third items request values for 'givenName' and 'familyName', but place no
                     * restrictions upon those values.
                     */
                    fields: [
                      {
                        id: fieldId1,
                        path: ['$.issuer.id'],
                        purpose: 'The credential must be issued by the specified party',
                        filter: {
                          _const: new String(issuerDid),
                        },
                      },
                      {
                        id: fieldId2,
                        path: ['$.credentialSubject.givenName'],
                        purpose: "The subject's given name is required to verify their residency",
                      },
                      {
                        id: fieldId3,
                        path: ['$.credentialSubject.familyName'],
                        purpose: "The subject's family name is required to verify their residency",
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    });

    if (!result.pres_ex_id) {
      throw new Error('Failed to send proof presentation request');
    }

    return {
      presentationExchangeId: result.pres_ex_id,
    };
  }

  /**
   * Get a W3C proof request received from a specified connection.
   *
   * @param connectionId The id of the connection to check for received proof requests.
   * @returns object {
   *   presentationExchangeId: The id of the presentation exchange associated with the received proof request.
   *     A presentation exchange tracks the current state of the protocol for presenting a verifiable credential.
   * }
   */
  async getW3cProofRequest(connectionId: string): Promise<{ presentationExchangeId?: string }> {
    if (connectionId.length === 0) {
      throw new Error('Missing required param "connectionId"');
    }

    // call the SDK
    const presentProofApi = new PresentProofV20Api(this.configuration);
    const result = await presentProofApi.presentProof20RecordsGet({
      connectionId,
    });

    // for the purposes of the example flow, we assume the first result is the only result
    const presentationExchange = result.results?.length === 1 ? result.results[0] : undefined;
    if (!presentationExchange) {
      return {};
    }

    return {
      presentationExchangeId: presentationExchange.pres_ex_id,
    };
  }

  /**
   * Send a W3C proof presentation, in response to a received W3C proof request.
   *
   * @param presentationExchangeId: The id of the presentation exchange to advance.
   *   This presentation exchange should be in the 'request-received' state.
   * @param credentialId: The id of the credential to use in the proof presentation.
   * @returns object {
   *   presentationExchangeId: Matches the @param presentationExchangeId, for convenience.
   *   state: The state of the presentation exchange protocol.
   * }
   */
  async sendW3cProofPresentation(
    presentationExchangeId: string,
    credentialId: string,
  ): Promise<{ presentationExchangeId: string; state: string }> {
    if (presentationExchangeId.length === 0) {
      throw new Error('Missing required param "presentationExchangeId"');
    }

    // call the SDK
    const presentProofApi = new PresentProofV20Api(this.configuration);
    const result = await presentProofApi.presentProof20RecordsPresExIdSendPresentationPost({
      presExId: presentationExchangeId,
      body: {
        dif: {
          record_ids: {
            resident_name_input: [credentialId],
          },
        },
      },
    });

    return {
      presentationExchangeId,
      state: result.state ?? '',
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
  async getAnoncredsProofPresentationExchangeState(presentationExchangeId: string): Promise<{
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
      verified: result.verified === V10PresentationExchangeVerifiedEnum.True,
    };

    const revealedAttributes = result.presentation?.requested_proof?.revealed_attrs ?? {};
    response.revealedAttributes = {
      name: revealedAttributes['name']?.raw,
      expiry: revealedAttributes['expiry']?.raw,
    };

    return response;
  }

  /**
   * Get the state of a W3C proof presentation exchange. The presentation exchange is identified by an id.
   *
   * @param presentationExchangeId The id of the presentation exchange to get the state of.
   * @returns object {
   *   presentationExchangeId: Matches the @param presentationExchangeId, for convenience.
   *   state: The state of the presentation exchange protocol.
   *   revealedAttributes: The attributes revealed by the connection in the proof presentation,
   *     if the proof presentation has been received.
   *   verified: When state==="done", this will be true if the revealedAttributes have been verified
   *     as being cryptographically secure. Otherwise, this will be false.
   * }
   */
  async getW3cProofPresentationExchangeState(presentationExchangeId: string): Promise<{
    presentationExchangeId: string;
    state: string;
    revealedAttributes: { givenName?: string; familyName?: string };
    verified: boolean;
  }> {
    if (presentationExchangeId.length === 0) {
      throw new Error('Missing required param "presentationExchangeId"');
    }

    // call the SDK
    const presentProofApi = new PresentProofV20Api(this.configuration);
    const result = await presentProofApi.presentProof20RecordsPresExIdGet({
      presExId: presentationExchangeId,
    });

    if (!result.state) {
      throw new Error('Failed to get proof presentation exchange state');
    }

    const response: {
      presentationExchangeId: string;
      state: string;
      revealedAttributes: { givenName?: string; familyName?: string };
      verified: boolean;
    } = {
      presentationExchangeId,
      state: result.state,
      revealedAttributes: {},
      verified: result.state === V20PresExRecordStateEnum.Done && result.verified === V20PresExRecordVerifiedEnum.True,
    };

    if (
      result.state === V20PresExRecordStateEnum.PresentationReceived ||
      result.state === V20PresExRecordStateEnum.Done
    ) {
      const revealedAttributes =
        (result.by_format?.pres as Pres)?.dif?.verifiableCredential[0]?.credentialSubject ?? {};
      response.revealedAttributes = {
        givenName: revealedAttributes['givenName'] as string,
        familyName: revealedAttributes['familyName'] as string,
      };
    }

    return response;
  }

  /**
   * Return a timestamp of the current date and time. This is only used to support replay-ability of this example app.
   */
  private generateTimeStamp(): string {
    return new Date().toISOString().split('.')[0].replace(/\D/gi, '');
  }
}

/**
 * Only used to extend the type interface of a fetched credential exchange.
 */
interface CredOffer {
  ld_proof: {
    credential: {
      '@context': string[];
      type: string[];
      issuanceDate: string;
      issuer: string;
      credentialSubject: {
        [attributeName: string]: unknown;
      };
    };
    options: {
      proofType: string;
    };
  };
}

/**
 * Only used to extend the type interface of a received proof presentation.
 */
interface Pres {
  dif: {
    '@context': string[];
    type: string[];
    verifiableCredential: {
      '@context': string[];
      type: string[];
      issuer: {
        id: string;
      };
      issuanceDate: string;
      credentialSubject: {
        [attributeName: string]: unknown;
      };
      proof: object;
    }[];
    presentation_submission: object;
    proof: object;
  };
}
