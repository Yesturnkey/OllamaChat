"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, ZoomIn, ZoomOut } from "lucide-react";

interface ImagePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  imageAlt: string;
  fileName?: string;
}

const ImagePreviewDialog: React.FC<ImagePreviewDialogProps> = ({
  isOpen,
  onClose,
  imageSrc,
  imageAlt,
  fileName,
}) => {
  const [zoom, setZoom] = React.useState(1);
  const [isDragging, setIsDragging] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const [imageError, setImageError] = React.useState(false);

  // 重置縮放和位置
  const resetView = React.useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
  }, []);

  // 處理縮放
  const handleZoomIn = React.useCallback(() => {
    setZoom((prev) => Math.min(prev * 1.2, 5));
  }, []);

  const handleZoomOut = React.useCallback(() => {
    setZoom((prev) => Math.max(prev / 1.2, 0.1));
  }, []);

  // 處理拖拽
  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      if (zoom > 1) {
        setIsDragging(true);
        setDragStart({
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        });
      }
    },
    [zoom, position]
  );

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent) => {
      if (isDragging && zoom > 1) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, zoom, dragStart]
  );

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  // 處理下載
  const handleDownload = React.useCallback(() => {
    if (!imageSrc) return;

    const link = document.createElement("a");
    link.href = imageSrc;
    link.download = fileName || "image";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [imageSrc, fileName]);

  // 處理圖片載入錯誤
  const handleImageError = React.useCallback(() => {
    setImageError(true);
  }, []);

  // 處理雙擊
  const handleDoubleClick = React.useCallback(() => {
    if (zoom === 1) {
      handleZoomIn();
    } else {
      resetView();
    }
  }, [zoom, handleZoomIn, resetView]);

  // 當 Dialog 關閉時重置狀態
  React.useEffect(() => {
    if (!isOpen) {
      // 延遲重置狀態，避免在動畫過程中出現錯誤
      const timer = setTimeout(() => {
        resetView();
        setImageError(false);
      }, 150); // 等待 dialog 關閉動畫完成

      return () => clearTimeout(timer);
    }
  }, [isOpen, resetView]);

  // 計算安全的變換值
  const safeZoom = Math.max(zoom, 0.1);
  const translateX = safeZoom > 0 ? position.x / safeZoom : 0;
  const translateY = safeZoom > 0 ? position.y / safeZoom : 0;

  // 如果沒有圖片源，不渲染 dialog
  if (!imageSrc && isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[90vw] h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-medium truncate">
              {fileName || "圖片預覽"}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={zoom <= 0.1}
                className="h-8 w-8"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground min-w-[3rem] text-center">
                {Math.round(safeZoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={zoom >= 5}
                className="h-8 w-8"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={resetView}
                className="h-8 w-8"
              >
                重置
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="h-8 w-8"
                disabled={!imageSrc}
              >
                <Download className="h-4 w-4" />
              </Button>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        <div
          className="flex-1 overflow-hidden bg-muted/20 relative flex items-center justify-center"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
          }}
        >
          {imageError || !imageSrc ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="text-4xl">🖼️</div>
              <p className="text-sm">
                {imageError ? "圖片載入失敗" : "沒有圖片"}
              </p>
            </div>
          ) : (
            <img
              key={imageSrc} // 添加 key 來強制重新渲染
              src={imageSrc}
              alt={imageAlt || "預覽圖片"}
              className="max-w-none transition-transform duration-200 select-none"
              style={{
                transform: `scale(${safeZoom}) translate(${translateX}px, ${translateY}px)`,
                maxHeight: zoom === 1 ? "100%" : "none",
                maxWidth: zoom === 1 ? "100%" : "none",
              }}
              draggable={false}
              onError={handleImageError}
              onDoubleClick={handleDoubleClick}
            />
          )}
        </div>

        <div className="px-4 py-2 border-t bg-muted/5">
          <p className="text-xs text-muted-foreground text-center">
            雙擊圖片可縮放 • 拖拽可移動 • ESC 鍵關閉
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImagePreviewDialog;
