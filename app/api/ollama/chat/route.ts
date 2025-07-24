import { NextRequest, NextResponse } from "next/server";
import { ChatOllama } from "@langchain/ollama";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  BaseMessage,
} from "@langchain/core/messages";
import { mcpClientManager } from "@/lib/mcp-client";

// 定義多模態內容類型
interface TextContent {
  type: "text";
  text: string;
}

interface ImageContent {
  type: "image_url";
  image_url: string;
}

type MessageContent = string | (TextContent | ImageContent)[];

// MCP 工具接口
interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  server: string;
  serverId: string;
  enabled: boolean;
}

// 生成工具定義的系統提示
const generateToolsSystemPrompt = (availableTools: MCPTool[]) => {
  if (availableTools.length === 0) {
    return "";
  }

  const toolDefinitions = availableTools.map(tool => {
    const params = tool.inputSchema?.properties || {};
    const required = tool.inputSchema?.required || [];
    
    const paramDescriptions = Object.entries(params).map(([name, def]: [string, any]) => {
      const isRequired = required.includes(name);
      const type = def.type || "string";
      const description = def.description || "";
      const enumValues = def.enum ? ` (選項: ${def.enum.join(", ")})` : "";
      
      return `  - ${name} (${type}${isRequired ? ", 必需" : ", 可選"}): ${description}${enumValues}`;
    }).join("\n");

    return `## ${tool.name}
描述: ${tool.description}
參數:
${paramDescriptions || "  無參數"}
服務器: ${tool.serverId}`;
  }).join("\n\n");

  return `你是一個智能助手，可以使用工具來幫助回答問題。

可用工具:
${toolDefinitions}

重要：如果用戶的問題需要使用上述工具，你必須使用以下格式調用工具：

<tool_call>
{"tool": "工具名稱", "arguments": {"參數名": "參數值"}}
</tool_call>

// 註解掉的硬編碼範例 - 測試通用性
// 例子：
// - 如果用戶問 "5+3等於多少"，你應該回答：
// <tool_call>
// {"tool": "add", "arguments": {"a": 5, "b": 3}}
// </tool_call>
//
// - 如果用戶問 "重複說hello"，你應該回答：  
// <tool_call>
// {"tool": "echo", "arguments": {"message": "hello"}}
// </tool_call>

如果用戶的問題不需要工具，就直接回答。
如果需要工具，必須先調用工具，然後基於結果回答。

`;
};

// 解析 LLM 響應中的工具調用
const parseToolCall = (content: string) => {
  
  // 嘗試多種格式的工具調用匹配
  const patterns = [
    // 標準格式：<tool_call>{"tool": "name", "arguments": {...}}</tool_call>
    /<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/,
    // 無結束標籤：<tool_call>{"tool": "name", "arguments": {...}}
    /<tool_call>\s*(\{[^<]*\})/,
    // JSON 格式但無標籤：{"tool": "name", "arguments": {...}}
    /(\{"tool"\s*:\s*"[^"]+"\s*,\s*"arguments"\s*:\s*\{[^}]*\}\s*\})/
  ];

  let toolCallMatch = null;
  let matchedPattern = -1;

  for (let i = 0; i < patterns.length; i++) {
    toolCallMatch = content.match(patterns[i]);
    if (toolCallMatch) {
      matchedPattern = i;
      break;
    }
  }

  if (!toolCallMatch) {
    return null;
  }

  try {
    const toolCallData = JSON.parse(toolCallMatch[1]);
    return {
      tool: toolCallData.tool,
      arguments: toolCallData.arguments || {},
      originalMatch: toolCallMatch[0]
    };
  } catch (error) {
    console.error("[PARSE ERROR] 工具調用 JSON 解析失敗:", toolCallMatch[1]);
    return null;
  }
};

// 移除內容中的工具調用標記
const removeToolCallFromContent = (content: string) => {
  return content.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "").trim();
};

