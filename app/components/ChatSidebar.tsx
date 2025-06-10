"use client";

import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  MessageSquare,
  Trash,
  Download,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/app/redux/hooks";
import { setCurrentChat, deleteChat } from "@/app/redux/chatSlice";
import {
  fetchModels,
  setSelectedModel,
  updateModelDownloadProgress,
  markModelAsDownloaded,
} from "@/app/redux/modelSlice";
import {
  setIsNewChatDialogOpen,
  setIsSidebarOpen,
  setActiveTab,
} from "@/app/redux/uiSlice";

const ChatSidebar = () => {
  const dispatch = useAppDispatch();
  const chats = useAppSelector((state) => state.chat.chats);
  const currentChatId = useAppSelector((state) => state.chat.currentChatId);
  const models = useAppSelector((state) => state.model.models);
  const selectedModel = useAppSelector((state) => state.model.selectedModel);
  const modelLoading = useAppSelector((state) => state.model.loading);
  const modelError = useAppSelector((state) => state.model.error);
  const isSidebarOpen = useAppSelector((state) => state.ui.isSidebarOpen);
  const isMobile = useAppSelector((state) => state.ui.isMobile);
  const activeTab = useAppSelector((state) => state.ui.activeTab);

  const sidebarRef = useRef<HTMLDivElement>(null);

  // 在組件掛載時獲取模型列表
  useEffect(() => {
    dispatch(fetchModels());
  }, [dispatch]);

  // 點擊外部區域關閉側邊欄（僅在移動設備上）
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMobile &&
        isSidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        dispatch(setIsSidebarOpen(false));
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMobile, isSidebarOpen, dispatch]);

  // 選擇聊天，自動關閉側邊欄（僅在移動設備上）
  const handleChatSelect = (chatId: string) => {
    dispatch(setCurrentChat(chatId));
    if (isMobile) {
      dispatch(setIsSidebarOpen(false));
    }
  };

  // 選擇模型，自動關閉側邊欄（僅在移動設備上）
  const handleModelSelect = (modelId: string) => {
    // 先更新選擇的模型
    dispatch(setSelectedModel(modelId));

    // 確保不改變當前標籤（保持在模型標籤頁）

    // 如果是移動設備，則關閉側邊欄
    if (isMobile) {
      dispatch(setIsSidebarOpen(false));
    }
  };

  // 下載模型
  const handleDownloadModel = (modelId: string) => {
    // 查找模型
    const model = models.find((m) => m.id === modelId);
    if (!model || model.isDownloaded) return;

    // 更新模型以顯示下載進度
    dispatch(updateModelDownloadProgress({ modelId, progress: 0 }));

    // 模擬下載進度
    let progress = 0;
    const downloadInterval = setInterval(() => {
      progress += 5;
      if (progress <= 100) {
        dispatch(updateModelDownloadProgress({ modelId, progress }));
      } else {
        clearInterval(downloadInterval);
        // 標記為已下載
        dispatch(markModelAsDownloaded(modelId));
      }
    }, 300);
  };

  // 重新加載模型列表
  const handleReloadModels = () => {
    dispatch(fetchModels());
  };

  return (
    <div
      ref={sidebarRef}
      className={cn(
        "w-64 border-r flex flex-col bg-white transition-all duration-300 ease-in-out",
        isMobile
          ? isSidebarOpen
            ? "fixed inset-y-0 left-0 z-40"
            : "fixed inset-y-0 -left-64 z-40"
          : ""
      )}
    >
      {/* 移動設備關閉按鈕 */}
      {isMobile && isSidebarOpen && (
        <div className="flex justify-end p-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => dispatch(setIsSidebarOpen(false))}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="p-4 border-b">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => dispatch(setIsNewChatDialogOpen(true))}
        >
          <Plus className="mr-2 h-4 w-4" /> 新聊天
        </Button>
      </div>

      <Tabs
        className="flex-1 flex flex-col"
        value={activeTab}
        onValueChange={(value) => dispatch(setActiveTab(value))}
      >
        <TabsList className="grid grid-cols-2 mx-4 mt-2">
          <TabsTrigger value="chats">聊天</TabsTrigger>
          <TabsTrigger value="models">模型</TabsTrigger>
        </TabsList>

        <TabsContent
          value="chats"
          className={`flex-1 overflow-hidden flex flex-col ${
            activeTab === "chats" ? "" : "hidden"
          }`}
        >
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted group",
                    chat.id === currentChatId && "bg-muted"
                  )}
                  onClick={() => handleChatSelect(chat.id)}
                >
                  <div className="flex items-center">
                    <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm truncate max-w-[120px]">
                      {chat.name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch(deleteChat(chat.id));
                    }}
                  >
                    <Trash className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent
          value="models"
          className={`flex-1 overflow-hidden ${
            activeTab === "models" ? "" : "hidden"
          }`}
        >
          <ScrollArea className="h-[calc(70vh)] overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* 加載中狀態 */}
              {modelLoading && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                  <p className="text-muted-foreground">正在載入模型...</p>
                </div>
              )}

              {/* 錯誤狀態 */}
              {modelError && (
                <div className="flex flex-col items-center justify-center py-6 px-4 border rounded-md bg-red-50">
                  <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                  <p className="text-red-500 mb-3 text-center">{modelError}</p>
                  <Button
                    onClick={handleReloadModels}
                    variant="outline"
                    size="sm"
                  >
                    重新載入
                  </Button>
                </div>
              )}

              {/* 模型列表 */}
              {!modelLoading && !modelError && models.length === 0 && (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <p className="text-muted-foreground mb-2">尚無可用模型</p>
                  <Button
                    onClick={handleReloadModels}
                    variant="outline"
                    size="sm"
                  >
                    刷新
                  </Button>
                </div>
              )}

              {!modelLoading &&
                !modelError &&
                models.map((model) => (
                  <Card key={model.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{model.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {model.description}
                          </p>
                        </div>
                        {model.isDownloaded ? (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            已下載
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200"
                          >
                            {model.downloadSize}
                          </Badge>
                        )}
                      </div>

                      {model.downloadProgress !== undefined && (
                        <div className="mt-2">
                          <Progress
                            value={model.downloadProgress}
                            className="h-2"
                          />
                          <p className="text-xs text-right mt-1 text-muted-foreground">
                            {model.downloadProgress}%
                          </p>
                        </div>
                      )}

                      <div className="flex justify-between items-center mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={selectedModel === model.id}
                          onClick={() => handleModelSelect(model.id)}
                          className={
                            selectedModel === model.id
                              ? "bg-primary text-primary-foreground"
                              : ""
                          }
                        >
                          {selectedModel === model.id ? "使用中" : "使用"}
                        </Button>

                        {!model.isDownloaded &&
                          model.downloadProgress === undefined && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadModel(model.id)}
                            >
                              <Download className="h-3 w-3 mr-1" /> 下載
                            </Button>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ChatSidebar;
