import { describe, it, expect } from 'vitest';
import { getAppreciationNursery, getAppreciationPrimary } from './pedagogy';

describe('Pedagogy Utils', () => {
  describe('Nursery Appreciation', () => {
    it('returns A+ for high scores in French', () => {
      expect(getAppreciationNursery(19, false).code).toBe('A+');
    });

    it('returns AE for high scores in English', () => {
      expect(getAppreciationNursery(19, true).code).toBe('AE');
    });

    it('returns NA for low scores in French', () => {
      expect(getAppreciationNursery(5, false).code).toBe('NA');
    });
  });

  describe('Primary Appreciation', () => {
    it('returns Excellent for high scores in French', () => {
      expect(getAppreciationPrimary(19, false)).toBe('Excellent');
    });

    it('returns Above Expectation for high scores in English', () => {
      expect(getAppreciationPrimary(19, true)).toBe('Above Expectation');
    });

    it('returns Médiocre for low scores in French', () => {
      expect(getAppreciationPrimary(5, false)).toBe('Médiocre');
    });
  });
});
