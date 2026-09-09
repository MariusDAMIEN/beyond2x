import { describe, expect, it } from "vitest";
import { GAUGE_END_ANGLE, GAUGE_START_ANGLE, gaugeAngleToSpeed, gaugeRatioToSpeed, snapGaugeSpeed, speedToGaugeAngle, speedToGaugeRatio } from "../src/content/gauge";

describe("instrument gauge mapping", () => {
  it("maps the playback domain to the full gauge arc", () => {
    expect(speedToGaugeAngle(0.1)).toBeCloseTo(GAUGE_START_ANGLE);
    expect(speedToGaugeAngle(16)).toBeCloseTo(GAUGE_END_ANGLE);
    expect(speedToGaugeRatio(1)).toBeGreaterThan(0);
    expect(speedToGaugeRatio(16)).toBe(1);
  });

  it("converts gauge positions back to bounded playback speeds", () => {
    expect(gaugeRatioToSpeed(0)).toBe(0.1);
    expect(gaugeRatioToSpeed(1)).toBe(16);
    expect(gaugeAngleToSpeed(-999)).toBe(0.1);
    expect(gaugeAngleToSpeed(999)).toBe(16);
    expect(gaugeAngleToSpeed(speedToGaugeAngle(3))).toBeCloseTo(3, 1);
  });

  it("snaps near preset nodes while preserving precise values away from them", () => {
    expect(snapGaugeSpeed(3.03)).toBe(3);
    expect(snapGaugeSpeed(4.03)).toBe(4);
    expect(snapGaugeSpeed(3.37)).toBeCloseTo(3.37, 2);
  });
});
