import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import "dotenv/config";

import { logger } from "./utils/logger.js";
import { initializeSDK, closeSDK } from "./utils/sdk.js";
import { registerAllTools } from "./tools/index.js";

// Set log level from environment
if (process.env.LOG_LEVEL) {
  logger.setLevel(process.env.LOG_LEVEL as "debug" | "info" | "warn" | "error");
}

// Create MCP server instance
const server = new McpServer({
  name: "imessage",
  version: "2.0.0",
});

async function main() {
  logger.banner();
  logger.divider();

  try {
    // Initialize the iMessage SDK
    await initializeSDK();

    // Register all tools
    registerAllTools(server);

    // Connect MCP transport
    logger.info("Starting MCP server on stdio...");
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.success("iMessage MCP Server is running!");
    logger.info("Ready to receive commands via stdio");
    logger.divider();
  } catch (error: any) {
    logger.error("Failed to start server: %s", error.message);
    await closeSDK();
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("Shutting down...");
    await closeSDK();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  logger.error("Fatal error: %s", error.message);
  process.exit(1);
});
