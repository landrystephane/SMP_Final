import i18n from './i18n';

export const getNurseryAppreciation = (score: number) => {
    const isEn = i18n.language.startsWith('en');
    if (score >= 18) return { label: 'A+', color: '#10b981', remark: isEn ? 'Expert' : 'Expert' };
    if (score >= 14) return { label: 'A', color: '#3b82f6', remark: isEn ? 'Acquired' : 'Acquis' };
    if (score >= 10) return { label: 'ECA', color: '#f59e0b', remark: isEn ? 'In progress of acquisition' : "En cours d'acquisition" };
    return { label: 'NA', color: '#ef4444', remark: isEn ? 'Not acquired' : 'Non acquis' };
};

export const getPrimaryAppreciation = (score: number) => {
    const isEn = i18n.language.startsWith('en');
    if (score >= 18) return isEn ? 'EXCELLENT' : 'EXCELLENT';
    if (score >= 16) return isEn ? 'VERY GOOD' : 'TRÈS BIEN';
    if (score >= 14) return isEn ? 'GOOD' : 'BIEN';
    if (score >= 12) return isEn ? 'QUITE GOOD' : 'ASSEZ BIEN';
    if (score >= 10) return isEn ? 'PASSABLE' : 'PASSIBLE';
    if (score >= 8) return isEn ? 'INSUFFICIENT' : 'INSUFFISANT';
    return isEn ? 'POOR' : 'MÉDIOCRE';
};

export const calculateAttendanceObservations = (hours: number) => {
    const isEn = i18n.language.startsWith('en');
    if (hours === 0) return isEn ? 'EXEMPLARY CONDUCT' : 'CONDUITE EXEMPLAIRE';
    if (hours <= 5) return isEn ? 'TO BE ENCOURAGED' : 'À ENCOURAGER';
    if (hours <= 15) return isEn ? 'CONDUCT TO BE MONITORED' : 'CONDUITE À SURVEILLER';
    return isEn ? 'CONDUCT WARNING' : 'AVERTISSEMENT CONDUITE';
};
