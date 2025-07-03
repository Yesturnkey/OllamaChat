import chatReducer from "@/app/redux/chatSlice";
import modelReducer from "@/app/redux/modelSlice";
import uiReducer from "@/app/redux/uiSlice";
import mcpReducer from "@/app/redux/mcpSlice";
import { configureStore } from "@reduxjs/toolkit";

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    model: modelReducer,
    ui: uiReducer,
    mcp: mcpReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
