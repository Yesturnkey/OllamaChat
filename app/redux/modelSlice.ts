import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";

export type AIModel = {
  id: string;
  name: string;
  description: string;
  isDownloaded: boolean;
  downloadSize: string;
  downloadProgress?: number;
};

// 創建用於獲取模型列表的異步 thunk，使用 Axios
export const fetchModels = createAsyncThunk(
  "model/fetchModels",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get("/api/ollama/tags");
      return response.data.models.map((model: any) => ({
        id: model.name,
        name: model.name,
        description: model.details?.description || "Ollama 模型",
        isDownloaded: true,
        downloadSize: model.size
          ? `${Math.round(model.size / 1024 / 1024)}MB`
          : "未知",
        downloadProgress: undefined,
      }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return rejectWithValue(
          error.response?.data?.message || "無法獲取模型列表"
        );
      }
      return rejectWithValue("發生未知錯誤");
    }
  }
);

const modelSlice = createSlice({
  name: "model",
  initialState: {
    models: [] as AIModel[],
    selectedModel: "",
    loading: false,
    error: null as string | null,
  },
  reducers: {
    setModels: (state, action: PayloadAction<AIModel[]>) => {
      state.models = action.payload;
    },
    setSelectedModel: (state, action: PayloadAction<string>) => {
      state.selectedModel = action.payload;
    },
    updateModelDownloadProgress: (
      state,
      action: PayloadAction<{ modelId: string; progress: number }>
    ) => {
      const model = state.models.find((m) => m.id === action.payload.modelId);
      if (model) {
        model.downloadProgress = action.payload.progress;
      }
    },
    markModelAsDownloaded: (state, action: PayloadAction<string>) => {
      const model = state.models.find((m) => m.id === action.payload);
      if (model) {
        model.isDownloaded = true;
        model.downloadProgress = undefined;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchModels.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchModels.fulfilled, (state, action) => {
        state.models = action.payload;
        state.loading = false;

        // 如果尚未選擇模型，並且有可用模型，則選擇第一個
        if (!state.selectedModel && action.payload.length > 0) {
          state.selectedModel = action.payload[0].id;
        }
      })
      .addCase(fetchModels.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "獲取模型失敗";
      });
  },
});

export const {
  setModels,
  setSelectedModel,
  updateModelDownloadProgress,
  markModelAsDownloaded,
} = modelSlice.actions;

export default modelSlice.reducer;
