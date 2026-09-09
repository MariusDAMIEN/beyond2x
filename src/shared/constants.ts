export const EXTENSION_NAME = "Beyond2x";
export const MIN_SPEED = 0.1;
export const MAX_SPEED = 16;
export const SPEED_INCREMENT = 0.25;
export const DEFAULT_SPEED = 1;
export const STORAGE_KEY = "playbackSpeed";

export const SPEED_PRESETS = [
  0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5, 6, 8, 10
] as const;

export const EXTENDED_SPEED_PRESETS = [2.5, 3, 4, 5, 6, 8, 10] as const;
