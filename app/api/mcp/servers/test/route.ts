import { NextResponse } from "next/server";
import { MCPClient } from "mcp-client";

// Using 'any' as a workaround since the exact type from the client is not exported.
type Tool = any;

export async function POST(request: Request) {
  try {
    const { connectionOptions } = await request.json();

    if (!connectionOptions) {
      return NextResponse.json(
        { error: "Connection options are required" },
        { status: 400 }
      );
    }

    // Create a temporary, isolated client for testing.
    // The client info is based on what we use in the main manager.
    const testClient = new MCPClient({
      name: "OllamaChat-TestConnection",
      version: "1.0.0",
    });

    try {
      await testClient.connect(connectionOptions);
      const tools: Tool[] = await testClient.getAllTools();
      await testClient.close(); // Ensure we disconnect after the test

      // The new client returns tools with an `input_schema` property.
      // We rename it to `inputSchema` for frontend compatibility.
      const toolsArray = tools.map((tool) => {
        const { input_schema, ...rest } = tool;
        return {
          ...rest,
          inputSchema: input_schema || {},
        };
      });

      return NextResponse.json({
        success: true,
        message: "連接測試成功",
        tools: toolsArray,
      });
    } catch (connectionError) {
      await testClient
        .close()
        .catch((e) =>
          console.error("Error during disconnect after failed test:", e)
        );
      throw connectionError; // Rethrow to be caught by the outer catch block
    }
  } catch (error) {
    console.error("Test connection failed:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error during test";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
