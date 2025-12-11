import { experimental_createMCPClient as createMCPClient } from "ai";
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio";
import { openai } from "@ai-sdk/openai";
import { generateText, CoreMessage } from "ai";
import * as readline from "readline";
import "dotenv/config";

// Colors for CLI
const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

function log(color: string, icon: string, message: string) {
  console.log(`${color}${icon}${COLORS.reset} ${message}`);
}

function banner() {
  console.log(`
${COLORS.cyan}${COLORS.bright}
  ╔═══════════════════════════════════════╗
  ║    iMessage MCP Test Client           ║
  ║    Powered by Vercel AI SDK           ║
  ╚═══════════════════════════════════════╝
${COLORS.reset}`);
}

async function main() {
  banner();

  let client: Awaited<ReturnType<typeof createMCPClient>> | undefined;

  try {
    log(COLORS.blue, "🔌", "Connecting to iMessage MCP Server...");

    const transport = new Experimental_StdioMCPTransport({
      command: "node",
      args: ["dist/index.js"],
    });

    client = await createMCPClient({ transport });

    log(COLORS.green, "✅", "Connected to iMessage MCP Server");

    // Get available tools
    const tools = await client.tools();
    const toolNames = Object.keys(tools);

    log(COLORS.magenta, "🔧", `Available tools (${toolNames.length}):`);
    toolNames.forEach((tool) => {
      console.log(`${COLORS.gray}   • ${tool}${COLORS.reset}`);
    });
    console.log();

    // System prompt
    const systemPrompt = `You are a helpful assistant with access to the user's iMessage data on macOS.

You have the following capabilities:
- Read messages (get-messages, get-unread-messages, search-messages)
- View conversations (get-conversation, get-recent-conversations, get-chat-messages)
- Send messages (send-message, send-image, send-file, send-files)
- Work with attachments (get-attachments, get-conversation-attachments)

You can chain multiple tool calls to accomplish complex tasks. For example:
- Get recent conversations, then dive into a specific one
- Search for messages, then get the full conversation context
- Check unread messages, then respond to them

Be proactive in using tools to gather information. Always format phone numbers with country code (e.g., +1234567890).`;

    // Conversation history
    const messages: CoreMessage[] = [];

    // Interactive mode
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const askQuestion = () => {
      rl.question(`${COLORS.cyan}You: ${COLORS.reset}`, async (input) => {
        if (input.toLowerCase() === "exit" || input.toLowerCase() === "quit") {
          log(COLORS.yellow, "👋", "Goodbye!");
          rl.close();
          await client?.close();
          return;
        }

        if (input.toLowerCase() === "clear") {
          messages.length = 0;
          log(COLORS.yellow, "🗑️ ", "Conversation cleared.");
          console.log();
          askQuestion();
          return;
        }

        if (input.toLowerCase() === "tools") {
          log(COLORS.magenta, "🔧", "Available tools:");
          toolNames.forEach((tool) => {
            console.log(`${COLORS.gray}   • ${tool}${COLORS.reset}`);
          });
          console.log();
          askQuestion();
          return;
        }

        if (!input.trim()) {
          askQuestion();
          return;
        }

        messages.push({ role: "user", content: input });

        try {
          console.log(`\n${COLORS.gray}Thinking...${COLORS.reset}\n`);

          const response = await generateText({
            model: openai("gpt-4o-mini"),
            system: systemPrompt,
            tools,
            maxSteps: 10,
            messages,
            onStepFinish: ({ toolCalls }) => {
              // Just log tool calls for real-time feedback
              if (toolCalls && toolCalls.length > 0) {
                for (const call of toolCalls) {
                  log(COLORS.cyan, "🔧", `Calling ${call.toolName}...`);
                }
              }
            },
          });

          // Add all steps to conversation history in correct order
          for (const step of response.steps) {
            // Add assistant message with tool calls
            if (step.toolCalls && step.toolCalls.length > 0) {
              messages.push({
                role: "assistant",
                content: step.toolCalls.map((call) => ({
                  type: "tool-call" as const,
                  toolCallId: call.toolCallId,
                  toolName: call.toolName,
                  args: call.args,
                })),
              });

              // Add corresponding tool results immediately after
              if (step.toolResults && step.toolResults.length > 0) {
                for (const result of step.toolResults) {
                  messages.push({
                    role: "tool",
                    content: [
                      {
                        type: "tool-result" as const,
                        toolCallId: result.toolCallId,
                        toolName: result.toolName,
                        result: result.result,
                      },
                    ],
                  });
                }
              }
            }
          }

          // Add final assistant text response
          if (response.text) {
            messages.push({ role: "assistant", content: response.text });
          }

          console.log(
            `${COLORS.green}Assistant:${COLORS.reset} ${
              response.text || "[No text response]"
            }\n`
          );
        } catch (error: any) {
          log(COLORS.red, "❌", `Error: ${error.message}`);
          // Remove the failed user message to keep history clean
          messages.pop();
          console.log();
        }

        askQuestion();
      });
    };

    console.log(
      `${COLORS.gray}Commands: "exit" to quit, "clear" to reset, "tools" to list tools${COLORS.reset}`
    );
    console.log(`${COLORS.gray}${"─".repeat(50)}${COLORS.reset}\n`);

    askQuestion();
  } catch (error: any) {
    log(COLORS.red, "❌", `Failed to connect: ${error.message}`);
    await client?.close();
    process.exit(1);
  }
}

main();
