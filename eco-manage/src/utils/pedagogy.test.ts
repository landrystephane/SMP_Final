import { describe, it, expect } from 'vitest';
import { getNurseryAppreciation, getPrimaryAppreciation, calculateAttendanceObservations } from './pedagogy';

describe('Pedagogical Logic', () => {
    it('should return correct nursery appreciations', () => {
        expect(getNurseryAppreciation(19).label).toBe('A+');
        expect(getNurseryAppreciation(15).label).toBe('A');
        expect(getNurseryAppreciation(11).label).toBe('ECA');
        expect(getNurseryAppreciation(5).label).toBe('NA');
    });

    it('should return correct primary appreciations', () => {
        expect(getPrimaryAppreciation(18)).toBe('EXCELLENT');
        expect(getPrimaryAppreciation(13)).toBe('ASSEZ BIEN');
        expect(getPrimaryAppreciation(5)).toBe('MÉDIOCRE');
    });

    it('should calculate attendance observations based on hours', () => {
        expect(calculateAttendanceObservations(0)).toBe('CONDUITE EXEMPLAIRE');
        expect(calculateAttendanceObservations(10)).toBe('CONDUITE À SURVEILLER');
        expect(calculateAttendanceObservations(20)).toBe('AVERTISSEMENT CONDUITE');
    });
});
