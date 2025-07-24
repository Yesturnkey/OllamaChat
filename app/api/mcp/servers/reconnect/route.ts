import { NextRequest, NextResponse } from "next/server";
import { mcpClientManager } from "@/lib/mcp-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { servers } = body; // 從前端傳來的服務器配置列表

    console.log(`[MCP Reconnect] 開始重新連接 ${servers.length} 個服務器`);
    
    const reconnectResults = [];

    for (const server of servers) {
      console.log(`[MCP Reconnect] 嘗試重新連接服務器: ${server.name} (${server.id})`);
      
      try {
        // 先斷開現有連接（如果存在）
        if (mcpClientManager.getClient(server.id)) {
          console.log(`[MCP Reconnect] 斷開現有連接: ${server.id}`);
          await mcpClientManager.disconnect(server.id);
        }

        // 根據服務器類型重新連接
        let client;
        
        switch (server.type) {
          case "stdio":
            client = await mcpClientManager.createClient(server.id, {
              type: "stdio",
              command: server.command || "",
              args: server.args || [],
              env: server.env || {},
            });
            break;
          case "http":
            client = await mcpClientManager.createClient(server.id, {
              type: "httpStream",
              url: server.url || "",
            });
            break;
          case "sse":
            client = await mcpClientManager.createClient(server.id, {
              type: "sse",
              url: server.url || "",
            });
            break;
          default:
            throw new Error(`不支援的連接類型: ${server.type}`);
        }

        // 獲取工具列表驗證連接
        const tools = await mcpClientManager.listTools(server.id);
        
        reconnectResults.push({
          id: server.id,
          name: server.name,
          success: true,
          toolCount: tools.length,
          tools: tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            server: server.id,
            serverId: server.id,
            enabled: true,
          })),
        });

        console.log(`[MCP Reconnect] ✅ 服務器 ${server.name} 重新連接成功，發現 ${tools.length} 個工具`);
        
      } catch (error) {
        console.error(`[MCP Reconnect] ❌ 服務器 ${server.name} 重新連接失敗:`, error);
        
        reconnectResults.push({
          id: server.id,
          name: server.name,
          success: false,
          error: error instanceof Error ? error.message : "重新連接失敗",
        });
      }
    }

    const successCount = reconnectResults.filter(r => r.success).length;
    console.log(`[MCP Reconnect] 重新連接完成: ${successCount}/${servers.length} 成功`);

    return NextResponse.json({
      success: true,
      message: `成功重新連接 ${successCount} 個服務器`,
      results: reconnectResults,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error("[MCP Reconnect] 重新連接過程失敗:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "重新連接失敗",
        success: false,
      },
      { status: 500 }
    );
  }
}