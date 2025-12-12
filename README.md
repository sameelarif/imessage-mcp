# 💬 iMessage MCP Server

> Access your iMessage conversations through the Model Context Protocol

<p align="center">
  <strong>Read, search, and send iMessages</strong> directly from Claude, Cursor, or any MCP-compatible client.<br>
  No external servers required — works locally with your iMessage database.
</p>

⚠️ **Local-only server** — This MCP server reads directly from local macOS database files (`~/Library/Messages/chat.db` and `~/Library/Application Support/AddressBook/`). It must run on the same Mac where your iMessages are loaded and Apple ID is configured. Remote or cloud deployment is not supported.

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 📥 Read Messages

- Get recent messages with smart filtering
- View unread messages grouped by sender
- Search across all conversations
- Filter by date, service (iMessage/SMS), attachments

</td>
<td width="50%">

### 💬 Conversations

- View full chat history with any contact
- See recent conversations at a glance
- Support for group chats
- Track read/unread status

</td>
</tr>
<tr>
<td width="50%">

### 📤 Send Messages

- Send text messages to any contact
- Share images and files
- Send multiple attachments at once
- Works with phone numbers and emails

</td>
<td width="50%">

### 📎 Attachments

- Browse messages with attachments
- Get attachment metadata (size, type, path)
- Filter for images only
- View all attachments in a conversation

</td>
</tr>
</table>

---

## 🚀 Quick Start

### Prerequisites

- **macOS** with iMessage configured
- **Node.js** 18 or later
- **Full Disk Access** permission (see below)

### Installation

```bash
git clone https://github.com/sameelarif/imessage-mcp.git
cd imessage-mcp
pnpm install
pnpm build
```

### Granting Full Disk Access

The MCP server needs permission to read your iMessage database.

1. Open **System Settings** → **Privacy & Security** → **Full Disk Access**
2. Click the **+** button
3. Add your terminal app (Terminal, Claude Desktop, Cursor, Warp, VS Code, Ghostyy, etc.)
4. Restart the application

---

## 🔧 Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "imessage": {
      "command": "node",
      "args": ["/absolute/path/to/imessage-mcp/dist/index.js"]
    }
  }
}
```

### Environment Variables

| Variable    | Description                                          | Default |
| ----------- | ---------------------------------------------------- | ------- |
| `LOG_LEVEL` | Logging verbosity (`debug`, `info`, `warn`, `error`) | `info`  |
| `DEBUG`     | Enable SDK debug mode                                | `false` |

---

## 🛠️ Available Tools

<details>
<summary><strong>📥 Message Tools</strong></summary>

| Tool                  | Description                                                    |
| --------------------- | -------------------------------------------------------------- |
| `get-messages`        | Get messages with filters (sender, date, service, attachments) |
| `get-unread-messages` | Get unread messages grouped by sender                          |
| `search-messages`     | Search messages by text content                                |
| `send-message`        | Send a text message                                            |
| `send-image`          | Send an image                                                  |
| `send-file`           | Send a file attachment                                         |

</details>

<details>
<summary><strong>💬 Conversation Tools</strong></summary>

| Tool                       | Description                             |
| -------------------------- | --------------------------------------- |
| `get-conversation`         | Get full chat history with a contact    |
| `get-recent-conversations` | Overview of recent chats                |
| `get-chat-messages`        | Get messages from a specific chat/group |

</details>

<details>
<summary><strong>📎 Attachment Tools</strong></summary>

| Tool                           | Description                             |
| ------------------------------ | --------------------------------------- |
| `get-attachments`              | Get messages with attachments           |
| `get-conversation-attachments` | Get all attachments from a conversation |
| `send-files`                   | Send multiple files at once             |

</details>

---

## 🧪 Test Client

An interactive CLI is included for testing with the Vercel AI SDK:

```bash
export OPENAI_API_KEY=sk-...
pnpm test-client
```

**Commands:** `exit` • `clear` • `tools`

---

## 📁 Project Structure

```
src/
├── index.ts              # MCP server entry point
├── test-client.ts        # Interactive test client
├── tools/
│   ├── messages.ts       # Message tools
│   ├── conversations.ts  # Conversation tools
│   └── attachments.ts    # Attachment tools
└── utils/
    ├── logger.ts         # Pretty CLI logging
    └── sdk.ts            # SDK initialization
```

---

## 📜 Scripts

| Script             | Description             |
| ------------------ | ----------------------- |
| `pnpm build`       | Compile TypeScript      |
| `pnpm dev`         | Watch mode              |
| `pnpm start`       | Run the MCP server      |
| `pnpm test-client` | Interactive test client |
| `pnpm clean`       | Remove build artifacts  |

---

## 🙏 Acknowledgements

- Built with [@photon-ai/imessage-kit](https://github.com/photon-hq/imessage-kit) for iMessage database access
- Uses the [Model Context Protocol](https://modelcontextprotocol.io) by Anthropic
- Test client powered by [Vercel AI SDK](https://sdk.vercel.ai)

---

## 📄 License

Licensed under the MIT License.
