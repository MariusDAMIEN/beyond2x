import { afterEach, describe, expect, it, vi } from "vitest";
import { findNativeSpeedList, NativeSpeedMenu } from "../src/content/native-speed-menu";

const speedPanel = (): string => `
  <div class="ytp-panel-menu">
    <div class="speed-items">
      <div class="ytp-menuitem" role="menuitemradio">0.25</div>
      <div class="ytp-menuitem" role="menuitemradio">1.5</div>
      <div class="ytp-menuitem" role="menuitemradio">2</div>
    </div>
  </div>`;

describe("native playback-speed menu", () => {
  afterEach(() => { document.body.replaceChildren(); });

  it("detects a speed list from its numeric structure without translated labels", () => {
    document.body.innerHTML = `<div id="movie_player">${speedPanel()}</div>`;
    const player = document.querySelector<HTMLElement>("#movie_player")!;
    const list = findNativeSpeedList(player);
    expect(list?.nativeItems).toHaveLength(3);
  });

  it("adds extended entries once, preserves native entries, and applies a selected rate", () => {
    document.body.innerHTML = `<div id="movie_player">${speedPanel()}</div>`;
    const player = document.querySelector<HTMLElement>("#movie_player")!;
    const onSpeed = vi.fn();
    const menu = new NativeSpeedMenu(onSpeed);
    expect(menu.sync(player, 1)).toBe(true);
    expect(player.querySelectorAll("[data-beyond2x-speed]")).toHaveLength(7);
    expect(player.querySelectorAll(".ytp-menuitem:not([data-beyond2x-speed])")).toHaveLength(3);
    menu.sync(player, 1);
    expect(player.querySelectorAll("[data-beyond2x-speed]")).toHaveLength(7);
    player.querySelector<HTMLElement>("[data-beyond2x-speed='3']")?.click();
    expect(onSpeed).toHaveBeenCalledWith(3);
  });

  it("tracks the real speed and reinjects cleanly after YouTube recreates the menu", () => {
    document.body.innerHTML = `<div id="movie_player">${speedPanel()}</div>`;
    const player = document.querySelector<HTMLElement>("#movie_player")!;
    const menu = new NativeSpeedMenu(vi.fn());
    menu.sync(player, 3);
    expect(player.querySelector("[data-beyond2x-speed='3']")?.getAttribute("aria-checked")).toBe("true");
    player.innerHTML = speedPanel();
    menu.sync(player, 1.5);
    expect(player.querySelectorAll("[data-beyond2x-speed]")).toHaveLength(7);
    expect(player.querySelector("[data-beyond2x-speed='3']")?.getAttribute("aria-checked")).toBe("false");
  });
});
