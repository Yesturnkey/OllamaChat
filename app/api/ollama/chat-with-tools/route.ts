import { NextRequest, NextResponse } from "next/server";
import { MCPClient } from "mcp-client";

// 檢測用戶消息是否需要使用工具
const detectToolUsage = (message: string, availableTools: any[]) => {
  if (availableTools.length === 0) return null;

  const messageLower = message.toLowerCase();

  // 使用工具描述進行匹配
  for (const tool of availableTools) {
    const toolName = tool.name.toLowerCase();
    const toolDescription = tool.description.toLowerCase();

    // 檢查工具名稱是否在消息中
    if (messageLower.includes(toolName)) {
      return { tool: tool.name, toolDef: tool };
    }

    // 檢查工具描述的關鍵詞
    const keywords = extractKeywords(toolDescription);
    for (const keyword of keywords) {
      if (messageLower.includes(keyword)) {
        return { tool: tool.name, toolDef: tool };
      }
    }
  }

  return null;
};

// 從工具描述中提取關鍵詞
const extractKeywords = (description: string) => {
  // 移除常見的停用詞並提取關鍵詞
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "this",
    "that",
    "these",
    "those",
  ]);

  return description
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 2 && !stopWords.has(word))
    .slice(0, 10); // 取前10個關鍵詞
};

