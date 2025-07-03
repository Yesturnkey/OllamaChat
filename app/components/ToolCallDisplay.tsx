"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Wrench,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { ToolCall } from "@/app/redux/chatSlice";
import { cn } from "@/lib/utils";

interface ToolCallDisplayProps {
  toolCalls: ToolCall[];
  className?: string;
}

const ToolCallDisplay = ({ toolCalls, className }: ToolCallDisplayProps) => {
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>(
    {}
  );

  const toggleExpanded = (toolId: string) => {
    setExpandedTools((prev) => ({
      ...prev,
      [toolId]: !prev[toolId],
    }));
  };

  const getStatusIcon = (status: ToolCall["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "executing":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: ToolCall["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-50 border-yellow-200";
      case "executing":
        return "bg-blue-50 border-blue-200";
      case "completed":
        return "bg-green-50 border-green-200";
      case "failed":
        return "bg-red-50 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return "";
    return duration < 1000
      ? `${duration}ms`
      : `${(duration / 1000).toFixed(2)}s`;
  };

  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  return (
    <Card className={cn("mt-2", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          工具調用 ({toolCalls.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {toolCalls.map((toolCall) => (
          <Collapsible
            key={toolCall.id}
            open={expandedTools[toolCall.id]}
            onOpenChange={() => toggleExpanded(toolCall.id)}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start p-2 h-auto rounded-md",
                  getStatusColor(toolCall.status)
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(toolCall.status)}
                    <span className="font-medium">{toolCall.name}</span>
                    <Badge
                      variant={
                        toolCall.status === "completed"
                          ? "default"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {toolCall.status === "pending" && "等待中"}
                      {toolCall.status === "executing" && "執行中"}
                      {toolCall.status === "completed" && "完成"}
                      {toolCall.status === "failed" && "失敗"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {toolCall.duration && (
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(toolCall.duration)}
                      </span>
                    )}
                    {expandedTools[toolCall.id] ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-2 ml-6">
              <div className="space-y-2 text-sm">
                {/* 參數 */}
                {toolCall.arguments &&
                  Object.keys(toolCall.arguments).length > 0 && (
                    <div>
                      <div className="font-medium text-muted-foreground mb-1">
                        參數：
                      </div>
                      <div className="bg-muted p-2 rounded text-xs font-mono">
                        <pre>{JSON.stringify(toolCall.arguments, null, 2)}</pre>
                      </div>
                    </div>
                  )}

                {/* 結果 */}
                {toolCall.result && (
                  <div>
                    <div className="font-medium text-muted-foreground mb-1">
                      結果：
                    </div>
                    <div className="bg-green-50 border border-green-200 p-2 rounded text-xs">
                      {typeof toolCall.result === "string"
                        ? toolCall.result
                        : JSON.stringify(toolCall.result, null, 2)}
                    </div>
                  </div>
                )}

                {/* 錯誤 */}
                {toolCall.error && (
                  <div>
                    <div className="font-medium text-red-600 mb-1">錯誤：</div>
                    <div className="bg-red-50 border border-red-200 p-2 rounded text-xs text-red-700">
                      {toolCall.error}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
};

export default ToolCallDisplay;
