import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { model, prompt, stream = true, temperature = 0.7 } = body;

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_OLLAMA_API_URL}/api/generate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt,
          stream,
          options: {
            temperature,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Ollama API 請求失敗");
    }

    // 如果是流式響應，直接轉發響應流
    if (stream) {
      return new Response(response.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // 如果是非流式響應，返回 JSON
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("生成請求錯誤:", error);
    return NextResponse.json(
      { error: "處理生成請求時發生錯誤" },
      { status: 500 }
    );
  }
}
