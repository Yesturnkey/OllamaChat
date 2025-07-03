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

  console.log(`連接 STDIO 服務器: ${command} ${args.join(" ")}`);

  try {
    // 創建並存儲 MCP 客戶端
    const client = await mcpClientManager.createClient(
      serverId,
      command,
      args,
      env
    );

    // 連接到 MCP 服務器
    await client.connect();

    // 初始化 MCP 協議
    const serverInfo = await client.initialize();

    // 獲取工具列表
    const tools = await client.listTools();

    console.log(`成功連接到 MCP 服務器: ${serverInfo.name}`);
    console.log(`發現 ${tools.length} 個工具`);

    return {
      tools: tools.map((tool) => ({
        ...tool,
        server: serverInfo.name || "stdio-server",
        enabled: true,
      })),
      serverInfo: {
        name: serverInfo.name,
        version: serverInfo.version,
        protocolVersion: serverInfo.protocolVersion,
        capabilities: serverInfo.capabilities,
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

  try {
    console.log(`連接 HTTP 服務器: ${url}`);

    // 嘗試連接到 MCP HTTP 服務器
    const response = await fetch(`${url}/mcp/info`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      signal: AbortSignal.timeout(10000), // 10秒超時
    });

    if (!response.ok) {
      throw new Error(
        `HTTP 連接失敗: ${response.status} ${response.statusText}`
      );
    }

    const serverInfo = await response.json();

    // 獲取工具列表
    const toolsResponse = await fetch(`${url}/mcp/tools`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    });

    let tools = [];
    if (toolsResponse.ok) {
      const toolsData = await toolsResponse.json();
      tools = toolsData.tools || [];
    }

    console.log(`成功連接到 HTTP MCP 服務器: ${serverInfo.name || "Unknown"}`);
    console.log(`發現 ${tools.length} 個工具`);

    // HTTP 連接不需要持久化，每次調用時重新連接
    return {
      tools: tools.map((tool: any) => ({
        ...tool,
        server: serverInfo.name || "http-server",
        enabled: true,
      })),
      serverInfo: {
        ...serverInfo,
        type: "http",
        url: url,
        headers: headers,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("連接超時，請檢查 URL 是否正確");
    }
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

  try {
    console.log(`連接 SSE 服務器: ${url}`);

    // 測試 SSE 端點是否可訪問
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
        ...headers,
      },
      signal: AbortSignal.timeout(5000), // 5秒超時
    });

    if (!response.ok) {
      throw new Error(
        `SSE 連接失敗: ${response.status} ${response.statusText}`
      );
    }

    // 檢查是否是正確的 SSE 響應
    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("text/event-stream")) {
      throw new Error("服務器沒有返回正確的 SSE 內容類型");
    }

    console.log("SSE 連接成功");

    // TODO: 實現真實的 SSE MCP 協議通信
    // 這裡需要建立 SSE 連接並通過事件流進行 MCP 協議通信
    // 目前返回基本信息，表示連接成功但還沒有實現完整的 SSE MCP 協議

    return {
      tools: [],
      serverInfo: {
        name: "SSE Server",
        version: "1.0.0",
        type: "sse",
        capabilities: {},
        url: url,
        headers: headers,
        message: "SSE 連接成功，但 SSE MCP 協議實現正在開發中",
      },
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("SSE 連接超時，請檢查 URL 是否正確");
    }
    throw new Error(
      `SSE 連接失敗: ${error instanceof Error ? error.message : "未知錯誤"}`
    );
  }
}
