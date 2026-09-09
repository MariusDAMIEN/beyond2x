import { afterEach, describe, expect, it, vi } from "vitest";
import { findNativeSpeedSurface, NativeSpeedMenu } from "../src/content/native-speed-menu";

const listPanel = (includeThree = false): string => `
  <div class="ytp-panel-menu">
    <div class="speed-items">
      <div class="ytp-menuitem" role="menuitemradio">0.25</div>
      <div class="ytp-menuitem" role="menuitemradio">1.5</div>
      <div class="ytp-menuitem" role="menuitemradio">2</div>
      ${includeThree ? '<div class="ytp-menuitem" role="menuitemradio">3</div>' : ""}
    </div>
  </div>`;

const chipPanel = (): string => `
  <section role="dialog">
    <div class="speed-chips">
      <button type="button">1.0</button>
      <button type="button">1.25</button>
      <button type="button">1.5</button>
      <button type="button">2.0</button>
      <button type="button">3.0</button>
    </div>
  </section>`;

describe("native playback-speed integration", () => {
  afterEach(() => { document.body.replaceChildren(); });

  it("detects an old-style speed list from numeric structure without translated labels", () => {
    document.body.innerHTML = `<div id="movie_player">${listPanel()}</div>`;
    const surface = findNativeSpeedSurface(document.querySelector("#movie_player")!);
    expect(surface?.kind).toBe("list");
    expect(surface?.existingSpeeds).toEqual(new Set([0.25, 1.5, 2]));
  });

  it("detects newer slider/preset-chip layouts and injects only missing extended speeds", () => {
    document.body.innerHTML = `<div id="movie_player">${chipPanel()}</div>`;
    const player = document.querySelector<HTMLElement>("#movie_player")!;
    const menu = new NativeSpeedMenu(vi.fn());
    expect(menu.sync(player, 1)).toBe("active");
    expect(player.querySelectorAll("[data-beyond2x-native='true']")).toHaveLength(6);
    expect(player.querySelector("[data-beyond2x-speed='3']")).toBeNull();
    expect(player.querySelector("[data-beyond2x-speed='2.5']")?.tagName).toBe("BUTTON");
  });

  it("adds old-style entries once, keeps native values untouched, and applies the selected rate", () => {
    document.body.innerHTML = `<div id="movie_player">${listPanel()}</div>`;
    const player = document.querySelector<HTMLElement>("#movie_player")!;
    const onSpeed = vi.fn();
    const menu = new NativeSpeedMenu(onSpeed);
    expect(menu.sync(player, 1)).toBe("active");
    expect(player.querySelectorAll("[data-beyond2x-native='true']")).toHaveLength(7);
    expect(player.querySelectorAll(".ytp-menuitem:not([data-beyond2x-native])")).toHaveLength(3);
    expect(menu.sync(player, 1)).toBe("active");
    expect(player.querySelectorAll("[data-beyond2x-native='true']")).toHaveLength(7);
    player.querySelector<HTMLElement>("[data-beyond2x-speed='3']")?.click();
    expect(onSpeed).toHaveBeenCalledWith(3);
  });

  it("does not become active when a candidate cannot retain injected entries", () => {
    document.body.innerHTML = `<div id="movie_player">${listPanel()}</div>`;
    const player = document.querySelector<HTMLElement>("#movie_player")!;
    const parent = player.querySelector<HTMLElement>(".speed-items")!;
    vi.spyOn(parent, "append").mockImplementation(() => parent);
    const menu = new NativeSpeedMenu(vi.fn());
    expect(menu.sync(player, 1)).toBe("unavailable");
    expect(player.querySelectorAll("[data-beyond2x-native='true']")).toHaveLength(0);
  });

  it("keeps selected state tied to the real speed and reinjects after menu recreation", () => {
    document.body.innerHTML = `<div id="movie_player">${listPanel()}</div>`;
    const player = document.querySelector<HTMLElement>("#movie_player")!;
    const menu = new NativeSpeedMenu(vi.fn());
    menu.sync(player, 3);
    expect(player.querySelector("[data-beyond2x-speed='3']")?.getAttribute("aria-checked")).toBe("true");
    player.innerHTML = listPanel();
    expect(menu.sync(player, 1.5)).toBe("active");
    expect(player.querySelectorAll("[data-beyond2x-native='true']")).toHaveLength(7);
    expect(player.querySelector("[data-beyond2x-speed='3']")?.getAttribute("aria-checked")).toBe("false");
  });

  it("becomes unavailable without crashing when the transient native menu disappears", () => {
    document.body.innerHTML = `<div id="movie_player">${listPanel()}</div>`;
    const player = document.querySelector<HTMLElement>("#movie_player")!;
    const menu = new NativeSpeedMenu(vi.fn());
    expect(menu.sync(player, 1)).toBe("active");
    player.replaceChildren();
    expect(menu.sync(player, 1)).toBe("unavailable");
  });

  it("does not add a duplicate when the current YouTube UI already contains 3x", () => {
    document.body.innerHTML = `<div id="movie_player">${listPanel(true)}</div>`;
    const player = document.querySelector<HTMLElement>("#movie_player")!;
    const menu = new NativeSpeedMenu(vi.fn());
    expect(menu.sync(player, 1)).toBe("active");
    expect(player.querySelectorAll("[data-beyond2x-speed='3']")).toHaveLength(0);
    expect(player.querySelectorAll(".ytp-menuitem")).toHaveLength(10);
  });
});
