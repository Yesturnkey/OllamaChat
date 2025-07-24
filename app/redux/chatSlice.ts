import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchModels } from "@/app/redux/modelSlice";
import axios from "axios";

// 新增可序列化的檔案資料介面
export interface FileData {
  name: string;
  type: string;
  size: number;
  content: string; // base64 編碼的檔案內容
  lastModified: number;
}

// MCP 工具調用信息
export interface ToolCall {
  id: string;
  name: string;
  arguments: any;
  result?: any;
  error?: string;
  status: "pending" | "executing" | "completed" | "failed";
  duration?: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  files?: FileData[]; // 改為使用 FileData 以包含 content 屬性
  isFileList?: boolean;
  // MCP 工具相關
  toolCalls?: ToolCall[];
  usedTools?: string[]; // 使用的工具名稱列表
}
export interface Chat {
  id: string;
  name: string;
  lastActive: string;
  messages: Message[];
}

const initialChats: Chat[] = [
  {
    id: "chat1",
    name: "新聊天",
    lastActive: new Date().toISOString(),
    messages: [
      {
        id: "1",
        role: "assistant",
        content: "您好！我是 AI 助手，有什麼我可以幫您的嗎？",
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      },
    ],
  },
];

// 序列化日期的輔助函數
const serializeDate = (date: Date | string | null | undefined): string => {
  if (!date) return "";
  if (date instanceof Date) return date.toISOString();
  return String(date);
};

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    chats: initialChats,
    currentChatId: initialChats[0].id,
    isWaiting: false,
    uploadedFiles: [] as FileData[], // 改為使用 FileData 而不是 File
  },
  reducers: {
    setCurrentChat: (state, action: PayloadAction<string>) => {
      state.currentChatId = action.payload;
    },
    addChat: (state, action: PayloadAction<Chat>) => {
      state.chats.push(action.payload);
      state.currentChatId = action.payload.id;
    },
    deleteChat: (state, action: PayloadAction<string>) => {
      state.chats = state.chats.filter((chat) => chat.id !== action.payload);
      if (state.currentChatId === action.payload && state.chats.length > 0) {
        state.currentChatId = state.chats[0].id;
      }
    },
    addMessage: (
      state,
      action: PayloadAction<{ chatId: string; message: Message }>
    ) => {
      const { chatId, message } = action.payload;
      const chat = state.chats.find((c) => c.id === chatId);
      if (chat) {
        const newMessage = {
          ...message,
          timestamp: serializeDate(message.timestamp || new Date()),
        };
        chat.messages.push(newMessage);
        chat.lastActive = serializeDate(new Date());
      }
    },
    updateMessage: (
      state,
      action: PayloadAction<{
        chatId: string;
        messageId: string;
        content: string;
        isStreaming?: boolean;
        toolCalls?: ToolCall[];
        usedTools?: string[];
      }>
    ) => {
      const chat = state.chats.find((c) => c.id === action.payload.chatId);
      if (chat) {
        const message = chat.messages.find(
          (m) => m.id === action.payload.messageId
        );
        if (message) {
          // 過濾掉工具調用標籤作為額外保護
          const cleanContent = action.payload.content.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "").trim();
          message.content = cleanContent;
          message.isStreaming = action.payload.isStreaming;
          if (action.payload.toolCalls !== undefined) {
            message.toolCalls = action.payload.toolCalls;
          }
          if (action.payload.usedTools !== undefined) {
            message.usedTools = action.payload.usedTools;
          }
        }
      }
    },
    setIsWaiting: (state, action: PayloadAction<boolean>) => {
      state.isWaiting = action.payload;
    },
    addUploadedFiles: (state, action: PayloadAction<FileData[]>) => {
      state.uploadedFiles.push(...action.payload);
    },
    removeUploadedFile: (state, action: PayloadAction<string>) => {
      state.uploadedFiles = state.uploadedFiles.filter(
        (file) => file.name !== action.payload
      );
    },
    clearUploadedFiles: (state) => {
      state.uploadedFiles = [];
    },
    createChat: (state, action) => {
      const newChat = {
        ...action.payload,
        lastActive: serializeDate(action.payload.lastActive || new Date()),
        messages: action.payload.messages || [],
      };

      // 確保所有消息的時間戳也是字符串
      if (newChat.messages.length > 0) {
        newChat.messages = newChat.messages.map((msg: Message) => ({
          ...msg,
          timestamp: serializeDate(msg.timestamp || new Date()),
        }));
      }

      state.chats.push(newChat);
    },
    updateChat: (state, action) => {
      const { id, lastActive, ...updates } = action.payload;
      const chat = state.chats.find((chat) => chat.id === id);
      if (chat) {
        Object.assign(chat, updates);
        if (lastActive) {
          chat.lastActive =
            typeof lastActive === "object" && lastActive instanceof Date
              ? lastActive.toISOString()
              : lastActive;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchModels.pending, (state) => {
      // 遍歷所有聊天及其消息，確保時間戳都是字符串
      state.chats.forEach((chat) => {
        // 處理聊天的 lastActive
        if (chat.lastActive && typeof chat.lastActive === "object") {
          (chat.lastActive as any) = serializeDate(chat.lastActive);
        }

        // 處理聊天消息的時間戳
        if (chat.messages) {
          chat.messages.forEach((message) => {
            if (message.timestamp && typeof message.timestamp === "object") {
              (message.timestamp as any) = serializeDate(message.timestamp);
            }
          });
        }
      });
    });
  },
});

