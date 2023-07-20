import Express from 'express';
import { resolve } from 'path';
import { loadEnvironment } from './environment.js';
import { initRouter } from './router.js';
import CloudAgent from './CloudAgent.js';

// load the environment configuration
const env = loadEnvironment(resolve('..', '..', '.env'));

// prepare to make calls to the Cloud Agent Service
const cloudAgent = new CloudAgent(env.cloudAgentAdminApiEndpoint, env.cloudAgentAdminApiKey);

/**
 * Accept the ledger's TAA (Transaction Author Agreement).
 *
 * The TAA is a document describing the conditions of use of the ledger. The TAA must be accepted before attempting
 * to write to the ledger. Ledger writes (a.k.a. transactions) are necessary in order to issue verifiable credentials.
 * You are strongly encouraged to familiarize yourself with the TAA for the ledger used by your Cloud Agent Service.
 *
 * The TAA for the Indicio TestNet ledger can be found here:
 * https://github.com/Indicio-tech/indicio-network/blob/main/TAA/TAA.md
 *
 * CAUTION: Never attempt to write to the ledger without first accepting the TAA!
 */
await cloudAgent.acceptLedgerTaa();

// create the Express application
const app = Express();

// initialize routes
const router = initRouter(env, cloudAgent);
app.use(router);

// listen for incoming requests
app.listen(env.localhostPort, () => {
  console.log(`Server running at http://localhost:${env.localhostPort}`);
});
