"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { removeUploadedFile } from "@/app/redux/chatSlice";

const FileUploadArea = () => {
  const dispatch = useAppDispatch();
  const uploadedFiles = useAppSelector((state) => state.chat.uploadedFiles);

  // 移除上傳的文件
  const handleRemoveFile = (fileName: string) => {
    dispatch(removeUploadedFile(fileName));
  };

  return (
    <div className="px-4 py-2 border-t">
      <div className="text-sm font-medium mb-2">已上傳文件：</div>
      <div className="flex flex-wrap gap-2">
        {uploadedFiles.map((file) => (
          <Badge
            key={file.name}
            variant="secondary"
            className="flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            <span className="truncate max-w-[120px]">{file.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 ml-1 hover:bg-muted-foreground/20"
              onClick={() => handleRemoveFile(file.name)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default FileUploadArea;