// 分析工具輸入參數
const analyzeToolInput = (userMessage: string, inputSchema: any) => {
  if (!inputSchema || !inputSchema.properties) {
    return {};
  }

  const args: any = {};
  const properties = inputSchema.properties;
  const required = inputSchema.required || [];

  console.log(`分析工具參數:`, {
    userMessage,
    properties: Object.keys(properties),
    required,
  });

  // 嘗試從用戶消息中提取參數
  Object.keys(properties).forEach((paramName) => {
    const paramDef = properties[paramName];

    console.log(`處理參數 ${paramName}:`, paramDef);

    if (paramDef.type === "string") {
      // 處理枚舉類型
      if (paramDef.enum && Array.isArray(paramDef.enum)) {
        console.log(`${paramName} 是枚舉類型:`, paramDef.enum);

        // 嘗試從用戶消息中匹配枚舉值
        const foundEnum = paramDef.enum.find((enumValue: string) =>
          userMessage.toLowerCase().includes(enumValue.toLowerCase())
        );

        if (foundEnum) {
          args[paramName] = foundEnum;
        } else if (required.includes(paramName)) {
          // 如果是必需參數但找不到匹配，使用第一個枚舉值作為默認值
          args[paramName] = paramDef.enum[0];
          console.log(`${paramName} 使用默認枚舉值: ${paramDef.enum[0]}`);
        }
      } else {
        // 處理普通字符串參數
        if (
          paramName === "query" ||
          paramName === "question" ||
          paramName === "text" ||
          paramName === "message" ||
          paramName === "content" ||
          paramName === "input"
        ) {
          args[paramName] = userMessage;
        } else if (paramName === "location" || paramName === "city") {
          // 嘗試提取地點信息
          const locationMatch = userMessage.match(
            /(?:在|的|查詢|搜索|天氣|weather|in|at|for)\s*([^\s，。,.\?！!]+)/
          );
          if (locationMatch) {
            args[paramName] = locationMatch[1];
          }
        } else if (
          paramName === "path" ||
          paramName === "file" ||
          paramName === "filename" ||
          paramName === "directory"
        ) {
          // 特殊處理文件路徑參數
          console.log(`處理文件路徑參數: ${paramName}`);

          // 嘗試提取文件名或路徑
          const filePatterns = [
            // 完整路徑匹配
            /([\/\w\-\.]+\.[\w]+)/,
            // 檔名匹配 (包含副檔名)
            /([\w\-\.]+\.[\w]+)/,
            // mcp-demo/ 相對路徑
            /mcp-demo[\/\\]([\w\-\.]+)/,
            // 引號內的文件名
            /["']([\w\-\.\/\\]+)["']/,
            // 簡單文件名匹配
            /([\w\-]+\.txt|[\w\-]+\.json|[\w\-]+\.md)/i,
          ];

          let extractedPath = null;
          for (const pattern of filePatterns) {
            const match = userMessage.match(pattern);
            if (match) {
              extractedPath = match[1];
              break;
            }
          }

          if (extractedPath) {
            // 處理路徑解析
            if (extractedPath.startsWith("/")) {
              // 已經是絕對路徑，直接使用
              args[paramName] = extractedPath;
            } else if (extractedPath.includes("mcp-demo")) {
              // 包含 mcp-demo 但不是絕對路徑，轉換為絕對路徑
              const homeDir = process.env.HOME || "/Users/wxn1229";
              if (extractedPath.startsWith("mcp-demo/")) {
                args[paramName] = `${homeDir}/${extractedPath}`;
              } else {
                args[paramName] = `${homeDir}/${extractedPath}`;
              }
            } else {
              // 相對路徑，假設是在 mcp-demo 目錄中
              const homeDir = process.env.HOME || "/Users/wxn1229";
              args[paramName] = `${homeDir}/mcp-demo/${extractedPath}`;
            }
            console.log(`提取的文件路徑: ${args[paramName]}`);
          } else if (required.includes(paramName)) {
            // 如果找不到具體文件名，嘗試從消息中提取
            const words = userMessage.split(/\s+/);
            const possibleFile = words.find(
              (word) => word.includes(".") || word.match(/^[\w\-]+$/)
            );
            const fileName = possibleFile || "test.txt";
            const homeDir = process.env.HOME || "/Users/wxn1229";
            args[paramName] = `${homeDir}/mcp-demo/${fileName}`;
          }
        } else {
          // 對於其他字符串參數，嘗試提取引號內的內容或整個消息
          const quotedMatch = userMessage.match(/["']([^"']+)["']/);
          if (quotedMatch) {
            args[paramName] = quotedMatch[1];
          } else {
            // 如果沒有引號，嘗試提取命令後面的部分
            const commandMatch = userMessage.match(/\w+\s+(.+)/);
            if (commandMatch) {
              args[paramName] = commandMatch[1].trim();
            } else if (required.includes(paramName)) {
              args[paramName] = userMessage;
            }
          }
        }
      }
    } else if (paramDef.type === "number") {
      // 嘗試提取數字
      const numberMatch = userMessage.match(/\d+/);
      if (numberMatch) {
        args[paramName] = parseInt(numberMatch[0]);
      } else if (required.includes(paramName)) {
        // 默認數字值
        args[paramName] = 1;
      }
    } else if (paramDef.type === "integer") {
      // 處理整數類型
      const numberMatch = userMessage.match(/\d+/);
      if (numberMatch) {
        args[paramName] = parseInt(numberMatch[0]);
      } else if (required.includes(paramName)) {
        args[paramName] = 1;
      }
    } else if (paramDef.type === "boolean") {
      // 處理布爾值
      const booleanKeywords = {
        true: ["true", "yes", "是", "對", "enable", "啟用"],
        false: ["false", "no", "否", "錯", "disable", "禁用"],
      };

      const lowerMessage = userMessage.toLowerCase();
      if (
        booleanKeywords.true.some((keyword) => lowerMessage.includes(keyword))
      ) {
        args[paramName] = true;
      } else if (
        booleanKeywords.false.some((keyword) => lowerMessage.includes(keyword))
      ) {
        args[paramName] = false;
      } else if (required.includes(paramName)) {
        args[paramName] = true; // 默認為 true
      }
    }
  });

  // 特殊處理：如果沒有找到任何參數，但有必需參數，嘗試智能分配
  if (Object.keys(args).length === 0 && required.length > 0) {
    for (const requiredParam of required) {
      const paramDef = properties[requiredParam];
      if (paramDef.type === "string" && !paramDef.enum) {
        args[requiredParam] = userMessage;
        break;
      }
    }
  }

  console.log(`工具參數提取結果:`, { userMessage, inputSchema, args });
  return args;
};

const callToolWithDirectConnection = async (
  toolName: string,
  args: any,
  serverConfig: any
) => {
  console.log(
    `[callToolWithDirectConnection] 準備直接連接到 MCP 服務器:`,
    serverConfig
  );

  const { command, args: cmdArgs, env } = serverConfig;

  if (!command) {
    throw new Error("服務器配置中缺少 command");
  }

  // 解析命令：如果 command 包含空格，將其拆分為 command 和 args
  let actualCommand = command;
  let actualArgs = cmdArgs || [];

  if (command.includes(" ")) {
    const parts = command.split(" ").filter(Boolean);
    actualCommand = parts[0];
    actualArgs = [...parts.slice(1), ...(cmdArgs || [])];
  }

  const client = new MCPClient({
    name: "ollamachat-direct",
    version: "1.0.0",
  });

  try {
    await client.connect({
      type: "stdio",
      command: actualCommand,
      args: actualArgs,
      env: env || {},
    });

    console.log(`[callToolWithDirectConnection] 已連接到 MCP 服務器`);

    const result = await client.callTool({
      name: toolName,
      arguments: args,
    });

    console.log(`[callToolWithDirectConnection] 工具調用結果:`, result);

    await client.close();
    console.log(`[callToolWithDirectConnection] 已斷開與 MCP 服務器的連接`);

    return result;
  } catch (error) {
    console.error(`[callToolWithDirectConnection] MCP 客戶端錯誤:`, error);
    await client.close();
    throw error;
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, model, enableTools = true, availableTools = [] } = body;

    const lastMessage = messages[messages.length - 1];
    const userMessage = lastMessage.content;

    let toolCalls: any[] = [];
    let usedTools: string[] = [];
    let enhancedMessages = messages;

    // 如果啟用工具且有可用工具，檢測並調用 MCP 工具
    if (enableTools && availableTools.length > 0) {
      console.log(`可用工具數量: ${availableTools.length}`);
      console.log(
        `可用工具列表:`,
        availableTools.map((t: any) => t.name)
      );

      const toolUsage = detectToolUsage(userMessage, availableTools);

      if (toolUsage) {
        const { tool, toolDef } = toolUsage;

        console.log(`檢測到需要使用工具: ${tool}`);

        // 分析工具輸入參數
        const args = analyzeToolInput(userMessage, toolDef.inputSchema);

        // 創建工具調用記錄
        const toolCall = {
          id: `tool_${Date.now()}`,
          name: tool,
          args: args,
          status: "running",
          startTime: Date.now(),
        };

        toolCalls.push(toolCall);

        try {
          const startTime = Date.now();
          const result = await callToolWithDirectConnection(
            tool,
            args,
            toolDef.serverConfig
          );
          const duration = Date.now() - startTime;

          // 更新工具調用為成功狀態
          toolCalls[0] = {
            ...toolCalls[0],
            status: "completed",
            result: result,
            duration,
          };

          usedTools.push(tool);

          // 將工具結果整合到消息中
          const toolResultMessage = {
            role: "system",
            content: `工具調用結果：
工具: ${tool}
描述: ${toolDef.description}
服務器: ${toolDef.server}
參數: ${JSON.stringify(args, null, 2)}
結果: ${JSON.stringify(result, null, 2)}

請根據上述工具調用的結果來回答用戶的問題。使用繁體中文回答。`,
          };

          enhancedMessages = [...messages, toolResultMessage];
        } catch (error) {
          console.error(`MCP 工具調用失敗: ${tool}`, error);

          // 更新工具調用為失敗狀態
          toolCalls[0] = {
            ...toolCalls[0],
            status: "failed",
            error: error instanceof Error ? error.message : "工具調用失敗",
          };

          // 添加錯誤提示
          const errorMessage = {
            role: "system",
            content: `注意: 嘗試使用工具 ${tool} 但失敗了 (${
              error instanceof Error ? error.message : "未知錯誤"
            })。請直接回答用戶的問題。使用繁體中文回答。`,
          };

          enhancedMessages = [...messages, errorMessage];
        }
      } else {
        console.log(`沒有檢測到需要使用的工具，用戶消息: ${userMessage}`);
      }
    } else {
      console.log(
        `工具未啟用或沒有可用工具。啟用狀態: ${enableTools}, 可用工具: ${availableTools.length}`
      );
    }

    // 調用 Ollama API（支持流式輸出）
    const ollamaResponse = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: enhancedMessages,
        stream: true,
        options: {
          temperature: 0.7,
          top_p: 0.9,
        },
      }),
    });

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      throw new Error(`Ollama API 錯誤: ${errorText}`);
    }

    // 創建流式響應
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 如果有工具調用，先發送工具調用信息
          if (toolCalls.length > 0) {
            const toolCallsData = {
              type: "tool_calls",
              tool_calls: toolCalls,
              used_tools: usedTools,
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(toolCallsData)}\n\n`)
            );
          }

          // 處理 Ollama 流式響應
          const reader = ollamaResponse.body?.getReader();
          const decoder = new TextDecoder();

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n");

              for (const line of lines) {
                if (line.trim()) {
                  try {
                    const json = JSON.parse(line);
                    if (json.message?.content) {
                      const responseData = {
                        type: "content",
                        content: json.message.content,
                      };
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify(responseData)}\n\n`
                        )
                      );
                    }
                    if (json.done) {
                      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                    }
                  } catch (e) {
                    // 忽略解析錯誤
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat with tools error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "內部服務器錯誤" },
      { status: 500 }
    );
  }
}
