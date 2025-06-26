import { ModelCapabilities } from "@/app/redux/modelSlice";

// 已知的 embedding 模型名稱模式
const EMBEDDING_MODEL_PATTERNS = [
  /embed/i,
  /embedding/i,
  /nomic-embed/i,
  /all-minilm/i,
  /sentence-transformer/i,
  /bge-/i,
  /e5-/i,
];

// 已知的視覺模型名稱模式
const VISION_MODEL_PATTERNS = [
  /llava/i,
  /bakllava/i,
  /moondream/i,
  /cogvlm/i,
  /qwen-vl/i,
  /internvl/i,
  /minicpm-v/i,
  /gemma.*vision/i,
  /gemma.*v/i,
];

// 支援圖片的模型架構
const VISION_ARCHITECTURES = ["llava", "moondream", "cogvlm", "qwen", "gemma"];

/**
 * 分析模型的能力
 */
export function analyzeModelCapabilities(
  modelName: string,
  modelInfo?: any,
  template?: string,
  family?: string,
  apiCapabilities?: string[]
): ModelCapabilities {
  const capabilities: ModelCapabilities = {
    isEmbedding: false,
    isChat: false,
    supportsImages: false,
    supportsVision: false,
    inputTypes: [],
  };

  // 首先檢查 API 返回的 capabilities 數組（最準確）
  if (apiCapabilities && Array.isArray(apiCapabilities)) {
    capabilities.supportsVision = apiCapabilities.includes("vision");
    capabilities.supportsImages = capabilities.supportsVision;
    capabilities.isChat =
      apiCapabilities.includes("completion") ||
      apiCapabilities.includes("chat");
    // embedding 通常會有 "embed" 或者沒有 "completion"
    capabilities.isEmbedding =
      apiCapabilities.includes("embed") ||
      (!apiCapabilities.includes("completion") &&
        !apiCapabilities.includes("chat"));
  } else {
    // 如果沒有 API capabilities，使用舊的模式匹配邏輯
    // 檢查是否為 embedding 模型
    capabilities.isEmbedding = EMBEDDING_MODEL_PATTERNS.some((pattern) =>
      pattern.test(modelName)
    );

    // 檢查是否為視覺模型
    const isVisionModel = VISION_MODEL_PATTERNS.some((pattern) =>
      pattern.test(modelName)
    );

    // 檢查架構是否支援視覺
    const supportsVisionByArchitecture =
      modelInfo &&
      VISION_ARCHITECTURES.some((arch) =>
        modelInfo["general.architecture"]?.toLowerCase().includes(arch)
      );

    capabilities.supportsVision = isVisionModel || supportsVisionByArchitecture;
    capabilities.supportsImages = capabilities.supportsVision;

    // 如果不是 embedding 模型，通常就是 chat 模型
    capabilities.isChat = !capabilities.isEmbedding;
  }

  // 確定輸入類型
  if (capabilities.isEmbedding) {
    capabilities.inputTypes = ["text"];
  } else if (capabilities.isChat) {
    capabilities.inputTypes = ["text"];
    if (capabilities.supportsImages) {
      capabilities.inputTypes.push("image");
    }
  }

  // 從模板中獲取額外資訊
  if (template) {
    // 檢查模板是否包含圖片相關的標記
    const hasImageTokens =
      /\{\{\s*\.Images?\s*\}\}/i.test(template) || /image/i.test(template);

    if (hasImageTokens && !capabilities.supportsImages) {
      capabilities.supportsImages = true;
      capabilities.supportsVision = true;
      if (!capabilities.inputTypes.includes("image")) {
        capabilities.inputTypes.push("image");
      }
    }
  }

  return capabilities;
}

/**
 * 獲取模型類型的友好名稱
 */
export function getModelTypeLabel(capabilities: ModelCapabilities): string {
  if (capabilities.isEmbedding) {
    return "嵌入模型";
  }

  if (capabilities.isChat) {
    if (capabilities.supportsVision) {
      return "多模態對話模型";
    }
    return "對話模型";
  }

  return "未知類型";
}

/**
 * 獲取支援的輸入類型描述
 */
export function getInputTypesDescription(
  capabilities: ModelCapabilities
): string {
  const types = [];

  if (capabilities.inputTypes.includes("text")) {
    types.push("文字");
  }

  if (capabilities.inputTypes.includes("image")) {
    types.push("圖片");
  }

  return types.join("、") || "未知";
}
