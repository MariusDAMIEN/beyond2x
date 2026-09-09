export function observeYouTubeNavigation(callback: () => void): () => void {
  const events = ["yt-navigate-start", "yt-navigate-finish", "yt-page-data-updated"];
  events.forEach((event) => document.addEventListener(event, callback));
  return () => events.forEach((event) => document.removeEventListener(event, callback));
}
