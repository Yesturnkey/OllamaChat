import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";

// MCP 工具定義
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  server: string;
  enabled: boolean;
}

// MCP 服務器配置
export interface MCPServer {
  id: string;
  name: string;
  type: "stdio" | "sse" | "http";
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  headers?: Record<string, string>;
  connected: boolean;
  connecting: boolean;
  error?: string;
  tools: MCPTool[];
  lastConnected?: string;
}

// MCP 連接統計
export interface MCPStats {
  totalServers: number;
  connectedServers: number;
  totalTools: number;
  enabledTools: number;
}

// MCP Slice 狀態
interface MCPState {
  servers: MCPServer[];
  selectedServerId: string | null;
  loading: boolean;
  error: string | null;
  stats: MCPStats;
  // 工具調用相關
  toolCallHistory: ToolCallRecord[];
  currentToolCalls: ActiveToolCall[];
}

// 工具調用記錄
export interface ToolCallRecord {
  id: string;
  toolName: string;
  server: string;
  arguments: any;
  result?: any;
  error?: string;
  timestamp: string;
  duration?: number;
}

// 活動的工具調用
export interface ActiveToolCall {
  id: string;
  toolName: string;
  server: string;
  arguments: any;
  status: "pending" | "executing" | "completed" | "failed";
  startTime: string;
}

// 從 localStorage 載入數據
const loadPersistedData = () => {
  if (typeof window === "undefined")
    return { servers: [], selectedServerId: null };

  try {
    const savedServers = localStorage.getItem("mcpServers");
    const savedSelectedServerId = localStorage.getItem("mcpSelectedServerId");

    return {
      servers: savedServers
        ? JSON.parse(savedServers).map((server: any) => ({
            ...server,
            // 重新啟動時重置連接狀態
            connected: false,
            connecting: false,
            error: undefined,
          }))
        : [],
      selectedServerId: savedSelectedServerId || null,
    };
  } catch (error) {
    console.warn("Failed to load MCP data from localStorage:", error);
    return { servers: [], selectedServerId: null };
  }
};

// 保存數據到 localStorage
const savePersistedData = (
  servers: MCPServer[],
  selectedServerId: string | null
) => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem("mcpServers", JSON.stringify(servers));

    if (selectedServerId) {
      localStorage.setItem("mcpSelectedServerId", selectedServerId);
    } else {
      localStorage.removeItem("mcpSelectedServerId");
    }
  } catch (error) {
    console.warn("Failed to save MCP data to localStorage:", error);
  }
};

const persistedData = loadPersistedData();

// 初始狀態
const initialState: MCPState = {
  servers: persistedData.servers,
  selectedServerId: persistedData.selectedServerId,
  loading: false,
  error: null,
  stats: {
    totalServers: persistedData.servers.length,
    connectedServers: 0,
    totalTools: persistedData.servers.reduce(
      (sum: number, server: MCPServer) => sum + server.tools.length,
      0
    ),
    enabledTools: persistedData.servers.reduce(
      (sum: number, server: MCPServer) =>
        sum + server.tools.filter((tool: MCPTool) => tool.enabled).length,
      0
    ),
  },
  toolCallHistory: [],
  currentToolCalls: [],
};

// 異步 thunk：測試服務器連接
export const testServerConnection = createAsyncThunk(
  "mcp/testConnection",
  async (
    server: Omit<MCPServer, "id" | "connected" | "connecting" | "tools">,
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch("/api/mcp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(server),
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.message || "連接測試失敗");
      }

      const result = await response.json();
      return { server, tools: result.tools || [] };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "連接測試失敗"
      );
    }
  }
);

