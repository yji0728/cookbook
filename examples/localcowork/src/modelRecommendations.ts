import { FALLBACK_OLLAMA_MODEL } from "./stores/onboardingStore";

export interface DownloadableAsset {
  readonly label: string;
  readonly url: string;
}

export interface StartupModelRecommendation {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly requiredBy: readonly string[];
  readonly kind: "ollama" | "bundle";
  readonly buttonLabel: string;
  readonly modelName?: string;
  readonly downloads?: readonly DownloadableAsset[];
  readonly helpUrl?: string;
}

const SERVER_FEATURE_LABELS: Readonly<Record<string, string>> = {
  filesystem: "file operations",
  document: "document extraction",
  ocr: "OCR and image understanding",
  knowledge: "semantic search",
  meeting: "meeting analysis",
  security: "security scans",
  calendar: "calendar workflows",
  email: "email workflows",
  task: "task management",
  data: "structured data work",
  audit: "audit reporting",
  clipboard: "clipboard automation",
  system: "system actions",
};

const VISION_SERVERS = new Set(["ocr"]);

const VISION_DOWNLOADS: readonly DownloadableAsset[] = [
  {
    label: "LFM2.5-VL-1.6B-Q8_0.gguf",
    url: "https://huggingface.co/LiquidAI/LFM2.5-VL-1.6B-GGUF/resolve/main/LFM2.5-VL-1.6B-Q8_0.gguf?download=true",
  },
  {
    label: "mmproj-LFM2.5-VL-1.6B-Q8_0.gguf",
    url: "https://huggingface.co/LiquidAI/LFM2.5-VL-1.6B-GGUF/resolve/main/mmproj-LFM2.5-VL-1.6b-Q8_0.gguf?download=true",
  },
];

export function buildEnabledServersFingerprint(
  enabledServers: readonly string[],
): string {
  return [...enabledServers].sort().join(",");
}

export function describeEnabledFeatures(
  enabledServers: readonly string[],
): readonly string[] {
  return enabledServers.map((name) => SERVER_FEATURE_LABELS[name] ?? name);
}

export function getStartupModelRecommendations(
  enabledServers: readonly string[],
): readonly StartupModelRecommendation[] {
  if (enabledServers.length === 0) {
    return [];
  }

  const recommendations: StartupModelRecommendation[] = [
    {
      id: "core-agent",
      title: "Core agent model",
      description:
        "Install a tool-calling model for the enabled LocalCowork servers. " +
        "This Ollama path is the fastest way to make the packaged app usable after deployment.",
      requiredBy: enabledServers,
      kind: "ollama",
      modelName: FALLBACK_OLLAMA_MODEL,
      buttonLabel: "Install Qwen3-30B-A3B in Ollama",
      helpUrl: "https://ollama.com/library/qwen3",
    },
  ];

  const visionRequiredBy = enabledServers.filter((server) =>
    VISION_SERVERS.has(server),
  );
  if (visionRequiredBy.length > 0) {
    recommendations.push({
      id: "vision-ocr",
      title: "Vision OCR pack",
      description:
        "OCR is enabled in this deployment, so the app also needs the lightweight " +
        "LFM2.5-VL model plus its projector weights.",
      requiredBy: visionRequiredBy,
      kind: "bundle",
      downloads: VISION_DOWNLOADS,
      buttonLabel: "Download LFM2.5-VL vision pack",
      helpUrl: "https://huggingface.co/LiquidAI/LFM2.5-VL-1.6B-GGUF",
    });
  }

  return recommendations;
}
