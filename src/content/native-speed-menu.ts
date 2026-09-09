import { EXTENDED_SPEED_PRESETS } from "../shared/constants";
import { formatSpeed, normalizeSpeed } from "../shared/speed";

type SpeedHandler = (speed: number) => void;

export type NativeIntegrationState = "unknown" | "unavailable" | "active";

const DEBUG = false;
const CONTROL_SELECTOR = ".ytp-menuitem, button, [role='button'], [role='radio'], [role='option'], [role='menuitemradio'], [role='menuitem']";
const SURFACE_SELECTOR = ".ytp-panel-menu, .ytp-popup, .ytp-settings-menu, [role='dialog'], [role='menu'], ytd-menu-popup-renderer, tp-yt-paper-listbox";

function debug(message: string, details?: unknown): void {
  if (DEBUG) console.debug(`[Beyond2x] ${message}`, details ?? "");
}

function isRendered(element: HTMLElement): boolean {
  if (!element.isConnected || element.matches("[hidden], [aria-hidden='true']") || element.closest("[hidden], [aria-hidden='true']")) return false;
  const style = getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden";
}

function parseSpeed(text: string): number | null {
  const normalized = text.trim().replace(/\s+/g, " ").replace(/,/g, ".").replace(/[×x]$/i, "");
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  const speed = Number(normalized);
  return Number.isFinite(speed) && speed >= 0.1 && speed <= 16 ? normalizeSpeed(speed) : null;
}

function speedFromControl(control: HTMLElement): number | null {
  const sources = [control.getAttribute("aria-label"), control.textContent];
  for (const source of sources) {
    if (!source) continue;
    const direct = parseSpeed(source);
    if (direct !== null) return direct;
    const match = source.replace(",", ".").match(/(?:^|\s)(\d+(?:\.\d+)?)(?:\s|[×x]|$)/);
    if (match) {
      const speed = parseSpeed(match[1]);
      if (speed !== null) return speed;
    }
  }
  return null;
}

function collectSpeedControls(scope: ParentNode): HTMLElement[] {
  return Array.from(scope.querySelectorAll<HTMLElement>(CONTROL_SELECTOR)).filter((control) => {
    return !control.dataset.beyond2xNative && isRendered(control) && speedFromControl(control) !== null;
  });
}

function speedSet(controls: HTMLElement[]): Set<number> {
  return new Set(controls.map(speedFromControl).filter((speed): speed is number => speed !== null));
}

function isSpeedSurface(controls: HTMLElement[]): boolean {
  const speeds = speedSet(controls);
  return speeds.size >= 3 && (speeds.has(1) || speeds.has(1.25) || speeds.has(1.5));
}

function getItemParent(controls: HTMLElement[]): HTMLElement | null {
  const parents = new Map<HTMLElement, number>();
  for (const control of controls) {
    const parent = control.parentElement;
    if (parent instanceof HTMLElement) parents.set(parent, (parents.get(parent) ?? 0) + 1);
  }
  return [...parents.entries()].sort(([, left], [, right]) => right - left)[0]?.[0] ?? null;
}

export interface NativeSpeedSurface {
  container: HTMLElement;
  itemParent: HTMLElement;
  nativeItems: HTMLElement[];
  existingSpeeds: Set<number>;
  kind: "list" | "chips";
}

/** Finds a visible playback speed surface by numeric controls, independent of translated menu text. */
export function findNativeSpeedSurface(root: ParentNode = document): NativeSpeedSurface | null {
  const candidates = new Set<HTMLElement>();
  for (const surface of Array.from(root.querySelectorAll<HTMLElement>(SURFACE_SELECTOR))) candidates.add(surface);
  for (const control of collectSpeedControls(root)) {
    const parent = control.parentElement;
    if (parent instanceof HTMLElement) candidates.add(parent);
    const grandparent = parent?.parentElement;
    if (grandparent instanceof HTMLElement) candidates.add(grandparent);
  }

  for (const container of candidates) {
    if (!isRendered(container)) continue;
    const nativeItems = collectSpeedControls(container);
    if (!isSpeedSurface(nativeItems)) continue;
    const itemParent = getItemParent(nativeItems);
    if (!itemParent) continue;
    const kind = nativeItems.some((item) => item.matches("button, [role='button'], [role='radio'], [role='option']")) ? "chips" : "list";
    debug(`native ${kind} speed candidate detected`, [...speedSet(nativeItems)]);
    return { container, itemParent, nativeItems, existingSpeeds: speedSet(nativeItems), kind };
  }
  return null;
}

