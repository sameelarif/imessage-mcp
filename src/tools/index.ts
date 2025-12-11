import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerMessageTools } from "./messages";
import { registerConversationTools } from "./conversations";
import { registerAttachmentTools } from "./attachments";
import { logger } from "../utils/logger";

export function registerAllTools(server: McpServer) {
  logger.info("Registering MCP tools...");

  registerMessageTools(server);
  logger.debug("  ✓ Message tools registered");

  registerConversationTools(server);
  logger.debug("  ✓ Conversation tools registered");

  registerAttachmentTools(server);
  logger.debug("  ✓ Attachment tools registered");

  logger.success("All tools registered");
}

export { registerMessageTools, registerConversationTools, registerAttachmentTools };

