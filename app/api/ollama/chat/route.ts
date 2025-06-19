import { NextRequest, NextResponse } from "next/server";
import { ChatOllama } from "@langchain/ollama";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  BaseMessage,
} from "@langchain/core/messages";

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { model, messages, stream = true, temperature = 0.7, images } = body;

    console.log("聊天請求:", {
      model,
      messageCount: messages ? messages.length : 0,
      hasImages: images ? images.length : 0,
      stream,
      temperature,
    });

    // 確保有提供模型和消息
    if (!model) {
      return NextResponse.json(
        { error: "缺少必要參數：model" },
        { status: 400 }
      );
    }

    // 初始化 ChatOllama
    const llm = new ChatOllama({
      baseUrl: process.env.NEXT_PUBLIC_OLLAMA_API_URL,
      model: model,
      temperature: temperature,
    });

    // 轉換消息格式
    const langchainMessages: BaseMessage[] = [];

    if (messages && Array.isArray(messages)) {
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const content = msg.content || "";

        // 檢查是否為最後一條用戶消息且有圖片
        const isLastUserMessage =
          i === messages.length - 1 && msg.role === "user";
        const shouldAddImages =
          isLastUserMessage && images && images.length > 0;

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
      const stream = await llm.stream(langchainMessages);

      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const data = {
                message: {
                  role: "assistant",
                  content: chunk.content,
                },
                done: false,
              };

              controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
            }

            // 發送完成信號
            const finalData = {
              message: {
                role: "assistant",
                content: "",
              },
              done: true,
            };

            controller.enqueue(
              encoder.encode(JSON.stringify(finalData) + "\n")
            );

            controller.close();
          } catch (error) {
            console.error("流式響應錯誤:", error);
            controller.error(error);
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } else {
      // 非流式響應
      const response = await llm.invoke(langchainMessages);

      return NextResponse.json({
        message: {
          role: "assistant",
          content: response.content,
        },
        done: true,
      });
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
