import { format } from "util";

type LogLevel = "debug" | "info" | "warn" | "error";

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
  white: "\x1b[37m",
  gray: "\x1b[90m",
};

const ICONS = {
  debug: "🔍",
  info: "ℹ️ ",
  warn: "⚠️ ",
  error: "❌",
  success: "✅",
  message: "💬",
  send: "📤",
  receive: "📥",
  tool: "🔧",
  server: "🖥️ ",
};

class Logger {
  private level: LogLevel = "info";
  private prefix: string = "iMessage-MCP";

  setLevel(level: LogLevel) {
    this.level = level;
  }

  setPrefix(prefix: string) {
    this.prefix = prefix;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private timestamp(): string {
    return new Date().toLocaleTimeString();
  }

  private formatMessage(
    level: LogLevel,
    icon: string,
    color: string,
    message: string,
    ...args: any[]
  ): string {
    const formattedMsg = args.length > 0 ? format(message, ...args) : message;
    return `${COLORS.gray}[${this.timestamp()}]${COLORS.reset} ${icon} ${color}${COLORS.bright}[${this.prefix}]${COLORS.reset} ${formattedMsg}`;
  }

  debug(message: string, ...args: any[]) {
    if (this.shouldLog("debug")) {
      console.error(
        this.formatMessage("debug", ICONS.debug, COLORS.gray, message, ...args)
      );
    }
  }

  info(message: string, ...args: any[]) {
    if (this.shouldLog("info")) {
      console.error(
        this.formatMessage("info", ICONS.info, COLORS.blue, message, ...args)
      );
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.shouldLog("warn")) {
      console.error(
        this.formatMessage("warn", ICONS.warn, COLORS.yellow, message, ...args)
      );
    }
  }

  error(message: string, ...args: any[]) {
    if (this.shouldLog("error")) {
      console.error(
        this.formatMessage("error", ICONS.error, COLORS.red, message, ...args)
      );
    }
  }

  success(message: string, ...args: any[]) {
    console.error(
      this.formatMessage("info", ICONS.success, COLORS.green, message, ...args)
    );
  }

  tool(toolName: string, message: string, ...args: any[]) {
    if (this.shouldLog("debug")) {
      const formattedMsg =
        args.length > 0 ? format(message, ...args) : message;
      console.error(
        `${COLORS.gray}[${this.timestamp()}]${COLORS.reset} ${ICONS.tool} ${COLORS.cyan}[${toolName}]${COLORS.reset} ${formattedMsg}`
      );
    }
  }

  server(message: string, ...args: any[]) {
    console.error(
      this.formatMessage("info", ICONS.server, COLORS.magenta, message, ...args)
    );
  }

  divider() {
    console.error(
      `${COLORS.gray}${"─".repeat(50)}${COLORS.reset}`
    );
  }

  banner() {
    console.error(`
${COLORS.cyan}${COLORS.bright}
  ╔═══════════════════════════════════════╗
  ║       iMessage MCP Server             ║
  ║       Powered by imessage-kit         ║
  ╚═══════════════════════════════════════╝
${COLORS.reset}`);
  }
}

export const logger = new Logger();
export { COLORS, ICONS };

