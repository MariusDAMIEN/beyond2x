import { SPEED_PRESETS } from "../shared/constants";
import { decreaseSpeed, formatSpeed, increaseSpeed, parseCustomSpeed } from "../shared/speed";
import { formatGaugeSpeed, gaugeAngleToSpeed, snapGaugeSpeed, speedToGaugeAngle, speedToGaugeRatio } from "./gauge";

type SpeedHandler = (speed: number) => void;

const SVG_NS = "http://www.w3.org/2000/svg";
const GAUGE_ARC = 342.08;

function svgElement(name: string, attributes: Record<string, string>): SVGElement {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function gaugeTickMarkup(): SVGElement[] {
  return Array.from({ length: 25 }, (_, index) => {
    const major = index % 4 === 0;
    const angle = -140 + index * (280 / 24);
    return svgElement("line", {
      x1: "90", y1: major ? "17" : "21", x2: "90", y2: major ? "25" : "27",
      class: major ? "beyond2x-gauge-tick beyond2x-gauge-tick--major" : "beyond2x-gauge-tick",
      transform: `rotate(${angle} 90 90)`
    });
  });
}

export class PlayerUI {
  readonly root: HTMLDivElement;
  private readonly button: HTMLButtonElement;
  private readonly miniValue: HTMLSpanElement;
  private readonly menu: HTMLDivElement;
  private readonly gauge: HTMLDivElement;
  private readonly gaugeReadout: HTMLSpanElement;
  private readonly velocityMarker: HTMLSpanElement;
  private readonly items = new Map<number, HTMLButtonElement>();
  private isOpen = false;
  private speed = 1;
  private abort = new AbortController();
  private menuAbort: AbortController | null = null;
  private dragging = false;
  private dragFrame: number | null = null;
  private pendingDragSpeed: number | null = null;

  constructor(parent: HTMLElement, floating: boolean, private readonly onSpeed: SpeedHandler) {
    parent.querySelector<HTMLElement>("[data-beyond2x-control]")?.remove();
    this.root = document.createElement("div");
    this.root.className = `beyond2x-control${floating ? " beyond2x-control--floating" : ""}`;
    this.root.dataset.beyond2xControl = "";

    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.className = "beyond2x-button";
    this.button.setAttribute("aria-haspopup", "menu");
    this.button.setAttribute("aria-expanded", "false");
    const miniGauge = document.createElement("span");
    miniGauge.className = "beyond2x-mini-gauge";
    this.miniValue = document.createElement("span");
    this.miniValue.className = "beyond2x-mini-value";
    miniGauge.append(this.miniValue);
    this.button.append(miniGauge);
    this.button.addEventListener("click", () => this.toggle(), { signal: this.abort.signal });
    this.button.addEventListener("auxclick", (event) => {
      if (event.button === 1) {
        event.preventDefault();
        this.onSpeed(1);
      }
    }, { signal: this.abort.signal });
    this.button.addEventListener("wheel", (event) => {
      event.preventDefault();
      this.onSpeed(event.deltaY < 0 ? increaseSpeed(this.speed) : decreaseSpeed(this.speed));
    }, { passive: false, signal: this.abort.signal });

    this.menu = document.createElement("div");
    this.menu.className = "beyond2x-menu";
    this.menu.setAttribute("role", "menu");
    this.menu.setAttribute("aria-label", "Beyond2x playback velocity control");
    this.menu.hidden = true;
    this.gauge = this.createGauge();
    this.menu.append(this.createPanelHeader(), this.gauge, this.createVelocityRail());
    this.gaugeReadout = this.menu.querySelector<HTMLSpanElement>(".beyond2x-gauge-readout")!;
    this.velocityMarker = this.menu.querySelector<HTMLSpanElement>(".beyond2x-velocity-marker")!;
    this.menu.append(this.createPresetGrid(), this.createPrecisionControl(), this.createPointer());
    this.root.append(this.button, this.menu);
    parent.append(this.root);
    this.bindPointerEffects();
    this.update(1);
  }

  update(speed: number): void {
    this.speed = speed;
    const ratio = speedToGaugeRatio(speed);
    const angle = speedToGaugeAngle(speed);
    const label = formatSpeed(speed);
    this.root.style.setProperty("--b2x-gauge-progress", ratio.toFixed(4));
    this.root.style.setProperty("--b2x-gauge-angle", `${angle.toFixed(2)}deg`);
    this.root.style.setProperty("--b2x-arc-offset", `${(GAUGE_ARC * (1 - ratio)).toFixed(2)}`);
    this.root.style.setProperty("--b2x-energy", ratio.toFixed(3));
    this.root.dataset.energy = ratio > 0.76 ? "surge" : ratio > 0.52 ? "drive" : "cruise";
    this.miniValue.textContent = label;
    this.gaugeReadout.textContent = formatGaugeSpeed(speed);
    this.velocityMarker.style.setProperty("--b2x-rail-position", `${(ratio * 100).toFixed(2)}%`);
    this.button.setAttribute("aria-label", `Playback speed: ${label}. Open Beyond2x instrument panel`);
    this.gauge.setAttribute("aria-valuenow", String(speed));
    this.gauge.setAttribute("aria-valuetext", `Playback speed ${formatGaugeSpeed(speed)}`);
    this.items.forEach((item, preset) => {
      const selected = Math.abs(preset - speed) < 0.001;
      item.classList.toggle("is-selected", selected);
      item.setAttribute("aria-checked", String(selected));
    });
  }

  destroy(): void {
    this.abort.abort();
    this.menuAbort?.abort();
    if (this.dragFrame !== null) cancelAnimationFrame(this.dragFrame);
    this.root.remove();
  }

  private createGauge(): HTMLDivElement {
    const gauge = document.createElement("div");
    gauge.className = "beyond2x-gauge";
    gauge.tabIndex = 0;
    gauge.setAttribute("role", "slider");
    gauge.setAttribute("aria-label", "Playback velocity gauge. Use left and right arrow keys for fine adjustments.");
    gauge.setAttribute("aria-valuemin", "0.1");
    gauge.setAttribute("aria-valuemax", "16");
    const svg = svgElement("svg", { viewBox: "0 0 180 180", class: "beyond2x-gauge-svg", "aria-hidden": "true" });
    const track = svgElement("circle", { cx: "90", cy: "90", r: "70", class: "beyond2x-gauge-track" });
    const arc = svgElement("circle", { cx: "90", cy: "90", r: "70", class: "beyond2x-gauge-arc" });
    const tickGroup = svgElement("g", { class: "beyond2x-gauge-ticks" });
    tickGroup.append(...gaugeTickMarkup());
    const needleGroup = svgElement("g", { class: "beyond2x-gauge-needle" });
    needleGroup.append(svgElement("line", { x1: "90", y1: "91", x2: "90", y2: "31", class: "beyond2x-gauge-needle-line" }), svgElement("circle", { cx: "90", cy: "90", r: "7", class: "beyond2x-gauge-hub" }));
    svg.append(track, arc, tickGroup, needleGroup);
    const readout = document.createElement("div");
    readout.className = "beyond2x-gauge-center";
    const value = document.createElement("span");
    value.className = "beyond2x-gauge-readout";
    const caption = document.createElement("span");
    caption.className = "beyond2x-gauge-caption";
    caption.textContent = "PLAYBACK VELOCITY";
    readout.append(value, caption);
    const labels = document.createElement("div");
    labels.className = "beyond2x-gauge-labels";
    ["0.1×", "1×", "4×", "16×"].forEach((label) => {
      const node = document.createElement("span");
      node.textContent = label;
      labels.append(node);
    });
    gauge.append(svg, readout, labels);
    gauge.addEventListener("pointerdown", this.startDrag, { signal: this.abort.signal });
    gauge.addEventListener("pointermove", this.moveDrag, { signal: this.abort.signal });
    gauge.addEventListener("pointerup", this.endDrag, { signal: this.abort.signal });
    gauge.addEventListener("pointercancel", this.endDrag, { signal: this.abort.signal });
    gauge.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight" || event.key === "ArrowUp") {
        event.preventDefault();
        this.onSpeed(increaseSpeed(this.speed));
      } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
        event.preventDefault();
        this.onSpeed(decreaseSpeed(this.speed));
      } else if (event.key === "Home") {
        event.preventDefault();
        this.onSpeed(0.1);
      } else if (event.key === "End") {
        event.preventDefault();
        this.onSpeed(16);
      }
    }, { signal: this.abort.signal });
    return gauge;
  }

  private createPanelHeader(): HTMLDivElement {
    const header = document.createElement("div");
    header.className = "beyond2x-panel-header";
    const brand = document.createElement("span");
    brand.className = "beyond2x-panel-brand";
    const indicator = document.createElement("i");
    indicator.setAttribute("aria-hidden", "true");
    brand.append(indicator, document.createTextNode("BEYOND2X"));
    const status = document.createElement("span");
    status.className = "beyond2x-panel-status";
    status.textContent = "LIVE";
    header.append(brand, status);
    return header;
  }

  private createVelocityRail(): HTMLDivElement {
    const rail = document.createElement("div");
    rail.className = "beyond2x-velocity-rail";
    const track = document.createElement("span");
    track.className = "beyond2x-velocity-track";
    const marker = document.createElement("span");
    marker.className = "beyond2x-velocity-marker";
    const labels = document.createElement("div");
    labels.className = "beyond2x-velocity-labels";
    ["0.1", "1", "4", "16"].forEach((label) => {
      const node = document.createElement("span");
      node.textContent = `${label}×`;
      labels.append(node);
    });
    rail.append(track, marker, labels);
    return rail;
  }

  private createPresetGrid(): HTMLDivElement {
    const section = document.createElement("div");
    section.className = "beyond2x-preset-section";
    const title = document.createElement("span");
    title.className = "beyond2x-section-label";
    title.textContent = "ACCELERATION NODES";
    const grid = document.createElement("div");
    grid.className = "beyond2x-preset-grid";
    for (const preset of SPEED_PRESETS) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "beyond2x-menu-item";
      item.setAttribute("role", "menuitemradio");
      item.setAttribute("aria-label", `Set playback speed to ${formatSpeed(preset)}`);
      item.textContent = formatSpeed(preset);
      item.addEventListener("click", () => {
        this.onSpeed(preset);
        this.close();
      }, { signal: this.abort.signal });
      item.addEventListener("pointermove", this.magnetize, { signal: this.abort.signal });
      item.addEventListener("pointerleave", this.resetMagnet, { signal: this.abort.signal });
      this.items.set(preset, item);
      grid.append(item);
    }
    section.append(title, grid);
    return section;
  }

  private createPrecisionControl(): HTMLFormElement {
    const custom = document.createElement("form");
    custom.className = "beyond2x-custom";
    const label = document.createElement("label");
    label.htmlFor = "beyond2x-custom-rate";
    label.textContent = "PRECISION OVERRIDE";
    const inputShell = document.createElement("div");
    inputShell.className = "beyond2x-input-shell";
    const input = document.createElement("input");
    input.id = "beyond2x-custom-rate";
    input.inputMode = "decimal";
    input.maxLength = 5;
    input.placeholder = "3.25";
    input.setAttribute("aria-label", "Custom playback speed from 0.1 to 16");
    const suffix = document.createElement("span");
    suffix.textContent = "×";
    const set = document.createElement("button");
    set.type = "submit";
    set.textContent = "APPLY";
    inputShell.append(input, suffix, set);
    custom.append(label, inputShell);
    custom.addEventListener("submit", (event) => {
      event.preventDefault();
      const speed = parseCustomSpeed(input.value);
      if (speed === null) {
        input.setAttribute("aria-invalid", "true");
        input.focus();
        return;
      }
      input.removeAttribute("aria-invalid");
      this.onSpeed(speed);
      this.close();
    }, { signal: this.abort.signal });
    return custom;
  }

  private createPointer(): HTMLSpanElement {
    const pointer = document.createElement("span");
    pointer.className = "beyond2x-pointer";
    pointer.setAttribute("aria-hidden", "true");
    return pointer;
  }

  private bindPointerEffects(): void {
    this.menu.addEventListener("pointermove", (event) => {
      const rect = this.menu.getBoundingClientRect();
      this.menu.style.setProperty("--b2x-pointer-x", `${event.clientX - rect.left}px`);
      this.menu.style.setProperty("--b2x-pointer-y", `${event.clientY - rect.top}px`);
      this.menu.dataset.pointerActive = "true";
    }, { signal: this.abort.signal });
    this.menu.addEventListener("pointerleave", () => { delete this.menu.dataset.pointerActive; }, { signal: this.abort.signal });
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
    this.gauge.focus();
  }

  private close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.menu.hidden = true;
    this.button.setAttribute("aria-expanded", "false");
    this.menuAbort?.abort();
    this.menuAbort = null;
  }

  private readonly startDrag = (event: PointerEvent): void => {
    this.dragging = true;
    this.gauge.setPointerCapture(event.pointerId);
    this.gauge.dataset.dragging = "true";
    this.setGaugeFromPointer(event);
  };

  private readonly moveDrag = (event: PointerEvent): void => {
    if (this.dragging) this.setGaugeFromPointer(event);
  };

  private readonly endDrag = (event: PointerEvent): void => {
    if (!this.dragging) return;
    this.dragging = false;
    this.gauge.releasePointerCapture(event.pointerId);
    delete this.gauge.dataset.dragging;
    if (this.pendingDragSpeed !== null) {
      this.onSpeed(this.pendingDragSpeed);
      this.pendingDragSpeed = null;
    }
  };

  private setGaugeFromPointer(event: PointerEvent): void {
    const rect = this.gauge.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    const angle = Math.atan2(x, -y) * (180 / Math.PI);
    this.pendingDragSpeed = snapGaugeSpeed(gaugeAngleToSpeed(angle));
    if (this.dragFrame !== null) return;
    this.dragFrame = requestAnimationFrame(() => {
      this.dragFrame = null;
      if (this.pendingDragSpeed !== null) this.onSpeed(this.pendingDragSpeed);
    });
  }

  private readonly magnetize = (event: PointerEvent): void => {
    const item = event.currentTarget as HTMLButtonElement;
    const rect = item.getBoundingClientRect();
    const x = Math.max(-2.5, Math.min(2.5, (event.clientX - (rect.left + rect.width / 2)) / 10));
    const y = Math.max(-2.5, Math.min(2.5, (event.clientY - (rect.top + rect.height / 2)) / 10));
    item.style.setProperty("--b2x-magnet-x", `${x.toFixed(2)}px`);
    item.style.setProperty("--b2x-magnet-y", `${y.toFixed(2)}px`);
  };

  private readonly resetMagnet = (event: PointerEvent): void => {
    const item = event.currentTarget as HTMLButtonElement;
    item.style.removeProperty("--b2x-magnet-x");
    item.style.removeProperty("--b2x-magnet-y");
  };

  private readonly handleOutside = (event: PointerEvent): void => {
    if (!this.root.contains(event.target as Node)) this.close();
  };

  private readonly handleEscape = (event: KeyboardEvent): void => {
    if (event.key === "Escape") this.close();
  };
}
