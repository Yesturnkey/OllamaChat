import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    isSidebarOpen: false,
    isMobile: false,
    activeTab: "chats",
    isNewChatDialogOpen: false,
    // 側邊欄寬度調整
    sidebarWidth: 320, // 默認寬度 320px
    // MCP 工具管理相關
    isAddMCPServerDialogOpen: false,
    mcpServerSettingsOpen: false,
    selectedMCPServerId: null as string | null,
    mcpToolsFilter: "all" as "all" | "enabled" | "disabled",
  },
  reducers: {
    setIsSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.isSidebarOpen = action.payload;
    },
    setIsMobile: (state, action: PayloadAction<boolean>) => {
      state.isMobile = action.payload;
    },
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.activeTab = action.payload;
    },
    setIsNewChatDialogOpen: (state, action: PayloadAction<boolean>) => {
      state.isNewChatDialogOpen = action.payload;
    },
    // 側邊欄寬度調整
    setSidebarWidth: (state, action: PayloadAction<number>) => {
      // 限制寬度在 200px 到 600px 之間
      state.sidebarWidth = Math.max(200, Math.min(600, action.payload));
    },
    // MCP 工具管理 Actions
    setIsAddMCPServerDialogOpen: (state, action: PayloadAction<boolean>) => {
      state.isAddMCPServerDialogOpen = action.payload;
    },
    setMCPServerSettingsOpen: (state, action: PayloadAction<boolean>) => {
      state.mcpServerSettingsOpen = action.payload;
    },
    setSelectedMCPServerId: (state, action: PayloadAction<string | null>) => {
      state.selectedMCPServerId = action.payload;
    },
    setMCPToolsFilter: (
      state,
      action: PayloadAction<"all" | "enabled" | "disabled">
    ) => {
      state.mcpToolsFilter = action.payload;
    },
  },
});

export const {
  setIsSidebarOpen,
  setIsMobile,
  setActiveTab,
  setIsNewChatDialogOpen,
  setSidebarWidth,
  setIsAddMCPServerDialogOpen,
  setMCPServerSettingsOpen,
  setSelectedMCPServerId,
  setMCPToolsFilter,
} = uiSlice.actions;

export default uiSlice.reducer;
