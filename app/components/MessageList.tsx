"use client";

import { useRef, useEffect, useState } from "react";
import { useAppSelector } from "@/app/redux/hooks";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User, FileText } from "lucide-react";
import TypingIndicator from "@/app/components/TypingIndicator";
import { formatTime } from "@/utils/date";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import ImagePreviewDialog from "./ImagePreviewDialog";
import ToolCallDisplay from "./ToolCallDisplay";

type MessageListProps = {
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
};

const MessageList = ({ messagesEndRef }: MessageListProps) => {
  const chats = useAppSelector((state) => state.chat.chats);
  const currentChatId = useAppSelector((state) => state.chat.currentChatId);
  const isWaiting = useAppSelector((state) => state.chat.isWaiting);
  const activeTab = useAppSelector((state) => state.ui.activeTab);

  // 圖片預覽狀態
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    alt: string;
    fileName: string;
  } | null>(null);

  // 檢查是否為圖片檔案
  const isImageFile = (fileType: string) => {
    return fileType.startsWith("image/");
  };

  // 處理圖片點擊
  const handleImageClick = (imageSrc: string, fileName: string) => {
    setPreviewImage({
      src: imageSrc,
      alt: fileName,
      fileName: fileName,
    });
  };

  // 關閉預覽
  const handleClosePreview = () => {
    setPreviewImage(null);
  };

  // 獲取當前聊天
  const currentChat = chats.find((chat) => chat.id === currentChatId);
  const messages = currentChat?.messages || [];

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3 max-w-4xl",
              message.role === "user" ? "ml-auto flex-row-reverse" : ""
            )}
          >
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback>
                {message.role === "user" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </AvatarFallback>
            </Avatar>

            <div
              className={cn(
                "flex flex-col space-y-2 max-w-xs lg:max-w-md xl:max-w-lg",
                message.role === "user" ? "items-end" : "items-start"
              )}
            >
              <div
                className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <ReactMarkdown
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      return match ? (
                        <SyntaxHighlighter
                          style={materialDark as any}
                          language={match[1]}
                          PreTag="div"
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>

                {/* 顯示上傳的文件 */}
                {message.files && message.files.length > 0 && (
                  <div
                    className={cn(
                      "mt-2 pt-2 border-t",
                      message.role === "user"
                        ? "border-primary-foreground/30"
                        : "border-muted-foreground/30"
                    )}
                  >
                    <div className="text-xs mb-2">附件：</div>
                    <div className="flex flex-wrap gap-2">
                      {message.files.map((file, index) => (
                        <div key={index} className="relative">
                          {isImageFile(file.type) ? (
                            // 圖片預覽（在聊天記錄中顯示較小的版本）
                            <div className="relative">
                              <img
                                src={file.content}
                                alt={file.name}
                                className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() =>
                                  handleImageClick(file.content, file.name)
                                }
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 rounded-b truncate">
                                {file.name}
                              </div>
                            </div>
                          ) : (
                            // 文件圖標
                            <div className="flex items-center gap-1 text-xs bg-background/50 rounded px-2 py-1">
                              <FileText className="h-3 w-3" />
                              <span className="truncate max-w-[100px]">
                                {file.name}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 顯示工具調用 */}
              {message.toolCalls && message.toolCalls.length > 0 && (
                <ToolCallDisplay toolCalls={message.toolCalls} />
              )}

              {/* 顯示使用的工具摘要 */}
              {message.usedTools && message.usedTools.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {message.usedTools.map((toolName, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      <Bot className="h-3 w-3" />
                      {toolName}
                    </div>
                  ))}
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        ))}

        {isWaiting && (
          <div className="flex gap-3 max-w-4xl">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback>
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-2">
              <div className="rounded-lg px-3 py-2 bg-muted">
                <TypingIndicator />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 圖片預覽 Dialog */}
      <ImagePreviewDialog
        isOpen={previewImage !== null}
        onClose={handleClosePreview}
        imageSrc={previewImage?.src || ""}
        imageAlt={previewImage?.alt || ""}
        fileName={previewImage?.fileName || ""}
      />
    </>
  );
};

export default MessageList;
