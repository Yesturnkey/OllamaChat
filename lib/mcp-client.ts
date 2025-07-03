import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface MCPServerInfo {
  name: string;
  version: string;
  protocolVersion: string;
  capabilities: any;
}

export interface MCPToolCallResult {
  content: Array<{
    type: string;
    text?: string;
    [key: string]: any;
  }>;
  isError?: boolean;
}

export class MCPClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private messageId = 0;
  private pendingRequests = new Map<
    number,
    { resolve: Function; reject: Function }
  >();
  private isInitialized = false;
  private serverInfo: MCPServerInfo | null = null;
  private tools: MCPTool[] = [];
  private buffer = "";

  constructor(
    private command: string,
    private args: string[] = [],
    private env: Record<string, string> = {}
  ) {
    super();
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 啟動 MCP 服務器進程
        this.process = spawn(this.command, this.args, {
          stdio: ["pipe", "pipe", "pipe"],
          env: { ...process.env, ...this.env },
        });

        if (
          !this.process.stdout ||
          !this.process.stdin ||
          !this.process.stderr
        ) {
          throw new Error("Failed to create process pipes");
        }

        this.process.stdout.on("data", (data) => {
          this.handleOutput(data.toString());
        });

        this.process.stderr.on("data", (data) => {
          console.error("MCP Server stderr:", data.toString());
        });

        this.process.on("error", (error) => {
          console.error("MCP Server process error:", error);
          this.emit("error", error);
          reject(error);
        });

        this.process.on("close", (code) => {
          console.log(`MCP Server process exited with code ${code}`);
          this.emit("close", code);
        });

        // 等待進程啟動
        setTimeout(() => {
          if (this.process && !this.process.killed) {
            resolve();
          } else {
            reject(new Error("Failed to start MCP server process"));
          }
        }, 1000);
      } catch (error) {
        reject(error);
      }
    });
  }

  async initialize(): Promise<MCPServerInfo> {
    if (this.isInitialized) {
      return this.serverInfo!;
    }

    const result = await this.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {
        roots: {
          listChanged: false,
        },
        sampling: {},
      },
      clientInfo: {
        name: "ollamachat",
        version: "1.0.0",
      },
    });

    this.serverInfo = {
      name: result.serverInfo?.name || "Unknown",
      version: result.serverInfo?.version || "Unknown",
      protocolVersion: result.protocolVersion || "2024-11-05",
      capabilities: result.capabilities || {},
    };

    this.isInitialized = true;

    // 發送 initialized 通知
    await this.sendNotification("notifications/initialized", {});

    return this.serverInfo;
  }

  async listTools(): Promise<MCPTool[]> {
    if (!this.isInitialized) {
      throw new Error("Client not initialized");
    }

    const result = await this.sendRequest("tools/list", {});
    this.tools = result.tools || [];
    return this.tools;
  }

  async callTool(name: string, args: any = {}): Promise<MCPToolCallResult> {
    if (!this.isInitialized) {
      throw new Error("Client not initialized");
    }

    const result = await this.sendRequest("tools/call", {
      name,
      arguments: args,
    });

    return result;
  }

  private handleOutput(data: string): void {
    this.buffer += data;

    // 處理完整的 JSON-RPC 消息
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        try {
          const message = JSON.parse(trimmed);
          this.handleMessage(message);
        } catch (error) {
          console.error(
            "Failed to parse JSON-RPC message:",
            error,
            "Line:",
            trimmed
          );
        }
      }
    }
  }

  private handleMessage(message: any): void {
    if (message.id !== undefined && this.pendingRequests.has(message.id)) {
      // 這是對請求的響應
      const { resolve, reject } = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);

      if (message.error) {
        reject(new Error(message.error.message || "RPC Error"));
      } else {
        resolve(message.result);
      }
    } else if (message.method) {
      // 這是來自服務器的通知或請求
      this.emit("notification", message);
    }
  }

  private async sendRequest(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdin) {
        reject(new Error("Process not available"));
        return;
      }

      const id = ++this.messageId;
      const request = {
        jsonrpc: "2.0",
        id,
        method,
        params,
      };

      this.pendingRequests.set(id, { resolve, reject });

      // 設置超時
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout for method: ${method}`));
        }
      }, 30000);

      const message = JSON.stringify(request) + "\n";
      this.process.stdin.write(message);
    });
  }

  private async sendNotification(method: string, params: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdin) {
        reject(new Error("Process not available"));
        return;
      }

      const notification = {
        jsonrpc: "2.0",
        method,
        params,
      };

      const message = JSON.stringify(notification) + "\n";
      this.process.stdin.write(message);
      resolve();
    });
  }

  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.isInitialized = false;
    this.serverInfo = null;
    this.tools = [];
    this.pendingRequests.clear();
  }

  isConnected(): boolean {
    return this.process !== null && !this.process.killed;
  }

  getServerInfo(): MCPServerInfo | null {
    return this.serverInfo;
  }

  getTools(): MCPTool[] {
    return this.tools;
  }
}

// 全局 MCP 客戶端管理器
export class MCPClientManager {
  private clients = new Map<string, MCPClient>();

  async createClient(
    id: string,
    command: string,
    args: string[] = [],
    env: Record<string, string> = {}
  ): Promise<MCPClient> {
    // 如果已存在，先斷開
    if (this.clients.has(id)) {
      await this.disconnect(id);
    }

    const client = new MCPClient(command, args, env);
    this.clients.set(id, client);
    return client;
  }

  getClient(id: string): MCPClient | null {
    return this.clients.get(id) || null;
  }

  async disconnect(id: string): Promise<void> {
    const client = this.clients.get(id);
    if (client) {
      await client.disconnect();
      this.clients.delete(id);
    }
  }

  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.clients.keys()).map((id) =>
      this.disconnect(id)
    );
    await Promise.all(promises);
  }

  listClients(): string[] {
    return Array.from(this.clients.keys());
  }
}

// 全局實例
export const mcpClientManager = new MCPClientManager();
