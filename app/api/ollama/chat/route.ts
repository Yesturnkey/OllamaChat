import { NextRequest, NextResponse } from "next/server";
import { ChatOllama } from "@langchain/ollama";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";

// 處理與過濾字符內容的函數
function sanitizeContent(content: string): string {
  // 過濾不可打印字符
  return content.replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g, "");
}

// 處理模板中的特殊字符，防止 LangChain 模板解析錯誤
function escapeTemplateChars(text: string): string {
  if (!text) return "";

  // 1. 過濾不可打印字符
  let result = text.replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g, "");

  // 2. 替換可能導致模板解析錯誤的字符
  // 將單獨的 { 和 } 轉義為 {{ 和 }}
  result = result.replace(/[{}]/g, (match) => {
    return match === "{" ? "{{" : "}}";
  });

  return result;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { model, messages, stream = true, temperature = 0.7 } = body;

    // 確保 messages 是陣列格式
    const formattedMessages = Array.isArray(messages)
      ? messages
      : [
          {
            role: "user",
            content: messages,
          },
        ];

    // 過濾和轉義消息內容中的特殊字符
    const sanitizedMessages = formattedMessages.map((msg) => ({
      ...msg,
      content: escapeTemplateChars(msg.content),
    }));

    console.log("發送給 LangChain-Ollama 的請求內容:", {
      model,
      messages: formattedMessages.length,
      stream,
      temperature,
    });

    // 建立 Ollama 聊天模型
    const chatModel = new ChatOllama({
      model: model,
      baseUrl: process.env.NEXT_PUBLIC_OLLAMA_API_URL, // Ollama 服務地址
      temperature: temperature,
    });

    if (stream) {
      // 處理流式響應
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // 從歷史消息中創建提示
            const chatHistory = sanitizedMessages.map((msg) => {
              return {
                role: msg.role,
                content: msg.content,
              };
            });

            // 最後一條消息（通常是用戶的問題）
            const lastMessage = chatHistory[chatHistory.length - 1];

            // 移除最後一條消息，因為它將作為問題單獨傳遞
            const history = chatHistory.slice(0, -1);

            // 創建聊天提示模板
            let promptTemplate;
            if (history.length > 0) {
              promptTemplate = ChatPromptTemplate.fromMessages([
                ...history.map((msg) => ({
                  role: msg.role === "user" ? "human" : "assistant",
                  content: msg.content,
                })),
                ["human", lastMessage.content],
              ]);
            } else {
              promptTemplate = ChatPromptTemplate.fromMessages([
                ["human", lastMessage.content],
              ]);
            }

            // 創建 LangChain 流程
            const chain = RunnableSequence.from([
              promptTemplate,
              chatModel,
              new StringOutputParser(),
            ]);

            // 啟動流式生成
            const streamingResponse = await chain.stream({});

            for await (const chunk of streamingResponse) {
              try {
                // 過濾內容
                const sanitizedChunk = sanitizeContent(chunk);

                // 封裝流式響應格式
                const responseChunk = {
                  message: {
                    content: sanitizedChunk,
                  },
                };

                controller.enqueue(
                  new TextEncoder().encode(JSON.stringify(responseChunk) + "\n")
                );
              } catch (chunkError) {
                console.error("處理響應塊時出錯:", chunkError);
              }
            }
          } catch (error) {
            console.error("流處理錯誤:", error);

            // 發送錯誤訊息給客戶端
            const errorResponse = {
              message: {
                content:
                  "處理您的請求時發生錯誤。文件內容可能包含不支援的格式或特殊字符。",
              },
            };
            controller.enqueue(
              new TextEncoder().encode(JSON.stringify(errorResponse) + "\n")
            );

            controller.close();
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
    }

    // 非流式處理
    // 從歷史消息中創建提示
    const chatHistory = sanitizedMessages.map((msg) => {
      return {
        role: msg.role,
        content: msg.content,
      };
    });

    // 最後一條消息（通常是用戶的問題）
    const lastMessage = chatHistory[chatHistory.length - 1];

    // 移除最後一條消息，因為它將作為問題單獨傳遞
    const history = chatHistory.slice(0, -1);

    // 創建聊天提示模板
    let promptTemplate;
    if (history.length > 0) {
      promptTemplate = ChatPromptTemplate.fromMessages([
        ...history.map((msg) => ({
          role: msg.role === "user" ? "human" : "assistant",
          content: msg.content,
        })),
        ["human", lastMessage.content],
      ]);
    } else {
      promptTemplate = ChatPromptTemplate.fromMessages([
        ["human", lastMessage.content],
      ]);
    }

    // 創建 LangChain 流程
    const chain = RunnableSequence.from([
      promptTemplate,
      chatModel,
      new StringOutputParser(),
    ]);

    try {
      // 執行鏈並獲取響應
      const response = await chain.invoke({});

      // 過濾非流式回應中的內容
      const sanitizedResponse = sanitizeContent(response);

      return NextResponse.json({
        message: {
          content: sanitizedResponse,
        },
      });
    } catch (error) {
      console.error("非流處理錯誤:", error);
      return NextResponse.json({
        message: {
          content:
            "處理您的請求時發生錯誤。文件內容可能包含不支援的格式或特殊字符。",
        },
      });
    }
  } catch (error) {
    console.error("聊天請求錯誤:", error);
    return NextResponse.json(
      { error: "處理聊天請求時發生錯誤" },
      { status: 500 }
    );
  }
}
