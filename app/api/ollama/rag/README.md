# RAG API 使用說明

本目錄提供了使用 Ollama 和 LangChain 實現的 RAG（檢索增強生成）功能的 API。

## 主要功能

1. **create_index API** - 將上傳的文件轉換成向量並存儲在本地
2. **query API** - 根據提供的問題查詢最相關的文件內容

## 使用流程

### 1. 創建索引

首先，上傳文件並創建向量索引：

```bash
curl -X POST http://localhost:3000/api/ollama/rag/create_index \
  -F "file=@path/to/your/file.txt"
```

回傳結果示例：

```json
{
  "message": "索引創建成功",
  "documentCount": 1
}
```

### 2. 查詢索引

使用創建好的索引進行問題查詢：

```bash
curl -X POST http://localhost:3000/api/ollama/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query":"你的問題"}'
```

回傳結果示例：

```json
{
  "results": [
    {
      "content": "文件內容片段",
      "metadata": {
        "source": "file.txt",
        "type": "text/plain"
      },
      "score": null
    }
  ],
  "query": "你的問題",
  "timestamp": "2025-05-20T06:22:25.204Z"
}
```

### 3. 指定索引路徑查詢

如果要指定特定的索引路徑進行查詢：

```bash
curl -X POST http://localhost:3000/api/ollama/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query":"你的問題", "indexPath":"/custom/path/to/index.json"}'
```

## API 規格說明

### create_index API

**路徑**: `/api/ollama/rag/create_index`

**方法**: POST

**請求格式**: multipart/form-data

**參數**:

- `file`: 要索引的文件 (必填)

**回傳格式**: JSON

```json
{
  "message": "索引創建成功",
  "documentCount": 1
}
```

### query API

**路徑**: `/api/ollama/rag/query`

**方法**: POST

**請求格式**: application/json

**參數**:

- `query`: 查詢問題 (必填)
- `indexPath`: 向量索引路徑 (選填，默認為 `vectorstore/index.json`)

**回傳格式**: JSON

```json
{
  "results": [
    {
      "content": "相關文件內容",
      "metadata": { ... },
      "score": number | null
    }
  ],
  "query": "原始問題",
  "timestamp": "ISO日期時間"
}
```

## 技術說明

- 使用 Ollama 中的 `nomic-embed-text` 模型生成文本嵌入
- 使用 LangChain 的 `MemoryVectorStore` 進行向量存儲與檢索
- 向量存儲保存為 JSON 格式，便於跨平台使用
