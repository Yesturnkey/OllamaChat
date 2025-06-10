import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 讀取 HTML 文件
    const htmlPath = path.join(
      process.cwd(),
      "src",
      "app",
      "api",
      "ollama",
      "rag",
      "test.html"
    );
    const htmlContent = fs.readFileSync(htmlPath, "utf8");

    // 返回 HTML 內容，設置正確的 content-type
    return new NextResponse(htmlContent, {
      headers: {
        "content-type": "text/html",
      },
    });
  } catch (error) {
    console.error("讀取測試 HTML 檔案失敗:", error);
    return new NextResponse("無法載入測試頁面", {
      status: 500,
      headers: {
        "content-type": "text/plain",
      },
    });
  }
}
