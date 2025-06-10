"use client";

import { useState } from "react";
import { useAppDispatch } from "@/app/redux/hooks";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addChat } from "@/app/redux/chatSlice";
import { setIsNewChatDialogOpen } from "@/app/redux/uiSlice";

type NewChatDialogProps = {
  open: boolean;
};

const NewChatDialog = ({ open }: NewChatDialogProps) => {
  const dispatch = useAppDispatch();
  const [newChatName, setNewChatName] = useState<string>("");

  // 創建新聊天
  const handleCreateNewChat = () => {
    const name = newChatName.trim() || `新聊天 ${Date.now()}`;
    const newChat = {
      id: `chat${Date.now()}`,
      name,
      lastActive: new Date().toISOString(),
      messages: [
        {
          id: Date.now().toString(),
          role: "assistant" as const,
          content: "您好！我是 AI 助手，有什麼我可以幫您的嗎？",
          timestamp: new Date().toISOString(),
        },
      ],
    };

    dispatch(addChat(newChat));
    setNewChatName("");
    dispatch(setIsNewChatDialogOpen(false));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => dispatch(setIsNewChatDialogOpen(open))}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>創建新聊天</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="chat-name">聊天名稱</Label>
            <Input
              id="chat-name"
              placeholder="輸入聊天名稱..."
              value={newChatName}
              onChange={(e) => setNewChatName(e.target.value)}
            />
          </div>
          <Button onClick={handleCreateNewChat} className="w-full">
            創建
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewChatDialog;
