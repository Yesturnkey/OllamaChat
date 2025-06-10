import { NextRequest, NextResponse } from "next/server";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OllamaEmbeddings } from "@langchain/ollama";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { JSONLoader } from "langchain/document_loaders/fs/json";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
// import { PPTXLoader } from "@langchain/community/document_loaders/fs/pptx"; // 暫時註解掉
import fs from "fs/promises";
import { join } from "path";
import { writeFile } from "fs/promises";

// 支援的檔案類型映射
const SUPPORTED_FILE_TYPES = {
  "text/csv": "csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/msword": "doc",
  "application/json": "json",
  "application/pdf": "pdf",
  // "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx", // 暫時註解掉
  "text/plain": "txt",
  "application/xml": "xml",
  "text/xml": "xml",
};

// 根據檔案副檔名判斷類型
function getFileTypeFromExtension(fileName: string): string | null {
  const extension = fileName.split(".").pop()?.toLowerCase();
  const extensionMap: Record<string, string> = {
    csv: "csv",
    docx: "docx",
    doc: "doc",
    json: "json",
    pdf: "pdf",
    // pptx: "pptx", // 暫時註解掉
    txt: "txt",
    xml: "xml",
  };
  return extensionMap[extension || ""] || null;
}

// 創建臨時檔案
async function createTempFile(
  fileBlob: Blob,
  fileName: string
): Promise<string> {
  const tempDir = join(process.cwd(), "temp");
  await fs.mkdir(tempDir, { recursive: true });

  const tempFilePath = join(tempDir, `${Date.now()}_${fileName}`);
  const buffer = Buffer.from(await fileBlob.arrayBuffer());
  await writeFile(tempFilePath, buffer);

  return tempFilePath;
}

// 清理臨時檔案
async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.warn("清理臨時檔案失敗:", error);
  }
}

