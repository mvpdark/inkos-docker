/**
 * Kimi Coding Plan
 *
 * - 官网：https://platform.moonshot.cn/
 * - Kimi For Coding 会员订阅套餐（sk-kimi- 前缀 key）。
 * - 端点：https://api.kimi.com/coding/（Anthropic Messages 协议）
 */
import type { InkosEndpoint } from "../types.js";

export const KIMI_CODING_PLAN: InkosEndpoint = {
  id: "kimiCodingPlan",
  label: "Kimi Coding Plan",
  group: "codingPlan",
  api: "anthropic-messages",
  baseUrl: "https://api.kimi.com/coding/",
  checkModel: "kimi-k2.6",
  temperatureRange: [0, 1],
  defaultTemperature: 1,
  writingTemperature: 1,
  temperatureHint: "kimi-k2.x 推荐 temperature=1.0",
  models: [
    { id: "kimi-k2.7-code", maxOutput: 32768, contextWindowTokens: 262144, enabled: true, releasedAt: "2026-06-20", temperature: 1 },
    { id: "kimi-k2.6", maxOutput: 32768, contextWindowTokens: 262144, enabled: true, releasedAt: "2026-04-20", temperature: 1 },
    { id: "kimi-k2.5", maxOutput: 32768, contextWindowTokens: 262144, enabled: true, releasedAt: "2026-01-27", deploymentName: "k2p5", temperature: 1 },
    { id: "kimi-for-coding", maxOutput: 32768, contextWindowTokens: 262144, enabled: true, releasedAt: "2026-01-01", temperature: 1 },
  ],
};
