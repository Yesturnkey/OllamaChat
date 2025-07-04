# 視覺功能說明 (Vision Features)

## 概述

OllamaChat 現在支援圖片上傳功能，讓您可以與支援視覺的 AI 模型進行多模態對話。您可以上傳圖片並詢問 AI 關於圖片內容的問題。

## 支援的圖片格式

- **JPEG** (.jpg, .jpeg)
- **PNG** (.png)
- **GIF** (.gif)
- **WebP** (.webp)
- **BMP** (.bmp)
- **SVG** (.svg)

## 如何使用

### 1. 上傳圖片

1. 在聊天介面底部點擊上傳按鈕 (📎)
2. 選擇要上傳的圖片檔案
3. 圖片將會顯示在輸入區域上方，可以預覽

### 2. 詢問問題

- 輸入您想問的關於圖片的問題
- 點擊發送按鈕
- AI 將會分析圖片並回答您的問題

### 3. 範例問題

- "這張圖片裡有什麼？"
- "請描述這張圖片的內容"
- "圖片中的人在做什麼？"
- "這張圖片的主要顏色是什麼？"
- "請幫我分析這張圖表"

## 支援的模型

要使用視覺功能，您需要安裝支援視覺的 Ollama 模型，例如：

### 推薦的視覺模型

- **LLaVA** (`llava:latest`)
- **LLaVA 1.5** (`llava:7b`, `llava:13b`)
- **Bakllava** (`bakllava:latest`)
- **Moondream** (`moondream:latest`)

### 安裝視覺模型

```bash
# 安裝 LLaVA 模型
ollama pull llava:latest

# 或者安裝較小的版本
ollama pull llava:7b

# 安裝 Bakllava 模型
ollama pull bakllava:latest
```

## 技術細節

### API 端點

- **視覺對話**: `/api/ollama/vision`
- **一般對話**: `/api/ollama/chat`

### 自動檢測

系統會自動檢測您是否上傳了圖片：

- 如果有圖片：使用視覺 API 進行多模態對話
- 如果只有文件：使用 RAG 功能處理文件
- 如果沒有附件：使用一般聊天功能

### 圖片處理

- 圖片會被轉換為 base64 格式
- 大小限制：20MB
- 支援多張圖片同時上傳

## 注意事項

1. **模型相容性**：確保您使用的是支援視覺的模型
2. **檔案大小**：圖片檔案不應超過 20MB
3. **效能**：處理圖片可能需要更多時間，特別是大圖片
4. **隱私**：圖片會暫時儲存在記憶體中處理，處理完成後會清除

## 故障排除

### 常見問題

**Q: 為什麼 AI 無法看到我的圖片？**
A: 請確認：

- 使用的是支援視覺的模型（如 LLaVA）
- 圖片格式是支援的格式
- 圖片檔案沒有損壞

**Q: 處理圖片時出現錯誤**
A: 可能的原因：

- 模型未正確安裝
- Ollama 服務未執行
- 圖片檔案太大或格式不支援

**Q: 如何查看支援的模型？**
A: 在終端機中執行：

```bash
ollama list
```

## 範例使用情境

### 1. 圖片描述

上傳一張風景照片，詢問："請詳細描述這張風景照片"

### 2. 文字識別

上傳包含文字的圖片，詢問："請幫我讀出圖片中的文字"

### 3. 圖表分析

上傳統計圖表，詢問："請分析這個圖表的趨勢"

### 4. 物件識別

上傳物品照片，詢問："這是什麼東西？有什麼用途？"

---

如果您有任何問題或建議，歡迎在 GitHub 上提出 issue！
