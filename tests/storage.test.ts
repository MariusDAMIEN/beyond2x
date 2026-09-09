import { afterEach, describe, expect, it, vi } from "vitest";
import { getSavedSpeed } from "../src/shared/storage";

describe("storage", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("falls back to the default for malformed stored values", async () => {
    vi.stubGlobal("chrome", {
      storage: { local: { get: vi.fn().mockResolvedValue({ playbackSpeed: "very fast" }) } }
    });
    await expect(getSavedSpeed()).resolves.toBe(1);
  });

  it("normalizes valid persisted values", async () => {
    vi.stubGlobal("chrome", {
      storage: { local: { get: vi.fn().mockResolvedValue({ playbackSpeed: 2.750000000004 }) } }
    });
    await expect(getSavedSpeed()).resolves.toBe(2.75);
  });
});
