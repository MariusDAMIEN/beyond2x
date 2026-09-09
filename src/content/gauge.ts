import { MAX_SPEED, MIN_SPEED, SPEED_PRESETS } from "../shared/constants";
import { clampSpeed, normalizeSpeed } from "../shared/speed";

export const GAUGE_START_ANGLE = -140;
export const GAUGE_END_ANGLE = 140;
export const GAUGE_SWEEP = GAUGE_END_ANGLE - GAUGE_START_ANGLE;

/** A logarithmic scale gives low playback speeds useful travel while preserving the 16× range. */
export function speedToGaugeRatio(speed: number): number {
  const normalized = normalizeSpeed(speed);
  return (Math.log(normalized) - Math.log(MIN_SPEED)) / (Math.log(MAX_SPEED) - Math.log(MIN_SPEED));
}

export function gaugeRatioToSpeed(ratio: number): number {
  const clamped = Math.min(1, Math.max(0, ratio));
  return normalizeSpeed(Math.exp(Math.log(MIN_SPEED) + clamped * (Math.log(MAX_SPEED) - Math.log(MIN_SPEED))));
}

export function speedToGaugeAngle(speed: number): number {
  return GAUGE_START_ANGLE + speedToGaugeRatio(speed) * GAUGE_SWEEP;
}

export function gaugeAngleToSpeed(angle: number): number {
  const ratio = (Math.min(GAUGE_END_ANGLE, Math.max(GAUGE_START_ANGLE, angle)) - GAUGE_START_ANGLE) / GAUGE_SWEEP;
  return gaugeRatioToSpeed(ratio);
}

export function snapGaugeSpeed(speed: number, threshold = 0.015): number {
  const ratio = speedToGaugeRatio(speed);
  const nearest = SPEED_PRESETS.reduce((best, preset) => {
    return Math.abs(speedToGaugeRatio(preset) - ratio) < Math.abs(speedToGaugeRatio(best) - ratio) ? preset : best;
  }, SPEED_PRESETS[0]);
  return Math.abs(speedToGaugeRatio(nearest) - ratio) <= threshold ? nearest : clampSpeed(speed);
}

export function formatGaugeSpeed(speed: number): string {
  return `${normalizeSpeed(speed).toFixed(2)}×`;
}
