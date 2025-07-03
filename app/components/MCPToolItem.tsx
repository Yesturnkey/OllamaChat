"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Wrench,
  Info,
  ChevronDown,
  ChevronUp,
  Code,
  Settings,
} from "lucide-react";
import { MCPTool } from "@/app/redux/mcpSlice";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface MCPToolItemProps {
  tool: MCPTool;
  onToggle: () => void;
}

const MCPToolItem = ({ tool, onToggle }: MCPToolItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatSchema = (schema: any) => {
    if (!schema) return "無定義";

    try {
      if (typeof schema === "string") {
        return schema;
      }

      if (schema.type === "object" && schema.properties) {
        const properties = Object.entries(schema.properties)
          .map(([key, value]: [string, any]) => {
            const type = value.type || "any";
            const required = schema.required?.includes(key) ? "*" : "";
            const description = value.description
              ? ` - ${value.description}`
              : "";
            return `${key}${required}: ${type}${description}`;
          })
          .join("\n");
        return properties;
      }

      return JSON.stringify(schema, null, 2);
    } catch (error) {
      return "無法解析參數格式";
    }
  };

  const getParameterCount = (schema: any) => {
    if (!schema || !schema.properties) return 0;
    return Object.keys(schema.properties).length;
  };

  const getRequiredCount = (schema: any) => {
    if (!schema || !schema.required) return 0;
    return schema.required.length;
  };

  return (
    <Card
      className={cn(
        "mb-2 transition-all duration-200",
        tool.enabled ? "border-green-200 bg-green-50/50" : "border-gray-200"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Wrench
                className={cn(
                  "h-4 w-4",
                  tool.enabled ? "text-green-600" : "text-gray-400"
                )}
              />
              <h4 className="font-medium">{tool.name}</h4>
              <Badge
                variant={tool.enabled ? "default" : "secondary"}
                className="text-xs"
              >
                {tool.enabled ? "已啟用" : "已禁用"}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground mb-2">
              {tool.description || "無描述"}
            </p>

            {/* 參數概覽 */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>參數: {getParameterCount(tool.inputSchema)}</span>
              <span>必需: {getRequiredCount(tool.inputSchema)}</span>
              <span>服務器: {tool.server}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 展開/收起按鈕 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {/* 啟用/禁用開關 */}
            <Switch
              checked={tool.enabled}
              onCheckedChange={onToggle}
              className="data-[state=checked]:bg-green-600"
            />
          </div>
        </div>

        {/* 展開的詳細信息 */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t">
            <div className="space-y-3">
              <div>
                <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  參數定義
                </h5>
                <div className="bg-muted p-3 rounded-md">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {formatSchema(tool.inputSchema)}
                  </pre>
                </div>
              </div>

              {/* 示例用法 */}
              {tool.inputSchema && tool.inputSchema.properties && (
                <div>
                  <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    示例調用
                  </h5>
                  <div className="bg-blue-50 p-3 rounded-md">
                    <code className="text-xs text-blue-800">
                      {JSON.stringify(
                        {
                          tool_name: tool.name,
                          arguments: Object.keys(
                            tool.inputSchema.properties
                          ).reduce((acc, key) => {
                            const prop = tool.inputSchema.properties[key];
                            acc[key] =
                              prop.type === "string"
                                ? `"${prop.description || "value"}"`
                                : prop.type === "number"
                                ? 42
                                : prop.type === "boolean"
                                ? true
                                : prop.type === "array"
                                ? []
                                : {};
                            return acc;
                          }, {} as any),
                        },
                        null,
                        2
                      )}
                    </code>
                  </div>
                </div>
              )}

              {/* 操作按鈕 */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggle}
                  className={cn(
                    "flex-1",
                    tool.enabled
                      ? "text-red-600 hover:text-red-700 hover:bg-red-50"
                      : "text-green-600 hover:text-green-700 hover:bg-green-50"
                  )}
                >
                  {tool.enabled ? "禁用工具" : "啟用工具"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MCPToolItem;
