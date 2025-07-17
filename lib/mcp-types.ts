// This file is safe to be imported by both client and server components.
// It should not contain any server-only code.

// Defines the shape of a tool as seen by the frontend.
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any; // The JSON schema for the tool's input.
  server: string; // The name of the server providing the tool.
  enabled: boolean;
}

// Defines the connection options for an MCP server.
// This is used when connecting or testing a server.
export type ConnectionOptions =
  | { type: "stdio"; command: string; args?: string[] }
  | { type: "httpStream"; url: string }
  | { type: "sse"; url: string };

// Defines the full configuration and state of an MCP server in the frontend.
export interface MCPServer {
  id: string; // Unique ID for the server in the frontend.
  name: string; // User-defined name for the server.
  connectionOptions: ConnectionOptions;
  connected: boolean;
  connecting: boolean;
  error?: string;
  tools: MCPTool[];
  lastConnected?: string;
}

// Defines the statistics about the MCP servers.
export interface MCPStats {
  totalServers: number;
  connectedServers: number;
  totalTools: number;
  enabledTools: number;
}
