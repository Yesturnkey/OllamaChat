import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { model } = body;

    if (!model) {
      return NextResponse.json(
        { error: "缺少必要參數：model" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_OLLAMA_API_URL}/api/show`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model }),
      }
    );

    if (!response.ok) {
      throw new Error(`無法獲取模型資訊: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("獲取模型資訊錯誤:", error);
    return NextResponse.json({ error: "無法獲取模型資訊" }, { status: 500 });
  }
}
