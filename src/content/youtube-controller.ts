import { DEFAULT_SPEED } from "../shared/constants";
import { decreaseSpeed, increaseSpeed, normalizeSpeed } from "../shared/speed";
import { getSavedSpeed, saveSpeed } from "../shared/storage";
import { observeYouTubeNavigation } from "./navigation";
import { NativeIntegrationState, NativeSpeedMenu } from "./native-speed-menu";
import { findActiveVideo, findPlayer, findPlayerControls, isShortsPage } from "./player-finder";
import { PlayerUI } from "./player-ui";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

export class YouTubeController {
  private video: HTMLVideoElement | null = null;
  private ui: PlayerUI | null = null;
  private readonly nativeMenu = new NativeSpeedMenu((speed) => this.applySpeed(speed, true));
  private listenerAbort: AbortController | null = null;
  private selectedSpeed = DEFAULT_SPEED;
  private queued = false;
  private readonly observer = new MutationObserver(() => this.scheduleSync());
  private readonly stopNavigation: () => void;

  constructor() {
    this.stopNavigation = observeYouTubeNavigation(() => this.scheduleSync());
  }

  async start(): Promise<void> {
    this.selectedSpeed = await getSavedSpeed();
    this.observer.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener("keydown", this.handleShortcut, true);
    document.addEventListener("fullscreenchange", () => this.scheduleSync());
    this.sync();
  }

  stop(): void {
    this.observer.disconnect();
    this.stopNavigation();
    this.listenerAbort?.abort();
    this.ui?.destroy();
    this.nativeMenu.destroy();
    document.removeEventListener("keydown", this.handleShortcut, true);
  }

  private scheduleSync(): void {
    if (this.queued) return;
    this.queued = true;
    requestAnimationFrame(() => {
      this.queued = false;
      this.sync();
    });
  }

  private sync(): void {
    const nextVideo = findActiveVideo();
    if (!nextVideo) {
      this.removeUi();
      return;
    }
    if (nextVideo !== this.video) this.bindVideo(nextVideo);
    this.ensureUi(nextVideo);
  }

  private bindVideo(video: HTMLVideoElement): void {
    this.listenerAbort?.abort();
    this.nativeMenu.reset();
    this.video = video;
    const abort = new AbortController();
    this.listenerAbort = abort;
    const restore = (): void => this.applySpeed(this.selectedSpeed, false);
    video.addEventListener("loadedmetadata", restore, { signal: abort.signal });
    video.addEventListener("ratechange", () => {
      this.selectedSpeed = normalizeSpeed(video.playbackRate);
      this.ui?.update(this.selectedSpeed);
      this.nativeMenu.update(this.selectedSpeed);
      void saveSpeed(this.selectedSpeed);
    }, { signal: abort.signal });
    this.applySpeed(this.selectedSpeed, false);
  }

  private ensureUi(video: HTMLVideoElement): void {
    const player = findPlayer(video);
    if (!player) return;
    const controls = findPlayerControls(player);
    this.ensureFallback(player, controls, video);
    let nativeState: NativeIntegrationState = "unavailable";
    try {
      nativeState = this.nativeMenu.sync(player, normalizeSpeed(video.playbackRate));
    } catch {
      // The fallback is already visible; a transient player DOM change must not remove it.
      nativeState = "unavailable";
    }
    if (nativeState === "active") {
      this.removeUi();
    }
  }

  private ensureFallback(player: HTMLElement, controls: HTMLElement | null, video: HTMLVideoElement): void {
    const parent = controls ?? player;
    const floating = !controls || isShortsPage();
    if (this.ui && this.ui.root.parentElement === parent && this.ui.root.classList.contains("beyond2x-control--floating") === floating) {
      this.ui.update(normalizeSpeed(video.playbackRate));
      return;
    }
    this.removeUi();
    this.ui = new PlayerUI(parent, floating, (speed) => this.applySpeed(speed, true));
    this.ui.update(normalizeSpeed(video.playbackRate));
  }

  private removeUi(): void {
    this.ui?.destroy();
    this.ui = null;
  }

  private applySpeed(speed: number, persist: boolean): void {
    const normalized = normalizeSpeed(speed);
    this.selectedSpeed = normalized;
    if (this.video) this.video.playbackRate = normalized;
    this.ui?.update(normalized);
    this.nativeMenu.update(normalized);
    if (persist) void saveSpeed(normalized);
  }

  private readonly handleShortcut = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || isEditableTarget(event.target)) return;
    if (event.key === "]") {
      event.preventDefault();
      this.applySpeed(increaseSpeed(this.video?.playbackRate ?? this.selectedSpeed), true);
    } else if (event.key === "[") {
      event.preventDefault();
      this.applySpeed(decreaseSpeed(this.video?.playbackRate ?? this.selectedSpeed), true);
    } else if (event.key === "\\") {
      event.preventDefault();
      this.applySpeed(1, true);
    }
  };
}
