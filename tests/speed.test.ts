import { describe, expect, it } from "vitest";
import { MAX_SPEED, MIN_SPEED } from "../src/shared/constants";
import { clampSpeed, decreaseSpeed, formatSpeed, getNextPreset, increaseSpeed, isValidSpeed, normalizeSpeed, parseCustomSpeed } from "../src/shared/speed";

describe("speed domain", () => {
  it("clamps and normalizes safely", () => {
    expect(clampSpeed(-1)).toBe(MIN_SPEED);
    expect(clampSpeed(100)).toBe(MAX_SPEED);
    expect(normalizeSpeed(2.750000000004)).toBe(2.75);
    expect(normalizeSpeed(Number.NaN)).toBe(1);
  });

  it("increments and decrements within range", () => {
    expect(increaseSpeed(1.5)).toBe(1.75);
    expect(decreaseSpeed(1)).toBe(0.75);
    expect(increaseSpeed(MAX_SPEED)).toBe(MAX_SPEED);
    expect(decreaseSpeed(MIN_SPEED)).toBe(MIN_SPEED);
  });

  it("validates custom values", () => {
    expect(parseCustomSpeed("3.25x")).toBe(3.25);
    expect(parseCustomSpeed("0.09")).toBeNull();
    expect(parseCustomSpeed("17")).toBeNull();
    expect(parseCustomSpeed("fast")).toBeNull();
    expect(isValidSpeed("3")).toBe(false);
  });

  it("finds adjacent presets and formats display text", () => {
    expect(getNextPreset(2, 1)).toBe(2.5);
    expect(getNextPreset(2, -1)).toBe(1.75);
    expect(formatSpeed(2.5)).toBe("2.5×");
    expect(formatSpeed(3)).toBe("3×");
  });
});
