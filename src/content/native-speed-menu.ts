import { EXTENDED_SPEED_PRESETS } from "../shared/constants";
import { formatSpeed, normalizeSpeed } from "../shared/speed";

type SpeedHandler = (speed: number) => void;

const SPEED_ITEM_SELECTOR = ".ytp-menuitem, [role='menuitemradio'], [role='menuitem']";
const MENU_SELECTOR = ".ytp-panel-menu, [role='menu'], ytd-menu-popup-renderer, tp-yt-paper-listbox";
const NATIVE_SPEEDS = new Set([0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);

function isConnected(element: Element): element is HTMLElement {
  return element instanceof HTMLElement && element.isConnected;
}

function speedFromText(text: string): number | null {
  const normalized = text.trim().replace(/\s+/g, " ").replace(/[×x]$/i, "").replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  const speed = Number(normalized);
  return NATIVE_SPEEDS.has(speed) ? speed : null;
}

function speedFromItem(item: HTMLElement): number | null {
  const sources = [item.getAttribute("aria-label"), item.textContent];
  for (const source of sources) {
    if (!source) continue;
    const direct = speedFromText(source);
    if (direct !== null) return direct;
    const match = source.match(/(?:^|\s)(0[.,]25|0[.,]5|0[.,]75|1[.,]25|1[.,]5|1[.,]75|2)(?:\s|[×x]|$)/);
    if (match) return speedFromText(match[1]);
  }
  return null;
}

export interface NativeSpeedList {
  container: HTMLElement;
  itemParent: HTMLElement;
  nativeItems: HTMLElement[];
}

/** Finds a rendered speed list from its numeric structure rather than its translated labels. */
export function findNativeSpeedList(root: ParentNode = document): NativeSpeedList | null {
  const menus = Array.from(root.querySelectorAll(MENU_SELECTOR)).filter(isConnected);
  for (const container of menus) {
    const items = Array.from(container.querySelectorAll<HTMLElement>(SPEED_ITEM_SELECTOR));
    const nativeItems = items.filter((item) => !item.dataset.beyond2xSpeed && speedFromItem(item) !== null);
    const knownSpeeds = new Set(nativeItems.map(speedFromItem).filter((speed): speed is number => speed !== null));
    if (knownSpeeds.size < 3) continue;
    const itemParent = nativeItems[0]?.parentElement;
    if (itemParent instanceof HTMLElement) return { container, itemParent, nativeItems };
  }
  return null;
}

export class NativeSpeedMenu {
  private player: HTMLElement | null = null;
  private list: HTMLElement | null = null;
  private integrated = false;
  private abort = new AbortController();

  constructor(private readonly onSpeed: SpeedHandler) {}

  sync(player: HTMLElement, speed: number): boolean {
    if (this.player !== player) this.reset();
    this.player = player;
    const found = findNativeSpeedList(player) ?? findNativeSpeedList(document);
    if (!found) return this.integrated;

    if (this.list !== found.container || !found.container.querySelector("[data-beyond2x-speed]")) {
      this.removeEntries();
      this.list = found.container;
      this.inject(found);
      this.integrated = true;
    }
    this.update(speed);
    return true;
  }

  update(speed: number): void {
    if (!this.list) return;
    const current = normalizeSpeed(speed);
    this.list.querySelectorAll<HTMLElement>("[data-beyond2x-speed]").forEach((item) => {
      const selected = Math.abs(Number(item.dataset.beyond2xSpeed) - current) < 0.001;
      item.classList.toggle("beyond2x-native-speed--selected", selected);
      item.setAttribute("aria-checked", String(selected));
    });
  }

  reset(): void {
    this.removeEntries();
    this.player = null;
    this.list = null;
    this.integrated = false;
  }

  destroy(): void {
    this.reset();
    this.abort.abort();
  }

  private inject(found: NativeSpeedList): void {
    const divider = document.createElement("div");
    divider.className = "beyond2x-native-divider";
    divider.dataset.beyond2xNative = "divider";
    divider.setAttribute("role", "separator");
    found.itemParent.append(divider);

    for (const speed of EXTENDED_SPEED_PRESETS) {
      const item = document.createElement("div");
      item.className = "ytp-menuitem beyond2x-native-speed";
      item.dataset.beyond2xSpeed = String(speed);
      item.tabIndex = 0;
      item.setAttribute("role", "menuitemradio");
      item.setAttribute("aria-label", `Playback speed: ${formatSpeed(speed)}`);
      const label = document.createElement("div");
      label.className = "ytp-menuitem-label beyond2x-native-speed__label";
      label.textContent = formatSpeed(speed);
      item.append(label);
      const choose = (): void => this.onSpeed(speed);
      item.addEventListener("click", choose, { signal: this.abort.signal });
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          choose();
        }
      }, { signal: this.abort.signal });
      found.itemParent.append(item);
    }
  }

  private removeEntries(): void {
    this.list?.querySelectorAll("[data-beyond2x-speed], [data-beyond2x-native='divider']").forEach((element) => element.remove());
  }
}
