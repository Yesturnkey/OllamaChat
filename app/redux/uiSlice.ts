import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    isSidebarOpen: false,
    isMobile: false,
    activeTab: "chats",
    isNewChatDialogOpen: false,
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
  },
});

export const {
  setIsSidebarOpen,
  setIsMobile,
  setActiveTab,
  setIsNewChatDialogOpen,
} = uiSlice.actions;

export default uiSlice.reducer;
