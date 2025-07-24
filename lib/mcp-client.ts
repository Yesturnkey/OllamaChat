import { MCPClient } from "mcp-client";
import type {
  Tool as MCPTool,
  Implementation as MCPServerInfo,
  CallToolResult as MCPToolCallResult,
} from "@modelcontextprotocol/sdk/types.js";

export type { MCPTool, MCPServerInfo, MCPToolCallResult };

export class MCPClientManager {
  private static instance: MCPClientManager;
  private clients = new Map<string, MCPClient>();
  
  constructor() {
    if (MCPClientManager.instance) {
      return MCPClientManager.instance;
    }
    MCPClientManager.instance = this;
  }
  
  static getInstance(): MCPClientManager {
    if (!MCPClientManager.instance) {
      MCPClientManager.instance = new MCPClientManager();
    }
    return MCPClientManager.instance;
  }

  async createClient(
    id: string,
    connectionOptions:
      | {
          type: "stdio";
          command: string;
          args: string[];
          env?: Record<string, string>;
        }
      | {
          type: "sse";
          url: string;
        }
      | {
          type?: "httpStream";
          url: string;
        }
  ): Promise<MCPClient> {
    if (this.clients.has(id)) {
      await this.disconnect(id);
    }

    const client = new MCPClient({
      name: "ollamachat",
      version: "1.0.0",
    });

    await client.connect(connectionOptions);

    this.clients.set(id, client);
    return client;
  }

  // 保持向後相容性的方法
  async createStdioClient(
    id: string,
    command: string,
    args: string[] = [],
    env: Record<string, string> = {}
  ): Promise<MCPClient> {
    return this.createClient(id, {
      type: "stdio",
      command,
      args,
      env,
    });
  }

  getClient(id: string): MCPClient | null {
    return this.clients.get(id) || null;
  }

  async disconnect(id: string): Promise<void> {
    const client = this.clients.get(id);
    if (client) {
      await client.close();
      this.clients.delete(id);
    }
  }

  async disconnectAll(): Promise<void> {
    for (const id of this.clients.keys()) {
      await this.disconnect(id);
    }
  }

  listClients(): string[] {
    return Array.from(this.clients.keys());
  }

  async listTools(id: string): Promise<MCPTool[]> {
    const client = this.getClient(id);
    if (!client) {
      throw new Error(`Client with id ${id} not found`);
    }
    return client.getAllTools();
  }

  async callTool(
    id: string,
    name: string,
    args: any = {}
  ): Promise<MCPToolCallResult> {
    const client = this.getClient(id);
    if (!client) {
      throw new Error(`Client with id ${id} not found`);
    }
    return client.callTool({ name, arguments: args });
  }
}

export const mcpClientManager = MCPClientManager.getInstance();
