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

  static async getConnectionState(connectionId: string): Promise<{ connectionId: string; state: string }> {
    const responseData = await this.httpRequest({
      endpoint: `/api/connection/${connectionId}`,
      method: 'GET',
    });
    return responseData as { connectionId: string; state: string };
  }

  static async publishSchema(): Promise<{ schemaId: string }> {
    const responseData = await this.httpRequest({
      endpoint: `/api/schema`,
      method: 'POST',
    });
    return responseData as { schemaId: string };
  }

  static async publishCredDef(schemaId: string): Promise<{ credDefId: string }> {
    const responseData = await this.httpRequest({
      endpoint: `/api/credential-definition`,
      method: 'POST',
      body: { schemaId },
    });
    return responseData as { credDefId: string };
  }

  static async sendCredentialOffer(
    connectionId: string,
    credDefId: string,
    credentialData: { name: string; expiry: string },
  ): Promise<{ credentialExchangeId: string }> {
    const responseData = await this.httpRequest({
      endpoint: `/api/issue-credential`,
      method: 'POST',
      body: { connectionId, credDefId, credentialData },
    });
    return responseData as { credentialExchangeId: string };
  }

  static async getCredentialExchangeState(
    credentialExchangeId: string,
  ): Promise<{ credentialExchangeId: string; state: string }> {
    const responseData = await this.httpRequest({
      endpoint: `/api/credential-exchange/${credentialExchangeId}`,
      method: 'GET',
    });
    return responseData as { credentialExchangeId: string; state: string };
  }

  static async requestProofPresentation(
    connectionId: string,
    credDefId: string,
  ): Promise<{ presentationExchangeId: string }> {
    const responseData = await this.httpRequest({
      endpoint: `/api/proof-presentation`,
      method: 'POST',
      body: { connectionId, credDefId },
    });
    return responseData as { presentationExchangeId: string };
  }

  static async getProofPresentationExchangeState(presentationExchangeId: string): Promise<{
    presentationExchangeId: string;
    state: string;
    revealedAttributes: { name?: string; expiry?: string };
    verified: boolean;
  }> {
    const responseData = await this.httpRequest({
      endpoint: `/api/presentation-exchange/${presentationExchangeId}`,
      method: 'GET',
    });
    return responseData as {
      presentationExchangeId: string;
      state: string;
      revealedAttributes: { name?: string; expiry?: string };
      verified: boolean;
    };
  }

  private static async httpRequest(args: { endpoint: string; method: string; body?: object }): Promise<object> {
    const options = {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: args.method,
      body: args.body ? JSON.stringify(args.body) : undefined,
    };

    return await fetch(args.endpoint, options).then((response) => response.json());
  }
}
