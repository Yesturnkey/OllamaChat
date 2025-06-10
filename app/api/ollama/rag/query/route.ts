import { NextRequest, NextResponse } from "next/server";
import { OllamaEmbeddings } from "@langchain/ollama";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import fs from "fs/promises";
import { join } from "path";

interface VectorData {
  content: string;
  metadata: Record<string, any>;
  embedding: number[];
}

/**
 * 從本地 JSON 檔案載入向量資料
 */
async function loadVectorsFromFile(filePath: string): Promise<VectorData[]> {
  try {
    const fileContents = await fs.readFile(filePath, "utf-8");
    return JSON.parse(fileContents);
  } catch (error) {
    console.error("載入向量資料失敗:", error);
    throw new Error(
      `無法載入向量資料: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // 解析請求資料
    const data = await req.json();
    const { query, indexPath } = data;

    // 驗證必要參數
    if (!query) {
      return NextResponse.json({ error: "未提供查詢問題" }, { status: 400 });
    }

    console.log("查詢問題:", query);

    // 確定索引路徑
    // 如果未提供 indexPath，使用預設路徑
    const finalIndexPath =
      indexPath || join(process.cwd(), "vectorstore", "index.json");
    console.log("使用向量索引路徑:", finalIndexPath);

    // 從檔案載入向量資料
    const vectors = await loadVectorsFromFile(finalIndexPath);
    console.log(`成功載入 ${vectors.length} 個向量資料`);

    if (vectors.length === 0) {
      return NextResponse.json(
        { error: "索引為空，未包含任何文件" },
        { status: 400 }
      );
    }

    // 使用硬編碼的 URL 作為後備
    const ollamaApiUrl =
      process.env.NEXT_PUBLIC_OLLAMA_API_URL || "http://192.168.0.82:11434";
    console.log("使用 Ollama API URL:", ollamaApiUrl);

    // 初始化 Ollama embeddings
    const embeddings = new OllamaEmbeddings({
      model: "nomic-embed-text",
      baseUrl: ollamaApiUrl,
    });

    // 創建記憶體向量儲存
    const vectorStore = await MemoryVectorStore.fromTexts(
      vectors.map((v) => v.content),
      vectors.map((v) => v.metadata),
      embeddings
    );

    // 執行相似度搜尋
    console.log("執行相似度搜尋...");
    const searchResults = await vectorStore.similaritySearch(query, 3); // 獲取前 3 個相關片段
    console.log("搜尋完成");

    // 準備回傳資料
    const results = searchResults.map((doc) => ({
      content: doc.pageContent,
      metadata: doc.metadata,
      score: doc.metadata.score || null, // 有些實現可能會包含分數
    }));

    return NextResponse.json({
      results,
      query,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // 打印詳細錯誤信息
    console.error("查詢處理錯誤:", error);
    console.error(
      "錯誤詳情:",
      JSON.stringify(error, Object.getOwnPropertyNames(error))
    );

    return NextResponse.json(
      {
        error: "查詢處理失敗",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
