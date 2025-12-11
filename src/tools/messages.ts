import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getSDK } from "../utils/sdk.js";
import { logger } from "../utils/logger.js";

export function registerMessageTools(server: McpServer) {
  // Get messages with filtering
  server.tool(
    "get-messages",
    "Get messages with optional filtering by sender, date, service, etc.",
    {
      sender: z.string().optional().describe("Filter by sender phone/email"),
      limit: z.number().min(1).max(100).default(50).describe("Max messages to return"),
      since: z.string().optional().describe("Get messages after this ISO date"),
      unreadOnly: z.boolean().default(false).describe("Only get unread messages"),
      hasAttachments: z.boolean().optional().describe("Only messages with attachments"),
      service: z.enum(["iMessage", "SMS", "RCS"]).optional().describe("Filter by service"),
      chatId: z.string().optional().describe("Filter by chat ID"),
      includeOwn: z.boolean().default(false).describe("Include your own messages"),
    },
    async ({ sender, limit, since, unreadOnly, hasAttachments, service, chatId, includeOwn }) => {
      try {
        logger.tool("get-messages", "Fetching messages with filters");
        const sdk = getSDK();

        const result = await sdk.getMessages({
          sender,
          limit,
          since: since ? new Date(since) : undefined,
          unreadOnly,
          hasAttachments,
          service,
          chatId,
          excludeOwnMessages: !includeOwn,
        });

        if (result.messages.length === 0) {
          return { content: [{ type: "text", text: "No messages found matching criteria" }] };
        }

        const formatted = result.messages.map((msg) => {
          const date = new Date(msg.date).toLocaleString();
          const sender = msg.isFromMe ? "Me" : msg.sender;
          const read = msg.isRead ? "" : " [UNREAD]";
          const attachments = msg.attachments.length > 0 ? ` [${msg.attachments.length} attachment(s)]` : "";
          return `[${date}] ${sender} (${msg.service})${read}: ${msg.text || "[No text]"}${attachments}`;
        }).join("\n");

        return {
          content: [{
            type: "text",
            text: `Found ${result.total} messages (${result.unreadCount} unread):\n\n${formatted}`,
          }],
        };
      } catch (error: any) {
        logger.error("get-messages failed: %s", error.message);
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );

  // Get unread messages grouped by sender
  server.tool(
    "get-unread-messages",
    "Get all unread messages grouped by sender",
    {},
    async () => {
      try {
        logger.tool("get-unread-messages", "Fetching unread messages");
        const sdk = getSDK();

        const result = await sdk.getUnreadMessages();

        if (result.total === 0) {
          return { content: [{ type: "text", text: "No unread messages" }] };
        }

        const formatted = result.groups.map(({ sender, messages }) => {
          const msgList = messages.map((m) => {
            const time = new Date(m.date).toLocaleTimeString();
            return `  [${time}] ${m.text || "[No text]"}`;
          }).join("\n");
          return `${sender} (${messages.length} unread):\n${msgList}`;
        }).join("\n\n");

        return {
          content: [{
            type: "text",
            text: `${result.total} unread messages from ${result.senderCount} sender(s):\n\n${formatted}`,
          }],
        };
      } catch (error: any) {
        logger.error("get-unread-messages failed: %s", error.message);
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );

  // Search messages
  server.tool(
    "search-messages",
    "Search for messages containing specific text",
    {
      query: z.string().min(1).describe("Text to search for"),
      sender: z.string().optional().describe("Filter by sender"),
      limit: z.number().min(1).max(100).default(20).describe("Max results"),
    },
    async ({ query, sender, limit }) => {
      try {
        logger.tool("search-messages", "Searching for: %s", query);
        const sdk = getSDK();

        // Get messages and filter by text content
        const result = await sdk.getMessages({
          sender,
          limit: 500, // Get more to search through
          excludeOwnMessages: false,
        });

        const matches = result.messages
          .filter((m) => m.text?.toLowerCase().includes(query.toLowerCase()))
          .slice(0, limit);

        if (matches.length === 0) {
          return { content: [{ type: "text", text: `No messages found containing "${query}"` }] };
        }

        const formatted = matches.map((msg) => {
          const date = new Date(msg.date).toLocaleString();
          const sender = msg.isFromMe ? "Me" : msg.sender;
          return `[${date}] ${sender}: ${msg.text}`;
        }).join("\n");

        return {
          content: [{
            type: "text",
            text: `Found ${matches.length} messages containing "${query}":\n\n${formatted}`,
          }],
        };
      } catch (error: any) {
        logger.error("search-messages failed: %s", error.message);
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );

  // Send text message
  server.tool(
    "send-message",
    "Send a text message to a phone number or email",
    {
      to: z.string().describe("Recipient phone number (e.g., +1234567890) or email"),
      message: z.string().min(1).describe("Message text to send"),
    },
    async ({ to, message }) => {
      try {
        logger.tool("send-message", "Sending to %s", to);
        const sdk = getSDK();

        const result = await sdk.send(to, message);

        logger.success("Message sent to %s", to);
        return {
          content: [{
            type: "text",
            text: `Message sent successfully!\nTo: ${to}\nSent at: ${result.sentAt.toLocaleString()}`,
          }],
        };
      } catch (error: any) {
        logger.error("send-message failed: %s", error.message);
        return { content: [{ type: "text", text: `Error sending message: ${error.message}` }] };
      }
    }
  );

  // Send file
  server.tool(
    "send-file",
    "Send a file attachment to a recipient",
    {
      to: z.string().describe("Recipient phone number or email"),
      filePath: z.string().describe("Path to the file to send"),
      message: z.string().optional().describe("Optional text message with the file"),
    },
    async ({ to, filePath, message }) => {
      try {
        logger.tool("send-file", "Sending file to %s", to);
        const sdk = getSDK();

        const result = await sdk.sendFile(to, filePath, message);

        logger.success("File sent to %s", to);
        return {
          content: [{
            type: "text",
            text: `File sent successfully!\nTo: ${to}\nFile: ${filePath}\nSent at: ${result.sentAt.toLocaleString()}`,
          }],
        };
      } catch (error: any) {
        logger.error("send-file failed: %s", error.message);
        return { content: [{ type: "text", text: `Error sending file: ${error.message}` }] };
      }
    }
  );

  // Send image
  server.tool(
    "send-image",
    "Send an image to a recipient",
    {
      to: z.string().describe("Recipient phone number or email"),
      imagePath: z.string().describe("Path to the image file or URL"),
      message: z.string().optional().describe("Optional text message with the image"),
    },
    async ({ to, imagePath, message }) => {
      try {
        logger.tool("send-image", "Sending image to %s", to);
        const sdk = getSDK();

        const content: { text?: string; images: string[] } = { images: [imagePath] };
        if (message) content.text = message;

        const result = await sdk.send(to, content);

        logger.success("Image sent to %s", to);
        return {
          content: [{
            type: "text",
            text: `Image sent successfully!\nTo: ${to}\nSent at: ${result.sentAt.toLocaleString()}`,
          }],
        };
      } catch (error: any) {
        logger.error("send-image failed: %s", error.message);
        return { content: [{ type: "text", text: `Error sending image: ${error.message}` }] };
      }
    }
  );
}

