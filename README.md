# imessage-mcp

A full-featured MCP (Model Context Protocol) server for iMessage on macOS, powered by [@photon-ai/imessage-kit](https://github.com/photon-hq/imessage-kit).

**No external server required** - works directly with your local iMessage database.

## Features

### Message Tools
- **get-messages** - Get messages with filters (sender, date, service, attachments)
- **get-unread-messages** - Get unread messages grouped by sender
- **search-messages** - Search messages by text content
- **send-message** - Send text messages
- **send-image** - Send images
- **send-file** - Send file attachments

### Conversation Tools
- **get-conversation** - Get full chat history with a contact
- **get-recent-conversations** - Overview of recent chats
- **get-chat-messages** - Get messages from a specific chat/group

### Attachment Tools
- **get-attachments** - Get messages with attachments
- **get-conversation-attachments** - Get all attachments from a conversation
- **send-files** - Send multiple files at once

## Prerequisites

- **macOS** with iMessage enabled
- **Full Disk Access** permission for the application running the MCP server
- Node.js 18+

### Granting Full Disk Access

1. Go to **System Settings → Privacy & Security → Full Disk Access**
2. Add your terminal (Terminal.app, iTerm2, or VS Code)
3. Restart your terminal

## Setup

```bash
pnpm install
pnpm build
```

## Usage with Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "imessage": {
      "command": "node",
      "args": ["/path/to/imessage-mcp/dist/index.js"]
    }
  }
}
```

## Test Client

An interactive test client is included for testing with the Vercel AI SDK:

```bash
# Set your OpenAI API key
export OPENAI_API_KEY=your-api-key

# Run the test client
pnpm test-client
```

### Test Client Commands
- Type any question to interact with your iMessage data
- `clear` - Reset conversation history
- `tools` - List available tools
- `exit` - Quit

## Environment Variables

```bash
# Optional: Set log level (debug, info, warn, error)
LOG_LEVEL=info

# Optional: Enable debug mode for the SDK
DEBUG=true
```

## Project Structure

```
src/
├── index.ts           # Main MCP server entry point
├── test-client.ts     # Interactive test client
├── tools/
│   ├── index.ts       # Tool registration
│   ├── messages.ts    # Message tools
│   ├── conversations.ts # Conversation tools
│   └── attachments.ts # Attachment tools
└── utils/
    ├── logger.ts      # Pretty CLI logging
    └── sdk.ts         # SDK initialization
```

## Scripts

- `pnpm build` - Compile TypeScript
- `pnpm dev` - Watch mode
- `pnpm start` - Run the MCP server
- `pnpm test-client` - Interactive test client
- `pnpm clean` - Remove build artifacts
