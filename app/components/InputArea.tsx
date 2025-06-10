"use client";

import { useRef, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/app/redux/hooks";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  Upload,
  Paperclip,
  X,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import {
  addMessage,
  updateMessage,
  setIsWaiting,
  addUploadedFiles,
  clearUploadedFiles,
} from "@/app/redux/chatSlice";
import { toast } from "sonner";

const InputArea = () => {
  const dispatch = useAppDispatch();
  const currentChatId = useAppSelector((state) => state.chat.currentChatId);
  const isWaiting = useAppSelector((state) => state.chat.isWaiting);
  const uploadedFiles = useAppSelector((state) => state.chat.uploadedFiles);
  const selectedModel = useAppSelector((state) => state.model.selectedModel);
  const chats = useAppSelector((state) => state.chat.chats);

  const [inputMessage, setInputMessage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  ];

  // 定義檔案大小限制（20MB）
  const MAX_FILE_SIZE = 20 * 1024 * 1024;

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

    // 獲取上傳文件的信息
    const filesInfo =
      uploadedFiles.length > 0
        ? uploadedFiles.map((file) => ({
            name: file.name,
            type: file.type,
            size: file.size,
          }))
        : undefined;

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
      // 如果有上傳文件，先創建 RAG 索引並查詢相關內容
      let contextText = "";

      if (uploadedFiles.length > 0) {
        // 顯示文件處理通知
        toast.info("正在處理文件並建立知識庫...");

        // 創建索引名稱 - 使用時間戳確保唯一性
        const indexName = `index_${Date.now()}`;
        const formData = new FormData();

        // 將所有上傳的文件添加到 formData
        uploadedFiles.forEach((file) => {
          formData.append("file", file);
        });

        // 創建索引
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

          // 從查詢結果創建上下文
          if (queryData.results && queryData.results.length > 0) {
            // 清理每個結果中的內容
            contextText = queryData.results
              .map((result: any) => cleanRagContent(result.content))
              .join("\n\n");
          }

          // 不需要手動刪除索引，索引將保留供後續使用
        } catch (error) {
          toast.error(`處理文件時出錯: ${(error as Error).message}`);
          console.error("RAG 處理錯誤:", error);
        }
      }

      // 在發送消息之前先創建助手消息 ID，以便後續使用
      const assistantMessageId = (Date.now() + 1).toString();

      // 提前創建助手消息，避免發生解析問題時無法顯示
      const initialAssistantMessage = {
        id: assistantMessageId,
        role: "assistant" as const,
        content: "正在思考...",
        timestamp: new Date().toISOString(),
        isStreaming: true,
      };

      // 立即添加助手消息，這樣用戶可以看到有回應
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

      // 檢查響應類型
      const contentType = response.headers.get("Content-Type");
      console.log("響應內容類型:", contentType);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("無法讀取響應流");

      let accumulatedContent = "";

      // 處理流式回應
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // 使用 UTF-8 解碼
          const chunk = new TextDecoder("utf-8").decode(value);
          console.log("接收到原始流數據塊:", chunk);
          const lines = chunk.split("\n");

          for (const line of lines) {
            console.log("客戶端收到原始數據:", line);
            if (line.trim() === "") continue;

            try {
              const cleanedLine = line.trim();
              if (cleanedLine === "") continue;

              console.log("嘗試解析 JSON:", cleanedLine);
              const data = JSON.parse(cleanedLine);
              console.log("成功解析 JSON:", data);

              // 檢查數據結構並提取內容
              let content = "";
              if (data.message?.content) {
                content = data.message.content;
              } else if (data.content) {
                content = data.content;
              } else if (typeof data === "string") {
                content = data;
              }

              if (content) {
                console.log("提取到的內容:", content);

                // 更新累積的內容，過濾掉可能的亂碼
                // 使用 try-catch 避免在處理時遇到問題
                try {
                  // 過濾不可打印字符
                  const filteredContent = content.replace(
                    /[\x00-\x09\x0B-\x1F\x7F-\x9F]/g,
                    ""
                  );
                  accumulatedContent += filteredContent;

                  // 將轉義的換行符和製表符轉換為真正的換行符和製表符
                  const formattedContent = accumulatedContent
                    .replace(/\\n/g, "\n")
                    .replace(/\\t/g, "\t")
                    .replace(/\\"/g, '"')
                    .replace(/\\'/g, "'");

                  const displayContent = formattedContent;

                  console.log("更新消息內容:", displayContent);
                  dispatch(
                    updateMessage({
                      chatId: currentChatId,
                      messageId: assistantMessageId,
                      content: displayContent,
                      isStreaming: true,
                    })
                  );
                } catch (filterError) {
                  console.error("處理內容時出錯:", filterError);
                }
              }
            } catch (e) {
              console.error("解析流數據錯誤:", e, "原始數據:", line);

              // 嘗試從錯誤的 JSON 中提取內容
              try {
                const textMatch = line.match(/"content":"([^"]+)"/);
                if (textMatch && textMatch[1]) {
                  // 過濾不可打印字符
                  const filteredContent = textMatch[1].replace(
                    /[\x00-\x09\x0B-\x1F\x7F-\x9F]/g,
                    ""
                  );
                  accumulatedContent += filteredContent;

                  // 最小處理，保持與主流處理邏輯一致
                  const formattedContent = accumulatedContent
                    .replace(/\\n/g, "\n")
                    .replace(/\\t/g, "\t")
                    .replace(/\\"/g, '"')
                    .replace(/\\'/g, "'");

                  const displayContent = formattedContent;

                  dispatch(
                    updateMessage({
                      chatId: currentChatId,
                      messageId: assistantMessageId,
                      content: displayContent,
                      isStreaming: true,
                    })
                  );
                }
              } catch (extractError) {
                console.error("嘗試提取內容時出錯:", extractError);
              }
            }
          }
        }

        // 流式傳輸完成後，關閉流式狀態
        try {
          // 過濾最終內容的不可打印字符
          const filteredFinalContent = accumulatedContent.replace(
            /[\x00-\x09\x0B-\x1F\x7F-\x9F]/g,
            ""
          );

          const finalFormattedContent = filteredFinalContent
            ? filteredFinalContent
                .replace(/\\n/g, "\n")
                .replace(/\\t/g, "\t")
                .replace(/\\"/g, '"')
                .replace(/\\'/g, "'")
            : "無法獲取有效回應";

          const finalDisplayContent = finalFormattedContent;

          dispatch(
            updateMessage({
              chatId: currentChatId,
              messageId: assistantMessageId,
              content: finalDisplayContent,
              isStreaming: false,
            })
          );
        } catch (finalError) {
          console.error("處理最終內容時出錯:", finalError);
          dispatch(
            updateMessage({
              chatId: currentChatId,
              messageId: assistantMessageId,
              content: "處理回應時發生錯誤，請稍後再試。",
              isStreaming: false,
            })
          );
        }
      } catch (streamError) {
        console.error("處理流數據時發生錯誤:", streamError);

        // 如果處理流時出錯，更新消息顯示錯誤
        dispatch(
          updateMessage({
            chatId: currentChatId,
            messageId: assistantMessageId,
            content: "處理回應時發生錯誤，請稍後再試。",
            isStreaming: false,
          })
        );
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
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles: File[] = [];
      const rejectedFiles: string[] = [];

      // 檢查每個文件
      files.forEach((file) => {
        const isTypeValid =
          ALLOWED_FILE_TYPES.includes(file.type) ||
          isFileExtensionSupported(file.name);
        const isSizeValid = file.size <= MAX_FILE_SIZE;

        if (!isTypeValid) {
          rejectedFiles.push(`${file.name} (不支援的格式)`);
        } else if (!isSizeValid) {
          rejectedFiles.push(`${file.name} (超過20MB大小限制)`);
        } else {
          validFiles.push(file);
        }
      });

      // 處理有效文件
      if (validFiles.length > 0) {
        dispatch(addUploadedFiles(validFiles));
        toast.success(`成功上傳 ${validFiles.length} 個文件`);
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
            accept=".csv,.pdf,.doc,.docx,.pptx,.json,.txt,.xml"
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
