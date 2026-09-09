import { afterEach, describe, expect, it, vi } from "vitest";
import { PlayerUI } from "../src/content/player-ui";

describe("PlayerUI", () => {
  afterEach(() => { document.body.replaceChildren(); });

  it("injects one owned control and synchronizes its speed", () => {
    const parent = document.createElement("div");
    document.body.append(parent);
    const first = new PlayerUI(parent, false, vi.fn());
    first.update(3);
    expect(parent.querySelectorAll("[data-beyond2x-control]")).toHaveLength(1);
    expect(parent.querySelector(".beyond2x-button")?.textContent).toBe("3×");
    const second = new PlayerUI(parent, false, vi.fn());
    expect(parent.querySelectorAll("[data-beyond2x-control]")).toHaveLength(1);
    second.destroy();
  });

  it("opens a menu and closes it after a speed selection", () => {
    const parent = document.createElement("div");
    document.body.append(parent);
    const callback = vi.fn();
    new PlayerUI(parent, false, callback);
    const button = parent.querySelector<HTMLButtonElement>(".beyond2x-button")!;
    button.click();
    expect(parent.querySelector<HTMLElement>(".beyond2x-menu")?.hidden).toBe(false);
    parent.querySelectorAll<HTMLButtonElement>(".beyond2x-menu-item")[8].click();
    expect(callback).toHaveBeenCalledWith(2.5);
    expect(parent.querySelector<HTMLElement>(".beyond2x-menu")?.hidden).toBe(true);
  });

  it("exposes an expanded velocity gauge with keyboard precision controls", () => {
    const parent = document.createElement("div");
    document.body.append(parent);
    const callback = vi.fn();
    const ui = new PlayerUI(parent, false, callback);
    ui.update(3);
    parent.querySelector<HTMLButtonElement>(".beyond2x-button")?.click();
    const gauge = parent.querySelector<HTMLElement>(".beyond2x-gauge")!;
    expect(gauge.getAttribute("aria-valuetext")).toBe("Playback speed 3.00×");
    gauge.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(callback).toHaveBeenCalledWith(3.25);
  });
});
