"use client";

import { useRef, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/app/redux/hooks";
import { cn } from "@/lib/utils";
import { setIsSidebarOpen } from "@/app/redux/uiSlice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, X } from "lucide-react";
import MessageList from "@/app/components/MessageList";
import InputArea from "@/app/components/InputArea";
import FileUploadArea from "@/app/components/FileUploadArea";
import NewChatDialog from "@/app/components/NewChatDialog";

const ChatMain = () => {
  const dispatch = useAppDispatch();
  const chats = useAppSelector((state) => state.chat.chats);
  const currentChatId = useAppSelector((state) => state.chat.currentChatId);
  const models = useAppSelector((state) => state.model.models);
  const selectedModel = useAppSelector((state) => state.model.selectedModel);
  const isMobile = useAppSelector((state) => state.ui.isMobile);
  const isSidebarOpen = useAppSelector((state) => state.ui.isSidebarOpen);
  const uploadedFiles = useAppSelector((state) => state.chat.uploadedFiles);
  const isNewChatDialogOpen = useAppSelector(
    (state) => state.ui.isNewChatDialogOpen
  );
  const activeTab = useAppSelector((state) => state.ui.activeTab);

  // 獲取當前聊天
  const currentChat =
    chats.find((chat) => chat.id === currentChatId) || chats[0];

  // 用於訊息列表的滾動區域參考
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef<number>(
    currentChat?.messages?.length || 0
  );

  // 當消息變化時滾動到底部，但只在消息數量增加時執行
  useEffect(() => {
    const currentLength = currentChat?.messages?.length || 0;

    // 只有當消息數量增加時才滾動到底部
    if (currentLength > prevMessagesLengthRef.current) {
      // 使用 setTimeout 確保在 DOM 更新後執行滾動
      setTimeout(() => {
        // 僅滾動消息容器而不是整個頁面
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
      }, 100);
    }

    prevMessagesLengthRef.current = currentLength;
  }, [currentChat.messages]);

  return (
    <>
      <div
        className={cn("flex-1 flex flex-col h-full", isMobile ? "pl-0" : "")}
      >
        {/* 移動裝置選單按鈕 */}
        {isMobile && (
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "absolute top-2 left-2 z-50",
              isSidebarOpen && "hidden"
            )}
            onClick={() => dispatch(setIsSidebarOpen(!isSidebarOpen))}
          >
            {isSidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <MessageSquare className="h-5 w-5" />
            )}
          </Button>
        )}

        {/* 聊天頭部 */}
        <div className="p-4 border-b flex justify-between items-center">
          <div className={cn("flex items-center", isMobile && "ml-10")}>
            <h2 className="text-lg font-medium">{currentChat.name}</h2>
            <Badge variant="outline" className="ml-2">
              {models.find((m) => m.id === selectedModel)?.name || "AI 模型"}
            </Badge>
          </div>
        </div>

        {/* 訊息列表 */}
        <div className="flex-1 overflow-auto p-4" ref={scrollAreaRef}>
          <MessageList messagesEndRef={messagesEndRef} />
        </div>

        {/* 已上傳文件區域 */}
        {uploadedFiles.length > 0 && <FileUploadArea />}

        {/* 輸入區域 */}
        <InputArea />
      </div>

      {/* 新聊天對話框 */}
      <NewChatDialog open={isNewChatDialogOpen} />
    </>
  );
};

export default ChatMain;
