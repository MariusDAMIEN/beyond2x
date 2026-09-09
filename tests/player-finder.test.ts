import { afterEach, describe, expect, it } from "vitest";
import { findActiveVideo, findPlayer, findPlayerControls, isShortsPage } from "../src/content/player-finder";

describe("player discovery", () => {
  afterEach(() => { document.body.replaceChildren(); });

  it("finds a regular player, its video, and its controls", () => {
    document.body.innerHTML = '<div id="movie_player" class="html5-video-player"><video></video><div class="ytp-right-controls"></div></div>';
    const video = document.querySelector<HTMLVideoElement>("video")!;
    const player = findPlayer(video)!;
    expect(findActiveVideo()).toBe(video);
    expect(player.id).toBe("movie_player");
    expect(findPlayerControls(player)?.className).toBe("ytp-right-controls");
  });

  it("detects the Shorts route for floating-control placement", () => {
    history.pushState({}, "", "/shorts/example");
    expect(isShortsPage()).toBe(true);
    history.pushState({}, "", "/watch?v=example");
  });
});
