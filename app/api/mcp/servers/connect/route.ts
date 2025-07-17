import { NextRequest, NextResponse } from "next/server";
import { mcpClientManager } from "@/lib/mcp-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverId, serverConfig } = body;

    if (!serverId) {
      return NextResponse.json(
        { error: "服務器 ID 為必填項" },
        { status: 400 }
      );
    }

    if (!serverConfig) {
      return NextResponse.json(
        { error: "服務器配置為必填項" },
        { status: 400 }
      );
    }

    console.log(`正在連接服務器: ${serverId}`);

    // 根據服務器配置類型建立連接
    let tools: any[] = [];
    let serverInfo: any = {};

    const { type, command, args, url, env, headers } = serverConfig;

    switch (type) {
      case "stdio":
        const stdioResult = await connectStdioServer(
          serverId,
          command,
          args,
          env
        );
        tools = stdioResult.tools || [];
        serverInfo = stdioResult.serverInfo || {};
        break;
      case "http":
        const httpResult = await connectHttpServer(serverId, url, headers);
        tools = httpResult.tools || [];
        serverInfo = httpResult.serverInfo || {};
        break;
      case "sse":
        const sseResult = await connectSseServer(serverId, url, headers);
        tools = sseResult.tools || [];
        serverInfo = sseResult.serverInfo || {};
        break;
      default:
        return NextResponse.json(
          { error: `不支援的連接類型: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: "服務器連接成功",
      tools: tools,
      serverInfo: {
        id: serverId,
        name: serverInfo.name || "MCP Server",
        version: serverInfo.version || "unknown",
        capabilities: serverInfo.capabilities || [],
        connectedAt: new Date().toISOString(),
        type: type,
        ...serverInfo,
      },
    });
  } catch (error) {
    console.error("服務器連接失敗:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "服務器連接失敗",
        success: false,
      },
      { status: 500 }
    );
  }
}

// 連接 STDIO 服務器
async function connectStdioServer(
  serverId: string,
  command: string,
  args: string[] = [],
  env: Record<string, string> = {}
) {
  if (!command) {
    throw new Error("STDIO 連接需要指定命令");
  }

  // 解析命令：如果 command 包含空格，將其拆分為 command 和 args
  let actualCommand = command;
  let actualArgs = args;

  if (command.includes(" ")) {
    const parts = command.split(" ").filter(Boolean);
    actualCommand = parts[0];
    actualArgs = [...parts.slice(1), ...args];
  }

  console.log(`連接 STDIO 服務器: ${actualCommand} ${actualArgs.join(" ")}`);

  try {
    // 創建並連接 MCP 客戶端
    const client = await mcpClientManager.createStdioClient(
      serverId,
      actualCommand,
      actualArgs,
      env
    );

    // 獲取工具列表
    const tools = await client.getAllTools();

    console.log(`成功連接到 MCP 服務器`);
    console.log(`發現 ${tools.length} 個工具`);

    return {
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        server: "stdio-server",
        enabled: true,
      })),
      serverInfo: {
        name: "STDIO Server",
        version: "1.0.0",
        protocolVersion: "2024-11-05",
        capabilities: {},
        type: "stdio",
      },
    };
  } catch (error) {
    console.error("STDIO 服務器連接失敗:", error);
    // 清理失敗的連接
    await mcpClientManager.disconnect(serverId);
    throw new Error(
      `STDIO 連接失敗: ${error instanceof Error ? error.message : "未知錯誤"}`
    );
  }
}

// 連接 HTTP 服務器
async function connectHttpServer(
  serverId: string,
  url: string,
  headers: Record<string, string> = {}
) {
  if (!url) {
    throw new Error("HTTP 連接需要指定 URL");
  }

  console.log(`連接 HTTP 服務器: ${url}`);

  try {
    // 創建並連接 HTTP MCP 客戶端
    const client = await mcpClientManager.createClient(serverId, {
      type: "httpStream",
      url: url,
    });

    // 獲取工具列表
    const tools = await client.getAllTools();

    console.log(`成功連接到 HTTP MCP 服務器`);
    console.log(`發現 ${tools.length} 個工具`);

    return {
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        server: "http-server",
        enabled: true,
      })),
      serverInfo: {
        name: "HTTP Server",
        version: "1.0.0",
        protocolVersion: "2024-11-05",
        capabilities: {},
        type: "http",
        url: url,
      },
    };
  } catch (error) {
    console.error("HTTP 服務器連接失敗:", error);
    // 清理失敗的連接
    await mcpClientManager.disconnect(serverId);
    throw new Error(
      `HTTP 連接失敗: ${error instanceof Error ? error.message : "未知錯誤"}`
    );
  }
}

// 連接 SSE 服務器
async function connectSseServer(
  serverId: string,
  url: string,
  headers: Record<string, string> = {}
) {
  if (!url) {
    throw new Error("SSE 連接需要指定 URL");
  }

  console.log(`連接 SSE 服務器: ${url}`);

  try {
    // 創建並連接 SSE MCP 客戶端
    const client = await mcpClientManager.createClient(serverId, {
      type: "sse",
      url: url,
    });

    // 獲取工具列表
    const tools = await client.getAllTools();

    console.log(`成功連接到 SSE MCP 服務器`);
    console.log(`發現 ${tools.length} 個工具`);

    return {
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        server: "sse-server",
        enabled: true,
      })),
      serverInfo: {
        name: "SSE Server",
        version: "1.0.0",
        protocolVersion: "2024-11-05",
        capabilities: {},
        type: "sse",
        url: url,
      },
    };
  } catch (error) {
    console.error("SSE 服務器連接失敗:", error);
    // 清理失敗的連接
    await mcpClientManager.disconnect(serverId);
    throw new Error(
      `SSE 連接失敗: ${error instanceof Error ? error.message : "未知錯誤"}`
    );
  }
}
