export type Provider = "google" | "groq" | "anthropic";

export type ModelConfig = {
  id: string;
  name: string;
  provider: Provider;
  providerLabel?: string;
  providerColor: string;
  inputPricePer1M: number;
  outputPricePer1M: number;
  contextWindow: string;
  description: string;
  isFree: boolean;
  isDefault: boolean;
  supportsVision?: boolean;
  badge?: string;
};

export const MODELS = [
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    provider: "google",
    providerColor: "#4285f4",
    inputPricePer1M: 1.5,
    outputPricePer1M: 9,
    contextWindow: "1M",
    description: "Flagship value model - ultimate balance of intelligence, speed, and deep thinking capabilities.",
    isFree: false,
    isDefault: true,
    badge: "Recommended"
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash-Lite",
    provider: "google",
    providerColor: "#4285f4",
    inputPricePer1M: 0.25,
    outputPricePer1M: 1.5,
    contextWindow: "1M",
    description: "High-volume agentic tasks - ultra-low latency option optimized for massive scale.",
    isFree: false,
    isDefault: false
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    providerColor: "#4285f4",
    inputPricePer1M: 0.3,
    outputPricePer1M: 2.5,
    contextWindow: "1M",
    description: "Proven reasoning staple - exceptional price-to-performance ratio with 1M token context.",
    isFree: false,
    isDefault: false
  },
  {
    id: "groq/compound-beta",
    name: "Compound Beta",
    provider: "groq",
    providerLabel: "Groq",
    providerColor: "#f55036",
    inputPricePer1M: 0,
    outputPricePer1M: 0,
    description: "Agentic - built-in web search - auto tool use.",
    contextWindow: "128K",
    isFree: true,
    isDefault: false,
    supportsVision: false,
    badge: "New"
  },
  {
    id: "meta-llama/llama-4-scout-17b-16e-instruct",
    name: "Llama 4 Scout",
    provider: "groq",
    providerLabel: "Groq",
    providerColor: "#f55036",
    inputPricePer1M: 0,
    outputPricePer1M: 0,
    description: "Llama 4 - MoE architecture - vision - 128K.",
    contextWindow: "128K",
    isFree: true,
    isDefault: false,
    supportsVision: true
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B",
    provider: "groq",
    providerLabel: "Groq",
    providerColor: "#f55036",
    inputPricePer1M: 0,
    outputPricePer1M: 0,
    description: "Best Llama 3 - ultra-fast inference - 128K.",
    contextWindow: "128K",
    isFree: true,
    isDefault: false,
    supportsVision: false,
    badge: "Fast"
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B Instant",
    provider: "groq",
    providerLabel: "Groq",
    providerColor: "#f55036",
    inputPricePer1M: 0,
    outputPricePer1M: 0,
    description: "Lightning-fast - great for simple tasks - 128K.",
    contextWindow: "128K",
    isFree: true,
    isDefault: false,
    supportsVision: false
  },
  {
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    provider: "anthropic",
    providerLabel: "Anthropic",
    providerColor: "#c85a3a",
    inputPricePer1M: 3,
    outputPricePer1M: 15,
    description: "Balanced performance - 200K.",
    contextWindow: "200K",
    isFree: false,
    isDefault: false,
    supportsVision: true,
    badge: "Balanced"
  },
  {
    id: "claude-opus-4-6",
    name: "Claude Opus 4.6",
    provider: "anthropic",
    providerLabel: "Anthropic",
    providerColor: "#c85a3a",
    inputPricePer1M: 15,
    outputPricePer1M: 75,
    description: "Most capable - 200K.",
    contextWindow: "200K",
    isFree: false,
    isDefault: false,
    supportsVision: true
  },
  {
    id: "claude-haiku-4-5-20251001",
    name: "Claude Haiku 4.5",
    provider: "anthropic",
    providerLabel: "Anthropic",
    providerColor: "#c85a3a",
    inputPricePer1M: 0.8,
    outputPricePer1M: 4,
    description: "Fastest Anthropic model - 200K.",
    contextWindow: "200K",
    isFree: false,
    isDefault: false,
    supportsVision: true
  }
] satisfies ModelConfig[];

export type ModelId = (typeof MODELS)[number]["id"];

export const DEFAULT_MODEL_ID: ModelId = MODELS.find((model) => model.isDefault)?.id ?? "gemini-3.5-flash";

export function getModelById(modelId: string) {
  return MODELS.find((model) => model.id === modelId) ?? MODELS.find((model) => model.isDefault) ?? MODELS[0];
}

export function estimateModelCost(modelId: string, inputTokens: number, outputTokens: number) {
  const model = getModelById(modelId);
  return (inputTokens / 1_000_000) * model.inputPricePer1M + (outputTokens / 1_000_000) * model.outputPricePer1M;
}
