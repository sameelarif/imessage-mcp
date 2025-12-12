import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getSDK } from "../utils/sdk.js";
import { logger } from "../utils/logger.js";
import { searchContacts, getAllContacts } from "../utils/contacts.js";

export function registerConversationTools(server: McpServer) {
  // Find contact by name - searches both iMessage chats AND macOS Contacts
  server.tool(
    "find-contact",
    "Search for a contact by name and get their phone number. Use this FIRST when the user mentions someone by name instead of phone number. Searches both iMessage history and macOS Contacts.",
    {
      name: z
        .string()
        .describe("The name (or partial name) of the contact to find"),
    },
    async ({ name }) => {
      try {
        logger.tool("find-contact", "Searching for contact: %s", name);

        // Search macOS Contacts database first (more reliable for names)
        const contactsResults = searchContacts(name);

        if (contactsResults.length > 0) {
          if (contactsResults.length === 1) {
            const contact = contactsResults[0];
            const phone = contact.phoneNumbers[0] || "no phone";
            return {
              content: [
                {
                  type: "text",
                  text: `Found: ${contact.fullName}\nPhone: ${phone}\n\nUse this phone number with send-message, get-conversation, etc.`,
                },
              ],
            };
          }

          // Multiple matches from Contacts
          const formatted = contactsResults
            .slice(0, 10)
            .map((contact, i) => {
              const phones = contact.phoneNumbers.join(", ") || "no phone";
              return `${i + 1}. ${contact.fullName}\n   Phone: ${phones}`;
            })
            .join("\n\n");

          return {
            content: [
              {
                type: "text",
                text: `Found ${contactsResults.length} contacts matching "${name}":\n\n${formatted}\n\nUse the phone number with other tools.`,
              },
            ],
          };
        }

        // Fall back to searching iMessage chats
        const sdk = getSDK();
        const allChats = await sdk.listChats({
          type: "dm",
          limit: 100,
          sortBy: "recent",
        });

        const searchLower = name.toLowerCase();
        const chats = allChats.filter((chat) => {
          const displayName = chat.displayName?.toLowerCase() || "";
          return displayName.includes(searchLower);
        });

        if (chats.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No contact found matching "${name}" in Contacts or iMessage. Try a different spelling or use list-contacts to see all contacts.`,
              },
            ],
          };
        }

        if (chats.length === 1) {
          const chat = chats[0];
          const identifier = chat.chatId.split(";").pop() || chat.chatId;
          const displayName = chat.displayName || identifier;
          return {
            content: [
              {
                type: "text",
                text: `Found in iMessage: ${displayName}\nPhone/ID: ${identifier}\n\nUse this with send-message, get-conversation, etc.`,
              },
            ],
          };
        }

        // Multiple matches from iMessage
        const formatted = chats
          .map((chat, i) => {
            const identifier = chat.chatId.split(";").pop() || chat.chatId;
            const displayName = chat.displayName || identifier;
            return `${i + 1}. ${displayName}\n   Phone/ID: ${identifier}`;
          })
          .join("\n\n");

        return {
          content: [
            {
              type: "text",
              text: `Found ${chats.length} contacts in iMessage matching "${name}":\n\n${formatted}\n\nUse the phone number with other tools.`,
            },
          ],
        };
      } catch (error: any) {
        logger.error("find-contact failed: %s", error.message);
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );

  // List all contacts from macOS Contacts app
  server.tool(
    "list-contacts",
    "List all contacts from the macOS Contacts app with their phone numbers",
    {
      limit: z
        .number()
        .min(1)
        .max(100)
        .default(30)
        .describe("Number of contacts to return"),
    },
    async ({ limit }) => {
      try {
        logger.tool("list-contacts", "Listing contacts");
        const contacts = getAllContacts().slice(0, limit);

        if (contacts.length === 0) {
          return {
            content: [
              { type: "text", text: "No contacts found in macOS Contacts." },
            ],
          };
        }

        const formatted = contacts
          .map((contact) => {
            const phones = contact.phoneNumbers.join(", ") || "no phone";
            const emails =
              contact.emails.length > 0
                ? `\n  Email: ${contact.emails.join(", ")}`
                : "";
            return `• ${contact.fullName}\n  Phone: ${phones}${emails}`;
          })
          .join("\n\n");

        return {
          content: [
            {
              type: "text",
              text: `Found ${contacts.length} contacts:\n\n${formatted}`,
            },
          ],
        };
      } catch (error: any) {
        logger.error("list-contacts failed: %s", error.message);
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );

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

  // List chats with contact names
  server.tool(
    "list-chats",
    "List all chats with contact names, sorted by recent activity",
    {
      limit: z
        .number()
        .min(1)
        .max(100)
        .default(30)
        .describe("Number of chats to retrieve"),
      type: z
        .enum(["all", "group", "dm"])
        .default("all")
        .describe("Filter by chat type"),
      hasUnread: z
        .boolean()
        .optional()
        .describe("Only show chats with unread messages"),
      search: z.string().optional().describe("Search by contact/group name"),
    },
    async ({ limit, type, hasUnread, search }) => {
      try {
        logger.tool("list-chats", "Listing chats");
        const sdk = getSDK();

        const chats = await sdk.listChats({
          limit,
          type,
          hasUnread,
          search,
          sortBy: "recent",
        });

        if (chats.length === 0) {
          return {
            content: [{ type: "text", text: "No chats found" }],
          };
        }

        const formatted = chats
          .map((chat) => {
            // Extract phone/email from chatId (e.g., "iMessage;+1234567890" -> "+1234567890")
            const identifier = chat.chatId.split(";").pop() || chat.chatId;
            const name = chat.displayName || identifier;
            const typeLabel = chat.isGroup ? "👥 Group" : "👤 DM";
            const unread =
              chat.unreadCount > 0 ? ` [${chat.unreadCount} unread]` : "";
            const lastActive = chat.lastMessageAt
              ? `\n  Last active: ${chat.lastMessageAt.toLocaleString()}`
              : "";
            // Show name and number separately for DMs
            const contact =
              !chat.isGroup && chat.displayName
                ? `${name} (${identifier})`
                : name;
            return `• ${contact} (${typeLabel})${unread}${lastActive}\n  Chat ID: ${chat.chatId}`;
          })
          .join("\n\n");

        return {
          content: [
            {
              type: "text",
              text: `Found ${chats.length} chats:\n\n${formatted}`,
            },
          ],
        };
      } catch (error: any) {
        logger.error("list-chats failed: %s", error.message);
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
            const sender = msg.isFromMe ? "Me" : msg.senderName || msg.sender;
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
