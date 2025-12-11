import { IMessageSDK } from "@photon-ai/imessage-kit";
import { logger } from "./logger";

let sdk: IMessageSDK | null = null;

export function getSDK(): IMessageSDK {
  if (!sdk) {
    throw new Error("SDK not initialized. Call initializeSDK() first.");
  }
  return sdk;
}

export async function initializeSDK(): Promise<IMessageSDK> {
  if (sdk) {
    return sdk;
  }

  logger.info("Initializing iMessage SDK...");
  
  sdk = new IMessageSDK({
    debug: process.env.DEBUG === "true",
  });

  logger.success("iMessage SDK initialized");
  return sdk;
}

export async function closeSDK(): Promise<void> {
  if (sdk) {
    await sdk.close();
    sdk = null;
    logger.info("iMessage SDK closed");
  }
}

