"use client";

import React, { useState, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/app/redux/hooks";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Send, Upload, Wrench } from "lucide-react";
import {
  addMessage,
  addUploadedFiles,
  clearUploadedFiles,
  setIsWaiting,
  updateMessage,
} from "@/app/redux/chatSlice";
import { FileData } from "@/app/redux/chatSlice";
import FileUploadArea from "./FileUploadArea";

const InputArea = () => {
  const dispatch = useAppDispatch();
  const currentChatId = useAppSelector((state) => state.chat.currentChatId);
  const isWaiting = useAppSelector((state) => state.chat.isWaiting);
  const uploadedFiles = useAppSelector((state) => state.chat.uploadedFiles);
  const selectedModel = useAppSelector((state) => state.model.selectedModel);
  const chats = useAppSelector((state) => state.chat.chats);
  const models = useAppSelector((state) => state.model.models);

  // 獲取 MCP 工具信息
  const mcpServers = useAppSelector((state) => state.mcp.servers);
  const connectedServers = mcpServers.filter((server) => server.connected);
  const availableTools = connectedServers.flatMap((server) =>
    server.tools
      .filter((tool) => tool.enabled)
      .map((tool) => ({
        ...tool,
        serverId: server.id, // 添加服務器ID
        serverConfig: {
          type: server.type,
          command: server.command,
          args: server.args,
          env: server.env,
          headers: server.headers,
          url: server.url,
        }, // 添加完整的服務器配置
      }))
  );

  const [inputMessage, setInputMessage] = useState<string>("");
  const [enableMCPTools, setEnableMCPTools] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 獲取當前選中模型的能力
  const currentModel = models.find((model) => model.id === selectedModel);
  const supportsImages = currentModel?.capabilities?.supportsImages || false;

  // 定義允許的文件格式
  const ALLOWED_FILE_TYPES = [
    "text/csv",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/json",
    "text/plain",
    "application/xml",
    "text/xml",
    // 圖片格式（只有在模型支援時才允許）
    ...(supportsImages
      ? [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/gif",
          "image/webp",
          "image/bmp",
          "image/svg+xml",
        ]
      : []),
  ];

  // 定義檔案大小限制（20MB）
  const MAX_FILE_SIZE = 20 * 1024 * 1024;

  // 新增：將 File 轉換為 FileData 的輔助函數
  const convertFileToFileData = async (file: File): Promise<FileData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve({
          name: file.name,
          type: file.type,
          size: file.size,
          content: result, // base64 格式的內容
          lastModified: file.lastModified,
        });
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file); // 讀取為 base64 格式
    });
  };

  // 新增：將 FileData 轉換回 Blob 的輔助函數
  const convertFileDataToBlob = (fileData: FileData): Blob => {
    // 從 base64 data URL 中提取 base64 內容
    const base64Data = fileData.content.split(",")[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: fileData.type });
  };

  // 檢查檔案副檔名是否支援
  const isFileExtensionSupported = (fileName: string): boolean => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    const supportedExtensions = [
      "csv",
      "pdf",
      "doc",
      "docx",
      "pptx",
      "json",
      "txt",
      "xml",
      // 圖片副檔名（只有在模型支援時才允許）
      ...(supportsImages
        ? ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"]
        : []),
    ];
    return supportedExtensions.includes(extension || "");
  };

  // 添加一個工具函數清理RAG內容
  const cleanRagContent = (text: string): string => {
    if (!text) return "";

    // 1. 過濾不可打印字符
    const filteredText = text.replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g, "");

    // 2. 轉義可能導致模板解析錯誤的字符
    const escapedText = filteredText.replace(/[{}]/g, (match) => {
      return match === "{" ? "{{" : "}}";
    });

    return escapedText;
  };

  // 處理發送消息
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    // 保存當前輸入的消息
    const currentMessage = inputMessage;
    // 立即清空輸入區域
    setInputMessage("");

    // 檢查是否有上傳的圖片
    const hasImages = uploadedFiles.some((file) =>
      file.type.startsWith("image/")
    );
    const imageFiles = uploadedFiles.filter((file) =>
      file.type.startsWith("image/")
    );
    const documentFiles = uploadedFiles.filter(
      (file) => !file.type.startsWith("image/")
    );

    // 獲取上傳文件的信息
    const filesInfo = uploadedFiles.length > 0 ? uploadedFiles : undefined;

    // 立即添加用戶消息到聊天界面，包含文件信息
    const userMessage = {
      id: Date.now().toString(),
      role: "user" as const,
      content: currentMessage,
      timestamp: new Date().toISOString(),
      files: filesInfo,
    };

    dispatch(addMessage({ chatId: currentChatId, message: userMessage }));

    // 設置等待狀態
    dispatch(setIsWaiting(true));

    try {
      // 創建助手消息 ID
      const assistantMessageId = (Date.now() + 1).toString();

      // 如果有圖片，使用支援多模態的聊天 API
      if (hasImages) {
        toast.info("正在處理圖片並分析...");

        // 提前創建助手消息
        const initialAssistantMessage = {
          id: assistantMessageId,
          role: "assistant" as const,
          content: "正在分析圖片...",
          timestamp: new Date().toISOString(),
          isStreaming: true,
        };

        dispatch(
          addMessage({
            chatId: currentChatId,
            message: initialAssistantMessage,
          })
        );

        // 準備圖片數據（已經是 base64 格式）
        const imageDataUrls = imageFiles.map((file) => file.content);

        // 獲取聊天歷史
        const currentChat = chats.find((chat) => chat.id === currentChatId);
        const chatHistory =
          currentChat?.messages.slice(0, -2).map((msg) => ({
            role: msg.role,
            content: msg.content,
          })) || [];

        // 添加系統提示
        chatHistory.push({
          role: "system",
          content: `請用繁體中文回答用戶的問題。回答時可以使用 Markdown 格式來增強可讀性。`,
        });

        // 添加用戶問題（不包含圖片，圖片會在 API 中單獨處理）
        chatHistory.push({
          role: "user",
          content: currentMessage,
        });

        // 使用聊天 API（支援多模態）
        const response = await fetch("/api/ollama/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: chatHistory,
            images: imageDataUrls, // 傳遞圖片數據
            stream: true,
          }),
        });

        if (!response.ok) {
          throw new Error(
            `API 請求失敗: ${response.status} ${response.statusText}`
          );
        }

        // 處理流式響應
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("無法讀取響應流");
        }

        let accumulatedContent = "";
        let isStreamComplete = false;
        let toolCallsInfo: any = null;
        let usedToolsInfo: any = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            // 跳過空行和 data: 前綴
            if (!line.startsWith("data: ") || line === "data: [DONE]") {
              if (line === "data: [DONE]") {
                isStreamComplete = true;
                break;
              }
              continue;
            }

            try {
              const jsonStr = line.slice(6); // 移除 "data: " 前綴
              const data = JSON.parse(jsonStr);

              if (data.type === "tool_calls") {
                // 處理工具調用信息
                toolCallsInfo = data.tool_calls;
                usedToolsInfo = data.used_tools;

                console.log("收到工具調用信息:", toolCallsInfo);

                // 更新消息顯示工具調用狀態
                dispatch(
                  updateMessage({
                    chatId: currentChatId,
                    messageId: assistantMessageId,
                    content: "正在執行工具調用...",
                    isStreaming: true,
                    toolCalls: toolCallsInfo,
                    usedTools: usedToolsInfo,
                  })
                );
              } else if (data.type === "content") {
                // 處理內容更新
                accumulatedContent += data.content;

                dispatch(
                  updateMessage({
                    chatId: currentChatId,
                    messageId: assistantMessageId,
                    content: accumulatedContent,
                    isStreaming: true,
                    toolCalls: toolCallsInfo,
                    usedTools: usedToolsInfo,
                  })
                );
              }
            } catch (parseError) {
              console.warn("解析響應行失敗:", line, parseError);
            }
          }

          if (isStreamComplete) break;
        }

        // 確保最終狀態更新
        dispatch(
          updateMessage({
            chatId: currentChatId,
            messageId: assistantMessageId,
            content: accumulatedContent || "處理完成",
            isStreaming: false,
            toolCalls: toolCallsInfo,
            usedTools: usedToolsInfo,
          })
        );

        // 確保流式響應完成後清理狀態
        dispatch(setIsWaiting(false));
      } else if (documentFiles.length > 0) {
        // 如果有文件但沒有圖片，使用原有的 RAG 流程
        // ... 保留原有的 RAG 處理邏輯 ...

        // 顯示文件處理通知
        toast.info("正在處理文件並建立知識庫...");

        // 創建索引名稱 - 使用時間戳確保唯一性
        const indexName = `index_${Date.now()}`;
        const formData = new FormData();

        // 將所有上傳的文件添加到 formData
        documentFiles.forEach((fileData) => {
          // 將 FileData 轉換回 Blob，並建立 File 物件
          const blob = convertFileDataToBlob(fileData);
          const file = new File([blob], fileData.name, {
            type: fileData.type,
            lastModified: fileData.lastModified,
          });
          formData.append("file", file);
        });

        // ... 繼續原有的 RAG 處理邏輯 ...
        // (保留原來的 RAG 處理代碼)

        // 提前創建助手消息，避免發生解析問題時無法顯示
        const initialAssistantMessage = {
          id: assistantMessageId,
          role: "assistant" as const,
          content: "正在思考...",
          timestamp: new Date().toISOString(),
          isStreaming: true,
        };

        dispatch(
          addMessage({
            chatId: currentChatId,
            message: initialAssistantMessage,
          })
        );

        // 創建索引
        let contextText = "";
        try {
          const createResponse = await fetch("/api/ollama/rag/create_index", {
            method: "POST",
            body: formData,
          });

          if (!createResponse.ok) {
            const errorData = await createResponse.json();
            const errorDetails =
              errorData.details || errorData.error || "未知錯誤";
            throw new Error(`創建索引失敗: ${errorDetails}`);
          }

          const createData = await createResponse.json();
          const indexPath =
            createData.indexPath || `vectorstore/index_${indexName}.json`;

          // 索引創建成功，現在查詢
          toast.info("知識庫建立完成，正在查詢相關內容...");

          const queryResponse = await fetch("/api/ollama/rag/query", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: currentMessage,
              indexPath: indexPath,
            }),
          });

          if (!queryResponse.ok) {
            const errorData = await queryResponse.json();
            throw new Error(errorData.error || "查詢索引失敗");
          }

          const queryData = await queryResponse.json();

          if (queryData.results && queryData.results.length > 0) {
            contextText = queryData.results
              .map((result: { content: string }) =>
                cleanRagContent(result.content)
              )
              .join("\n\n");

            toast.success("已找到相關內容，正在生成回答...");
          } else {
            toast.info("未找到相關內容，將使用一般知識回答...");
          }
        } catch (ragError) {
          console.error("RAG 處理錯誤:", ragError);
          toast.error("文件處理失敗，將使用一般知識回答");
        }

        // 獲取聊天歷史
        const currentChat = chats.find((chat) => chat.id === currentChatId);
        const chatHistory =
          currentChat?.messages.slice(0, -2).map((msg) => ({
            role: msg.role,
            content: msg.content,
          })) || [];

        // 添加系統提示
        chatHistory.push({
          role: "system",
          content: `請用繁體中文回答用戶的問題。回答時可以使用 Markdown 格式來增強可讀性。`,
        });

        // 添加用戶問題
        if (contextText) {
          // 有 RAG 結果時，將其作為上下文添加
          chatHistory.push({
            role: "user",
            content: `我有一個問題：${currentMessage}\n\n根據以下資料來回答：\n\n${contextText}`,
          });
        } else {
          // 沒有 RAG 結果，直接添加用戶問題
          chatHistory.push({
            role: "user",
            content: currentMessage,
          });
        }

        // 使用 Ollama API 進行回答
        const response = await fetch("/api/ollama/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: chatHistory,
            stream: true,
          }),
        });

        if (!response.ok) {
          throw new Error(
            `API請求失敗: ${response.status} ${response.statusText}`
          );
        }

        // 處理流式響應
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("無法讀取響應流");
        }

        let accumulatedContent = "";
        let isStreamComplete = false;
        let toolCallsInfo: any = null;
        let usedToolsInfo: any = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            // 跳過空行和 data: 前綴
            if (!line.startsWith("data: ") || line === "data: [DONE]") {
              if (line === "data: [DONE]") {
                isStreamComplete = true;
                break;
              }
              continue;
            }

            try {
              const jsonStr = line.slice(6); // 移除 "data: " 前綴
              const data = JSON.parse(jsonStr);

              if (data.type === "tool_calls") {
                // 處理工具調用信息
                toolCallsInfo = data.tool_calls;
                usedToolsInfo = data.used_tools;

                console.log("收到工具調用信息:", toolCallsInfo);

                // 更新消息顯示工具調用狀態
                dispatch(
                  updateMessage({
                    chatId: currentChatId,
                    messageId: assistantMessageId,
                    content: "正在執行工具調用...",
                    isStreaming: true,
                    toolCalls: toolCallsInfo,
                    usedTools: usedToolsInfo,
                  })
                );
              } else if (data.type === "content") {
                // 處理內容更新
                accumulatedContent += data.content;

                dispatch(
                  updateMessage({
                    chatId: currentChatId,
                    messageId: assistantMessageId,
                    content: accumulatedContent,
                    isStreaming: true,
                    toolCalls: toolCallsInfo,
                    usedTools: usedToolsInfo,
                  })
                );
              }
            } catch (parseError) {
              console.warn("解析響應行失敗:", line, parseError);
            }
          }

          if (isStreamComplete) break;
        }

        // 確保最終狀態更新
        dispatch(
          updateMessage({
            chatId: currentChatId,
            messageId: assistantMessageId,
            content: accumulatedContent || "處理完成",
            isStreaming: false,
            toolCalls: toolCallsInfo,
            usedTools: usedToolsInfo,
          })
        );

        // 確保流式響應完成後清理狀態
        dispatch(setIsWaiting(false));
      } else {
        // 沒有文件，使用帶工具的聊天
        // 提前創建助手消息
        const initialAssistantMessage = {
          id: assistantMessageId,
          role: "assistant" as const,
          content: "正在思考...",
          timestamp: new Date().toISOString(),
          isStreaming: true,
        };

        dispatch(
          addMessage({
            chatId: currentChatId,
            message: initialAssistantMessage,
          })
        );

        // 獲取聊天歷史
        const currentChat = chats.find((chat) => chat.id === currentChatId);
        const chatHistory =
          currentChat?.messages.slice(0, -2).map((msg) => ({
            role: msg.role,
            content: msg.content,
          })) || [];

        // 添加系統提示
        chatHistory.push({
          role: "system",
          content: `請用繁體中文回答用戶的問題。回答時可以使用 Markdown 格式來增強可讀性。`,
        });

        // 添加用戶問題
        chatHistory.push({
          role: "user",
          content: currentMessage,
        });

        // 根據是否啟用 MCP 工具選擇不同的 API
        const apiEndpoint = enableMCPTools
          ? "/api/ollama/chat-with-tools"
          : "/api/ollama/chat";
        const requestBody = enableMCPTools
          ? {
              model: selectedModel,
              messages: chatHistory,
              enableTools: enableMCPTools,
              availableTools: availableTools, // 傳遞可用工具
            }
          : {
              model: selectedModel,
              messages: chatHistory,
              stream: true,
            };

        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(
            `API請求失敗: ${response.status} ${response.statusText}`
          );
        }

        // 處理流式響應
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("無法讀取響應流");
        }

        let accumulatedContent = "";
        let isStreamComplete = false;
        let toolCallsInfo: any = null;
        let usedToolsInfo: any = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            // 跳過空行和 data: 前綴
            if (!line.startsWith("data: ") || line === "data: [DONE]") {
              if (line === "data: [DONE]") {
                isStreamComplete = true;
                break;
              }
              continue;
            }

            try {
              const jsonStr = line.slice(6); // 移除 "data: " 前綴
              const data = JSON.parse(jsonStr);

              if (data.type === "tool_calls") {
                // 處理工具調用信息
                toolCallsInfo = data.tool_calls;
                usedToolsInfo = data.used_tools;

                console.log("收到工具調用信息:", toolCallsInfo);

                // 更新消息顯示工具調用狀態
                dispatch(
                  updateMessage({
                    chatId: currentChatId,
                    messageId: assistantMessageId,
                    content: "正在執行工具調用...",
                    isStreaming: true,
                    toolCalls: toolCallsInfo,
                    usedTools: usedToolsInfo,
                  })
                );
              } else if (data.type === "content") {
                // 處理內容更新
                accumulatedContent += data.content;

                dispatch(
                  updateMessage({
                    chatId: currentChatId,
                    messageId: assistantMessageId,
                    content: accumulatedContent,
                    isStreaming: true,
                    toolCalls: toolCallsInfo,
                    usedTools: usedToolsInfo,
                  })
                );
              }
            } catch (parseError) {
              console.warn("解析響應行失敗:", line, parseError);
            }
          }

          if (isStreamComplete) break;
        }

        // 確保最終狀態更新
        dispatch(
          updateMessage({
            chatId: currentChatId,
            messageId: assistantMessageId,
            content: accumulatedContent || "處理完成",
            isStreaming: false,
            toolCalls: toolCallsInfo,
            usedTools: usedToolsInfo,
          })
        );

        // 確保流式響應完成後清理狀態
        dispatch(setIsWaiting(false));
      }
    } catch (error) {
      console.error("處理請求時發生錯誤:", error);
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content: "對不起，在處理您的請求時出現了錯誤。請稍後再試。",
        timestamp: new Date().toISOString(),
        isStreaming: false,
      };

      dispatch(
        addMessage({ chatId: currentChatId, message: assistantMessage })
      );
    } finally {
      dispatch(setIsWaiting(false));
      dispatch(clearUploadedFiles());
    }
  };

  // 處理文件上傳
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles: File[] = [];
      const rejectedFiles: string[] = [];

      // 檢查每個文件
      files.forEach((file) => {
        const isImageFile = file.type.startsWith("image/");
        const isTypeValid =
          ALLOWED_FILE_TYPES.includes(file.type) ||
          isFileExtensionSupported(file.name);
        const isSizeValid = file.size <= MAX_FILE_SIZE;

        if (isImageFile && !supportsImages) {
          rejectedFiles.push(`${file.name} (當前模型不支援圖片)`);
        } else if (!isTypeValid) {
          rejectedFiles.push(`${file.name} (不支援的格式)`);
        } else if (!isSizeValid) {
          rejectedFiles.push(`${file.name} (超過20MB大小限制)`);
        } else {
          validFiles.push(file);
        }
      });

      // 處理有效文件
      if (validFiles.length > 0) {
        try {
          // 將 File 物件轉換為 FileData
          const fileDataPromises = validFiles.map(convertFileToFileData);
          const fileData = await Promise.all(fileDataPromises);

          dispatch(addUploadedFiles(fileData));
          toast.success(`成功上傳 ${validFiles.length} 個文件`);
        } catch (error) {
          console.error("轉換檔案時發生錯誤:", error);
          toast.error("處理檔案時發生錯誤");
        }
      }

      // 顯示被拒絕的文件
      if (rejectedFiles.length > 0) {
        toast.error(
          `無法上傳 ${rejectedFiles.length} 個文件: ${rejectedFiles.join(", ")}`
        );
      }
    }
  };

  // 觸發文件輸入點擊
  const handleFileInputClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="p-4 border-t">
      {/* 顯示已上傳的檔案 */}
      <FileUploadArea />

      {/* MCP 工具開關 */}
      <div className="flex items-center gap-2 mb-2">
        <Switch
          id="mcp-tools"
          checked={enableMCPTools}
          onCheckedChange={setEnableMCPTools}
        />
        <Label htmlFor="mcp-tools" className="flex items-center gap-2 text-sm">
          <Wrench className="h-4 w-4" />
          啟用 MCP 工具
        </Label>
        {enableMCPTools && (
          <span className="text-xs text-muted-foreground">
            (可自動檢測並使用相關工具)
          </span>
        )}
      </div>

      <div className="flex items-end gap-2">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full h-10 w-10"
          onClick={handleFileInputClick}
        >
          <Upload className="h-5 w-5" />
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
            multiple
            accept={[
              ".csv",
              ".pdf",
              ".doc",
              ".docx",
              ".pptx",
              ".json",
              ".txt",
              ".xml",
              ...(supportsImages
                ? [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"]
                : []),
            ].join(",")}
          />
        </Button>

        <Textarea
          placeholder="輸入訊息..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          className="flex-1 min-h-[60px] max-h-[200px]"
        />

        <Button
          className="rounded-full h-10 w-10 flex-shrink-0"
          onClick={handleSendMessage}
          disabled={!inputMessage.trim() || isWaiting}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default InputArea;
