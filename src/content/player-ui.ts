import { SPEED_PRESETS } from "../shared/constants";
import { formatSpeed, parseCustomSpeed } from "../shared/speed";

type SpeedHandler = (speed: number) => void;

export class PlayerUI {
  readonly root: HTMLDivElement;
  private readonly button: HTMLButtonElement;
  private readonly menu: HTMLDivElement;
  private readonly items = new Map<number, HTMLButtonElement>();
  private isOpen = false;
  private speed = 1;
  private abort = new AbortController();
  private menuAbort: AbortController | null = null;

  constructor(parent: HTMLElement, floating: boolean, private readonly onSpeed: SpeedHandler) {
    const existing = parent.querySelector<HTMLElement>("[data-beyond2x-control]");
    existing?.remove();
    this.root = document.createElement("div");
    this.root.className = `beyond2x-control${floating ? " beyond2x-control--floating" : ""}`;
    this.root.dataset.beyond2xControl = "";

    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.className = "beyond2x-button";
    this.button.setAttribute("aria-haspopup", "menu");
    this.button.setAttribute("aria-expanded", "false");
    this.button.addEventListener("click", () => this.toggle(), { signal: this.abort.signal });
    this.button.addEventListener("auxclick", (event) => {
      if (event.button === 1) {
        event.preventDefault();
        this.onSpeed(1);
      }
    }, { signal: this.abort.signal });
    this.button.addEventListener("wheel", (event) => {
      event.preventDefault();
      this.onSpeed(this.speed + (event.deltaY < 0 ? 0.25 : -0.25));
    }, { passive: false, signal: this.abort.signal });

    this.menu = this.createMenu();
    this.root.append(this.button, this.menu);
    parent.append(this.root);
    this.update(1);
  }

  update(speed: number): void {
    this.speed = speed;
    const label = formatSpeed(speed);
    this.button.textContent = label;
    this.button.setAttribute("aria-label", `Playback speed: ${label}`);
    this.items.forEach((item, preset) => {
      const selected = Math.abs(preset - speed) < 0.001;
      item.classList.toggle("is-selected", selected);
      item.setAttribute("aria-checked", String(selected));
    });
  }

  destroy(): void {
    this.abort.abort();
    this.menuAbort?.abort();
    this.root.remove();
  }

  private createMenu(): HTMLDivElement {
    const menu = document.createElement("div");
    menu.className = "beyond2x-menu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Playback speed options");
    menu.hidden = true;
    for (const preset of SPEED_PRESETS) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "beyond2x-menu-item";
      item.setAttribute("role", "menuitemradio");
      item.textContent = formatSpeed(preset);
      item.addEventListener("click", () => {
        this.onSpeed(preset);
        this.close();
      }, { signal: this.abort.signal });
      this.items.set(preset, item);
      menu.append(item);
    }
    const custom = document.createElement("form");
    custom.className = "beyond2x-custom";
    custom.innerHTML = '<label for="beyond2x-custom-rate">Custom</label><input id="beyond2x-custom-rate" inputmode="decimal" maxlength="5" placeholder="0.1–16×" aria-label="Custom playback speed"><button type="submit">Set</button>';
    custom.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = custom.querySelector<HTMLInputElement>("input");
      const speed = input ? parseCustomSpeed(input.value) : null;
      if (speed === null) {
        input?.setAttribute("aria-invalid", "true");
        input?.focus();
        return;
      }
      this.onSpeed(speed);
      this.close();
    }, { signal: this.abort.signal });
    menu.append(custom);
    return menu;
  }

  private toggle(): void {
    if (this.isOpen) this.close(); else this.open();
  }

  private open(): void {
    this.isOpen = true;
    this.menu.hidden = false;
    this.button.setAttribute("aria-expanded", "true");
    this.menuAbort?.abort();
    this.menuAbort = new AbortController();
    document.addEventListener("pointerdown", this.handleOutside, { capture: true, signal: this.menuAbort.signal });
    document.addEventListener("keydown", this.handleEscape, { capture: true, signal: this.menuAbort.signal });
    this.menu.querySelector<HTMLButtonElement>("button")?.focus();
  }

  private close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.menu.hidden = true;
    this.button.setAttribute("aria-expanded", "false");
    this.menuAbort?.abort();
    this.menuAbort = null;
  }

  private readonly handleOutside = (event: PointerEvent): void => {
    if (!this.root.contains(event.target as Node)) this.close();
  };

  private readonly handleEscape = (event: KeyboardEvent): void => {
    if (event.key === "Escape") this.close();
  };
}
