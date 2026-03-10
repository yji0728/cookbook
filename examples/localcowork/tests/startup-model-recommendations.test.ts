import { describe, expect, it } from "vitest";

import {
  buildEnabledServersFingerprint,
  describeEnabledFeatures,
  getStartupModelRecommendations,
} from "../src/modelRecommendations";

describe("startup model recommendations", () => {
  it("returns no download prompts when no servers are enabled", () => {
    expect(getStartupModelRecommendations([])).toEqual([]);
  });

  it("always recommends the core agent model when tools are enabled", () => {
    const recommendations = getStartupModelRecommendations([
      "filesystem",
      "document",
    ]);

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]?.id).toBe("core-agent");
    expect(recommendations[0]?.kind).toBe("ollama");
  });

  it("adds the vision pack when OCR is enabled", () => {
    const recommendations = getStartupModelRecommendations([
      "filesystem",
      "ocr",
    ]);

    expect(recommendations.map((item) => item.id)).toEqual([
      "core-agent",
      "vision-ocr",
    ]);
    expect(recommendations[1]?.downloads).toHaveLength(2);
  });

  it("uses a stable fingerprint regardless of server ordering", () => {
    expect(
      buildEnabledServersFingerprint(["ocr", "filesystem", "audit"]),
    ).toBe(buildEnabledServersFingerprint(["audit", "ocr", "filesystem"]));
  });

  it("describes enabled server features for the startup banner copy", () => {
    expect(describeEnabledFeatures(["filesystem", "ocr"])).toEqual([
      "file operations",
      "OCR and image understanding",
    ]);
  });
});