// 異步 thunk：獲取服務器工具列表
export const fetchServerTools = createAsyncThunk(
  "mcp/fetchTools",
  async (serverId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/mcp/tools?serverId=${serverId}`);

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.message || "獲取工具列表失敗");
      }

      const result = await response.json();
      return { serverId, tools: result.tools || [] };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "獲取工具列表失敗"
      );
    }
  }
);

// 異步 thunk：連接服務器
export const connectServer = createAsyncThunk(
  "mcp/connectServer",
  async (server: MCPServer, { rejectWithValue }) => {
    try {
      // 檢查服務器是否已連接
      if (server.connected) {
        // 如果已連接，執行斷開連接
        console.log(`正在斷開服務器連接: ${server.name}`);

        // 調用斷開連接 API
        const response = await fetch("/api/mcp/servers/disconnect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serverId: server.id }),
        });

        if (!response.ok) {
          const error = await response.json();
          return rejectWithValue(error.message || "服務器斷開連接失敗");
        }

        return { serverId: server.id, disconnect: true };
      } else {
        // 如果未連接，執行連接操作
        console.log(`正在連接服務器: ${server.name}`);

        const response = await fetch("/api/mcp/servers/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serverId: server.id,
            serverConfig: {
              type: server.type,
              command: server.command,
              args: server.args,
              url: server.url,
              env: server.env,
              headers: server.headers,
            },
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          return rejectWithValue(error.message || "服務器連接失敗");
        }

        const result = await response.json();
        return {
          serverId: server.id,
          tools: result.tools || [],
          connect: true,
        };
      }
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "服務器操作失敗"
      );
    }
  }
);

// MCP Slice
const mcpSlice = createSlice({
  name: "mcp",
  initialState,
  reducers: {
    // 添加服務器
    addServer: (
      state,
      action: PayloadAction<
        Omit<MCPServer, "id" | "connected" | "connecting" | "tools">
      >
    ) => {
      const server: MCPServer = {
        ...action.payload,
        id: uuidv4(),
        connected: false,
        connecting: false,
        tools: [],
      };
      state.servers.push(server);
      state.stats.totalServers = state.servers.length;
      // 保存到 localStorage
      savePersistedData(state.servers, state.selectedServerId);
    },

    // 移除服務器
    removeServer: (state, action: PayloadAction<string>) => {
      state.servers = state.servers.filter(
        (server) => server.id !== action.payload
      );
      if (state.selectedServerId === action.payload) {
        state.selectedServerId = null;
      }
      state.stats.totalServers = state.servers.length;
      state.stats.connectedServers = state.servers.filter(
        (s) => s.connected
      ).length;
      // 保存到 localStorage
      savePersistedData(state.servers, state.selectedServerId);
    },

    // 更新服務器
    updateServer: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<MCPServer> }>
    ) => {
      const { id, updates } = action.payload;
      const serverIndex = state.servers.findIndex((s) => s.id === id);
      if (serverIndex !== -1) {
        state.servers[serverIndex] = {
          ...state.servers[serverIndex],
          ...updates,
        };
      }
    },

    // 選擇服務器
    selectServer: (state, action: PayloadAction<string | null>) => {
      state.selectedServerId = action.payload;
      // 保存到 localStorage
      savePersistedData(state.servers, state.selectedServerId);
    },

    // 切換工具啟用狀態
    toggleTool: (
      state,
      action: PayloadAction<{ serverId: string; toolName: string }>
    ) => {
      const { serverId, toolName } = action.payload;
      const server = state.servers.find((s) => s.id === serverId);
      if (server) {
        const tool = server.tools.find((t) => t.name === toolName);
        if (tool) {
          tool.enabled = !tool.enabled;
          // 更新統計
          state.stats.enabledTools = state.servers
            .flatMap((s) => s.tools)
            .filter((t) => t.enabled).length;
          // 保存到 localStorage
          savePersistedData(state.servers, state.selectedServerId);
        }
      }
    },

    // 設置服務器連接狀態
    setServerConnection: (
      state,
      action: PayloadAction<{
        serverId: string;
        connected: boolean;
        error?: string;
      }>
    ) => {
      const { serverId, connected, error } = action.payload;
      const server = state.servers.find((s) => s.id === serverId);
      if (server) {
        server.connected = connected;
        server.connecting = false;
        server.error = error;
        if (connected) {
          server.lastConnected = new Date().toISOString();
        }
        // 更新統計
        state.stats.connectedServers = state.servers.filter(
          (s) => s.connected
        ).length;
      }
    },

    // 添加工具調用記錄
    addToolCallRecord: (state, action: PayloadAction<ToolCallRecord>) => {
      state.toolCallHistory.unshift(action.payload);
      // 只保留最近 100 條記錄
      if (state.toolCallHistory.length > 100) {
        state.toolCallHistory = state.toolCallHistory.slice(0, 100);
      }
    },

    // 添加活動工具調用
    addActiveToolCall: (state, action: PayloadAction<ActiveToolCall>) => {
      state.currentToolCalls.push(action.payload);
    },

    // 更新活動工具調用狀態
    updateActiveToolCall: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<ActiveToolCall> }>
    ) => {
      const { id, updates } = action.payload;
      const toolCallIndex = state.currentToolCalls.findIndex(
        (tc) => tc.id === id
      );
      if (toolCallIndex !== -1) {
        state.currentToolCalls[toolCallIndex] = {
          ...state.currentToolCalls[toolCallIndex],
          ...updates,
        };
      }
    },

    // 移除活動工具調用
    removeActiveToolCall: (state, action: PayloadAction<string>) => {
      state.currentToolCalls = state.currentToolCalls.filter(
        (tc) => tc.id !== action.payload
      );
    },

    // 清除錯誤
    clearError: (state) => {
      state.error = null;
    },

    // 重置狀態
    resetMCP: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // 測試連接
      .addCase(testServerConnection.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(testServerConnection.fulfilled, (state, action) => {
        state.loading = false;
      })
      .addCase(testServerConnection.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 獲取工具
      .addCase(fetchServerTools.pending, (state, action) => {
        const serverId = action.meta.arg;
        const server = state.servers.find((s) => s.id === serverId);
        if (server) {
          server.connecting = true;
          server.error = undefined;
        }
      })
      .addCase(fetchServerTools.fulfilled, (state, action) => {
        const { serverId, tools } = action.payload;
        const server = state.servers.find((s) => s.id === serverId);
        if (server) {
          server.connecting = false;
          server.tools = tools.map((tool: any) => ({ ...tool, enabled: true }));
          // 更新統計
          state.stats.totalTools = state.servers.flatMap((s) => s.tools).length;
          state.stats.enabledTools = state.servers
            .flatMap((s) => s.tools)
            .filter((t) => t.enabled).length;
          // 保存到 localStorage
          savePersistedData(state.servers, state.selectedServerId);
        }
      })
      .addCase(fetchServerTools.rejected, (state, action) => {
        const serverId = action.meta.arg;
        const server = state.servers.find((s) => s.id === serverId);
        if (server) {
          server.connecting = false;
          server.error = action.payload as string;
        }
      })

      // 連接服務器
      .addCase(connectServer.pending, (state, action) => {
        const serverId = action.meta.arg.id;
        const server = state.servers.find((s) => s.id === serverId);
        if (server) {
          server.connecting = true;
          server.error = undefined;
        }
      })
      .addCase(connectServer.fulfilled, (state, action) => {
        const { serverId, tools, connect, disconnect } = action.payload;
        const server = state.servers.find((s) => s.id === serverId);
        if (server) {
          server.connecting = false;

          if (disconnect) {
            // 斷開連接
            server.connected = false;
            server.tools = [];
            server.error = undefined;
          } else if (connect) {
            // 連接成功
            server.connected = true;
            server.tools = tools
              ? tools.map((tool: any) => ({ ...tool, enabled: true }))
              : [];
            server.lastConnected = new Date().toISOString();
          }

          // 更新統計
          state.stats.connectedServers = state.servers.filter(
            (s) => s.connected
          ).length;
          state.stats.totalTools = state.servers.flatMap((s) => s.tools).length;
          state.stats.enabledTools = state.servers
            .flatMap((s) => s.tools)
            .filter((t) => t.enabled).length;
          // 保存到 localStorage
          savePersistedData(state.servers, state.selectedServerId);
        }
      })
      .addCase(connectServer.rejected, (state, action) => {
        const serverId = action.meta.arg.id;
        const server = state.servers.find((s) => s.id === serverId);
        if (server) {
          server.connecting = false;
          server.error = action.payload as string;
        }
      });
  },
});

export const {
  addServer,
  removeServer,
  updateServer,
  selectServer,
  toggleTool,
  setServerConnection,
  addToolCallRecord,
  addActiveToolCall,
  updateActiveToolCall,
  removeActiveToolCall,
  clearError,
  resetMCP,
} = mcpSlice.actions;

export default mcpSlice.reducer;
