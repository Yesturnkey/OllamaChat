import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import { analyzeModelCapabilities } from "@/utils/modelAnalyzer";

export type ModelDetails = {
  format: string;
  family: string;
  families: string[] | null;
  parameter_size: string;
  quantization_level: string;
};

export type ModelInfo = {
  "general.architecture": string;
  "general.file_type": number;
  "general.parameter_count": number;
  [key: string]: any;
};

export type ModelCapabilities = {
  isEmbedding: boolean;
  isChat: boolean;
  supportsImages: boolean;
  supportsVision: boolean;
  inputTypes: string[];
};

export type ModelStats = {
  pulls: string;
};

export type AIModel = {
  id: string;
  name: string;
  description: string;
  isDownloaded: boolean;
  downloadSize: string;
  downloadProgress?: number;
  details?: ModelDetails;
  modelInfo?: ModelInfo;
  capabilities?: ModelCapabilities;
  template?: string;
  parameters?: string;
  stats?: ModelStats;
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
        details: model.details,
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

// 創建用於獲取單個模型詳細資訊的異步 thunk
export const fetchModelDetails = createAsyncThunk(
  "model/fetchModelDetails",
  async (modelName: string, { rejectWithValue }) => {
    try {
      const response = await axios.post("/api/ollama/show", {
        model: modelName,
      });

      const {
        details,
        model_info: modelInfo,
        template,
        parameters,
        capabilities: apiCapabilities,
      } = response.data;

      // 分析模型能力
      const capabilities = analyzeModelCapabilities(
        modelName,
        modelInfo,
        template,
        details?.family,
        apiCapabilities
      );

      return {
        modelName,
        details,
        modelInfo,
        capabilities,
        template,
        parameters,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return rejectWithValue(
          error.response?.data?.message ||
            `無法獲取模型 ${modelName} 的詳細資訊`
        );
      }
      return rejectWithValue("發生未知錯誤");
    }
  }
);

// 創建用於獲取模型統計資料的異步 thunk
export const fetchModelStats = createAsyncThunk(
  "model/fetchModelStats",
  async (forceUpdate: boolean = false, { rejectWithValue }) => {
    try {
      const response = await axios.get("/api/ollama/stats");
      return response.data.stats;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return rejectWithValue(
          error.response?.data?.message || "無法獲取模型統計資料"
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
    detailsLoading: {} as Record<string, boolean>,
    detailsError: {} as Record<string, string | null>,
    statsLoading: false,
    statsError: null as string | null,
    statsLoaded: false, // 添加標記來防止重複請求
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
      })
      // 處理獲取模型詳細資訊
      .addCase(fetchModelDetails.pending, (state, action) => {
        state.detailsLoading[action.meta.arg] = true;
        state.detailsError[action.meta.arg] = null;
      })
      .addCase(fetchModelDetails.fulfilled, (state, action) => {
        const {
          modelName,
          details,
          modelInfo,
          capabilities,
          template,
          parameters,
        } = action.payload;

        // 更新對應的模型
        const modelIndex = state.models.findIndex((m) => m.id === modelName);
        if (modelIndex !== -1) {
          state.models[modelIndex] = {
            ...state.models[modelIndex],
            details,
            modelInfo,
            capabilities,
            template,
            parameters,
          };
        }

        state.detailsLoading[modelName] = false;
      })
      .addCase(fetchModelDetails.rejected, (state, action) => {
        const modelName = action.meta.arg;
        state.detailsLoading[modelName] = false;
        state.detailsError[modelName] =
          (action.payload as string) || "獲取模型詳細資訊失敗";
      })
      // 處理獲取模型統計資料
      .addCase(fetchModelStats.pending, (state) => {
        state.statsLoading = true;
        state.statsError = null;
      })
      .addCase(fetchModelStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.statsLoaded = true; // 標記統計資料已載入
        const statsMap = action.payload as Record<string, { pulls: string }>;

        // 將統計資料合併到對應的模型
        state.models.forEach((model) => {
          const modelBaseName = model.name.split(":")[0]; // 移除版本號

          // 嘗試多種匹配方式
          const stats =
            statsMap[model.name] ||
            statsMap[modelBaseName] ||
            Object.entries(statsMap).find(
              ([key]) =>
                key.toLowerCase() === modelBaseName.toLowerCase() ||
                modelBaseName.toLowerCase().includes(key.toLowerCase()) ||
                key.toLowerCase().includes(modelBaseName.toLowerCase())
            )?.[1];

          if (stats) {
            model.stats = stats;
          }
        });
      })
      .addCase(fetchModelStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.statsError = (action.payload as string) || "獲取模型統計資料失敗";
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
