import { NextRequest, NextResponse } from "next/server";
import { mcpClientManager } from "@/lib/mcp-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverId } = body;

    if (!serverId) {
      return NextResponse.json(
        { error: "服務器 ID 為必填項" },
        { status: 400 }
      );
    }

    console.log(`正在斷開服務器連接: ${serverId}`);

    // 斷開 MCP 客戶端連接
    await mcpClientManager.disconnect(serverId);

    return NextResponse.json({
      success: true,
      message: "服務器連接已斷開",
      serverId: serverId,
      disconnectedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("斷開服務器連接失敗:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "斷開連接失敗",
        success: false,
      },
      { status: 500 }
    );
  }
}
