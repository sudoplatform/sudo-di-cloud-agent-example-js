import { config } from 'dotenv';

/**
 * The collection of environment variables supported by the example app.
 */
export interface Environment {
  localhostPort?: number;
  staticContentRootDirectory?: string;
  cloudAgentAdminApiEndpoint: string;
  cloudAgentAdminApiKey: string;
}

/**
 * A function to load the example app's environment configuration from a given `.env` file.
 */
export function loadEnvironment(envFilePath: string): Environment {
  const dotenvOutput = config({ path: envFilePath });
  if (dotenvOutput.error) {
    throw new Error(`File not found: ${envFilePath}`);
  }
  const parsedDotenv = dotenvOutput.parsed ?? {};

  const env: Environment = {
    localhostPort: parseInt(parsedDotenv.LOCALHOST_PORT ?? 3000),
    staticContentRootDirectory: parsedDotenv.STATIC_CONTENT_ROOT_DIRECTORY ?? '',
    cloudAgentAdminApiEndpoint: parsedDotenv.CLOUD_AGENT_ADMIN_API_ENDPOINT ?? '',
    cloudAgentAdminApiKey: parsedDotenv.CLOUD_AGENT_ADMIN_API_KEY ?? '',
  };

  const isRequiredEnvSet = env.cloudAgentAdminApiEndpoint && env.cloudAgentAdminApiKey;
  if (!isRequiredEnvSet) {
    throw new Error('Missing required environment configuration');
  }

  return env;
}
