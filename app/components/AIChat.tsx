"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/app/redux/hooks";
import { setIsMobile, setIsSidebarOpen } from "@/app/redux/uiSlice";
import ChatSidebar from "@/app/components/ChatSidebar";
import ChatMain from "@/app/components/ChatMain";

export function AIChat() {
  const dispatch = useAppDispatch();
  const isMobile = useAppSelector((state) => state.ui.isMobile);
  const isSidebarOpen = useAppSelector((state) => state.ui.isSidebarOpen);
  const [isClient, setIsClient] = useState(false);

  // 檢查設備類型
  useEffect(() => {
    setIsClient(true);
    const checkIfMobile = () => {
      dispatch(setIsMobile(window.innerWidth < 768));
    };

    // 初始檢查
    checkIfMobile();

    // 監聽視窗大小變化
    window.addEventListener("resize", checkIfMobile);

    // 清理監聽器
    return () => window.removeEventListener("resize", checkIfMobile);
  }, [dispatch]);

  // 在客戶端渲染之前顯示加載狀態
  if (!isClient) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-white relative">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white relative">
      <ChatSidebar />
      <ChatMain />

      {/* 側邊欄打開時的背景遮罩 */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30"
          onClick={() => dispatch(setIsSidebarOpen(false))}
        />
      )}
    </div>
  );
}

export default AIChat;
