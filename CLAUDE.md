# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 開發命令

- `pnpm dev` - 啟動開發服務器 (使用 Next.js TurboPack)
- `pnpm build` - 構建生產版本
- `pnpm start` - 啟動生產服務器
- `pnpm lint` - 運行 Next.js linter 檢查代碼錯誤

## 架構概述

OllamaChat 是一個基於 Next.js 的 AI 聊天應用，整合了 Ollama LLM 和 MCP (Model Context Protocol) 客戶端。

### 核心技術棧
- **前端**: Next.js 15 + React 19 + TypeScript
- **狀態管理**: Redux Toolkit
- **UI**: Tailwind CSS + Shadcn/UI
- **AI**: LangChain + Ollama
- **向量存儲**: LangChain MemoryVectorStore (用於 RAG)

### 應用架構

#### 狀態管理 (Redux)
Store 位於 `app/redux/store.ts`，包含以下 slices：
- `chatSlice`: 聊天消息和會話管理
- `modelSlice`: 模型選擇和配置
- `uiSlice`: UI 狀態 (側邊欄、移動端適配等)
- `mcpSlice`: MCP 服務器和工具管理

#### API 路由結構
- `app/api/ollama/`: Ollama 相關 API
  - `chat/`: 基本聊天功能
  - `generate/`: 文本生成
  - `chat-with-tools/`: 支持工具調用的聊天
  - `rag/`: 檢索增強生成功能
    - `create_index/`: 創建文檔索引
    - `query/`: 查詢 RAG 系統
  - `vision/`: 圖像識別功能
  - `tags/`, `show/`, `stats/`: 模型管理

- `app/api/mcp/`: MCP 協議相關 API
  - `connect/`: 連接 MCP 服務器
  - `servers/`: 服務器管理
  - `tools/`: 工具調用

#### 核心庫文件
- `lib/ollama.ts`: Ollama API 客戶端封裝
- `lib/mcp-client.ts`: MCP 客戶端管理器，支持 stdio、SSE、httpStream 連接
- `lib/mcp-types.ts`: MCP 類型定義

#### 主要組件
- `AIChat.tsx`: 主應用容器，處理響應式布局
- `ChatMain.tsx`: 聊天主界面
- `ChatSidebar.tsx`: 側邊欄，包含會話列表和工具
- `InputArea.tsx`: 消息輸入區域
- `MessageList.tsx`: 消息列表顯示
- `MCPToolsTab.tsx`: MCP 工具管理標籤頁

### 關鍵功能實現

#### RAG 系統
- 支持多種文檔格式：PDF, DOCX, CSV, JSON, TXT, XML
- 使用 `nomic-embed-text` 模型進行文檔嵌入
- 文檔分割：chunk size 1000，overlap 200
- 向量索引保存在 `vectorstore/` 目錄

#### MCP 集成
- 支持多種連接類型：stdio、SSE、httpStream
- 動態工具發現和調用
- Server 連接狀態管理

#### 移動端適配
- 響應式設計，768px 為移動端斷點
- 側邊欄在移動端可折疊
- 觸摸友好的交互設計

## 環境配置

默認 Ollama API URL: `http://localhost:11434`
可通過環境變量 `NEXT_PUBLIC_OLLAMA_API_URL` 自定義

## 開發注意事項

- 所有 API 路由都有完整的錯誤處理和日志記錄
- 使用 TypeScript 嚴格模式
- 遵循 Next.js App Router 約定
- 組件使用 "use client" 指令進行客戶端渲染
- 狀態管理優先使用 Redux，局部狀態使用 useState