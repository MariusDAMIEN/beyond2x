import { DEFAULT_SPEED, MAX_SPEED, MIN_SPEED, SPEED_INCREMENT, SPEED_PRESETS } from "./constants";

const PRECISION = 100;

export function clampSpeed(value: number): number {
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, value));
}

export function normalizeSpeed(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SPEED;
  return Math.round(clampSpeed(value) * PRECISION) / PRECISION;
}

export function isValidSpeed(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= MIN_SPEED && value <= MAX_SPEED;
}

export function parseCustomSpeed(value: string): number | null {
  const text = value.trim().replace(/x$/i, "");
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  const parsed = Number(text);
  return isValidSpeed(parsed) ? normalizeSpeed(parsed) : null;
}

export function increaseSpeed(value: number, amount = SPEED_INCREMENT): number {
  return normalizeSpeed(normalizeSpeed(value) + amount);
}

export function decreaseSpeed(value: number, amount = SPEED_INCREMENT): number {
  return normalizeSpeed(normalizeSpeed(value) - amount);
}

export function getNextPreset(value: number, direction: 1 | -1): number {
  const speed = normalizeSpeed(value);
  if (direction > 0) return SPEED_PRESETS.find((preset) => preset > speed) ?? MAX_SPEED;
  return [...SPEED_PRESETS].reverse().find((preset) => preset < speed) ?? MIN_SPEED;
}

export function formatSpeed(value: number): string {
  return `${normalizeSpeed(value).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}×`;
}
