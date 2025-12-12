/**
 * iMessage Kit Playground
 * Run with: pnpm tsx src/test.ts
 */

import { IMessageSDK } from "@photon-ai/imessage-kit";
import {
  getAllContacts,
  searchContacts,
  findContactByPhone,
} from "./utils/contacts";

const sdk = new IMessageSDK({
  debug: false,
});

async function main() {
  console.log("🔌 iMessage SDK Playground\n");

  // ═══════════════════════════════════════════════════════════════
  // 📇 CONTACTS DATABASE
  // ═══════════════════════════════════════════════════════════════

  // Get all contacts
  const contacts = getAllContacts();
  console.log(`📇 Found ${contacts.length} contacts in macOS Contacts\n`);

  // Show first 10 contacts with phone numbers
  console.log("First 10 contacts:");
  for (const contact of contacts.slice(0, 10)) {
    const phones = contact.phoneNumbers.join(", ") || "no phone";
    console.log(`  • ${contact.fullName}: ${phones}`);
  }
  console.log();

  // Search for a contact by name
  // const results = searchContacts("john");
  // console.log(`🔍 Search "john": ${results.length} results`);
  // for (const contact of results) {
  //   console.log(`  • ${contact.fullName}: ${contact.phoneNumbers.join(", ")}`);
  // }

  // Find contact by phone number
  // const contact = findContactByPhone("+1234567890");
  // if (contact) {
  //   console.log(`📱 Found: ${contact.fullName}`);
  // }

  // ═══════════════════════════════════════════════════════════════
  // 💬 iMESSAGE SDK
  // ═══════════════════════════════════════════════════════════════

  // List recent chats
  const chats = await sdk.listChats({ limit: 5 });
  console.log("📱 Recent chats:");
  for (const chat of chats) {
    const id = chat.chatId.split(";").pop() || "";
    const name = chat.displayName || id;

    // Try to find contact name if displayName is missing
    let resolvedName = name;
    if (!chat.displayName && id) {
      const contact = findContactByPhone(id);
      if (contact) {
        resolvedName = `${contact.fullName} (${id})`;
      }
    }

    console.log(`  • ${resolvedName}`);
  }
  console.log();

  // Get recent messages
  // const messages = await sdk.getMessages({ limit: 5 });
  // console.log("💬 Recent messages:");
  // for (const msg of messages.messages) {
  //   const sender = msg.isFromMe ? "Me" : msg.senderName || msg.sender;
  //   console.log(`  [${sender}]: ${msg.text?.slice(0, 50) || "[attachment]"}`);
  // }

  console.log("👋 Done!");
}

main().catch(console.error);
