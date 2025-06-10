import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_OLLAMA_API_URL}/api/tags`
    );
    if (!response.ok) {
      throw new Error("無法獲取模型列表");
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "無法獲取模型列表" }, { status: 500 });
  }
}
