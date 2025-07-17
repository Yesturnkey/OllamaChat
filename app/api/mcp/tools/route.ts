import { NextRequest, NextResponse } from "next/server";
import { mcpClientManager } from "@/lib/mcp-client";

export async function GET(request: NextRequest) {
  try {
    // 調試：顯示詳細的客戶端信息
    const clientIds = mcpClientManager.listClients();
    console.log(`=== MCP 客戶端狀態調試 ===`);
    console.log(`活動客戶端數量: ${clientIds.length}`);
    console.log(`客戶端ID列表:`, clientIds);

    // 獲取所有已連接的客戶端工具
    const allTools = [];

    for (const clientId of clientIds) {
      const client = mcpClientManager.getClient(clientId);
      console.log(`檢查客戶端 ${clientId}:`, {
        exists: !!client,
      });

      if (client) {
        try {
          const tools = await mcpClientManager.listTools(clientId);
          allTools.push(
            ...tools.map((tool) => ({
              ...tool,
              server: clientId,
              serverId: clientId,
              enabled: true,
            }))
          );
        } catch (error) {
          console.error(`獲取客戶端 ${clientId} 工具失敗:`, error);
        }
      }
    }

    console.log(`總共找到 ${allTools.length} 個工具`);

    return NextResponse.json({
      success: true,
      tools: allTools,
      totalClients: clientIds.length,
      debug: {
        clientIds,
        clientDetails: clientIds.map((id) => {
          const client = mcpClientManager.getClient(id);
          return {
            id,
            exists: !!client,
          };
        }),
      },
    });
  } catch (error) {
    console.error("獲取工具列表失敗:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "獲取工具列表失敗",
        success: false,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverId, toolName, args = {} } = body;

    console.log(`工具調用請求:`, { serverId, toolName, args });

    // 驗證參數
    if (!serverId || !toolName) {
      return NextResponse.json(
        { error: "服務器ID和工具名稱為必填項" },
        { status: 400 }
      );
    }

    // 調試：列出所有可用的客戶端
    const allClients = mcpClientManager.listClients();
    console.log(`可用的客戶端列表:`, allClients);
    console.log(`正在查找的服務器ID:`, serverId);

    // 獲取 MCP 客戶端
    const client = mcpClientManager.getClient(serverId);
    if (!client) {
      console.error(`找不到服務器 ${serverId}，可用的客戶端:`, allClients);
      return NextResponse.json(
        { error: `找不到服務器: ${serverId}` },
        { status: 404 }
      );
    }

    console.log(`調用 MCP 工具: ${toolName} on ${serverId}`, args);

    // 調用工具
    const startTime = Date.now();
    const result = await mcpClientManager.callTool(serverId, toolName, args);
    const duration = Date.now() - startTime;

    console.log(`工具調用完成: ${toolName} (${duration}ms)`);

    return NextResponse.json({
      success: true,
      result: result,
      duration: duration,
      toolName: toolName,
      serverId: serverId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("MCP 工具調用失敗:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "工具調用失敗",
        success: false,
      },
      { status: 500 }
    );
  }
}
