/**
 * The frontend's API to the backend. Uses standard HTTP request methods to send requests and receive responses
 * to and from the backend's exposed API endpoints.
 */
export default class HttpToBackend {
  static async createConnectionInvitation(
    connectionAlias: string,
  ): Promise<{ connectionId: string; invitationUrl: string }> {
    const responseData = await this.httpRequest({
      endpoint: '/api/connection-invitation',
      method: 'POST',
      body: { connectionAlias },
    });
    return responseData as { connectionId: string; invitationUrl: string };
  }

  static async acceptConnectionInvitation(
    connectionAlias: string,
    invitationUrl: string,
  ): Promise<{ connectionId: string }> {
    const responseData = await this.httpRequest({
      endpoint: '/api/accept-connection-invitation',
      method: 'POST',
      body: { connectionAlias, invitationUrl },
    });
    return responseData as { connectionId: string };
  }

  static async getConnectionState(connectionId: string): Promise<{ connectionId: string; state: string }> {
    const responseData = await this.httpRequest({
      endpoint: `/api/connection/${connectionId}`,
      method: 'GET',
    });
    return responseData as { connectionId: string; state: string };
  }

  static async publishAnoncredsSchema(): Promise<{ schemaId: string }> {
    const responseData = await this.httpRequest({
      endpoint: `/api/anoncreds/schema`,
      method: 'POST',
    });
    return responseData as { schemaId: string };
  }

  static async publishAnoncredsCredDef(schemaId: string): Promise<{ credDefId: string }> {
    const responseData = await this.httpRequest({
      endpoint: `/api/anoncreds/credential-definition`,
      method: 'POST',
      body: { schemaId },
    });
    return responseData as { credDefId: string };
  }

  static async sendAnoncredsCredentialOffer(
    connectionId: string,
    credDefId: string,
    credentialData: { name: string; expiry: string },
  ): Promise<{ credentialExchangeId: string }> {
    const responseData = await this.httpRequest({
      endpoint: `/api/anoncreds/issue-credential`,
      method: 'POST',
      body: { connectionId, credDefId, credentialData },
    });
    return responseData as { credentialExchangeId: string };
  }

  static async sendW3cCredentialOffer(
    connectionId: string,
    credentialData: { givenName: string; familyName: string },
  ): Promise<{ credentialExchangeId: string; issuerDid: string }> {
    const responseData = await this.httpRequest({
      endpoint: `/api/w3c/issue-credential`,
      method: 'POST',
      body: { connectionId, credentialData },
    });
    return responseData as { credentialExchangeId: string; issuerDid: string };
  }

  static async getW3cCredentialOffer(connectionId: string): Promise<{
    credentialExchangeId?: string;
    credentialData?: { givenName: string; familyName: string };
  }> {
    const responseData = await this.httpRequest({
      endpoint: `/api/w3c/credential-offer/${connectionId}`,
      method: 'GET',
    });
    return responseData as {
      credentialExchangeId?: string;
      credentialData?: { givenName: string; familyName: string };
    };
  }

  static async acceptW3cCredentialOffer(credentialExchangeId: string): Promise<{ holderDid: string }> {
    const responseData = await this.httpRequest({
      endpoint: `/api/w3c/credential-request`,
      method: 'POST',
      body: { credentialExchangeId },
    });
    return responseData as { holderDid: string };
  }

  static async getAnoncredsCredentialExchangeState(
    credentialExchangeId: string,
  ): Promise<{ credentialExchangeId: string; state: string }> {
    const responseData = await this.httpRequest({
      endpoint: `/api/anoncreds/credential-exchange/${credentialExchangeId}`,
      method: 'GET',
    });
    return responseData as { credentialExchangeId: string; state: string };
  }

  static async getW3cCredentialExchangeState(
    credentialExchangeId: string,
  ): Promise<{ credentialExchangeId: string; state: string; credentialId?: string }> {
    const responseData = await this.httpRequest({
      endpoint: `/api/w3c/credential-exchange/${credentialExchangeId}`,
      method: 'GET',
    });
    return responseData as { credentialExchangeId: string; state: string; credentialId?: string };
  }

  static async sendAnoncredsProofRequest(
    connectionId: string,
    credDefId: string,
  ): Promise<{ presentationExchangeId: string }> {
    const responseData = await this.httpRequest({
      endpoint: `/api/anoncreds/proof-request`,
      method: 'POST',
      body: { connectionId, credDefId },
    });
    return responseData as { presentationExchangeId: string };
  }

  static async sendW3cProofRequest(
    connectionId: string,
    issuerDid: string,
  ): Promise<{ presentationExchangeId: string }> {
    const responseData = await this.httpRequest({
      endpoint: `/api/w3c/proof-request`,
      method: 'POST',
      body: { connectionId, issuerDid },
    });
    return responseData as { presentationExchangeId: string };
  }

  static async getW3cProofRequest(connectionId: string): Promise<{ presentationExchangeId: string }> {
    const responseData = await this.httpRequest({
      endpoint: `/api/w3c/proof-request/${connectionId}`,
      method: 'GET',
    });
    return responseData as { presentationExchangeId: string };
  }

  static async sendW3cProofPresentation(
    presentationExchangeId: string,
    credentialId: string,
  ): Promise<{ presentationExchangeId: string; state: string }> {
    const responseData = await this.httpRequest({
      endpoint: `/api/w3c/proof-presentation`,
      method: 'POST',
      body: { presentationExchangeId, credentialId },
    });
    return responseData as { presentationExchangeId: string; state: string };
  }

  static async getAnoncredsProofPresentationExchangeState(presentationExchangeId: string): Promise<{
    presentationExchangeId: string;
    state: string;
    revealedAttributes: { name?: string; expiry?: string };
    verified: boolean;
  }> {
    const responseData = await this.httpRequest({
      endpoint: `/api/anoncreds/presentation-exchange/${presentationExchangeId}`,
      method: 'GET',
    });
    return responseData as {
      presentationExchangeId: string;
      state: string;
      revealedAttributes: { name?: string; expiry?: string };
      verified: boolean;
    };
  }

  static async getW3cProofPresentationExchangeState(presentationExchangeId: string): Promise<{
    presentationExchangeId: string;
    state: string;
    revealedAttributes: { givenName?: string; familyName?: string };
    verified: boolean;
  }> {
    const responseData = await this.httpRequest({
      endpoint: `/api/w3c/presentation-exchange/${presentationExchangeId}`,
      method: 'GET',
    });
    return responseData as {
      presentationExchangeId: string;
      state: string;
      revealedAttributes: { givenName?: string; familyName?: string };
      verified: boolean;
    };
  }

  private static async httpRequest(args: { endpoint: string; method: string; body?: object }): Promise<object> {
    const options: RequestInit = {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: args.method,
    };

    if (args.body !== undefined) {
      options.body = JSON.stringify(args.body);
    }

    return await fetch(args.endpoint, options).then((response) => response.json());
  }
}
