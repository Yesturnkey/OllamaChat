import { NextRequest, NextResponse } from "next/server";
import { mcpClientManager } from "@/lib/mcp-client";

export async function GET(request: NextRequest) {
  try {
    // 獲取後端實際的連接狀態
    const clientIds = mcpClientManager.listClients();
    const serverStatus = [];

    console.log(`[MCP Status] 檢查 ${clientIds.length} 個連接的服務器`);

    for (const clientId of clientIds) {
      const client = mcpClientManager.getClient(clientId);
      
      if (client) {
        try {
          // 嘗試獲取工具列表來驗證連接是否仍然有效
          const tools = await mcpClientManager.listTools(clientId);
          
          serverStatus.push({
            id: clientId,
            connected: true,
            toolCount: tools.length,
            tools: tools.map(tool => ({
              name: tool.name,
              description: tool.description,
              inputSchema: tool.inputSchema,
              server: clientId,
              serverId: clientId,
              enabled: true,
            })),
            lastChecked: new Date().toISOString(),
          });
          
          console.log(`[MCP Status] 服務器 ${clientId}: 已連接, ${tools.length} 個工具`);
        } catch (error) {
          console.error(`[MCP Status] 服務器 ${clientId}: 連接失效`, error);
          
          // 連接失效，從管理器中移除
          await mcpClientManager.disconnect(clientId);
          
          serverStatus.push({
            id: clientId,
            connected: false,
            error: error instanceof Error ? error.message : "連接失效",
            lastChecked: new Date().toISOString(),
          });
        }
      } else {
        console.log(`[MCP Status] 服務器 ${clientId}: 客戶端不存在`);
        serverStatus.push({
          id: clientId,
          connected: false,
          error: "客戶端不存在",
          lastChecked: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      serverStatus,
      totalConnected: serverStatus.filter(s => s.connected).length,
      totalServers: serverStatus.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("獲取 MCP 服務器狀態失敗:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "獲取服務器狀態失敗",
        success: false,
      },
      { status: 500 }
    );
  }
}