"use client";

import { useRef, useEffect, useState, useCallback } from "react";
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
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/app/redux/hooks";
import { setCurrentChat, deleteChat } from "@/app/redux/chatSlice";
import {
  fetchModels,
  fetchModelDetails,
  fetchModelStats,
  setSelectedModel,
  updateModelDownloadProgress,
  markModelAsDownloaded,
} from "@/app/redux/modelSlice";
import {
  getModelTypeLabel,
  getInputTypesDescription,
} from "@/utils/modelAnalyzer";
import { toast } from "sonner";
import {
  setIsNewChatDialogOpen,
  setIsSidebarOpen,
  setActiveTab,
  setSidebarWidth,
} from "@/app/redux/uiSlice";
import MCPToolsTab from "./MCPToolsTab";

const ChatSidebar = () => {
  const dispatch = useAppDispatch();
  const chats = useAppSelector((state) => state.chat.chats);
  const currentChatId = useAppSelector((state) => state.chat.currentChatId);
  const models = useAppSelector((state) => state.model.models);
  const selectedModel = useAppSelector((state) => state.model.selectedModel);
  const modelLoading = useAppSelector((state) => state.model.loading);
  const modelError = useAppSelector((state) => state.model.error);
  const detailsLoading = useAppSelector((state) => state.model.detailsLoading);
  const detailsError = useAppSelector((state) => state.model.detailsError);
  const statsLoading = useAppSelector((state) => state.model.statsLoading);
  const statsError = useAppSelector((state) => state.model.statsError);
  const statsLoaded = useAppSelector((state) => state.model.statsLoaded);
  const isSidebarOpen = useAppSelector((state) => state.ui.isSidebarOpen);
  const isMobile = useAppSelector((state) => state.ui.isMobile);
  const activeTab = useAppSelector((state) => state.ui.activeTab);
  const sidebarWidth = useAppSelector((state) => state.ui.sidebarWidth);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  // 在組件掛載時獲取模型列表
  useEffect(() => {
    dispatch(fetchModels());
  }, [dispatch]);

  // 從 localStorage 載入側邊欄寬度
  useEffect(() => {
    const savedWidth = localStorage.getItem("sidebarWidth");
    if (savedWidth) {
      const width = parseInt(savedWidth, 10);
      if (width >= 200 && width <= 600) {
        dispatch(setSidebarWidth(width));
      }
    }
  }, [dispatch]);

  // 保存側邊欄寬度到 localStorage
  useEffect(() => {
    localStorage.setItem("sidebarWidth", sidebarWidth.toString());
  }, [sidebarWidth]);

  // 在模型列表載入完成後，獲取統計資料（只執行一次）
  useEffect(() => {
    if (!modelLoading && models.length > 0 && !statsLoaded && !statsLoading) {
      dispatch(fetchModelStats(false)); // 第一次載入不強制更新
    }
  }, [modelLoading, models.length, statsLoaded, statsLoading, dispatch]);

  // 當模型列表載入完成後，自動獲取每個模型的詳細資訊
  useEffect(() => {
    if (!modelLoading && models.length > 0) {
      models.forEach((model) => {
        // 只為沒有詳細資訊且未在載入中的模型獲取詳細資訊
        if (!model.capabilities && !detailsLoading[model.id]) {
          dispatch(fetchModelDetails(model.id));
        }
      });
    }
  }, [modelLoading, models, detailsLoading, dispatch]);

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

  // 獲取模型詳細資訊
  const handleGetModelDetails = (modelName: string) => {
    dispatch(fetchModelDetails(modelName));
  };

  // 拖拽開始
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isMobile) return; // 移動設備不支援拖拽
      e.preventDefault();
      setIsResizing(true);
      setStartX(e.clientX);
      setStartWidth(sidebarWidth);
    },
    [isMobile, sidebarWidth]
  );

  // 拖拽中
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startX;
      const newWidth = startWidth + deltaX;

      dispatch(setSidebarWidth(newWidth));
    },
    [isResizing, startX, startWidth, dispatch]
  );

  // 拖拽結束
  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // 監聽拖拽事件
  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "none"; // 防止選擇文字
      document.body.style.cursor = "col-resize"; // 設置游標
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={sidebarRef}
      className={cn(
        "border-r flex flex-col bg-white relative",
        isMobile
          ? isSidebarOpen
            ? "fixed inset-y-0 left-0 z-40"
            : "fixed inset-y-0 z-40"
          : "transition-all duration-300 ease-in-out"
      )}
      style={{
        width: isMobile ? "320px" : `${sidebarWidth}px`,
        left: isMobile && !isSidebarOpen ? `-${320}px` : undefined,
      }}
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
        <TabsList className="grid grid-cols-3 mx-4 mt-2">
          <TabsTrigger value="chats">聊天</TabsTrigger>
          <TabsTrigger value="models">模型</TabsTrigger>
          <TabsTrigger value="tools">工具</TabsTrigger>
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
                    <span className="text-sm truncate max-w-[160px]">
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
              {!modelLoading &&
                !modelError &&
                models.filter((model) => !model.capabilities?.isEmbedding)
                  .length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <p className="text-muted-foreground mb-2">
                      尚無可用的對話模型
                    </p>
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
                models
                  .filter((model) => !model.capabilities?.isEmbedding)
                  .map((model) => (
                    <Card key={model.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium mb-1">{model.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {model.description}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            {model.stats && (
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-200 text-xs"
                              >
                                📥 下載次數: {model.stats.pulls}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* 模型詳細資訊 */}
                        {model.capabilities && model.details && (
                          <div className="mt-3 space-y-2">
                            <div className="flex flex-wrap gap-1">
                              {model.capabilities.isChat && (
                                <Badge variant="outline" className="text-xs">
                                  💬 對話
                                </Badge>
                              )}
                              {model.capabilities.isEmbedding && (
                                <Badge variant="outline" className="text-xs">
                                  🔢 嵌入
                                </Badge>
                              )}
                              {model.capabilities.supportsImages && (
                                <Badge variant="outline" className="text-xs">
                                  🖼️ 圖片
                                </Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">
                                  參數:
                                </span>
                                <span className="ml-1">
                                  {model.details.parameter_size}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  架構:
                                </span>
                                <span className="ml-1 capitalize">
                                  {model.details.family}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  容量:
                                </span>
                                <span className="ml-1">
                                  {model.downloadSize}
                                </span>
                              </div>
                              <div className="col-span-1">
                                <span className="text-muted-foreground">
                                  輸入:
                                </span>
                                <span className="ml-1">
                                  {getInputTypesDescription(model.capabilities)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 載入詳細資訊狀態 */}
                        {!model.capabilities && !detailsLoading[model.id] && (
                          <div className="mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-muted-foreground"
                              onClick={() => handleGetModelDetails(model.id)}
                            >
                              載入詳細資訊
                            </Button>
                          </div>
                        )}

                        {detailsLoading[model.id] && (
                          <div className="mt-2 flex items-center text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            載入詳細資訊中...
                          </div>
                        )}

                        {detailsError[model.id] && (
                          <div className="mt-2 text-xs text-red-500">
                            {detailsError[model.id]}
                          </div>
                        )}

                        <div className="flex justify-end items-center mt-3">
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
                        </div>
                      </CardContent>
                    </Card>
                  ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent
          value="tools"
          className={`flex-1 overflow-hidden ${
            activeTab === "tools" ? "" : "hidden"
          }`}
        >
          <div className="h-[calc(100vh-200px)] overflow-hidden">
            <MCPToolsTab />
          </div>
        </TabsContent>
      </Tabs>

      {/* 拖拽手柄 - 只在桌面版顯示 */}
      {!isMobile && (
        <div
          className="absolute top-0 right-0 w-1 h-full bg-transparent hover:bg-blue-500 cursor-col-resize transition-colors duration-200 group"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="bg-blue-500 text-white p-1 rounded-full shadow-lg">
              <GripVertical className="h-3 w-3" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatSidebar;
