"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Server,
  TestTube,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info,
  Settings,
  Globe,
  Terminal,
  Rss,
} from "lucide-react";
import { useAppDispatch } from "@/app/redux/hooks";
import { addServer, testServerConnection } from "@/app/redux/mcpSlice";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import MCPToolsStatus from "./MCPToolsStatus";

interface AddMCPServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddMCPServerDialog = ({
  open,
  onOpenChange,
}: AddMCPServerDialogProps) => {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    tools?: any[];
  } | null>(null);

  // 表單狀態
  const [formData, setFormData] = useState({
    name: "",
    type: "stdio" as "stdio" | "sse" | "http",
    command: "",
    args: "",
    url: "",
    env: "",
    headers: "",
    description: "",
  });

  // 安全解析 JSON
  const safeJSONParse = (jsonString: string) => {
    if (!jsonString || !jsonString.trim()) return undefined;
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error(
        `JSON 格式錯誤: ${
          error instanceof Error ? error.message : "無效的 JSON 格式"
        }`
      );
    }
  };

  // 驗證表單
  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error("請輸入服務器名稱");
      return false;
    }

    if (formData.type === "stdio") {
      if (!formData.command.trim()) {
        toast.error("請輸入 stdio 命令");
        return false;
      }
    } else if (formData.type === "http") {
      if (!formData.url.trim()) {
        toast.error("請輸入 HTTP URL");
        return false;
      }
      try {
        new URL(formData.url);
      } catch {
        toast.error("請輸入有效的 URL");
        return false;
      }
    } else if (formData.type === "sse") {
      if (!formData.url.trim()) {
        toast.error("請輸入 SSE URL");
        return false;
      }
      try {
        new URL(formData.url);
      } catch {
        toast.error("請輸入有效的 URL");
        return false;
      }
    }

    // 驗證 JSON 格式
    if (formData.env && formData.env.trim()) {
      try {
        safeJSONParse(formData.env);
      } catch (error) {
        toast.error(
          `環境變量 JSON 格式錯誤: ${
            error instanceof Error ? error.message : "無效格式"
          }`
        );
        return false;
      }
    }

    if (formData.headers && formData.headers.trim()) {
      try {
        safeJSONParse(formData.headers);
      } catch (error) {
        toast.error(
          `HTTP Headers JSON 格式錯誤: ${
            error instanceof Error ? error.message : "無效格式"
          }`
        );
        return false;
      }
    }

    return true;
  };

  // 測試連接
  const handleTestConnection = async () => {
    if (!validateForm()) return;

    setTesting(true);
    setTestResult(null);

    try {
      const serverConfig = {
        name: formData.name,
        type: formData.type,
        command: formData.command || undefined,
        args: formData.args
          ? formData.args.split(" ").filter(Boolean)
          : undefined,
        url: formData.url || undefined,
        env: safeJSONParse(formData.env),
        headers: safeJSONParse(formData.headers),
      };

      const result = await dispatch(
        testServerConnection(serverConfig)
      ).unwrap();
      setTestResult({
        success: true,
        message: "連接成功！",
        tools: result.tools || [],
      });
      toast.success("連接測試成功");
    } catch (error) {
      setTestResult({
        success: false,
        message: String(error),
      });
      toast.error(`連接測試失敗: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  // 添加服務器
  const handleAddServer = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const serverConfig = {
        name: formData.name,
        type: formData.type,
        command: formData.command || undefined,
        args: formData.args
          ? formData.args.split(" ").filter(Boolean)
          : undefined,
        url: formData.url || undefined,
        env: safeJSONParse(formData.env),
        headers: safeJSONParse(formData.headers),
      };

      dispatch(addServer(serverConfig));
      toast.success("MCP 服務器添加成功");
      handleClose();
    } catch (error) {
      toast.error(`添加服務器失敗: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 重置表單
  const handleClose = () => {
    setFormData({
      name: "",
      type: "stdio",
      command: "",
      args: "",
      url: "",
      env: "",
      headers: "",
      description: "",
    });
    setTestResult(null);
    onOpenChange(false);
  };

  // 表單字段更新
  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTestResult(null); // 清除之前的測試結果
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            添加 MCP 服務器
          </DialogTitle>
          <DialogDescription>
            添加新的 Model Context Protocol 服務器以擴展可用工具
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 基本信息 */}
          <div className="space-y-4">
            <h4 className="font-medium">基本信息</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">服務器名稱 *</Label>
                <Input
                  id="name"
                  placeholder="例如：我的工具服務器"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="type">連接類型</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "stdio" | "sse" | "http") =>
                    updateField("type", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stdio">
                      <div className="flex items-center gap-2">
                        <Terminal className="h-4 w-4" />
                        STDIO
                      </div>
                    </SelectItem>
                    <SelectItem value="http">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        HTTP
                      </div>
                    </SelectItem>
                    <SelectItem value="sse">
                      <div className="flex items-center gap-2">
                        <Rss className="h-4 w-4" />
                        SSE
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 連接配置 */}
          <Tabs value={formData.type} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="stdio">STDIO</TabsTrigger>
              <TabsTrigger value="http">HTTP</TabsTrigger>
              <TabsTrigger value="sse">SSE</TabsTrigger>
            </TabsList>

            <TabsContent value="stdio" className="space-y-4">
              <div>
                <Label htmlFor="command">命令 *</Label>
                <Input
                  id="command"
                  placeholder="例如：node server.js"
                  value={formData.command}
                  onChange={(e) => updateField("command", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="args">參數</Label>
                <Input
                  id="args"
                  placeholder="例如：--port 3000 --debug"
                  value={formData.args}
                  onChange={(e) => updateField("args", e.target.value)}
                />
              </div>
            </TabsContent>

            <TabsContent value="http" className="space-y-4">
              <div>
                <Label htmlFor="url">URL *</Label>
                <Input
                  id="url"
                  placeholder="例如：http://localhost:3000"
                  value={formData.url}
                  onChange={(e) => updateField("url", e.target.value)}
                />
              </div>
            </TabsContent>

            <TabsContent value="sse" className="space-y-4">
              <div>
                <Label htmlFor="url">SSE URL *</Label>
                <Input
                  id="url"
                  placeholder="例如：http://localhost:3000/events"
                  value={formData.url}
                  onChange={(e) => updateField("url", e.target.value)}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* 高級配置 */}
          <div className="space-y-4">
            <h4 className="font-medium">高級配置（可選）</h4>

            {formData.type !== "stdio" && (
              <div>
                <Label htmlFor="headers">HTTP Headers (JSON)</Label>
                <Textarea
                  id="headers"
                  placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                  value={formData.headers}
                  onChange={(e) => updateField("headers", e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  格式範例：
                  {`{"key": "value", "Authorization": "Bearer token"}`}
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="env">環境變量 (JSON)</Label>
              <Textarea
                id="env"
                placeholder='{"API_KEY": "your-key", "DEBUG": "true"}'
                value={formData.env}
                onChange={(e) => updateField("env", e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                格式範例：{`{"API_KEY": "your-key", "DEBUG": "true"}`}
              </p>
            </div>
          </div>

          {/* 測試結果 */}
          {testResult && (
            <Alert
              className={cn(
                testResult.success
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              )}
            >
              {testResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription
                className={cn(
                  testResult.success ? "text-green-800" : "text-red-800"
                )}
              >
                {testResult.message}
                {testResult.tools && testResult.tools.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium mb-1">
                      找到 {testResult.tools.length} 個工具:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {testResult.tools.map((tool, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tool.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* MCP 工具狀態和測試建議 */}
          <div className="pt-4 border-t">
            <MCPToolsStatus className="max-h-[300px] overflow-y-auto" />
          </div>
        </div>

        <DialogFooter className="flex items-center gap-2">
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={testing}
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <TestTube className="h-4 w-4 mr-2" />
            )}
            測試連接
          </Button>
          <Button onClick={handleAddServer} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Server className="h-4 w-4 mr-2" />
            )}
            添加服務器
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddMCPServerDialog;
