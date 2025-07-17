"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Server,
  Power,
  PowerOff,
  Settings,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MCPServer } from "@/app/redux/mcpSlice";

interface MCPServerCardProps {
  server: MCPServer;
  onConnect: () => void;
  onRefresh: () => void;
  onRemove: () => void;
  onSettings: () => void;
}

const MCPServerCard = ({
  server,
  onConnect,
  onRefresh,
  onRemove,
  onSettings,
}: MCPServerCardProps) => {
  const getConnectionStatus = () => {
    if (server.connecting) {
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        text: "連接中",
        color: "bg-yellow-500",
      };
    }
    if (server.connected) {
      return {
        icon: <CheckCircle className="h-4 w-4" />,
        text: "已連接",
        color: "bg-green-500",
      };
    }
    return {
      icon: <XCircle className="h-4 w-4" />,
      text: "未連接",
      color: "bg-red-500",
    };
  };

  const status = getConnectionStatus();

  const formatLastConnected = (lastConnected?: string) => {
    if (!lastConnected) return "從未連接";
    const date = new Date(lastConnected);
    return date.toLocaleString("zh-TW");
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Server className="h-5 w-5 text-blue-500" />
            <div>
              <CardTitle className="text-base">{server.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <div className={cn("w-2 h-2 rounded-full", status.color)} />
                <span className="text-sm text-muted-foreground">
                  {status.text}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onSettings}
              className="h-8 w-8"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* 服務器信息 */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">類型:</span>
              <Badge variant="outline" className="ml-2">
                {server.type?.toUpperCase() || "UNKNOWN"}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">工具:</span>
              <span className="ml-2">{server.tools?.length || 0}</span>
            </div>
          </div>

          {/* 連接詳情 */}
          {server.type === "stdio" && server.command && (
            <div className="text-sm">
              <span className="text-muted-foreground">命令:</span>
              <code className="ml-2 bg-muted px-2 py-1 rounded text-xs">
                {server.command}
                {Array.isArray(server.args) && server.args.length > 0 && (
                  <span className="ml-1">{server.args.join(" ")}</span>
                )}
              </code>
            </div>
          )}

          {server.type === "http" && server.url && (
            <div className="text-sm">
              <span className="text-muted-foreground">URL:</span>
              <code className="ml-2 bg-muted px-2 py-1 rounded text-xs">
                {server.url}
              </code>
            </div>
          )}

          {server.lastConnected && (
            <div className="text-sm">
              <span className="text-muted-foreground">上次連接:</span>
              <span className="ml-2 text-xs">
                {formatLastConnected(server.lastConnected)}
              </span>
            </div>
          )}

          {/* 錯誤信息 */}
          {server.error && (
            <div className="text-sm">
              <span className="text-red-500">錯誤: {server.error}</span>
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant={server.connected ? "outline" : "default"}
              size="sm"
              onClick={onConnect}
              disabled={server.connecting}
              className="flex-1"
            >
              {server.connecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : server.connected ? (
                <PowerOff className="h-4 w-4 mr-2" />
              ) : (
                <Power className="h-4 w-4 mr-2" />
              )}
              {server.connecting
                ? "連接中"
                : server.connected
                ? "斷開連接"
                : "連接"}
            </Button>

            {server.connected && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={server.connecting}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                刷新工具
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MCPServerCard;
