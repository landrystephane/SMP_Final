export const getNurseryAppreciation = (score: number) => {
    if (score >= 18) return { label: 'A+', color: '#10b981', remark: 'Expert' };
    if (score >= 14) return { label: 'A', color: '#3b82f6', remark: 'Acquis' };
    if (score >= 10) return { label: 'ECA', color: '#f59e0b', remark: 'En cours d\'acquisition' };
    return { label: 'NA', color: '#ef4444', remark: 'Non acquis' };
};

export const getPrimaryAppreciation = (score: number) => {
    if (score >= 18) return 'EXCELLENT';
    if (score >= 16) return 'TRÈS BIEN';
    if (score >= 14) return 'BIEN';
    if (score >= 12) return 'ASSEZ BIEN';
    if (score >= 10) return 'PASSIBLE';
    if (score >= 8) return 'INSUFFISANT';
    return 'MÉDIOCRE';
};

export const calculateAttendanceObservations = (hours: number) => {
    if (hours === 0) return 'CONDUITE EXEMPLAIRE';
    if (hours <= 5) return 'À ENCOURAGER';
    if (hours <= 15) return 'CONDUITE À SURVEILLER';
    return 'AVERTISSEMENT CONDUITE';
};