export const {
  setCurrentChat,
  addChat,
  deleteChat,
  addMessage,
  updateMessage,
  setIsWaiting,
  addUploadedFiles,
  removeUploadedFile,
  clearUploadedFiles,
} = chatSlice.actions;

// 創建用於發送消息到 Ollama 的異步 thunk（支援工具）
export const sendMessageToOllamaWithTools = createAsyncThunk(
  "chat/sendMessageToOllamaWithTools",
  async (
    {
      chatId,
      message,
      model,
      enableTools = true,
    }: {
      chatId: string;
      message: Message;
      model: string;
      enableTools?: boolean;
    },
    { dispatch, getState }
  ) => {
    try {
      // 獲取當前聊天的所有消息
      const state = getState() as any;
      const currentChat = state.chat.chats.find(
        (chat: Chat) => chat.id === chatId
      );
      const messages = currentChat?.messages || [];

      // 構建消息歷史
      const messageHistory = messages.map((msg: Message) => ({
        role: msg.role,
        content: msg.content,
      }));

      // 發送請求到帶工具的 Ollama API
      const response = await fetch("/api/ollama/chat-with-tools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: messageHistory,
          enableTools,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const { message: aiMessage, error } = result;

      if (error) {
        throw new Error(error);
      }

      // 更新助手消息，包含工具調用信息
      dispatch(
        updateMessage({
          chatId,
          messageId: message.id,
          content: aiMessage.content,
          isStreaming: false,
        })
      );

      // 如果有工具調用，更新消息的工具調用信息
      if (aiMessage.toolCalls || aiMessage.usedTools) {
        const chat = state.chat.chats.find((chat: Chat) => chat.id === chatId);
        if (chat) {
          const msgToUpdate = chat.messages.find(
            (m: Message) => m.id === message.id
          );
          if (msgToUpdate) {
            msgToUpdate.toolCalls = aiMessage.toolCalls;
            msgToUpdate.usedTools = aiMessage.usedTools;
          }
        }
      }

      return aiMessage.content;
    } catch (error) {
      console.error("發送消息錯誤:", error);
      dispatch(
        updateMessage({
          chatId,
          messageId: message.id,
          content: "抱歉，發生錯誤，請稍後再試。",
          isStreaming: false,
        })
      );
      throw error;
    }
  }
);

// 創建用於發送消息到 Ollama 的異步 thunk
export const sendMessageToOllama = createAsyncThunk(
  "chat/sendMessageToOllama",
  async (
    {
      chatId,
      message,
      model,
    }: { chatId: string; message: Message; model: string },
    { dispatch, getState }
  ) => {
    try {
      // 獲取當前聊天的所有消息
      const state = getState() as any;
      const currentChat = state.chat.chats.find(
        (chat: Chat) => chat.id === chatId
      );
      const messages = currentChat?.messages || [];

      // 構建消息歷史
      const messageHistory = messages.map((msg: Message) => ({
        role: msg.role,
        content: msg.content,
      }));

      // 發送請求到 Ollama API
      const response = await axios.post("/api/ollama/chat", {
        model,
        messages: messageHistory,
        stream: true,
      });

      // 處理流式響應
      const reader = response.data.getReader();
      let accumulatedContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.trim() === "") continue;
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              accumulatedContent += data.message.content;
              dispatch(
                updateMessage({
                  chatId,
                  messageId: message.id,
                  content: accumulatedContent,
                  isStreaming: true,
                })
              );
            }
          } catch (e) {
            console.error("解析響應數據失敗:", e);
          }
        }
      }

      // 更新最終消息狀態
      dispatch(
        updateMessage({
          chatId,
          messageId: message.id,
          content: accumulatedContent,
          isStreaming: false,
        })
      );

      return accumulatedContent;
    } catch (error) {
      console.error("發送消息錯誤:", error);
      dispatch(
        updateMessage({
          chatId,
          messageId: message.id,
          content: "抱歉，發生錯誤，請稍後再試。",
          isStreaming: false,
        })
      );
      throw error;
    }
  }
);

export default chatSlice.reducer;
