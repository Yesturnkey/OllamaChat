import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), "public", "ollama_models.json");
    const jsonData = await fs.readFile(filePath, "utf8");
    const models = JSON.parse(jsonData);

    // 將統計資料轉換為更容易使用的格式，只返回 pulls 資訊
    const statsMap: Record<string, { pulls: string }> = {};

    models.forEach((model: any) => {
      const modelName = model.name;
      statsMap[modelName] = {
        pulls: model.pulls,
      };
    });

    return NextResponse.json({ stats: statsMap });
  } catch (error) {
    console.error("讀取模型統計資料錯誤:", error);
    return NextResponse.json(
      { error: "無法讀取模型統計資料" },
      { status: 500 }
    );
  }
}
