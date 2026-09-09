export function findActiveVideo(): HTMLVideoElement | null {
  const videos = Array.from(document.querySelectorAll<HTMLVideoElement>("video"));
  return videos.find((video) => {
    const rect = video.getBoundingClientRect();
    return video.isConnected && (rect.width > 0 || video.offsetParent !== null);
  }) ?? videos.find((video) => video.isConnected) ?? null;
}

export function findPlayer(video: HTMLVideoElement): HTMLElement | null {
  return video.closest<HTMLElement>(".html5-video-player, #movie_player, ytd-reel-video-renderer")
    ?? document.querySelector<HTMLElement>("#movie_player, .html5-video-player");
}

export function findPlayerControls(player: HTMLElement): HTMLElement | null {
  return player.querySelector<HTMLElement>(".ytp-right-controls");
}

export function isShortsPage(): boolean {
  return location.pathname.startsWith("/shorts/") || Boolean(document.querySelector("ytd-reel-video-renderer"));
}
