import { NextRequest, NextResponse } from "next/server";
import { MCPClient } from "mcp-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, command, args, url, env, headers } = body;

    // 驗證必要參數
    if (!name || !type) {
      return NextResponse.json(
        { error: "服務器名稱和連接類型為必填項" },
        { status: 400 }
      );
    }

    // 根據不同類型進行測試連接
    let testResult;

    switch (type) {
      case "stdio":
        testResult = await testStdioConnection(command, args, env);
        break;
      case "http":
        testResult = await testHttpConnection(url, headers);
        break;
      case "sse":
        testResult = await testSseConnection(url, headers);
        break;
      default:
        return NextResponse.json(
          { error: "不支援的連接類型" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: "連接測試成功",
      tools: testResult.tools || [],
      serverInfo: testResult.serverInfo || {},
    });
  } catch (error) {
    console.error("MCP 連接測試失敗:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "連接測試失敗",
        success: false,
      },
      { status: 500 }
    );
  }
}

// 測試 STDIO 連接
async function testStdioConnection(
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

  console.log(`測試 STDIO 連接: ${actualCommand} ${actualArgs.join(" ")}`);

  const client = new MCPClient({
    name: "ollamachat-test",
    version: "1.0.0",
  });

  try {
    // 連接到 MCP 服務器
    await client.connect({
      type: "stdio",
      command: actualCommand,
      args: actualArgs,
      env,
    });

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
    console.error("STDIO 連接測試失敗:", error);
    throw new Error(
      `STDIO 連接失敗: ${error instanceof Error ? error.message : "未知錯誤"}`
    );
  } finally {
    await client.close();
  }
}

// 測試 HTTP 連接
async function testHttpConnection(
  url: string,
  headers: Record<string, string> = {}
) {
  if (!url) {
    throw new Error("HTTP 連接需要指定 URL");
  }

  console.log(`測試 HTTP 連接: ${url}`);

  const client = new MCPClient({
    name: "ollamachat-test",
    version: "1.0.0",
  });

  try {
    // 使用 httpStream 連接
    await client.connect({
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
    console.error("HTTP 連接測試失敗:", error);
    throw new Error(
      `HTTP 連接測試失敗: ${
        error instanceof Error ? error.message : "未知錯誤"
      }`
    );
  } finally {
    await client.close();
  }
}

// 測試 SSE 連接
async function testSseConnection(
  url: string,
  headers: Record<string, string> = {}
) {
  if (!url) {
    throw new Error("SSE 連接需要指定 URL");
  }

  console.log(`測試 SSE 連接: ${url}`);

  const client = new MCPClient({
    name: "ollamachat-test",
    version: "1.0.0",
  });

  try {
    // 使用 mcp-client 建立 SSE 連接
    await client.connect({
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
    console.error("SSE 連接測試失敗:", error);
    throw new Error(
      `SSE 連接測試失敗: ${error instanceof Error ? error.message : "未知錯誤"}`
    );
  } finally {
    await client.close();
  }
}
