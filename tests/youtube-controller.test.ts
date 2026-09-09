import { afterEach, describe, expect, it, vi } from "vitest";
import { YouTubeController } from "../src/content/youtube-controller";

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 25));

describe("YouTubeController", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  it("injects once, restores speed, and reinjects when YouTube replaces its player", async () => {
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({ playbackSpeed: 1.5 }),
          set: vi.fn().mockResolvedValue(undefined)
        }
      }
    });
    document.body.innerHTML = '<div id="movie_player" class="html5-video-player"><video></video><div class="ytp-right-controls"></div></div>';
    const controller = new YouTubeController();
    await controller.start();
    expect(document.querySelectorAll("[data-beyond2x-control]")).toHaveLength(1);
    expect(document.querySelector<HTMLVideoElement>("video")?.playbackRate).toBe(1.5);

    document.body.innerHTML = '<div id="movie_player" class="html5-video-player"><video></video><div class="ytp-right-controls"></div></div>';
    await tick();
    expect(document.querySelectorAll("[data-beyond2x-control]")).toHaveLength(1);
    expect(document.querySelector<HTMLVideoElement>("video")?.playbackRate).toBe(1.5);
    controller.stop();
  });

  it("uses the native menu extension when a supported speed panel is open", async () => {
    vi.stubGlobal("chrome", {
      storage: { local: { get: vi.fn().mockResolvedValue({ playbackSpeed: 1 }), set: vi.fn().mockResolvedValue(undefined) } }
    });
    document.body.innerHTML = '<div id="movie_player" class="html5-video-player"><video></video><div class="ytp-right-controls"></div><div class="ytp-panel-menu"><div><div class="ytp-menuitem">0.25</div><div class="ytp-menuitem">1.5</div><div class="ytp-menuitem">2</div></div></div></div>';
    const controller = new YouTubeController();
    await controller.start();
    expect(document.querySelectorAll("[data-beyond2x-speed]")).toHaveLength(7);
    expect(document.querySelectorAll("[data-beyond2x-control]")).toHaveLength(0);
    document.querySelector<HTMLElement>("[data-beyond2x-speed='3']")?.click();
    expect(document.querySelector<HTMLVideoElement>("video")?.playbackRate).toBe(3);
    controller.stop();
  });

  it("uses the floating fallback for Shorts when native integration is unavailable", async () => {
    vi.stubGlobal("chrome", {
      storage: { local: { get: vi.fn().mockResolvedValue({ playbackSpeed: 1 }), set: vi.fn().mockResolvedValue(undefined) } }
    });
    history.pushState({}, "", "/shorts/example");
    document.body.innerHTML = '<ytd-reel-video-renderer class="html5-video-player"><video></video></ytd-reel-video-renderer>';
    const controller = new YouTubeController();
    await controller.start();
    expect(document.querySelector(".beyond2x-control--floating")).not.toBeNull();
    controller.stop();
    history.pushState({}, "", "/watch?v=example");
  });
});
