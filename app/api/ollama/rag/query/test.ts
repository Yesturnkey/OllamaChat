/**
 * 此文件用於演示如何使用 query API
 *
 * 使用方法:
 * 1. 確保已經通過 create_index API 創建了向量索引
 * 2. 在終端中執行 `ts-node src/app/api/ollama/rag/query/test.ts`
 */

async function testQuery() {
  try {
    const response = await fetch("http://localhost:3000/api/ollama/rag/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "這個文件主要在說什麼?", // 替換為你的查詢問題
        // indexPath 可選，如果不提供則使用默認路徑
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("查詢結果：", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("測試查詢失敗:", error);
  }
}

// 如果直接執行此文件則運行測試
if (require.main === module) {
  testQuery();
}
