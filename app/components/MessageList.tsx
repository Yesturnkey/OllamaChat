"use client";

import { useRef, useEffect } from "react";
import { useAppSelector } from "@/app/redux/hooks";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User, FileText } from "lucide-react";
import TypingIndicator from "@/app/components/TypingIndicator";
import { formatTime } from "@/utils/date";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark } from "react-syntax-highlighter/dist/cjs/styles/prism";

type MessageListProps = {
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
};

const MessageList = ({ messagesEndRef }: MessageListProps) => {
  const chats = useAppSelector((state) => state.chat.chats);
  const currentChatId = useAppSelector((state) => state.chat.currentChatId);
  const isWaiting = useAppSelector((state) => state.chat.isWaiting);
  const activeTab = useAppSelector((state) => state.ui.activeTab);

  // 獲取當前聊天
  const currentChat =
    chats.find((chat) => chat.id === currentChatId) || chats[0];

  return (
    <div className="space-y-2 min-h-[50vh]">
      {currentChat.messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex",
            message.role === "user" ? "justify-end" : "justify-start"
          )}
        >
          <div className="flex items-start max-w-[80%]">
            {message.role === "assistant" && (
              <Avatar className="mr-2">
                <AvatarFallback>
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            )}

            <div>
              <div
                className={cn(
                  "rounded-lg p-3",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {message.role === "assistant" ? (
                  <div className=" prose dark:prose-invert prose-base ">
                    <ReactMarkdown
                      components={{
                        code: ({ className, children }) => {
                          const match = /language-(\w+)/.exec(className || "");
                          return match ? (
                            <SyntaxHighlighter
                              // @ts-ignore - 處理類型問題
                              style={materialDark}
                              language={match[1]}
                            >
                              {String(children).replace(/\n$/, "")}
                            </SyntaxHighlighter>
                          ) : (
                            <code className={className}>{children}</code>
                          );
                        },
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                )}
                {message.isStreaming && <TypingIndicator />}

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
                    <div className="text-xs mb-1">上傳的文件：</div>
                    <div className="flex flex-col gap-1">
                      {message.files.map((file, index) => (
                        <div key={index} className="flex items-center text-sm">
                          <FileText className="h-4 w-4 mr-1 flex-shrink-0" />
                          <span className="truncate">{file.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatTime(message.timestamp.toString())}
              </div>
            </div>

            {message.role === "user" && (
              <Avatar className="ml-2">
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      ))}

      {/* 僅在沒有正在流式傳輸的消息時才顯示等待指示器 */}
      {isWaiting && !currentChat.messages.some((m) => m.isStreaming) && (
        <div className="flex justify-start">
          <div className="flex items-start max-w-[80%]">
            <Avatar className="mr-2">
              <AvatarFallback>
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-lg p-3">
              <TypingIndicator />
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
