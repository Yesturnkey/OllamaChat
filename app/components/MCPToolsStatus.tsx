"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  Clock,
  Wrench,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface MCPToolsStatusProps {
  className?: string;
}

const MCPToolsStatus = ({ className }: MCPToolsStatusProps) => {
  const [toolsStatus, setToolsStatus] = useState<{
    available: boolean;
    tools: string[];
    error?: string;
  }>({
    available: false,
    tools: [],
  });

  const [isLoading, setIsLoading] = useState(false);

  const checkToolsStatus = async () => {
    setIsLoading(true);
    try {
      // 測試 MCP 工具 API
      const response = await fetch("/api/mcp/tools", {
        method: "GET",
      });

      if (response.ok) {
        const data = await response.json();
        setToolsStatus({
          available: true,
          tools: data.tools || [],
        });
      } else {
        setToolsStatus({
          available: false,
          tools: [],
          error: "無法連接到 MCP 服務器",
        });
      }
    } catch (error) {
      setToolsStatus({
        available: false,
        tools: [],
        error: error instanceof Error ? error.message : "未知錯誤",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkToolsStatus();
  }, []);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wrench className="h-4 w-4" />
          MCP 工具狀態
          <Button
            variant="ghost"
            size="sm"
            onClick={checkToolsStatus}
            disabled={isLoading}
            className="ml-auto h-6 w-6 p-0"
          >
            <RefreshCw
              className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {/* 狀態顯示 */}
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Clock className="h-4 w-4 text-yellow-500" />
          ) : toolsStatus.available ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
          <span className="text-sm">
            {isLoading
              ? "檢查中..."
              : toolsStatus.available
              ? "MCP 工具已就緒"
              : "MCP 工具不可用"}
          </span>
          {toolsStatus.available && toolsStatus.tools.length > 0 && (
            <Badge variant="secondary">{toolsStatus.tools.length} 個工具</Badge>
          )}
        </div>

        {/* 錯誤信息 */}
        {toolsStatus.error && (
          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700">{toolsStatus.error}</span>
          </div>
        )}

        {/* 可用工具列表 */}
        {toolsStatus.available && toolsStatus.tools.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">可用工具：</h4>
            <div className="grid grid-cols-1 gap-2">
              {toolsStatus.tools.map((tool, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted rounded"
                >
                  <div className="font-medium text-sm">{tool}</div>
                  <Badge variant="outline">已連接</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 無工具時的提示 */}
        {!toolsStatus.available && (
          <div className="p-2 bg-gray-50 border border-gray-200 rounded text-xs">
            <div className="font-medium mb-1">添加 MCP 工具：</div>
            <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground">
              <li>點擊「添加 MCP 服務器」按鈕</li>
              <li>選擇連接方式（STDIO、HTTP 或 SSE）</li>
              <li>輸入服務器配置信息</li>
              <li>連接成功後即可使用工具</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MCPToolsStatus;