// 根據檔案類型載入文檔
async function loadDocumentByType(
  filePath: string,
  fileType: string,
  fileName: string
): Promise<Document[]> {
  try {
    console.log(`使用 ${fileType} 載入器處理檔案: ${fileName}`);

    switch (fileType) {
      case "csv":
        const csvLoader = new CSVLoader(filePath);
        return await csvLoader.load();

      case "docx":
        // 處理 .docx 格式（基於 ZIP 的 Office Open XML）
        const docxLoader = new DocxLoader(filePath);
        return await docxLoader.load();

      case "doc":
        // 處理舊的 .doc 格式，需要指定 type: "doc"
        const docLoader = new DocxLoader(filePath, { type: "doc" });
        return await docLoader.load();

      case "json":
        const jsonLoader = new JSONLoader(filePath);
        return await jsonLoader.load();

      case "pdf":
        const pdfLoader = new PDFLoader(filePath);
        return await pdfLoader.load();

      // case "pptx": // 暫時註解掉
      //   const pptxLoader = new PPTXLoader(filePath);
      //   return await pptxLoader.load();

      case "txt":
      case "xml":
        const textLoader = new TextLoader(filePath);
        return await textLoader.load();

      default:
        throw new Error(`不支援的檔案類型: ${fileType}`);
    }
  } catch (error) {
    console.error(`載入檔案 ${fileName} 時發生錯誤:`, error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("API 被調用了");

    const formData = await req.formData();
    const files = formData.getAll("file");

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "未提供文件" }, { status: 400 });
    }

    console.log(`收到 ${files.length} 個文件`);

    // 創建文檔列表
    const documents: Document[] = [];
    const tempFiles: string[] = [];

    // 處理文件
    for (const fileItem of files) {
      if (!(fileItem instanceof Blob)) {
        console.warn("非 Blob 類型的文件項目，跳過");
        continue;
      }

      const fileName = (fileItem as any).name || `file_${Date.now()}`;
      const fileType = fileItem.type || "text/plain";
      const fileSize = fileItem.size;

      console.log("處理文件:", fileName, fileType, "大小:", fileSize);

      // 判斷檔案類型
      let detectedType: string | null =
        SUPPORTED_FILE_TYPES[fileType as keyof typeof SUPPORTED_FILE_TYPES];
      if (!detectedType) {
        detectedType = getFileTypeFromExtension(fileName);
      }

      if (!detectedType) {
        console.warn(`不支援的檔案類型: ${fileName} (${fileType})`);
        // 對於不支援的檔案類型，嘗試作為純文字處理
        try {
          const fileContent = await fileItem.text();
          const doc = new Document({
            pageContent: fileContent,
            metadata: {
              source: fileName,
              type: fileType,
              detectedType: "fallback-text",
            },
          });
          documents.push(doc);
          console.log(`檔案 ${fileName} 作為純文字處理`);
        } catch (error) {
          console.error(`無法處理檔案 ${fileName}:`, error);
        }
        continue;
      }

      console.log(`檔案 ${fileName} 被識別為類型: ${detectedType}`);

      try {
        // 創建臨時檔案
        const tempFilePath = await createTempFile(fileItem, fileName);
        tempFiles.push(tempFilePath);

        // 使用對應的載入器載入文檔
        const loadedDocs = await loadDocumentByType(
          tempFilePath,
          detectedType,
          fileName
        );

        console.log(
          `成功載入檔案 ${fileName}，產生 ${loadedDocs.length} 個文檔片段`
        );

        // 更新文檔的 metadata
        const updatedDocs = loadedDocs.map((doc) => ({
          ...doc,
          metadata: {
            ...doc.metadata,
            source: fileName,
            type: fileType,
            detectedType: detectedType,
          },
        }));

        documents.push(...updatedDocs);
      } catch (error) {
        console.error(`處理檔案 ${fileName} 時發生錯誤:`, error);
        // 如果專用載入器失敗，嘗試作為純文字處理
        try {
          const fileContent = await fileItem.text();
          const doc = new Document({
            pageContent: fileContent,
            metadata: {
              source: fileName,
              type: fileType,
              detectedType: "fallback-text",
            },
          });
          documents.push(doc);
          console.log(`檔案 ${fileName} 載入器失敗，改為純文字處理`);
        } catch (fallbackError) {
          console.error(`檔案 ${fileName} 完全無法處理:`, fallbackError);
        }
      }
    }

    if (documents.length === 0) {
      // 清理臨時檔案
      for (const tempFile of tempFiles) {
        await cleanupTempFile(tempFile);
      }
      return NextResponse.json(
        { error: "沒有成功載入任何文檔" },
        { status: 400 }
      );
    }

    // 分割文本
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    console.log("開始分割文檔...");
    const splitDocs = await textSplitter.splitDocuments(documents);
    console.log("文檔分割完成，分片數量:", splitDocs.length);

    // 初始化 Ollama embeddings
    const ollamaApiUrl =
      process.env.NEXT_PUBLIC_OLLAMA_API_URL || "http://192.168.0.82:11434";
    console.log("使用 Ollama API URL:", ollamaApiUrl);

    console.log("初始化 Ollama embeddings...");
    const embeddings = new OllamaEmbeddings({
      model: "nomic-embed-text",
      baseUrl: ollamaApiUrl,
    });

    // 創建向量存儲
    console.log("創建向量存儲...");
    const vectorStore = await MemoryVectorStore.fromDocuments(
      splitDocs,
      embeddings
    );
    console.log("向量存儲創建完成");

    // 創建唯一的索引名稱並保存
    const timestamp = Date.now();
    const indexName = `index_${timestamp}`;
    const vectorStorePath = join(
      process.cwd(),
      "vectorstore",
      `${indexName}.json`
    );

    // 確保目錄存在
    await fs.mkdir(join(process.cwd(), "vectorstore"), { recursive: true });

    // 將向量存儲序列化為 JSON
    const serialized = JSON.stringify(
      vectorStore.memoryVectors.map((vector: any) => ({
        content: vector.content,
        metadata: vector.metadata,
        embedding: Array.from(vector.embedding),
      }))
    );

    // 保存向量存儲到本地
    console.log("保存向量存儲到路徑:", vectorStorePath);
    await fs.writeFile(vectorStorePath, serialized);
    console.log("向量存儲保存完成");

    // 清理臨時檔案
    for (const tempFile of tempFiles) {
      await cleanupTempFile(tempFile);
    }

    return NextResponse.json({
      message: "索引創建成功",
      fileCount: files.length,
      documentCount: documents.length,
      splitDocumentCount: splitDocs.length,
      indexPath: vectorStorePath,
      supportedTypes: Object.keys(SUPPORTED_FILE_TYPES),
      ollamaUrl: ollamaApiUrl,
    });
  } catch (error) {
    console.error("API 錯誤:", error);
    return NextResponse.json(
      {
        error: "API 執行失敗",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
