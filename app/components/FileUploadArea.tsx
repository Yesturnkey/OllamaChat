"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, FileText, AlertTriangle } from "lucide-react";
import { removeUploadedFile } from "@/app/redux/chatSlice";
import { useState, useEffect } from "react";
import ImagePreviewDialog from "./ImagePreviewDialog";

const FileUploadArea = () => {
  const dispatch = useAppDispatch();
  const uploadedFiles = useAppSelector((state) => state.chat.uploadedFiles);
  const selectedModel = useAppSelector((state) => state.model.selectedModel);
  const models = useAppSelector((state) => state.model.models);

  // 圖片預覽狀態
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    alt: string;
    fileName: string;
  } | null>(null);

  // 獲取當前選中模型的能力
  const currentModel = models.find((model) => model.id === selectedModel);
  const supportsImages = currentModel?.capabilities?.supportsImages || false;

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

  // 自動移除不支援的圖片文件
  useEffect(() => {
    if (!supportsImages) {
      const imageFiles = uploadedFiles.filter((file) => isImageFile(file.type));
      imageFiles.forEach((file) => {
        dispatch(removeUploadedFile(file.name));
      });
    }
  }, [supportsImages, uploadedFiles, dispatch]);

  // 過濾文件：如果模型不支援圖片，則不顯示圖片文件
  const displayFiles = uploadedFiles.filter((file) => {
    if (isImageFile(file.type)) {
      return supportsImages;
    }
    return true; // 非圖片文件總是顯示
  });

  if (displayFiles.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mb-4 p-3 bg-muted/50 rounded-lg border">
        <div className="text-xs text-muted-foreground mb-2">已上傳的檔案：</div>
        {!supportsImages &&
          uploadedFiles.some((file) => isImageFile(file.type)) && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
              <AlertTriangle className="h-3 w-3" />
              <span>當前模型不支援圖片，圖片文件已被移除</span>
            </div>
          )}
        <div className="flex flex-wrap gap-2">
          {displayFiles.map((file, index) => (
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
