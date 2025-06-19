"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, FileText } from "lucide-react";
import { removeUploadedFile } from "@/app/redux/chatSlice";
import { useState } from "react";
import ImagePreviewDialog from "./ImagePreviewDialog";

const FileUploadArea = () => {
  const dispatch = useAppDispatch();
  const uploadedFiles = useAppSelector((state) => state.chat.uploadedFiles);

  // 圖片預覽狀態
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    alt: string;
    fileName: string;
  } | null>(null);

  // 移除上傳的文件
  const handleRemoveFile = (fileName: string) => {
    dispatch(removeUploadedFile(fileName));
  };

  // 檢查是否為圖片檔案
  const isImageFile = (fileType: string) => {
    return fileType.startsWith("image/");
  };

  // 處理圖片點擊
  const handleImageClick = (file: any) => {
    // 確保文件和內容存在
    if (!file || !file.content || !file.name) return;

    setPreviewImage({
      src: file.content,
      alt: file.name,
      fileName: file.name,
    });
  };

  // 關閉預覽
  const handleClosePreview = () => {
    setPreviewImage(null);
  };

  if (uploadedFiles.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mb-4 p-3 bg-muted/50 rounded-lg border">
        <div className="text-xs text-muted-foreground mb-2">已上傳的檔案：</div>
        <div className="flex flex-wrap gap-2">
          {uploadedFiles.map((file, index) => (
            <div key={index} className="relative group">
              {isImageFile(file.type) ? (
                // 圖片預覽
                <div className="relative">
                  <img
                    src={file.content}
                    alt={file.name}
                    className="w-20 h-20 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleImageClick(file)}
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveFile(file.name)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 rounded-b truncate">
                    {file.name}
                  </div>
                </div>
              ) : (
                // 文件圖標
                <Badge variant="secondary" className="pr-1 max-w-[200px]">
                  <FileText className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                    onClick={() => handleRemoveFile(file.name)}
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 圖片預覽 Dialog */}
      <ImagePreviewDialog
        isOpen={previewImage !== null}
        onClose={handleClosePreview}
        imageSrc={previewImage?.src || ""}
        imageAlt={previewImage?.alt || ""}
        fileName={previewImage?.fileName || ""}
      />
    </>
  );
};

export default FileUploadArea;