export class NativeSpeedMenu {
  private player: HTMLElement | null = null;
  private surface: HTMLElement | null = null;
  private state: NativeIntegrationState = "unknown";
  private entryAbort: AbortController | null = null;

  constructor(private readonly onSpeed: SpeedHandler) {}

  sync(player: HTMLElement, speed: number): NativeIntegrationState {
    if (this.player !== player) this.reset();
    this.player = player;
    const found = findNativeSpeedSurface(player) ?? findNativeSpeedSurface(document);
    if (!found) return this.setUnavailable("native integration unavailable, fallback active");

    const expected = EXTENDED_SPEED_PRESETS.filter((speed) => !found.existingSpeeds.has(speed));
    if (this.surface !== found.container || !this.verify(found.container, expected)) {
      this.removeEntries();
      this.surface = found.container;
      const injected = this.injectMissingSpeeds(found);
      if (!this.verify(found.container, injected)) return this.setUnavailable("native injection was not verified, fallback active");
      debug("native integration verified", injected);
    }

    this.state = "active";
    this.update(speed);
    return this.state;
  }

  update(speed: number): void {
    if (this.state !== "active" || !this.surface) return;
    const current = normalizeSpeed(speed);
    this.surface.querySelectorAll<HTMLElement>("[data-beyond2x-native='true'][data-beyond2x-speed]").forEach((item) => {
      const selected = Math.abs(Number(item.dataset.beyond2xSpeed) - current) < 0.001;
      item.classList.toggle("beyond2x-native-speed--selected", selected);
      item.setAttribute("aria-checked", String(selected));
    });
  }

  reset(): void {
    this.removeEntries();
    this.player = null;
    this.surface = null;
    this.state = "unknown";
  }

  destroy(): void {
    this.reset();
  }

  private injectMissingSpeeds(found: NativeSpeedSurface): number[] {
    const missing = EXTENDED_SPEED_PRESETS.filter((speed) => !found.existingSpeeds.has(speed));
    if (missing.length === 0) return [];
    this.entryAbort = new AbortController();
    for (const speed of missing) found.itemParent.append(this.createEntry(speed, found.kind));
    debug(`injected speeds: ${missing.join(", ")}`);
    return missing;
  }

  private createEntry(speed: number, kind: NativeSpeedSurface["kind"]): HTMLElement {
    const item = document.createElement(kind === "chips" ? "button" : "div");
    item.className = `beyond2x-native-speed${kind === "chips" ? " beyond2x-native-chip" : " ytp-menuitem"}`;
    item.dataset.beyond2xNative = "true";
    item.dataset.beyond2xSpeed = String(speed);
    if (item instanceof HTMLButtonElement) item.type = "button";
    item.tabIndex = 0;
    item.setAttribute("role", "menuitemradio");
    item.setAttribute("aria-label", `Playback speed: ${formatSpeed(speed)}`);
    item.textContent = formatSpeed(speed);
    const choose = (): void => this.onSpeed(speed);
    item.addEventListener("click", choose, { signal: this.entryAbort?.signal });
    item.addEventListener("keydown", (event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
        keyboardEvent.preventDefault();
        choose();
      }
    }, { signal: this.entryAbort?.signal });
    return item;
  }

  private verify(container: HTMLElement, expected: number[]): boolean {
    if (expected.length === 0) return false;
    const actual = new Set(Array.from(container.querySelectorAll<HTMLElement>("[data-beyond2x-native='true'][data-beyond2x-speed]"))
      .filter(isRendered)
      .map((item) => Number(item.dataset.beyond2xSpeed)));
    return expected.every((speed) => actual.has(speed));
  }

  private setUnavailable(message: string): NativeIntegrationState {
    this.removeEntries();
    this.surface = null;
    this.state = "unavailable";
    debug(message);
    return this.state;
  }

  private removeEntries(): void {
    this.entryAbort?.abort();
    this.entryAbort = null;
    this.surface?.querySelectorAll("[data-beyond2x-native='true']").forEach((element) => element.remove());
  }
}
