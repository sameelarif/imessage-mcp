import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getSDK } from "../utils/sdk";
import { logger } from "../utils/logger";

export function registerConversationTools(server: McpServer) {
  // Get conversation with a specific contact
  server.tool(
    "get-conversation",
    "Get the full conversation history with a specific contact",
    {
      contact: z.string().describe("Phone number or email of the contact"),
      limit: z
        .number()
        .min(1)
        .max(200)
        .default(50)
        .describe("Number of messages to retrieve"),
      since: z.string().optional().describe("Get messages after this ISO date"),
    },
    async ({ contact, limit, since }) => {
      try {
        logger.tool(
          "get-conversation",
          "Getting conversation with %s",
          contact
        );
        const sdk = getSDK();

        const result = await sdk.getMessages({
          sender: contact,
          limit,
          since: since ? new Date(since) : undefined,
          excludeOwnMessages: false, // Include both sides
        });

        if (result.messages.length === 0) {
          return {
            content: [
              { type: "text", text: `No conversation found with ${contact}` },
            ],
          };
        }

        // Sort by date ascending for conversation view
        const sorted = [...result.messages].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const formatted = sorted
          .map((msg) => {
            const time = new Date(msg.date).toLocaleTimeString();
            const sender = msg.isFromMe ? "Me" : contact;
            const text = msg.text || "[No text]";
            const attachments =
              msg.attachments.length > 0
                ? ` 📎 ${msg.attachments.map((a) => a.filename).join(", ")}`
                : "";
            return `[${time}] ${sender}: ${text}${attachments}`;
          })
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: `Conversation with ${contact} (${result.messages.length} messages):\n\n${formatted}`,
            },
          ],
        };
      } catch (error: any) {
        logger.error("get-conversation failed: %s", error.message);
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );

  // Get recent conversations overview
  server.tool(
    "get-recent-conversations",
    "Get an overview of recent conversations with unique contacts",
    {
      limit: z
        .number()
        .min(1)
        .max(50)
        .default(20)
        .describe("Number of recent conversations"),
    },
    async ({ limit }) => {
      try {
        logger.tool("get-recent-conversations", "Getting recent conversations");
        const sdk = getSDK();

        const result = await sdk.getMessages({
          limit: 500, // Get more to group by sender
          excludeOwnMessages: false,
        });

        // Group by sender and get most recent
        const conversations = new Map<
          string,
          {
            lastMessage: string;
            lastDate: Date;
            unreadCount: number;
            service: string;
          }
        >();

        for (const msg of result.messages) {
          const contact = msg.isFromMe ? msg.chatId : msg.sender;
          const existing = conversations.get(contact);

          if (!existing || new Date(msg.date) > existing.lastDate) {
            conversations.set(contact, {
              lastMessage: msg.text || "[No text]",
              lastDate: new Date(msg.date),
              unreadCount: (existing?.unreadCount || 0) + (msg.isRead ? 0 : 1),
              service: msg.service,
            });
          } else if (!msg.isRead) {
            existing.unreadCount++;
          }
        }

        // Sort by date and limit
        const sorted = [...conversations.entries()]
          .sort((a, b) => b[1].lastDate.getTime() - a[1].lastDate.getTime())
          .slice(0, limit);

        if (sorted.length === 0) {
          return {
            content: [{ type: "text", text: "No recent conversations found" }],
          };
        }

        const formatted = sorted
          .map(([contact, data]) => {
            const time = data.lastDate.toLocaleString();
            const unread =
              data.unreadCount > 0 ? ` [${data.unreadCount} unread]` : "";
            const preview =
              data.lastMessage.length > 50
                ? data.lastMessage.slice(0, 50) + "..."
                : data.lastMessage;
            return `• ${contact} (${data.service})${unread}\n  Last: ${time}\n  "${preview}"`;
          })
          .join("\n\n");

        return {
          content: [
            {
              type: "text",
              text: `Recent conversations (${sorted.length}):\n\n${formatted}`,
            },
          ],
        };
      } catch (error: any) {
        logger.error("get-recent-conversations failed: %s", error.message);
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );

  // Get messages from a specific chat (group or individual)
  server.tool(
    "get-chat-messages",
    "Get messages from a specific chat by chat ID (useful for group chats)",
    {
      chatId: z.string().describe("The chat ID to retrieve messages from"),
      limit: z
        .number()
        .min(1)
        .max(100)
        .default(50)
        .describe("Number of messages"),
      since: z.string().optional().describe("Get messages after this ISO date"),
    },
    async ({ chatId, limit, since }) => {
      try {
        logger.tool(
          "get-chat-messages",
          "Getting messages for chat %s",
          chatId
        );
        const sdk = getSDK();

        const result = await sdk.getMessages({
          chatId,
          limit,
          since: since ? new Date(since) : undefined,
          excludeOwnMessages: false,
        });

        if (result.messages.length === 0) {
          return {
            content: [
              { type: "text", text: `No messages found in chat ${chatId}` },
            ],
          };
        }

        const isGroup = result.messages.some((m) => m.isGroupChat);
        const formatted = result.messages
          .map((msg) => {
            const time = new Date(msg.date).toLocaleTimeString();
            const sender = msg.isFromMe ? "Me" : msg.sender;
            return `[${time}] ${sender}: ${msg.text || "[No text]"}`;
          })
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: `${isGroup ? "Group chat" : "Chat"} ${chatId} (${
                result.messages.length
              } messages):\n\n${formatted}`,
            },
          ],
        };
      } catch (error: any) {
        logger.error("get-chat-messages failed: %s", error.message);
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );
}
