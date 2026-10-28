import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

let bedrockClient: BedrockRuntimeClient | null = null;

export interface BedrockClientOptions {
  region?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

/**
 * Returns a singleton instance of the BedrockRuntimeClient,
 * or creates one using environment variables or optional custom config.
 */
export function getBedrockClient(options?: BedrockClientOptions): BedrockRuntimeClient {
  if (options) {
    return new BedrockRuntimeClient({
      region: options.region || process.env.AWS_BEDROCK_REGION || process.env.AWS_REGION || "us-east-1",
      ...(options.credentials ? { credentials: options.credentials } : {}),
    });
  }

  if (!bedrockClient) {
    const accessKeyId = process.env.AWS_BEDROCK_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_BEDROCK_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_BEDROCK_REGION || process.env.AWS_REGION || "us-east-1";

    bedrockClient = new BedrockRuntimeClient({
      region,
      ...(accessKeyId && secretAccessKey
        ? {
            credentials: {
              accessKeyId,
              secretAccessKey,
            },
          }
        : {}),
    });
  }

  return bedrockClient;
}
