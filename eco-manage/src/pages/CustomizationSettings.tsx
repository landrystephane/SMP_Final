import React, { useState, useEffect } from 'react';
import { Palette, FileText, CheckCircle2, Layout, Sliders, Type, Edit3, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const CustomizationSettings: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [schools, setSchools] = useState<any[]>([]);
    const [activeSchool, setActiveSchool] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    // Settings fields
    const [schoolName, setSchoolName] = useState('');
    const [schoolMotto, setSchoolMotto] = useState('');
    const [schoolAddress, setSchoolAddress] = useState('');
    const [schoolBp, setSchoolBp] = useState('');
    const [primaryColor, setPrimaryColor] = useState('#1e293b');
    const [secondaryColor, setSecondaryColor] = useState('#f59e0b');
    const [receiptSigTitle, setReceiptSigTitle] = useState("Signature de l'Économe");
    const [bulletinSigLeft, setBulletinSigLeft] = useState("L'ENSEIGNANT (TEACHER)");
    const [bulletinSigMiddle, setBulletinSigMiddle] = useState("PARENT / GUARDIAN");
    const [bulletinSigRight, setBulletinSigRight] = useState("LE DIRECTEUR (HEADMASTER)");
    const [headerFrench, setHeaderFrench] = useState("MINISTÈRE DE L'ÉDUCATION DE BASE");
    const [headerEnglish, setHeaderEnglish] = useState("MINISTRY OF BASIC EDUCATION");
    const [honorRollThreshold, setHonorRollThreshold] = useState<number>(15.0);
    const [timetableSlots, setTimetableSlots] = useState<any[]>([]);
    const [evaluationPeriods, setEvaluationPeriods] = useState<any[]>([]);
    const [installments, setInstallments] = useState<any[]>([]);
    const [installmentDeadlines, setInstallmentDeadlines] = useState<any[]>([]);

    // Custom PDF template fields
    const [headerImage, setHeaderImage] = useState('');
    const [watermarkImage, setWatermarkImage] = useState('');
    const [footerImage, setFooterImage] = useState('');

    const loadSettings = async () => {
        setLoading(true);
        if (window.electronAPI && user) {
            const schs = await window.electronAPI.getSchools();
            setSchools(schs);
            const mySchool = schs.find(s => s.id?.toString() === user.schoolId?.toString()) || schs[0];
            if (mySchool) {
                setActiveSchool(mySchool);
                setSchoolName(mySchool.name || '');
                setSchoolMotto(mySchool.motto || '');
                setSchoolAddress(mySchool.address || '');
                setSchoolBp(mySchool.bp || '');
                setPrimaryColor(mySchool.primary_color || '#1e293b');
                setSecondaryColor(mySchool.secondary_color || '#f59e0b');
                setReceiptSigTitle(mySchool.receipt_sig_title || "Signature de l'Économe");
                setBulletinSigLeft(mySchool.bulletin_sig_left || "L'ENSEIGNANT (TEACHER)");
                setBulletinSigMiddle(mySchool.bulletin_sig_middle || "PARENT / GUARDIAN");
                setBulletinSigRight(mySchool.bulletin_sig_right || "LE DIRECTEUR (HEADMASTER)");
                setHeaderFrench(mySchool.header_french || "MINISTÈRE DE L'ÉDUCATION DE BASE");
                setHeaderEnglish(mySchool.header_english || "MINISTRY OF BASIC EDUCATION");
                setHonorRollThreshold(mySchool.honor_roll_threshold !== undefined && mySchool.honor_roll_threshold !== null ? mySchool.honor_roll_threshold : 15.0);
                try {
                    setTimetableSlots(mySchool.timetable_slots ? JSON.parse(mySchool.timetable_slots) : [
                        { label: '08:00 - 10:00', start: '08:00', end: '10:00', isBreak: false },
                        { label: '10:00 - 12:00', start: '10:00', end: '12:00', isBreak: false },
                        { label: '12:00 - 13:00', start: '12:00', end: '13:00', isBreak: true },
                        { label: '13:00 - 15:00', start: '13:00', end: '15:00', isBreak: false },
                        { label: '15:00 - 17:00', start: '15:00', end: '17:00', isBreak: false }
                    ]);
                } catch(e) {
                    setTimetableSlots([]);
                }

                try {
                    setEvaluationPeriods(mySchool.evaluation_periods ? JSON.parse(mySchool.evaluation_periods) : [
                        { id: 1, name: '1ER TRIMESTRE' },
                        { id: 2, name: '2E TRIMESTRE' },
                        { id: 3, name: '3E TRIMESTRE' }
                    ]);
                } catch(e) {
                    setEvaluationPeriods([]);
                }
                const template = window.electronAPI.getReportTemplate ? await window.electronAPI.getReportTemplate(mySchool.id) : null;
                
                if (template) {
                    setHeaderImage(template.header_image || '');
                    setWatermarkImage(template.watermark_image || '');
                    setFooterImage(template.footer_image || '');
                    setPrimaryColor(template.primary_color || mySchool.primary_color || '#1e293b');
                    setSecondaryColor(template.secondary_color || mySchool.secondary_color || '#f59e0b');
                }
                
                const insts = window.electronAPI.getInstallments ? await window.electronAPI.getInstallments() : [];
                setInstallments(insts || []);
                const deadls = window.electronAPI.getInstallmentDeadlines ? await window.electronAPI.getInstallmentDeadlines(mySchool.id) : [];
                setInstallmentDeadlines(deadls || []);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        loadSettings();
    }, [user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeSchool || !window.electronAPI) return;
        setSaving(true);
        setSuccess(false);

        try {
            const res = await window.electronAPI.updateSchoolSettings({
                id: activeSchool.id,
                name: schoolName,
                motto: schoolMotto,
                address: schoolAddress,
                bp: schoolBp,
                primary_color: primaryColor,
                secondary_color: secondaryColor,
                receipt_sig_title: receiptSigTitle,
                bulletin_sig_left: bulletinSigLeft,
                bulletin_sig_middle: bulletinSigMiddle,
                bulletin_sig_right: bulletinSigRight,
                header_french: headerFrench,
                header_english: headerEnglish,
                honor_roll_threshold: honorRollThreshold,
                timetable_slots: JSON.stringify(timetableSlots),
                evaluation_periods: JSON.stringify(evaluationPeriods)
            });

            await window.electronAPI.saveReportTemplate({
                schoolId: activeSchool.id,
                headerImage,
                watermarkImage,
                footerImage,
                primaryColor,
                secondaryColor
            });
            if (res && res.error) {
                throw new Error(res.error);
            }

            if (window.electronAPI.saveInstallmentDeadlines) {
                await window.electronAPI.saveInstallmentDeadlines(activeSchool.id, installmentDeadlines);
            }

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            loadSettings();
        } catch (err: any) {
            console.error(err);
            alert(t('alert_update_error', 'Erreur lors de la sauvegarde des paramètres: ') + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) {
            alert(t('cust_upload_max_size', "L'image est trop volumineuse (maximum 3 Mo)."));
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setter(event.target.result as string);
            }
        };
        reader.readAsDataURL(file);
    };

    if (loading) return (
        <div className="h-[50vh] flex flex-col items-center justify-center space-y-4">
            <Palette className="w-12 h-12 text-amber-500 animate-pulse" />
            <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">{t('cust_loading_templates', 'Chargement des templates personnalisables...')}</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header Title */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-8 rounded-[32px] border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center space-x-5">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg">
                        <Palette className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tight">{t('cust_title', 'Personnalisation des Documents')}</h1>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                            {t('cust_subtitle', 'Configurez la charte graphique et les signatures de votre établissement')} ({activeSchool?.name})
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Form settings */}
                <form onSubmit={handleSave} className="xl:col-span-2 space-y-8">
                    {/* School Identity Information Card */}
                    <div className="glass-card p-8 bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-[32px] space-y-6 shadow-2xl">
                        <div className="flex items-center space-x-3 text-amber-500 border-b border-white/5 pb-4">
                            <Sliders className="w-5 h-5" />
                            <h2 className="text-lg font-black uppercase text-white tracking-wide">{t('cust_school_identity', 'Identité de l\'Établissement')}</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_school_name', 'Nom de l\'École')}</label>
                                <input
                                    type="text"
                                    value={schoolName}
                                    onChange={(e) => setSchoolName(e.target.value)}
                                    placeholder="Nom officiel"
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_school_motto', 'Devise de l\'École')}</label>
                                <input
                                    type="text"
                                    value={schoolMotto}
                                    onChange={(e) => setSchoolMotto(e.target.value)}
                                    placeholder="Ex: Éducation pour l'excellence"
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_physical_address', 'Adresse Physique')}</label>
                                <input
                                    type="text"
                                    value={schoolAddress}
                                    onChange={(e) => setSchoolAddress(e.target.value)}
                                    placeholder="Ex: Quartier Bastos, Yaoundé"
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_bp', 'Boîte Postale (B.P.)')}</label>
                                <input
                                    type="text"
                                    value={schoolBp}
                                    onChange={(e) => setSchoolBp(e.target.value)}
                                    placeholder="Ex: B.P. 1234, Yaoundé"
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Visual Colors card */}
                    <div className="glass-card p-8 bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-[32px] space-y-6 shadow-2xl">
                        <div className="flex items-center space-x-3 text-amber-500 border-b border-white/5 pb-4">
                            <Palette className="w-5 h-5" />
                            <h2 className="text-lg font-black uppercase text-white tracking-wide">{t('cust_color_palette', 'Palette Graphique de l\'École')}</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Primary color */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_primary_color', 'Couleur Primaire (Cadres et En-têtes)')}</label>
                                <div className="flex items-center space-x-3 bg-slate-950 p-3.5 rounded-2xl border border-white/5">
                                    <input
                                        type="color"
                                        value={primaryColor}
                                        onChange={(e) => setPrimaryColor(e.target.value)}
                                        className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none"
                                    />
                                    <input
                                        type="text"
                                        value={primaryColor}
                                        onChange={(e) => setPrimaryColor(e.target.value)}
                                        className="bg-transparent text-sm font-bold text-white uppercase tracking-wider outline-none w-full"
                                    />
                                </div>
                            </div>

                            {/* Secondary color */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_secondary_color', 'Couleur Secondaire (Accents et Textes clés)')}</label>
                                <div className="flex items-center space-x-3 bg-slate-950 p-3.5 rounded-2xl border border-white/5">
                                    <input
                                        type="color"
                                        value={secondaryColor}
                                        onChange={(e) => setSecondaryColor(e.target.value)}
                                        className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none"
                                    />
                                    <input
                                        type="text"
                                        value={secondaryColor}
                                        onChange={(e) => setSecondaryColor(e.target.value)}
                                        className="bg-transparent text-sm font-bold text-white uppercase tracking-wider outline-none w-full"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pedagogy & Timetable Settings */}
                    <div className="glass-card p-8 bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-[32px] space-y-6 shadow-2xl">
                        <div className="flex items-center space-x-3 text-amber-500 border-b border-white/5 pb-4">
                            <Layout className="w-5 h-5" />
                            <h2 className="text-lg font-black uppercase text-white tracking-wide">{t('cust_pedagogy_settings', 'Pédagogie & Emploi du Temps')}</h2>
                        </div>

                        <div className="space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_honor_threshold', 'Moyenne Minimum - Tableau d\'Honneur ( /20)')}</label>
                                <input
                                    type="number"
                                    min="10"
                                    max="20"
                                    step="0.5"
                                    value={honorRollThreshold}
                                    onChange={(e) => setHonorRollThreshold(parseFloat(e.target.value))}
                                    className="w-full md:w-1/3 bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Périodes d'Évaluation (Trimestres / Séquences)</label>
                                    <button 
                                        type="button"
                                        onClick={() => setEvaluationPeriods([...evaluationPeriods, { id: evaluationPeriods.length + 1, name: `Période ${evaluationPeriods.length + 1}` }])}
                                        className="text-[10px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-lg hover:bg-amber-500 hover:text-slate-950 transition-all"
                                    >
                                        + Ajouter une période
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {evaluationPeriods.map((period, index) => (
                                        <div key={index} className="flex flex-col md:flex-row gap-3 items-center bg-slate-950 p-4 rounded-2xl border border-white/5">
                                            <span className="text-slate-500 font-bold text-xs w-8 text-center bg-white/5 rounded-lg py-2">ID: {period.id}</span>
                                            <input 
                                                type="text" 
                                                value={period.name} 
                                                onChange={(e) => {
                                                    const newPeriods = [...evaluationPeriods];
                                                    newPeriods[index].name = e.target.value;
                                                    setEvaluationPeriods(newPeriods);
                                                }}
                                                placeholder="Ex: 1ER TRIMESTRE, 1ÈRE SÉQUENCE"
                                                className="w-full md:flex-1 bg-transparent border-b border-white/10 px-2 py-1 text-sm font-bold text-white outline-none focus:border-amber-500 uppercase"
                                            />
                                            <div className="flex items-center justify-between w-full md:w-auto gap-4">
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        const newPeriods = evaluationPeriods.filter((_, i) => i !== index);
                                                        setEvaluationPeriods(newPeriods);
                                                    }}
                                                    className="text-rose-500 hover:text-rose-400 bg-rose-500/10 p-2 rounded-xl transition-all"
                                                >
                                                    <ShieldAlert className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {evaluationPeriods.length === 0 && (
                                        <p className="text-center text-rose-500 text-sm font-bold italic py-4">Attention : Aucune période d'évaluation définie !</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Échéances des Tranches de Scolarité</label>
                                <div className="space-y-3">
                                    {installments.map(inst => {
                                        const deadline = installmentDeadlines.find(d => d.installment_id === inst.id)?.deadline_date || '';
                                        return (
                                            <div key={inst.id} className="flex flex-col md:flex-row gap-3 items-center bg-slate-950 p-4 rounded-2xl border border-white/5">
                                                <span className="text-slate-500 font-bold text-xs w-32 bg-white/5 rounded-lg py-2 px-3">{inst.name}</span>
                                                <input 
                                                    type="date" 
                                                    value={deadline}
                                                    onChange={(e) => {
                                                        const newDeadlines = [...installmentDeadlines];
                                                        const existing = newDeadlines.find(d => d.installment_id === inst.id);
                                                        if (existing) {
                                                            existing.deadline_date = e.target.value;
                                                        } else {
                                                            newDeadlines.push({ installment_id: inst.id, deadline_date: e.target.value });
                                                        }
                                                        setInstallmentDeadlines(newDeadlines);
                                                    }}
                                                    className="w-full md:flex-1 bg-transparent border-b border-white/10 px-2 py-1 text-sm font-bold text-white outline-none focus:border-amber-500"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_timetable_slots', 'Configuration des Plages Horaires')}</label>
                                    <button 
                                        type="button"
                                        onClick={() => setTimetableSlots([...timetableSlots, { label: 'Nouveau', start: '00:00', end: '00:00', isBreak: false }])}
                                        className="text-[10px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-lg hover:bg-amber-500 hover:text-slate-950 transition-all"
                                    >
                                        + Ajouter une plage
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {timetableSlots.map((slot, index) => (
                                        <div key={index} className="flex flex-col md:flex-row gap-3 items-center bg-slate-950 p-4 rounded-2xl border border-white/5">
                                            <input 
                                                type="text" 
                                                value={slot.label} 
                                                onChange={(e) => {
                                                    const newSlots = [...timetableSlots];
                                                    newSlots[index].label = e.target.value;
                                                    setTimetableSlots(newSlots);
                                                }}
                                                placeholder="Libellé (ex: 08:00 - 10:00)"
                                                className="w-full md:w-1/3 bg-transparent border-b border-white/10 px-2 py-1 text-sm font-bold text-white outline-none focus:border-amber-500"
                                            />
                                            <div className="flex items-center gap-2 w-full md:w-auto">
                                                <input 
                                                    type="time" 
                                                    value={slot.start}
                                                    onChange={(e) => {
                                                        const newSlots = [...timetableSlots];
                                                        newSlots[index].start = e.target.value;
                                                        setTimetableSlots(newSlots);
                                                    }}
                                                    className="bg-transparent border-b border-white/10 px-2 py-1 text-sm text-slate-300 outline-none focus:border-amber-500"
                                                />
                                                <span className="text-slate-500">-</span>
                                                <input 
                                                    type="time" 
                                                    value={slot.end}
                                                    onChange={(e) => {
                                                        const newSlots = [...timetableSlots];
                                                        newSlots[index].end = e.target.value;
                                                        setTimetableSlots(newSlots);
                                                    }}
                                                    className="bg-transparent border-b border-white/10 px-2 py-1 text-sm text-slate-300 outline-none focus:border-amber-500"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between w-full md:w-auto md:ml-auto gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={slot.isBreak}
                                                        onChange={(e) => {
                                                            const newSlots = [...timetableSlots];
                                                            newSlots[index].isBreak = e.target.checked;
                                                            setTimetableSlots(newSlots);
                                                        }}
                                                        className="w-4 h-4 rounded accent-amber-500"
                                                    />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pause ?</span>
                                                </label>
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        const newSlots = timetableSlots.filter((_, i) => i !== index);
                                                        setTimetableSlots(newSlots);
                                                    }}
                                                    className="text-rose-500 hover:text-rose-400 bg-rose-500/10 p-2 rounded-xl transition-all"
                                                >
                                                    <ShieldAlert className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {timetableSlots.length === 0 && (
                                        <p className="text-center text-slate-500 text-sm font-bold italic py-4">Aucune plage horaire définie. L'emploi du temps sera vide.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Official Headers */}
                    <div className="glass-card p-8 bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-[32px] space-y-6 shadow-2xl">
                        <div className="flex items-center space-x-3 text-amber-500 border-b border-white/5 pb-4">
                            <Type className="w-5 h-5" />
                            <h2 className="text-lg font-black uppercase text-white tracking-wide">{t('cust_ministerial_headers', 'En-têtes Ministériels / Subdivisions')}</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_header_french', 'Sous-titre En-tête (Français)')}</label>
                                <input
                                    type="text"
                                    value={headerFrench}
                                    onChange={(e) => setHeaderFrench(e.target.value)}
                                    placeholder="Ex: MINISTÈRE DE L'ÉDUCATION DE BASE"
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_header_english', 'Sous-titre En-tête (Anglais)')}</label>
                                <input
                                    type="text"
                                    value={headerEnglish}
                                    onChange={(e) => setHeaderEnglish(e.target.value)}
                                    placeholder="Ex: MINISTRY OF BASIC EDUCATION"
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Signatures block */}
                    <div className="glass-card p-8 bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-[32px] space-y-6 shadow-2xl">
                        <div className="flex items-center space-x-3 text-amber-500 border-b border-white/5 pb-4">
                            <Edit3 className="w-5 h-5" />
                            <h2 className="text-lg font-black uppercase text-white tracking-wide">{t('cust_signatories', 'Intitulés des Signataires Officiels')}</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_sig_left', 'Bloc Gauche (Bulletin)')}</label>
                                <input
                                    type="text"
                                    value={bulletinSigLeft}
                                    onChange={(e) => setBulletinSigLeft(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-4 py-3.5 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_sig_middle', 'Bloc Milieu (Bulletin)')}</label>
                                <input
                                    type="text"
                                    value={bulletinSigMiddle}
                                    onChange={(e) => setBulletinSigMiddle(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-4 py-3.5 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_sig_right', 'Bloc Droit (Bulletin)')}</label>
                                <input
                                    type="text"
                                    value={bulletinSigRight}
                                    onChange={(e) => setBulletinSigRight(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-4 py-3.5 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_sig_receipt', 'Signature sur les Reçus de Caisse')}</label>
                            <input
                                type="text"
                                value={receiptSigTitle}
                                onChange={(e) => setReceiptSigTitle(e.target.value)}
                                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                            />
                        </div>
                    </div>

                    {/* Hybrid Report Template Configuration */}
                    <div className="glass-card p-8 bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-[32px] space-y-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <div className="flex items-center space-x-3 text-amber-500">
                                <Sliders className="w-5 h-5" />
                                <h2 className="text-lg font-black uppercase text-white tracking-wide">{t('cust_pdf_template_title', 'Bulletin Personnalisé (Gabarit Hybride)')}</h2>
                            </div>
                        </div>

                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div className="space-y-2 text-slate-400 text-xs font-bold">
                                <p>Le système hybride permet à l'application de générer le tableau central des notes de façon dynamique (avec pagination automatique si besoin) tout en conservant le design de votre établissement.</p>
                            </div>

                            {/* Header Image Uploader */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Image de l'En-tête (JPG / PNG - Max 3 Mo)</label>
                                <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-amber-500/50 transition-all relative">
                                    {headerImage ? (
                                        <div className="space-y-4">
                                            <img src={headerImage} alt="Header" className="max-h-32 mx-auto rounded-lg shadow-lg" />
                                            <button type="button" onClick={() => setHeaderImage('')} className="px-4 py-2 bg-rose-500/20 text-rose-500 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-rose-500 hover:text-white transition-all">Supprimer l'En-tête</button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-sm font-bold text-slate-400">Sélectionnez une image large pour l'en-tête</p>
                                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setHeaderImage)} className="opacity-0 absolute inset-0 cursor-pointer w-full h-full" />
                                            <span className="inline-block bg-white/5 border border-white/10 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest mt-2 hover:bg-white/10">{t('cust_browse', 'Parcourir')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Watermark Image Uploader */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Filigrane / Watermark de Fond (JPG / PNG - Translucide)</label>
                                <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-amber-500/50 transition-all relative">
                                    {watermarkImage ? (
                                        <div className="space-y-4">
                                            <img src={watermarkImage} alt="Watermark" className="max-h-32 mx-auto rounded-lg shadow-lg opacity-50" />
                                            <button type="button" onClick={() => setWatermarkImage('')} className="px-4 py-2 bg-rose-500/20 text-rose-500 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-rose-500 hover:text-white transition-all">Supprimer le Filigrane</button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-sm font-bold text-slate-400">Sélectionnez une image de fond (logo de l'école estompé)</p>
                                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setWatermarkImage)} className="opacity-0 absolute inset-0 cursor-pointer w-full h-full" />
                                            <span className="inline-block bg-white/5 border border-white/10 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest mt-2 hover:bg-white/10">{t('cust_browse', 'Parcourir')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer Image Uploader */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Image de Pied de Page / Cachets & Signatures (JPG / PNG)</label>
                                <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-amber-500/50 transition-all relative">
                                    {footerImage ? (
                                        <div className="space-y-4">
                                            <img src={footerImage} alt="Footer" className="max-h-32 mx-auto rounded-lg shadow-lg" />
                                            <button type="button" onClick={() => setFooterImage('')} className="px-4 py-2 bg-rose-500/20 text-rose-500 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-rose-500 hover:text-white transition-all">Supprimer le Pied de page</button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-sm font-bold text-slate-400">Sélectionnez une image contenant les cachets et signatures</p>
                                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setFooterImage)} className="opacity-0 absolute inset-0 cursor-pointer w-full h-full" />
                                            <span className="inline-block bg-white/5 border border-white/10 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest mt-2 hover:bg-white/10">{t('cust_browse', 'Parcourir')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Actions bar */}
                    <div className="flex justify-end items-center gap-4">
                        {success && (
                            <span className="text-emerald-500 text-xs font-black uppercase tracking-widest flex items-center gap-2 animate-bounce">
                                <CheckCircle2 className="w-4 h-4" /> {t('cust_changes_applied', 'Changements Appliqués !')}
                            </span>
                        )}
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-amber-500 text-slate-950 px-10 py-4.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {saving ? t('cust_saving', 'Sauvegarde...') : t('cust_save_config', 'Enregistrer la Configuration')}
                        </button>
                    </div>
                </form>

                {/* Real-time Dynamic Mockup Preview */}
                <div className="space-y-8">
                    <div className="sticky top-8 space-y-6">
                        <div className="flex items-center space-x-2 text-slate-400 font-black text-xs uppercase tracking-widest">
                            <Layout className="w-4 h-4 text-amber-500" />
                            <span>{t('cust_live_preview', 'Aperçu du Rendu Direct')}</span>
                        </div>

                        {/* Bulletin Mockup Card */}
                        <div className="bg-white p-6 rounded-[24px] shadow-2xl border border-slate-200 text-slate-900 space-y-4">
                            <span className="text-[8px] font-black bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase tracking-widest block w-max">
                                {t('cust_official_report', 'Bulletin Scolaire Officiel')}
                            </span>

                            {/* Header */}
                            <div className="flex justify-between items-start border-b border-slate-200 pb-3 text-[5px] font-bold text-slate-600">
                                <div>
                                    <p>RÉPUBLIQUE DU CAMEROUN</p>
                                    <p className="text-[4px] italic text-slate-400">Paix - Travail - Patrie</p>
                                    <p className="text-[5px] font-black text-slate-800 uppercase mt-0.5">{headerFrench || "MINISTÈRE DE L'ÉDUCATION DE BASE"}</p>
                                </div>
                                <div className="text-right">
                                    <p>REPUBLIC OF CAMEROON</p>
                                    <p className="text-[4px] italic text-slate-400">Peace - Work - Fatherland</p>
                                    <p className="text-[5px] font-black text-slate-800 uppercase mt-0.5">{headerEnglish || "MINISTRY OF BASIC EDUCATION"}</p>
                                </div>
                            </div>

                            {/* School Title dynamic color */}
                            <div className="text-center py-1">
                                <h3 className="text-xs font-black uppercase tracking-tight" style={{ color: primaryColor }}>
                                    {schoolName || 'ECO-MANAGE ACADEMY'}
                                </h3>
                                <p className="text-[5px] text-slate-400 font-bold italic mt-0.5">{schoolMotto || 'Education for Excellence'}</p>
                            </div>

                            {/* Grade summary row */}
                            <div className="p-3 rounded-lg flex justify-between items-center" style={{ backgroundColor: `${primaryColor}10` }}>
                                <span className="text-[7px] font-black uppercase tracking-wider text-slate-700">Moyenne Générale</span>
                                <span className="text-xs font-black" style={{ color: primaryColor }}>15.75 <span className="text-[8px] text-slate-400">/ 20</span></span>
                            </div>

                            {/* Signatures mockup */}
                            <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center text-[5px] font-black uppercase tracking-wider text-slate-400">
                                <div className="border-r border-slate-100 pr-1">
                                    <p className="font-bold text-slate-500 truncate">{bulletinSigLeft || t('cust_sig_left_default', "L'ENSEIGNANT")}</p>
                                    <p className="text-[4px] text-slate-300 italic mt-3">{t('cust_signature', 'Signature')}</p>
                                </div>
                                <div className="border-r border-slate-100 pr-1">
                                    <p className="font-bold text-slate-500 truncate">{bulletinSigMiddle || t('cust_sig_middle_default', "PARENT")}</p>
                                    <p className="text-[4px] text-slate-300 italic mt-3">{t('cust_signature', 'Signature')}</p>
                                </div>
                                <div>
                                    <p className="font-bold text-slate-500 truncate">{bulletinSigRight || t('cust_sig_right_default', "LE DIRECTEUR")}</p>
                                    <p className="text-[4px] text-slate-300 italic mt-3">{t('cust_signature', 'Signature')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Receipt Mockup Card */}
                        <div className="bg-white p-6 rounded-[24px] shadow-2xl border border-slate-200 text-slate-900 space-y-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl pointer-events-none" style={{ backgroundColor: `${secondaryColor}15` }} />
                            <span className="text-[8px] font-black bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase tracking-widest block w-max">
                                {t('cust_receipt_badge', 'Reçu Financier de Caisse')}
                            </span>

                            <h4 className="text-center text-xs font-black uppercase tracking-widest border-b border-slate-100 pb-3" style={{ color: primaryColor }}>
                                {t('cust_receipt_title', 'Reçu de Paiement')}
                            </h4>

                            <div className="space-y-1.5 text-[7px] text-slate-600">
                                <div className="flex justify-between border-b border-slate-100 pb-1">
                                    <span className="font-black">{t('cust_receipt_amount', 'Montant versé')}</span>
                                    <span className="font-black text-slate-900">75 000 FCFA</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-100 pb-1">
                                    <span className="font-black">{t('cust_receipt_reason', 'Motif')}</span>
                                    <span className="font-black text-slate-900">{t('cust_receipt_reason_val', '2e Tranche Pension')}</span>
                                </div>
                            </div>

                            {/* Receipt Signature */}
                            <div className="text-right text-[5px] font-black uppercase tracking-wider text-slate-400 pt-2">
                                <p className="font-bold text-slate-600 truncate">{receiptSigTitle || t('cust_receipt_sig_default', "L'Économe / Bursar")}</p>
                                <p className="text-[4px] text-slate-300 italic mt-4">{t('cust_stamp_sig', 'Cachet & Signature')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomizationSettings;