// 獲取可用的 MCP 工具
const getAvailableTools = async (): Promise<MCPTool[]> => {
  try {
    console.log("\n=== MCP 連接調試 ===");
    console.log(`mcpClientManager 實例:`, typeof mcpClientManager);
    console.log(`mcpClientManager.listClients 方法:`, typeof mcpClientManager.listClients);
    
    const clientIds = mcpClientManager.listClients();
    console.log(`MCP 客戶端 ID 列表:`, clientIds);
    console.log(`客戶端數量: ${clientIds.length}`);
    
    if (clientIds.length === 0) {
      console.log("⚠️ 沒有任何 MCP 客戶端連接 - 可能需要重新連接");
      console.log("請檢查：");
      console.log("1. Everything MCP Server 是否已連接");
      console.log("2. 側邊欄中 MCP 工具標籤頁的連接狀態");
      console.log("3. MCP 服務器進程是否仍在運行");
      
      // 嘗試通過 API 端點獲取工具
      console.log("🔧 嘗試通過 API 端點獲取工具...");
      try {
        const response = await fetch(`http://localhost:3000/api/mcp/tools`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("API 端點工具數據:", data);
          if (data.tools && data.tools.length > 0) {
            console.log("⚠️ API 端點可以獲取工具，但 mcpClientManager 為空，確認有實例問題");
            // 直接返回 API 獲取的工具
            return data.tools.map((tool: any) => ({
              ...tool,
              enabled: tool.enabled !== false
            }));
          }
        } else {
          console.log("API 端點響應錯誤:", response.status, response.statusText);
        }
      } catch (error) {
        console.log("API 端點訪問失敗:", error);
      }
      
      return [];
    }

    const allTools: MCPTool[] = [];

    for (const clientId of clientIds) {
      console.log(`\n--- 檢查客戶端: ${clientId} ---`);
      
      const client = mcpClientManager.getClient(clientId);
      console.log(`客戶端存在:`, !!client);
      
      if (client) {
        try {
          console.log(`正在獲取客戶端 ${clientId} 的工具列表...`);
          const tools = await mcpClientManager.listTools(clientId);
          console.log(`客戶端 ${clientId} 工具數量: ${tools.length}`);
          console.log(`工具詳情:`, tools.map(t => ({
            name: t.name,
            description: t.description
          })));
          
          const mappedTools = tools.map((tool) => ({
            ...tool,
            server: clientId,
            serverId: clientId,
            enabled: true,
          }));
          
          allTools.push(...mappedTools);
          console.log(`已添加 ${mappedTools.length} 個工具到總列表`);
        } catch (error) {
          console.error(`❌ 獲取客戶端 ${clientId} 工具失敗:`, error);
          console.error(`錯誤詳情:`, {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
        }
      } else {
        console.log(`❌ 客戶端 ${clientId} 不存在於 mcpClientManager 中`);
      }
    }

    const enabledTools = allTools.filter((tool) => tool.enabled);
    console.log(`\n=== 工具篩選結果 ===`);
    console.log(`總工具數: ${allTools.length}`);
    console.log(`啟用工具數: ${enabledTools.length}`);
    console.log(`最終工具列表:`, enabledTools.map(t => ({
      name: t.name,
      serverId: t.serverId,
      enabled: t.enabled
    })));

    return enabledTools;
  } catch (error) {
    console.error("❌ 獲取可用工具過程中發生錯誤:", error);
    console.error(`錯誤詳情:`, {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return [];
  }
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { model, messages, stream = true, temperature = 0.7, images, enableTools = true } = body;

    console.log("聊天請求:", {
      model,
      messageCount: messages ? messages.length : 0,
      hasImages: images ? images.length : 0,
      stream,
      temperature,
      enableTools,
    });
    
    console.log("\n=== 請求參數檢查 ===");
    console.log("enableTools:", enableTools);
    console.log("messages:", messages.length > 0 ? "有消息" : "無消息");

    // 確保有提供模型和消息
    if (!model) {
      return NextResponse.json(
        { error: "缺少必要參數：model" },
        { status: 400 }
      );
    }

    // 準備消息和工具
    let toolCallInfo: any = null;
    let enhancedMessages = [...messages];
    let availableTools: MCPTool[] = [];
    let preExecutedTool = null; // 預先執行的工具

    // 如果啟用工具，獲取可用工具
    if (enableTools) {
      try {
        availableTools = await getAvailableTools();
        console.log(`\n=== 工具調試信息 ===`);
        console.log(`可用工具數量: ${availableTools.length}`);
        console.log(`工具列表:`, availableTools.map(t => ({
          name: t.name,
          description: t.description,
          serverId: t.serverId,
          inputSchema: t.inputSchema
        })));

        if (availableTools.length > 0) {
          // 暫時跳過預先執行工具，改用 LLM 自主判斷
          preExecutedTool = null;
          
          if (preExecutedTool) {
            console.log(`\n=== 預先執行工具 ===`);
            console.log(`工具: ${preExecutedTool.toolName}`);
            console.log(`參數:`, preExecutedTool.arguments);
            console.log(`結果:`, preExecutedTool.result);
            
            // 將工具結果加入系統提示
            const toolResultPrompt = `用戶剛才的問題已經通過工具處理：
工具: ${preExecutedTool.toolName}
描述: ${preExecutedTool.description}
參數: ${JSON.stringify(preExecutedTool.arguments, null, 2)}
結果: ${JSON.stringify(preExecutedTool.result, null, 2)}

請基於這個工具執行結果來回答用戶的問題。用繁體中文回答，並使用 Markdown 格式。`;

            enhancedMessages = [
              {
                role: "system",
                content: toolResultPrompt
              },
              ...messages
            ];
          } else {
            // 如果沒有預先執行工具，使用原來的 LLM 工具調用方式
            const toolsSystemPrompt = generateToolsSystemPrompt(availableTools);
            console.log(`\n=== 工具系統提示（LLM 自主調用） ===`);
            console.log(toolsSystemPrompt);
            
            const enhancedSystemPrompt = toolsSystemPrompt + `

請用繁體中文回答用戶的問題。回答時可以使用 Markdown 格式來增強可讀性。

特別注意：
- 當用戶要求計算時，使用 add 工具
- 當用戶要求重複或回音時，使用 echo 工具
- 工具調用格式必須完全正確：<tool_call>{"tool": "名稱", "arguments": {...}}</tool_call>
- 一定要先調用工具，再根據結果回答`;

            enhancedMessages = [
              {
                role: "system",
                content: enhancedSystemPrompt
              },
              ...messages
            ];
          }
          
          console.log(`\n=== 最終發送給 LLM 的消息 ===`);
          console.log(JSON.stringify(enhancedMessages, null, 2));
        } else {
          console.log(`沒有可用工具，將直接對話`);
        }
      } catch (error) {
        console.error("獲取可用工具失敗:", error);
      }
    } else {
      console.log(`工具功能已禁用`);
    }

    // 初始化 ChatOllama
    const llm = new ChatOllama({
      baseUrl: process.env.NEXT_PUBLIC_OLLAMA_API_URL,
      model: model,
      temperature: temperature,
    });

    // 轉換消息格式 - 使用增強後的消息
    const langchainMessages: BaseMessage[] = [];

    if (enhancedMessages && Array.isArray(enhancedMessages)) {
      for (let i = 0; i < enhancedMessages.length; i++) {
        const msg = enhancedMessages[i];
        const content = msg.content || "";

        // 檢查是否為原始消息中的最後一條用戶消息且有圖片
        const isOriginalLastUserMessage =
          messages && i === messages.length - 1 && msg.role === "user";
        const shouldAddImages =
          isOriginalLastUserMessage && images && images.length > 0;

        if (shouldAddImages) {
          // 為最後一條用戶消息添加圖片支援
          const contentParts: (TextContent | ImageContent)[] = [
            {
              type: "text",
              text: content,
            },
          ];

          // 添加圖片
          for (const imageData of images) {
            contentParts.push({
              type: "image_url",
              image_url: imageData, // 應該是 data:image/jpeg;base64,... 格式
            });
          }

          langchainMessages.push(
            new HumanMessage({
              content: contentParts as MessageContent,
            })
          );
        } else {
          // 普通消息處理
          switch (msg.role) {
            case "system":
              langchainMessages.push(new SystemMessage(content));
              break;
            case "user":
              langchainMessages.push(new HumanMessage(content));
              break;
            case "assistant":
              langchainMessages.push(new AIMessage(content));
              break;
            default:
              console.warn(`未知的消息角色: ${msg.role}`);
              break;
          }
        }
      }
    }

    if (stream) {
      // 流式響應
      const llmStream = await llm.stream(langchainMessages);

      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            let accumulatedContent = "";
            let hasToolCall = false;

            // 處理 LLM 流式響應
            for await (const chunk of llmStream) {
              accumulatedContent += chunk.content;
              // 實時日誌輸出
              console.log(`[STREAM] 新增: "${chunk.content}" | 累積長度: ${accumulatedContent.length}`);

              // 檢查是否包含工具調用
              const toolCall = parseToolCall(accumulatedContent);
              if (toolCall) {
                console.log(`[TOOL DETECTED] ${toolCall.tool}:`, toolCall.arguments);
              }
              
              if (toolCall && !hasToolCall) {
                hasToolCall = true;
                
                // 停止流式輸出原始內容（避免顯示工具調用標籤）
                console.log(`[TOOL CALL] 停止原始流式輸出，開始處理工具調用`);
                
                // 發送工具調用開始信息
                const toolCallId = `tool_${Date.now()}`;
                toolCallInfo = {
                  id: toolCallId,
                  name: toolCall.tool,
                  args: toolCall.arguments,
                  status: "running",
                  startTime: Date.now(),
                };

                const toolCallData = {
                  type: "tool_call",
                  tool_call: toolCallInfo,
                };
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(toolCallData)}\n\n`)
                );

                // 執行工具調用
                try {
                  console.log(`[TOOL EXEC START] ${toolCall.tool}:`, toolCall.arguments);
                  
                  // 找到對應的工具定義
                  const toolDef = availableTools.find(t => t.name === toolCall.tool);
                  if (!toolDef) {
                    throw new Error(`找不到工具: ${toolCall.tool}`);
                  }

                  const startTime = Date.now();
                  const result = await mcpClientManager.callTool(
                    toolDef.serverId,
                    toolCall.tool,
                    toolCall.arguments
                  );
                  const duration = Date.now() - startTime;

                  // 更新工具調用狀態
                  toolCallInfo = {
                    ...toolCallInfo,
                    status: "completed",
                    result: result,
                    duration,
                  };

                  console.log(`[TOOL EXEC SUCCESS] ${toolCall.tool} (${duration}ms):`, result);

                  // 發送工具調用完成信息
                  const completedToolCallData = {
                    type: "tool_call",
                    tool_call: toolCallInfo,
                  };
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(completedToolCallData)}\n\n`)
                  );

                  // 讓 LLM 基於工具結果生成自然回答
                  const toolResultContent = result.content && result.content[0] && result.content[0].text 
                    ? result.content[0].text 
                    : JSON.stringify(result, null, 2);
                  
                  console.log(`[TOOL RESULT] 工具結果:`, toolResultContent);
                  
                  // 構建給 LLM 的上下文，讓它基於工具結果回答
                  const contextMessage = {
                    role: "user",
                    content: `剛才你調用了工具 "${toolCall.tool}"，獲得了以下結果：

${toolResultContent}

請基於這個結果，用繁體中文給出一個自然、有用的回答給用戶。不要提及工具調用的技術細節，就像你直接知道答案一樣自然地回答。用戶的原始問題記住嗎？請直接回答他們的問題。`
                  };

                  // 重新調用 LLM 生成基於結果的回答
                  console.log(`[LLM FINAL CALL] 讓 LLM 基於工具結果生成回答`);
                  const finalMessages = [...langchainMessages, contextMessage];
                  const finalStream = await llm.stream(finalMessages);

                  // 處理 LLM 的最終回答
                  for await (const finalChunk of finalStream) {
                    console.log(`[LLM FINAL STREAM] "${finalChunk.content}"`);
                    
                    // 過濾掉任何包含工具調用標籤的內容
                    if (finalChunk.content.includes('<tool_call>')) {
                      console.log(`[LLM FINAL STREAM] 跳過包含工具調用標籤的 chunk，避免顯示技術內容`);
                      continue; // 跳過這個 chunk
                    }
                    
                    // 發送 LLM 最終回答到 UI
                    const data = {
                      type: "content",
                      message: {
                        role: "assistant",
                        content: finalChunk.content,
                      },
                      done: false,
                    };

                    console.log(`[UI SEND] 發送最終回答 chunk 到前端: "${finalChunk.content}"`);
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
                    );
                  }
                  
                  // 發送工具調用完成的結束信號
                  const toolCallCompleteData = {
                    type: "content",
                    message: {
                      role: "assistant",
                      content: "",
                    },
                    done: true,
                  };

                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(toolCallCompleteData)}\n\n`)
                  );
                  
                  console.log(`[LLM FINAL CALL] LLM 回答生成完成`);

                } catch (error) {
                  console.error(`[TOOL EXEC FAILED] ${toolCall.tool}:`, error);
                  
                  // 更新工具調用為失敗狀態
                  toolCallInfo = {
                    ...toolCallInfo,
                    status: "failed",
                    error: error instanceof Error ? error.message : "工具調用失敗",
                  };

                  // 發送工具調用失敗信息
                  const failedToolCallData = {
                    type: "tool_call",
                    tool_call: toolCallInfo,
                  };
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(failedToolCallData)}\n\n`)
                  );

                  // 工具調用失敗時，提供一個友好的錯誤回答，不顯示技術細節
                  const errorResponse = {
                    type: "content",
                    message: {
                      role: "assistant",
                      content: `抱歉，我在處理您的請求時遇到了問題。請重新嘗試，或者用不同的方式提問。`,
                    },
                    done: false,
                  };

                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(errorResponse)}\n\n`)
                  );
                }
                
                // 跳出循環，因為我們已經處理了工具調用
                break;
              } else if (!hasToolCall) {
                // 檢查當前chunk是否包含工具調用的開始
                if (chunk.content.includes('<tool_call>')) {
                  console.log(`[TOOL CALL] 檢測到工具調用開始，跳過此chunk避免顯示技術內容`);
                  // 不發送包含工具調用標籤的內容
                } else {
                  // 如果沒有工具調用，正常流式輸出
                  const data = {
                    type: "content",
                    message: {
                      role: "assistant",
                      content: chunk.content,
                    },
                    done: false,
                  };

                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
                  );
                }
              }
            }

            // 如果沒有工具調用，發送完成信號
            if (!hasToolCall) {
              const finalData = {
                type: "content",
                message: {
                  role: "assistant",
                  content: "",
                },
                done: true,
              };

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(finalData)}\n\n`)
              );
            }

            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) {
            console.error("流式響應錯誤:", error);
            controller.error(error);
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } else {
      // 非流式響應
      const response = await llm.invoke(langchainMessages);
      let finalContent = response.content;
      
      console.log(`\n=== LLM 非流式響應 ===`);
      console.log(`響應內容:`, finalContent);

      // 檢查是否包含工具調用
      const toolCall = parseToolCall(finalContent);
      console.log(`[TOOL DETECTION] 非流式響應工具調用檢測:`, toolCall ? 'YES' : 'NO');
      
      if (toolCall && availableTools.length > 0) {
        console.log(`[TOOL CALL] 非流式響應檢測到工具調用，移除原始內容避免顯示技術細節`);
        try {
          console.log(`LLM 請求調用工具: ${toolCall.tool}`, toolCall.arguments);
          
          // 找到對應的工具定義
          const toolDef = availableTools.find(t => t.name === toolCall.tool);
          if (!toolDef) {
            throw new Error(`找不到工具: ${toolCall.tool}`);
          }

          // 創建工具調用記錄
          const toolCallId = `tool_${Date.now()}`;
          const startTime = Date.now();
          
          const result = await mcpClientManager.callTool(
            toolDef.serverId,
            toolCall.tool,
            toolCall.arguments
          );
          const duration = Date.now() - startTime;

          toolCallInfo = {
            id: toolCallId,
            name: toolCall.tool,
            args: toolCall.arguments,
            status: "completed",
            result: result,
            duration,
            startTime,
          };

          console.log(`工具調用成功: ${toolCall.tool} (${duration}ms)`);

          // 讓 LLM 基於工具結果生成自然回答
          const toolResultContent = result.content && result.content[0] && result.content[0].text 
            ? result.content[0].text 
            : JSON.stringify(result, null, 2);
          
          console.log(`[TOOL RESULT] 非流式工具結果:`, toolResultContent);
          
          // 構建給 LLM 的上下文，讓它基於工具結果回答
          const contextMessage = {
            role: "user",
            content: `剛才你調用了工具 "${toolCall.tool}"，獲得了以下結果：

${toolResultContent}

請基於這個結果，用繁體中文給出一個自然、有用的回答給用戶。不要提及工具調用的技術細節，就像你直接知道答案一樣自然地回答。用戶的原始問題記住嗎？請直接回答他們的問題。`
          };

          // 重新調用 LLM 生成基於結果的回答
          const finalMessages = [...langchainMessages, contextMessage];
          const finalResponse = await llm.invoke(finalMessages);
          finalContent = finalResponse.content;
          
          // 確保最終內容不包含任何工具調用標籤
          finalContent = removeToolCallFromContent(finalContent);

        } catch (error) {
          console.error(`工具調用失敗: ${toolCall.tool}`, error);
          
          toolCallInfo = {
            id: `tool_${Date.now()}`,
            name: toolCall.tool,
            args: toolCall.arguments,
            status: "failed",
            error: error instanceof Error ? error.message : "工具調用失敗",
            startTime: Date.now(),
          };

          // 移除工具調用標記，返回原始內容
          finalContent = removeToolCallFromContent(finalContent);
        }
      }

      const responseData: any = {
        message: {
          role: "assistant",
          content: finalContent,
        },
        done: true,
      };

      // 如果有工具調用，包含工具調用信息
      if (toolCallInfo) {
        responseData.tool_call = toolCallInfo;
      }

      return NextResponse.json(responseData);
    }
  } catch (error) {
    console.error("聊天請求錯誤:", error);
    return NextResponse.json(
      {
        error: "處理聊天請求時發生錯誤",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
