import { MCPClient } from "mcp-client";
import type {
  Tool as MCPTool,
  Implementation as MCPServerInfo,
  CallToolResult as MCPToolCallResult,
} from "@modelcontextprotocol/sdk/types.js";

export type { MCPTool, MCPServerInfo, MCPToolCallResult };

export class MCPClientManager {
  private clients = new Map<string, MCPClient>();

  async createClient(
    id: string,
    command: string,
    args: string[] = [],
    env: Record<string, string> = {}
  ): Promise<MCPClient> {
    if (this.clients.has(id)) {
      await this.disconnect(id);
    }

    const client = new MCPClient({
      name: "ollamachat",
      version: "1.0.0",
    });

    await client.connect({
      type: "stdio",
      command,
      args,
      env,
    });

    this.clients.set(id, client);
    return client;
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

export const mcpClientManager = new MCPClientManager();
