"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Plus,
  Server,
  Settings,
  Power,
  PowerOff,
  Trash2,
  Filter,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Wrench,
  ArrowUp,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/app/redux/hooks";
import {
  connectServer,
  fetchServerTools,
  removeServer,
  selectServer,
  toggleTool,
  clearError,
} from "@/app/redux/mcpSlice";
import {
  setIsAddMCPServerDialogOpen,
  setMCPServerSettingsOpen,
  setSelectedMCPServerId,
  setMCPToolsFilter,
} from "@/app/redux/uiSlice";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// 導入子組件
import MCPServerCard from "@/app/components/MCPServerCard";
import AddMCPServerDialog from "@/app/components/AddMCPServerDialog";
import MCPToolItem from "@/app/components/MCPToolItem";

const MCPToolsTab = () => {
  const dispatch = useAppDispatch();
  const { servers, selectedServerId, loading, error, stats, currentToolCalls } =
    useAppSelector((state) => state.mcp);
  const { isAddMCPServerDialogOpen, mcpServerSettingsOpen, mcpToolsFilter } =
    useAppSelector((state) => state.ui);

  // 滾動相關的引用和狀態
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);

  // 選中的服務器
  const selectedServer = servers.find((s) => s.id === selectedServerId);

  // 根據篩選器過濾工具
  const filteredTools =
    (selectedServer?.tools || []).filter((tool) => {
      switch (mcpToolsFilter) {
        case "enabled":
          return tool.enabled;
        case "disabled":
          return !tool.enabled;
        default:
          return true;
      }
    }) || [];

  // 調試信息
  console.log("MCPToolsTab Debug:", {
    servers: servers.length,
    selectedServerId,
    selectedServer: selectedServer?.name,
    totalTools: selectedServer?.tools?.length || 0,
    filteredTools: filteredTools.length,
    mcpToolsFilter,
    isConnected: selectedServer?.connected,
    isConnecting: selectedServer?.connecting,
  });

  // 處理服務器連接/斷開連接
  const handleConnectServer = async (serverId: string) => {
    try {
      const server = servers.find((s) => s.id === serverId);
      if (!server) {
        throw new Error("找不到服務器");
      }

      const isConnected = server.connected;
      await dispatch(connectServer(server)).unwrap();

      if (isConnected) {
        toast.success("服務器連接已斷開");
      } else {
        toast.success("服務器連接成功");
      }
    } catch (error) {
      const server = servers.find((s) => s.id === serverId);
      const isConnected = server?.connected;

      if (isConnected) {
        toast.error(`斷開連接失敗: ${error}`);
      } else {
        toast.error(`連接失敗: ${error}`);
      }
    }
  };

  // 處理刷新服務器工具
  const handleRefreshTools = async (serverId: string) => {
    try {
      await dispatch(fetchServerTools(serverId)).unwrap();
      toast.success("工具列表更新成功");
    } catch (error) {
      toast.error(`更新失敗: ${error}`);
    }
  };

  // 處理移除服務器
  const handleRemoveServer = (serverId: string) => {
    dispatch(removeServer(serverId));
    toast.success("服務器移除成功");
  };

  // 處理選擇服務器
  const handleSelectServer = (serverId: string) => {
    dispatch(selectServer(serverId));
    dispatch(setSelectedMCPServerId(serverId));

    // 如果服務器已連接但沒有工具，則獲取工具列表
    const server = servers.find((s) => s.id === serverId);
    if (server && server.connected && (server.tools?.length || 0) === 0) {
      dispatch(fetchServerTools(serverId));
    }
  };

  // 處理工具啟用/禁用
  const handleToggleTool = (serverId: string, toolName: string) => {
    dispatch(toggleTool({ serverId, toolName }));
    toast.success("工具設定已保存");
  };

  // 清除錯誤
  const handleClearError = () => {
    dispatch(clearError());
  };

  // 滾動到頂部
  const scrollToTop = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollElement) {
        scrollElement.scrollTop = 0;
      }
    }
  };

  // 監聽滾動事件以顯示/隱藏滾動到頂部按鈕
  const handleScroll = (e: any) => {
    const scrollTop = e.target.scrollTop;
    setShowScrollToTop(scrollTop > 200);
  };

  // 組件掛載時，如果有服務器但沒有選中，則選中第一個
  useEffect(() => {
    if (servers.length > 0 && !selectedServerId) {
      handleSelectServer(servers[0].id);
    }
  }, [servers, selectedServerId]);

  return (
    <div className="flex flex-col h-full">
      {/* 頂部統計和添加按鈕 */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">MCP 工具</h3>
          <Button
            size="sm"
            onClick={() => dispatch(setIsAddMCPServerDialogOpen(true))}
          >
            <Plus className="h-4 w-4 mr-2" />
            添加服務器
          </Button>
        </div>

        {/* 統計信息 */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-blue-500" />
            <span className="text-muted-foreground">
              服務器: {stats.connectedServers}/{stats.totalServers}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">
              工具: {stats.enabledTools}/{stats.totalTools}
            </span>
          </div>
        </div>

        {/* 活動工具調用 */}
        {currentToolCalls.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
              <span className="text-sm text-muted-foreground">
                正在執行 {currentToolCalls.length} 個工具...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 錯誤提示 */}
      {error && (
        <Alert className="mx-4 mt-4 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-red-700">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearError}
              className="text-red-700 hover:bg-red-100"
            >
              清除
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 主要內容 */}
      <div className="flex-1 overflow-hidden">
        {servers.length === 0 ? (
          // 空狀態
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 overflow-y-auto">
              <Server className="h-12 w-12 text-muted-foreground mb-4" />
              <h4 className="text-lg font-medium mb-2">尚未添加 MCP 服務器</h4>
              <p className="text-muted-foreground mb-4">
                添加 MCP 服務器以使用外部工具和資源
              </p>
              <Button
                onClick={() => dispatch(setIsAddMCPServerDialogOpen(true))}
              >
                <Plus className="h-4 w-4 mr-2" />
                添加第一個服務器
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* 服務器選擇器 */}
            <div className="p-4 border-b">
              <div className="flex items-center gap-2 mb-3">
                <Select
                  value={selectedServerId || ""}
                  onValueChange={handleSelectServer}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="選擇服務器" />
                  </SelectTrigger>
                  <SelectContent>
                    {servers.map((server) => (
                      <SelectItem key={server.id} value={server.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full",
                              server.connected
                                ? "bg-green-500"
                                : server.connecting
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            )}
                          />
                          {server.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 工具篩選器 */}
              {selectedServer && (selectedServer.tools?.length || 0) > 0 && (
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={mcpToolsFilter}
                    onValueChange={(value: "all" | "enabled" | "disabled") =>
                      dispatch(setMCPToolsFilter(value))
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="enabled">已啟用</SelectItem>
                      <SelectItem value="disabled">已禁用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* 服務器詳情和工具列表 */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
              <ScrollArea
                ref={scrollAreaRef}
                className="flex-1 h-full"
                onScrollCapture={handleScroll}
              >
                <div className="p-4 space-y-4 ">
                  {selectedServer && (
                    <>
                      {/* 服務器信息卡片 */}
                      <MCPServerCard
                        server={selectedServer}
                        onConnect={() => handleConnectServer(selectedServer.id)}
                        onRefresh={() => handleRefreshTools(selectedServer.id)}
                        onRemove={() => handleRemoveServer(selectedServer.id)}
                        onSettings={() => {
                          dispatch(setSelectedMCPServerId(selectedServer.id));
                          dispatch(setMCPServerSettingsOpen(true));
                        }}
                      />

                      <Separator />

                      {/* 工具列表 */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">
                            可用工具 ({filteredTools.length})
                          </h4>
                          {filteredTools.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {filteredTools.filter((t) => t.enabled).length}{" "}
                              已啟用
                            </div>
                          )}
                        </div>

                        {selectedServer.connecting && (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                            <span className="text-muted-foreground">
                              正在獲取工具列表...
                            </span>
                          </div>
                        )}

                        {selectedServer.error && (
                          <Alert className="mb-4 border-red-200 bg-red-50">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-red-700">
                              {selectedServer.error}
                            </AlertDescription>
                          </Alert>
                        )}

                        {!selectedServer.connecting &&
                          filteredTools.length === 0 &&
                          selectedServer.connected && (
                            <div className="text-center py-8">
                              <div className="text-muted-foreground mb-2">
                                {mcpToolsFilter === "all"
                                  ? "此服務器沒有可用工具"
                                  : `沒有找到${
                                      mcpToolsFilter === "enabled"
                                        ? "已啟用"
                                        : "已禁用"
                                    }的工具`}
                              </div>
                              <div className="space-y-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleRefreshTools(selectedServer.id)
                                  }
                                >
                                  重新載入工具
                                </Button>
                                {mcpToolsFilter !== "all" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      dispatch(setMCPToolsFilter("all"))
                                    }
                                  >
                                    顯示所有工具
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}

                        {/* 工具列表 */}
                        <div className="space-y-2">
                          {filteredTools.map((tool, index) => (
                            <MCPToolItem
                              key={`${tool.name}-${index}`}
                              tool={tool}
                              onToggle={() =>
                                handleToggleTool(selectedServer.id, tool.name)
                              }
                            />
                          ))}
                        </div>

                        {/* 工具列表底部的緩衝區 */}
                        {filteredTools.length > 0 && <div className="h-4" />}
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>

              {/* 滾動到頂部按鈕 */}
              {showScrollToTop && (
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute bottom-4 right-4 z-10 shadow-lg bg-white/90 backdrop-blur-sm hover:bg-white"
                  onClick={scrollToTop}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 添加服務器對話框 */}
      <AddMCPServerDialog
        open={isAddMCPServerDialogOpen}
        onOpenChange={(open: boolean) =>
          dispatch(setIsAddMCPServerDialogOpen(open))
        }
      />
    </div>
  );
};

export default MCPToolsTab;
