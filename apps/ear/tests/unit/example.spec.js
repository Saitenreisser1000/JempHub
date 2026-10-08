import { describe, expect, it } from 'vitest';
import toneCalcService from "@/components/mixins/toneCalcService";

describe('toneCalcService', () => {
  it("random number is within tone range", () => {
    const range = { min: 2, max: 9 };

    for (let i = 0; i < 200; i++) {
      const value = toneCalcService.methods.randomRangeInt(range);
      expect(value).toBeGreaterThanOrEqual(range.min);
      expect(value).toBeLessThan(range.max);
    }
  });
});
