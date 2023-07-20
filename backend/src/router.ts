import { resolve, sep as pathSep } from 'path';
import Express, { Request, Response, Router } from 'express';
import { Environment } from './environment.js';
import CloudAgent from './CloudAgent.js';

/**
 * A function to initialize routes for the example app, given an environment configuration.
 */
export function initRouter(env: Environment, cloudAgent: CloudAgent): Router {
  const router = Express.Router();

  // serve static content, if the static content root directory is defined
  if (env.staticContentRootDirectory) {
    router.use('/', Express.static(resolve(...env.staticContentRootDirectory.split(pathSep))));
  }

  /**
   * Routes for frontend-to-backend communication.
   * These routes expect JSON in the request body, and return JSON in the response body.
   */
  router.use('/api/', Express.json());
  router.post('/api/connection-invitation', initRoutePostConnectionInvitation(cloudAgent));
  router.get('/api/connection/:connectionId', initRouteGetConnectionState(cloudAgent));
  router.post('/api/schema', initRoutePostSchema(cloudAgent));
  router.post('/api/credential-definition', initRoutePostCredDef(cloudAgent));
  router.post('/api/issue-credential', initRoutePostCredentialOffer(cloudAgent));
  router.get('/api/credential-exchange/:credentialExchangeId', initRouteGetCredentialExchangeState(cloudAgent));
  router.post('/api/proof-presentation', initRoutePostProofPresentation(cloudAgent));
  router.get('/api/presentation-exchange/:presentationExchangeId', initRouteGetPresentationExchangeState(cloudAgent));

  // use a default route for requests which cannot be served by another route
  router.get('*', initDefaultRoute(env));

  return router;
}

/**
 * Default route: return static content if its root directory is defined, otherwise return status 404 "Not Found".
 */
function initDefaultRoute(env: Environment) {
  return (request: Request, response: Response) => {
    env.staticContentRootDirectory
      ? response.sendFile(resolve(...env.staticContentRootDirectory.split(pathSep), 'index.html'))
      : response.sendStatus(404);
  };
}

/**
 * Route handler to create a new connection invitation.
 *
 * Request body: json object {
 *   connectionAlias: The human-readable name which users of this application can use to identify the connection.
 * }
 * Response body: json object {
 *   connectionId: New id which can be used to identify the pending connection.
 *   invitationUrl: URL which an Edge Agent can use to accept the invitation and establish the connection.
 * }
 */
function initRoutePostConnectionInvitation(cloudAgent: CloudAgent) {
  return async (request: Request, response: Response) => {
    const connectionAlias = request.body['connectionAlias'] ?? '';
    const result = await cloudAgent.createConnectionInvitation(connectionAlias);
    response.json(result);
  };
}

/**
 * Route handler to get the state of a connection.
 * The connection is identified by a connection id param in the request URL.
 *
 * Request param:
 *   connectionId: The id of the connection to get the state of.
 * Response body: json object {
 *   connectionId: Matches the request param connectionId, for convenience.
 *   state: The state of the connection.
 * }
 */
function initRouteGetConnectionState(cloudAgent: CloudAgent) {
  return async (request: Request, response: Response) => {
    const connectionId = request.params['connectionId'] ?? '';
    const result = await cloudAgent.getConnectionState(connectionId);
    response.json(result);
  };
}

/**
 * Route handler to publish a new schema to the ledger.
 *
 * Request body: void
 * Response body: json object {
 *   schemaId: The id of the new schema.
 * }
 */
function initRoutePostSchema(cloudAgent: CloudAgent) {
  return async (request: Request, response: Response) => {
    const result = await cloudAgent.publishSchema();
    response.json(result);
  };
}

/**
 * Route handler to publish a new credDef (credential definition) to the ledger for a specified schema.
 *
 * Request body: json object {
 *   schemaId: The id of the schema to use for the new credDef.
 * }
 * Response body: json object {
 *   credDefId: The id of the new credDef.
 * }
 */
function initRoutePostCredDef(cloudAgent: CloudAgent) {
  return async (request: Request, response: Response) => {
    const schemaId = request.body['schemaId'] ?? '';
    const result = await cloudAgent.publishCredDef(schemaId);
    response.json(result);
  };
}

/**
 * Route handler to send a credential offer to a specified connection.
 *
 * Request body: json object {
 *   connectionId: The id of the connection to send the credential offer to.
 *   credDefId: The id of the credDef (credential definition) to use as the base for the new credential.
 *   credentialData: Data values for the attributes listed in the credDef.
 * }
 * Response body: json object {
 *   credentialExchangeId: The id of the new credential exchange associated with the credential offer.
 * }
 */
function initRoutePostCredentialOffer(cloudAgent: CloudAgent) {
  return async (request: Request, response: Response) => {
    const connectionId = request.body['connectionId'] ?? '';
    const credDefId = request.body['credDefId'] ?? '';
    const credentialData = request.body['credentialData'] ?? { name: '', expiry: '' };
    const result = await cloudAgent.sendCredentialOffer(connectionId, credDefId, credentialData);
    response.json(result);
  };
}

/**
 * Route handler to get the state of a credential exchange.
 * The credential exchange is identified by a credential exchange id param in the request URL.
 *
 * Request param:
 *   credentialExchangeId: The id of the credential exchange to get the state of.
 * Response body: json object {
 *   credentialExchangeId: Matches the request param credentialExchangeId, for convenience.
 *   state: The state of the credential exchange.
 * }
 */
function initRouteGetCredentialExchangeState(cloudAgent: CloudAgent) {
  return async (request: Request, response: Response) => {
    const credentialExchangeId = request.params['credentialExchangeId'] ?? '';
    const result = await cloudAgent.getCredentialExchangeState(credentialExchangeId);
    response.json(result);
  };
}

/**
 * Route handler to request a proof presentation from a specified connection.
 *
 * Request body: json object {
 *   connectionId: The id of the connection to request the proof presentation from.
 *   credDefId: The id of the credDef (credential definition) to restrict which credentials can be used
 *              to satisfy the proof presentation request.
 * }
 * Response body: json object {
 *   presentationExchangeId: The id of the new presentation exchange associated with the proof presentation request.
 * }
 */
function initRoutePostProofPresentation(cloudAgent: CloudAgent) {
  return async (request: Request, response: Response) => {
    const connectionId = request.body['connectionId'] ?? '';
    const credDefId = request.body['credDefId'] ?? '';
    const result = await cloudAgent.requestProofPresentation(connectionId, credDefId);
    response.json(result);
  };
}

/**
 * Route handler to get the state of a proof presentation exchange.
 * The presentation exchange is identified by a presentation exchange id param in the request URL.
 *
 * Request param:
 *   presentationExchangeId: The id of the presentation exchange to get the state of.
 * Response body: json object {
 *   presentationExchangeId: Matches the request param presentationExchangeId, for convenience.
 *   state: The state of the presentation exchange protocol.
 *   revealedAttributes: The attributes revealed by the connection in the proof presentation,
 *     if the proof presentation has been received.
 *   verified: When state==="verified", this will be true if the revealedAttributes have been verified
 *     as being cryptographically secure. Otherwise, this will be false.
 * }
 */
function initRouteGetPresentationExchangeState(cloudAgent: CloudAgent) {
  return async (request: Request, response: Response) => {
    const presentationExchangeId = request.params['presentationExchangeId'] ?? '';
    const result = await cloudAgent.getProofPresentationExchangeState(presentationExchangeId);
    response.json(result);
  };
}
