import { DEFAULT_SPEED, STORAGE_KEY } from "./constants";
import { isValidSpeed, normalizeSpeed } from "./speed";

export async function getSavedSpeed(): Promise<number> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return isValidSpeed(result[STORAGE_KEY]) ? normalizeSpeed(result[STORAGE_KEY]) : DEFAULT_SPEED;
  } catch {
    return DEFAULT_SPEED;
  }
}

export async function saveSpeed(speed: number): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: normalizeSpeed(speed) });
  } catch {
    // Storage can be unavailable in restricted browser contexts; playback still works locally.
  }
}
