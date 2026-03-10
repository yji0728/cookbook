import { useCallback, useEffect, useMemo, useState } from "react";

import type { ModelsOverview } from "../../types";
import { useOnboardingStore } from "../../stores/onboardingStore";
import {
  buildEnabledServersFingerprint,
  describeEnabledFeatures,
  getStartupModelRecommendations,
  type StartupModelRecommendation,
} from "../../modelRecommendations";
import {
  GgufDownloadProgressView,
  OllamaPullProgressView,
} from "../Onboarding/ModelProgressViews";

const DISMISS_PREFIX = "localcowork-startup-downloads-dismissed:";

function dismissalKey(enabledServers: readonly string[]): string {
  return `${DISMISS_PREFIX}${buildEnabledServersFingerprint(enabledServers)}`;
}

function wasDismissed(enabledServers: readonly string[]): boolean {
  try {
    return localStorage.getItem(dismissalKey(enabledServers)) === "true";
  } catch {
    return false;
  }
}

interface FeatureModelDownloadsProps {
  readonly overview: ModelsOverview;
}

export function FeatureModelDownloads({
  overview,
}: FeatureModelDownloadsProps): React.JSX.Element {
  const enabledServers = overview.enabledServers;
  const featureLabels = useMemo(
    () => describeEnabledFeatures(enabledServers),
    [enabledServers],
  );
  const recommendations = useMemo(
    () => getStartupModelRecommendations(enabledServers),
    [enabledServers],
  );

  const [dismissed, setDismissed] = useState(() => wasDismissed(enabledServers));

  const clearError = useOnboardingStore((s) => s.clearError);
  const error = useOnboardingStore((s) => s.error);
  const isDownloading = useOnboardingStore((s) => s.isDownloading);
  const downloadProgress = useOnboardingStore((s) => s.downloadProgress);
  const startDownload = useOnboardingStore((s) => s.startDownload);
  const checkOllama = useOnboardingStore((s) => s.checkOllama);
  const ollamaAvailable = useOnboardingStore((s) => s.ollamaAvailable);
  const isCheckingOllama = useOnboardingStore((s) => s.isCheckingOllama);
  const isPullingOllama = useOnboardingStore((s) => s.isPullingOllama);
  const ollamaPullProgress = useOnboardingStore((s) => s.ollamaPullProgress);
  const pullOllamaModel = useOnboardingStore((s) => s.pullOllamaModel);

  useEffect(() => {
    setDismissed(wasDismissed(enabledServers));
  }, [enabledServers]);

  useEffect(() => {
    if (recommendations.length > 0) {
      void checkOllama();
    }
  }, [checkOllama, recommendations.length]);

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(dismissalKey(enabledServers), "true");
    } catch {
      // localStorage can be unavailable in some shells
    }
    setDismissed(true);
  }, [enabledServers]);

  const handleDownload = useCallback(
    async (recommendation: StartupModelRecommendation): Promise<void> => {
      clearError();

      if (recommendation.kind === "ollama") {
        if (!recommendation.modelName) {
          return;
        }
        const unlisten = await pullOllamaModel(recommendation.modelName);
        if (unlisten) {
          unlisten();
        }
        return;
      }

      for (const asset of recommendation.downloads ?? []) {
        const unlisten = await startDownload(asset.url, false);
        if (unlisten) {
          unlisten();
        }
      }
    },
    [clearError, pullOllamaModel, startDownload],
  );

  if (recommendations.length === 0 || dismissed) {
    return <></>;
  }

  const isBusy = isDownloading || isPullingOllama;

  return (
    <section className="startup-downloads-banner" aria-label="Model downloads">
      <div className="startup-downloads-header">
        <div className="startup-downloads-copy">
          <span className="startup-downloads-kicker">Deployment setup</span>
          <h2>Download models for the enabled features</h2>
          <p>
            This build enables{" "}
            {featureLabels.map((label, index) => (
              <span key={label}>
                {index > 0 ? ", " : ""}
                {label}
              </span>
            ))}
            . Install the matching model packs here when the app starts.
          </p>
        </div>
        <button
          className="startup-downloads-dismiss"
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss startup downloads"
        >
          &times;
        </button>
      </div>

      {error ? <div className="onboarding-error">{error}</div> : null}

      {isPullingOllama ? (
        <div className="startup-downloads-progress">
          <OllamaPullProgressView progress={ollamaPullProgress} />
        </div>
      ) : null}
      {isDownloading ? (
        <div className="startup-downloads-progress">
          <GgufDownloadProgressView progress={downloadProgress} />
        </div>
      ) : null}

      <div className="startup-downloads-grid">
        {recommendations.map((recommendation) => (
          <article
            key={recommendation.id}
            className="startup-download-card"
          >
            <div className="startup-download-card-header">
              <h3>{recommendation.title}</h3>
              <span className="startup-download-pill">
                Needed for {recommendation.requiredBy.join(", ")}
              </span>
            </div>
            <p>{recommendation.description}</p>
            {recommendation.kind === "bundle" ? (
              <ul className="startup-download-assets">
                {(recommendation.downloads ?? []).map((asset) => (
                  <li key={asset.label}>{asset.label}</li>
                ))}
              </ul>
            ) : null}
            <div className="startup-download-actions">
              <button
                className="onboarding-btn primary"
                type="button"
                disabled={
                  isBusy ||
                  (recommendation.kind === "ollama" &&
                    (!ollamaAvailable || isCheckingOllama))
                }
                onClick={() => {
                  void handleDownload(recommendation);
                }}
              >
                {recommendation.buttonLabel}
              </button>
              {recommendation.kind === "ollama" ? (
                <button
                  className="onboarding-btn secondary"
                  type="button"
                  disabled={isBusy || isCheckingOllama}
                  onClick={() => {
                    void checkOllama();
                  }}
                >
                  {isCheckingOllama ? "Checking Ollama..." : "Refresh Ollama"}
                </button>
              ) : null}
              {recommendation.helpUrl ? (
                <a
                  className="startup-download-link"
                  href={recommendation.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open model page
                </a>
              ) : null}
            </div>
            {recommendation.kind === "ollama" && !ollamaAvailable ? (
              <p className="startup-download-note">
                Start Ollama first to enable one-click installation.
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
