import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getSDK } from "../utils/sdk.js";
import { logger } from "../utils/logger.js";

export function registerAttachmentTools(server: McpServer) {
  // Get messages with attachments
  server.tool(
    "get-attachments",
    "Get messages that have file attachments",
    {
      sender: z.string().optional().describe("Filter by sender"),
      limit: z.number().min(1).max(50).default(20).describe("Number of messages to retrieve"),
      imagesOnly: z.boolean().default(false).describe("Only get image attachments"),
    },
    async ({ sender, limit, imagesOnly }) => {
      try {
        logger.tool("get-attachments", "Getting messages with attachments");
        const sdk = getSDK();

        const result = await sdk.getMessages({
          sender,
          hasAttachments: true,
          limit: limit * 2, // Get more to account for filtering
          excludeOwnMessages: false,
        });

        let messages = result.messages;
        
        if (imagesOnly) {
          messages = messages.filter((m) => 
            m.attachments.some((a) => a.isImage)
          );
        }

        messages = messages.slice(0, limit);

        if (messages.length === 0) {
          return { content: [{ type: "text", text: "No messages with attachments found" }] };
        }

        const formatted = messages.map((msg) => {
          const date = new Date(msg.date).toLocaleString();
          const sender = msg.isFromMe ? "Me" : msg.sender;
          const attachmentList = msg.attachments.map((a) => {
            const type = a.isImage ? "📷" : "📎";
            const size = formatFileSize(a.size);
            return `    ${type} ${a.filename} (${a.mimeType}, ${size})`;
          }).join("\n");
          
          return `[${date}] ${sender}: ${msg.text || "[No text]"}\n  Attachments:\n${attachmentList}`;
        }).join("\n\n");

        return {
          content: [{
            type: "text",
            text: `Found ${messages.length} messages with attachments:\n\n${formatted}`,
          }],
        };
      } catch (error: any) {
        logger.error("get-attachments failed: %s", error.message);
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );

  // Get attachment details for a conversation
  server.tool(
    "get-conversation-attachments",
    "Get all attachments from a conversation with a specific contact",
    {
      contact: z.string().describe("Phone number or email of the contact"),
      limit: z.number().min(1).max(100).default(50).describe("Max attachments to retrieve"),
    },
    async ({ contact, limit }) => {
      try {
        logger.tool("get-conversation-attachments", "Getting attachments for %s", contact);
        const sdk = getSDK();

        const result = await sdk.getMessages({
          sender: contact,
          hasAttachments: true,
          limit: 200,
          excludeOwnMessages: false,
        });

        const allAttachments: Array<{
          filename: string;
          path: string;
          size: number;
          mimeType: string;
          isImage: boolean;
          date: Date;
          sender: string;
        }> = [];

        for (const msg of result.messages) {
          for (const att of msg.attachments) {
            allAttachments.push({
              ...att,
              date: new Date(msg.date),
              sender: msg.isFromMe ? "Me" : msg.sender,
            });
          }
        }

        const limited = allAttachments.slice(0, limit);

        if (limited.length === 0) {
          return { content: [{ type: "text", text: `No attachments found in conversation with ${contact}` }] };
        }

        const formatted = limited.map((att) => {
          const type = att.isImage ? "📷" : "📎";
          const size = formatFileSize(att.size);
          const date = att.date.toLocaleString();
          return `${type} ${att.filename}\n  From: ${att.sender} at ${date}\n  Type: ${att.mimeType}, Size: ${size}\n  Path: ${att.path}`;
        }).join("\n\n");

        return {
          content: [{
            type: "text",
            text: `Found ${limited.length} attachments in conversation with ${contact}:\n\n${formatted}`,
          }],
        };
      } catch (error: any) {
        logger.error("get-conversation-attachments failed: %s", error.message);
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );

  // Send multiple files
  server.tool(
    "send-files",
    "Send multiple files to a recipient",
    {
      to: z.string().describe("Recipient phone number or email"),
      filePaths: z.array(z.string()).min(1).describe("Array of file paths to send"),
      message: z.string().optional().describe("Optional text message"),
    },
    async ({ to, filePaths, message }) => {
      try {
        logger.tool("send-files", "Sending %d files to %s", filePaths.length, to);
        const sdk = getSDK();

        const result = await sdk.sendFiles(to, filePaths, message);

        logger.success("Files sent to %s", to);
        return {
          content: [{
            type: "text",
            text: `${filePaths.length} files sent successfully!\nTo: ${to}\nFiles: ${filePaths.join(", ")}\nSent at: ${result.sentAt.toLocaleString()}`,
          }],
        };
      } catch (error: any) {
        logger.error("send-files failed: %s", error.message);
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

