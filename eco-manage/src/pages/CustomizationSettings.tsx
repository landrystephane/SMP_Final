import React, { useState, useEffect } from 'react';
import { Palette, FileText, CheckCircle2, Layout, Sliders, Type, Edit3, ShieldAlert, X, Plus, Trash2, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../context/NotificationContext';

const CustomizationSettings: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { showNotification } = useNotification();
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
    const [currency, setCurrency] = useState('FCFA');
    const [primaryColor, setPrimaryColor] = useState('#1e293b');
    const [secondaryColor, setSecondaryColor] = useState('#f59e0b');
    const [receiptSigTitle, setReceiptSigTitle] = useState("Signature de l'Économe");
    const [bulletinSigLeft, setBulletinSigLeft] = useState("L'ENSEIGNANT (TEACHER)");
    const [bulletinSigMiddle, setBulletinSigMiddle] = useState("PARENT / GUARDIAN");
    const [bulletinSigRight, setBulletinSigRight] = useState("LE DIRECTEUR (HEADMASTER)");
    const [headerFrench, setHeaderFrench] = useState("MINISTÈRE DE L'ÉDUCATION DE BASE");
    const [headerEnglish, setHeaderEnglish] = useState("MINISTRY OF BASIC EDUCATION");
    const [honorRollThreshold, setHonorRollThreshold] = useState<number>(15.0);
    const [honorTitleText, setHonorTitleText] = useState("TABLEAU D'HONNEUR");
    const [timetableSlots, setTimetableSlots] = useState<any[]>([]);
    const [evaluationPeriods, setEvaluationPeriods] = useState<any[]>([]);
    const [termStructure, setTermStructure] = useState<any[]>([]);
    const [allowFounderTermEdit, setAllowFounderTermEdit] = useState(0);
    const [gradingScales, setGradingScales] = useState<any[]>([]);
    const [isEditingScale, setIsEditingScale] = useState(false);
    const [editingScale, setEditingScale] = useState<any>({
        id: null as number | null,
        name: '',
        is_numerical: 1,
        min_value: 0,
        max_value: 20,
        options: [] as any[]
    });
    const [installments, setInstallments] = useState<any[]>([]);
    const [installmentDeadlines, setInstallmentDeadlines] = useState<any[]>([]);

    // Financial alert thresholds
    const [alertUnpaidThreshold, setAlertUnpaidThreshold] = useState(50);
    const [alertExpenseRatio, setAlertExpenseRatio] = useState(50);
    const [alertDeadlineDays, setAlertDeadlineDays] = useState(7);
    const [alertGradeDeadlineDays, setAlertGradeDeadlineDays] = useState(3);

    // Full custom bulletin template
    const [bulletinUseCustom, setBulletinUseCustom] = useState(0);
    const [bulletinTemplate, setBulletinTemplate] = useState('');
    const [bulletinMapping, setBulletinMapping] = useState<any>({
        studentName: { x: 80, y: 80 },
        matricule: { x: 80, y: 87 },
        class: { x: 80, y: 94 },
        year: { x: 175, y: 80 },
        section: { x: 175, y: 87 },
        absences: { x: 25, y: 195 },
        conduct: { x: 25, y: 202 },
        average: { x: 120, y: 195 },
        rank: { x: 120, y: 202 },
        decision: { x: 120, y: 209 },
        table: { x: 20, y: 115, width: 170 }
    });

    // Custom PDF template fields
    const [headerImage, setHeaderImage] = useState('');
    const [watermarkImage, setWatermarkImage] = useState('');
    const [footerImage, setFooterImage] = useState('');

    const loadSettings = async () => {
        setLoading(true);
        try {
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
                    setHonorRollThreshold(mySchool.honor_roll_threshold || 15.0);

                    // Signatures pour les bulletins et reçus
                    setReceiptSigTitle(mySchool.receipt_sig_title || "Signature de l'Économe");
                    setBulletinSigLeft(mySchool.bulletin_sig_left || "L'ENSEIGNANT (TEACHER)");
                    setBulletinSigMiddle(mySchool.bulletin_sig_middle || "PARENT / GUARDIAN");
                    setBulletinSigRight(mySchool.bulletin_sig_right || "LE DIRECTEUR (HEADMASTER)");
                    setHeaderFrench(mySchool.header_french || "MINISTÈRE DE L'ÉDUCATION DE BASE");
                    setHeaderEnglish(mySchool.header_english || "MINISTRY OF BASIC EDUCATION");
                    setHonorTitleText(mySchool.honor_title_text || "TABLEAU D'HONNEUR");

                    try {
                        setTimetableSlots(mySchool.timetable_slots ? JSON.parse(mySchool.timetable_slots) : [
                            { label: '08:00 - 10:00', start: '08:00', end: '10:00', isBreak: false },
                            { label: '10:00 - 10:30', start: '10:00', end: '10:30', isBreak: true },
                            { label: '10:30 - 12:30', start: '10:30', end: '12:30', isBreak: false },
                            { label: '12:30 - 13:00', start: '12:30', end: '13:00', isBreak: true },
                            { label: '13:00 - 15:00', start: '13:00', end: '15:00', isBreak: false },
                            { label: '15:00 - 17:00', start: '15:00', end: '17:00', isBreak: false }
                        ]);
                    } catch(e) {
                        setTimetableSlots([]);
                    }

                    setAllowFounderTermEdit(mySchool.allow_founder_term_edit || 0);
                    try {
                        setEvaluationPeriods(mySchool.evaluation_periods ? JSON.parse(mySchool.evaluation_periods) : [
                            { id: 1, name: '1ER TRIMESTRE' },
                            { id: 2, name: '2E TRIMESTRE' },
                            { id: 3, name: '3E TRIMESTRE' }
                        ]);
                    } catch(e) {
                        setEvaluationPeriods([]);
                    }

                    try {
                        setTermStructure(mySchool.term_structure ? JSON.parse(mySchool.term_structure) : [
                            { term_id: 1, name: '1ER TRIMESTRE', sequences: [{ id: 1, name: 'Séquence 1' }, { id: 2, name: 'Séquence 2' }] },
                            { term_id: 2, name: '2E TRIMESTRE', sequences: [{ id: 3, name: 'Séquence 3' }, { id: 4, name: 'Séquence 4' }] },
                            { term_id: 3, name: '3E TRIMESTRE', sequences: [{ id: 5, name: 'Séquence 5' }, { id: 6, name: 'Séquence 6' }] }
                        ]);
                    } catch(e) {
                        setTermStructure([]);
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

                    try {
                        const scales = await (window.electronAPI as any).getGradingScales(mySchool.id);
                        setGradingScales(scales || []);
                    } catch(e: any) {
                        console.error('Failed to load grading scales', e);
                        setGradingScales([]);
                    }

                    setBulletinUseCustom(mySchool.bulletin_pdf_use_custom || 0);
                    setBulletinTemplate(mySchool.bulletin_pdf_template || '');
                    try {
                        if (mySchool.bulletin_pdf_mapping) {
                            setBulletinMapping(typeof mySchool.bulletin_pdf_mapping === 'string' ? JSON.parse(mySchool.bulletin_pdf_mapping) : mySchool.bulletin_pdf_mapping);
                        }
                    } catch(e) {}

                    const aut = await window.electronAPI.getSetting('alert_unpaid_threshold');
                    if (aut) setAlertUnpaidThreshold(parseInt(aut));
                    const aer = await window.electronAPI.getSetting('alert_expense_ratio');
                    if (aer) setAlertExpenseRatio(parseInt(aer));
                    const add = await window.electronAPI.getSetting('alert_deadline_days');
                    if (add) setAlertDeadlineDays(parseInt(add));
                    const agd = await window.electronAPI.getSetting('alert_grade_deadline_days');
                    if (agd) setAlertGradeDeadlineDays(parseInt(agd));

                    const currencySetting = await window.electronAPI.getSetting('currency');
                    if (currencySetting) setCurrency(currencySetting);
                }
            }
        } catch (e: any) {
            console.error(t('cust_load_settings_error', { message: e.message }));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, [user]);

    const handleAddScaleOption = () => {
        setEditingScale({
            ...editingScale,
            options: [
                ...editingScale.options,
                { symbol: '', min_range: 0, max_range: 20, numeric_equivalent: 10, description: '' }
            ]
        });
    };

    const handleRemoveScaleOption = (index: number) => {
        setEditingScale({
            ...editingScale,
            options: editingScale.options.filter((_: any, i: number) => i !== index)
        });
    };

    const handleOptionChange = (index: number, field: string, value: any) => {
        const updatedOptions = [...editingScale.options];
        updatedOptions[index] = {
            ...updatedOptions[index],
            [field]: value
        };
        setEditingScale({
            ...editingScale,
            options: updatedOptions
        });
    };

    const handleSaveScale = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!window.electronAPI || !activeSchool) return;

        try {
            const res = await (window.electronAPI as any).saveGradingScale({
                id: editingScale.id,
                schoolId: activeSchool.id,
                name: editingScale.name,
                is_numerical: parseInt(editingScale.is_numerical),
                min_value: parseFloat(editingScale.min_value) || 0,
                max_value: parseFloat(editingScale.max_value) || 20,
                options: editingScale.options.map((opt: any) => ({
                    ...opt,
                    min_range: opt.min_range !== '' && opt.min_range !== null ? parseFloat(opt.min_range) : null,
                    max_range: opt.max_range !== '' && opt.max_range !== null ? parseFloat(opt.max_range) : null,
                    numeric_equivalent: parseFloat(opt.numeric_equivalent) || 0
                }))
            });

            if (res.error) throw new Error(res.error);
            showNotification(editingScale.id ? t('cust_scale_updated_success') : t('cust_scale_created_success'), "success");
            setIsEditingScale(false);
            loadSettings();
        } catch (err: any) {
            showNotification(t('cust_scale_save_error', { message: err.message }), "error");
        }
    };

    const handleDeleteScale = async (scaleId: number) => {
        if (!window.confirm(t('cust_confirm_delete_scale'))) return;
        if (!window.electronAPI) return;

        try {
            const res = await (window.electronAPI as any).deleteGradingScale(scaleId);
            if (res.error) throw new Error(res.error);
            showNotification(t('cust_scale_deleted_success'), "success");
            setIsEditingScale(false);
            loadSettings();
        } catch (err: any) {
            showNotification(t('cust_scale_delete_error', { message: err.message }), "error");
        }
    };

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
                honor_title_text: honorTitleText,
                timetable_slots: JSON.stringify(timetableSlots),
                evaluation_periods: JSON.stringify(evaluationPeriods),
                term_structure: JSON.stringify(termStructure),
                bulletin_pdf_use_custom: bulletinUseCustom,
                bulletin_pdf_template: bulletinTemplate || null,
                bulletin_pdf_mapping: JSON.stringify(bulletinMapping)
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

            await window.electronAPI.setSetting({ key: 'alert_unpaid_threshold', value: alertUnpaidThreshold.toString() });
            await window.electronAPI.setSetting({ key: 'alert_expense_ratio', value: alertExpenseRatio.toString() });
            await window.electronAPI.setSetting({ key: 'alert_deadline_days', value: alertDeadlineDays.toString() });
            await window.electronAPI.setSetting({ key: 'alert_grade_deadline_days', value: alertGradeDeadlineDays.toString() });
            await window.electronAPI.setSetting({ key: 'currency', value: currency });

            setSuccess(true);
            showNotification(t('cust_settings_saved_success'), "success");
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
                                    placeholder={t('cust_official_name_placeholder')}
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_school_motto_label')}</label>
                                <input
                                    type="text"
                                    value={schoolMotto}
                                    onChange={(e) => setSchoolMotto(e.target.value)}
                                    placeholder={t('cust_school_motto_placeholder')}
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_physical_address', 'Adresse Physique')}</label>
                                <input
                                    type="text"
                                    value={schoolAddress}
                                    onChange={(e) => setSchoolAddress(e.target.value)}
                                    placeholder={t('cust_address_placeholder')}
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_bp', 'Boîte Postale (B.P.)')}</label>
                                <input
                                    type="text"
                                    value={schoolBp}
                                    onChange={(e) => setSchoolBp(e.target.value)}
                                    placeholder={t('cust_bp_placeholder')}
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_currency_label')}</label>
                                <input
                                    type="text"
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                                    placeholder="Ex: FCFA, USD, EUR"
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
                            <h2 className="text-lg font-black uppercase text-white tracking-wide">{t('cust_pedagogy_settings')}</h2>
                        </div>

                        <div className="space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_honor_threshold')}</label>
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

                            {/* Honor Roll Certificate customization (reuses primary/secondary colors above) */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_honor_title_text', 'Titre du Certificat (Tableau d\'Honneur)')}</label>
                                <input
                                    type="text"
                                    value={honorTitleText}
                                    onChange={(e) => setHonorTitleText(e.target.value)}
                                    placeholder="TABLEAU D'HONNEUR"
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white uppercase outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                />
                                <p className="text-[10px] text-slate-500">{t('cust_honor_title_text_hint', "Le certificat utilise déjà la couleur primaire (bordure/nom) et la couleur secondaire (titre) définies ci-dessus.")}</p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_eval_periods_structure')}</label>
                                    {(allowFounderTermEdit === 1 || user?.role === 'SUPERADMIN') && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newId = termStructure.length > 0 ? Math.max(...termStructure.map(t => t.term_id)) + 1 : 1;
                                                setTermStructure([...termStructure, { term_id: newId, name: `Période ${newId}`, sequences: [] }]);
                                            }}
                                            className="text-[10px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-lg hover:bg-amber-500 hover:text-slate-950 transition-all"
                                        >
                                            {t('cust_add_period')}
                                        </button>
                                    )}
                                </div>

                                {!(allowFounderTermEdit === 1 || user?.role === 'SUPERADMIN') && (
                                    <div className="p-4 bg-rose-500/10 border-l-4 border-rose-500 rounded-xl text-rose-500 text-xs font-bold flex items-start gap-2">
                                        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>{t('cust_term_structure_readonly_warning')}</span>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {termStructure.map((term, tIdx) => (
                                        <div key={term.term_id} className="bg-slate-950 p-6 rounded-2xl border border-white/5 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <span className="text-slate-500 font-bold text-xs bg-white/5 px-3 py-1.5 rounded-lg">ID: {term.term_id}</span>
                                                <input 
                                                    type="text" 
                                                    value={term.name} 
                                                    disabled={!(allowFounderTermEdit === 1 || user?.role === 'SUPERADMIN')}
                                                    onChange={(e) => {
                                                        const newStruct = [...termStructure];
                                                        newStruct[tIdx].name = e.target.value;
                                                        setTermStructure(newStruct);
                                                    }}
                                                    placeholder={t('cust_term_name_placeholder')}
                                                    className="flex-1 bg-transparent border-b border-white/10 px-2 py-1 text-sm font-black text-white outline-none focus:border-amber-500 uppercase disabled:opacity-60"
                                                />
                                                {(allowFounderTermEdit === 1 || user?.role === 'SUPERADMIN') && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            const newStruct = termStructure.filter((_, i) => i !== tIdx);
                                                            setTermStructure(newStruct);
                                                        }}
                                                        className="text-rose-500 hover:text-rose-400 bg-rose-500/10 p-2 rounded-xl transition-all"
                                                    >
                                                        <ShieldAlert className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="pl-6 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('cust_associated_sequences')}</span>
                                                    {(allowFounderTermEdit === 1 || user?.role === 'SUPERADMIN') && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const allSeqIds = termStructure.flatMap(t => t.sequences.map((s: any) => s.id));
                                                                const nextSeqId = allSeqIds.length > 0 ? Math.max(...allSeqIds) + 1 : 1;
                                                                const newStruct = [...termStructure];
                                                                newStruct[tIdx].sequences.push({ id: nextSeqId, name: `Séquence ${nextSeqId}`, weight: 1 });
                                                                setTermStructure(newStruct);
                                                            }}
                                                            className="text-[8px] font-black text-amber-500 hover:underline uppercase tracking-wider"
                                                        >
                                                            {t('cust_add_sequence')}
                                                        </button>
                                                    )}
                                                </div>
                                                {term.sequences.map((seq: any, sIdx: number) => (
                                                    <div key={seq.id} className="flex gap-3 items-center bg-slate-900/40 px-4 py-2.5 rounded-xl border border-white/5">
                                                        <span className="text-slate-600 font-bold text-[10px]">SEQ {seq.id}</span>
                                                        <input 
                                                            type="text" 
                                                            value={seq.name}
                                                            disabled={!(allowFounderTermEdit === 1 || user?.role === 'SUPERADMIN')}
                                                            onChange={(e) => {
                                                                const newStruct = [...termStructure];
                                                                newStruct[tIdx].sequences[sIdx].name = e.target.value;
                                                                setTermStructure(newStruct);
                                                            }}
                                                            placeholder={t('cust_sequence_name_placeholder')}
                                                            className="flex-1 bg-transparent border-b border-white/5 px-2 py-0.5 text-xs font-semibold text-slate-300 outline-none focus:border-amber-500 disabled:opacity-60"
                                                        />
                                                        <div className="flex items-center gap-1.5 border-l border-white/10 pl-3">
                                                            <span className="text-[9px] font-black text-slate-500 uppercase">{t('cust_weight_label')}</span>
                                                            <input
                                                                type="number"
                                                                min="0.1"
                                                                step="0.1"
                                                                disabled={!(allowFounderTermEdit === 1 || user?.role === 'SUPERADMIN')}
                                                                value={seq.weight !== undefined ? seq.weight : 1}
                                                                onChange={(e) => {
                                                                    const newStruct = [...termStructure];
                                                                    newStruct[tIdx].sequences[sIdx].weight = parseFloat(e.target.value) || 1;
                                                                    setTermStructure(newStruct);
                                                                }}
                                                                className="w-12 bg-slate-800 border border-white/10 rounded px-1.5 py-0.5 text-xs font-bold text-center text-white outline-none focus:border-amber-500 disabled:opacity-60"
                                                            />
                                                        </div>
                                                        {(allowFounderTermEdit === 1 || user?.role === 'SUPERADMIN') && (
                                                            <button 
                                                                type="button"
                                                                onClick={() => {
                                                                    const newStruct = [...termStructure];
                                                                    newStruct[tIdx].sequences = term.sequences.filter((_: any, i: number) => i !== sIdx);
                                                                    setTermStructure(newStruct);
                                                                }}
                                                                className="text-rose-500 hover:text-rose-400 p-1"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                {term.sequences.length === 0 && (
                                                    <p className="text-[10px] text-slate-600 italic">{t('cust_no_sequence_in_period')}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {termStructure.length === 0 && (
                                        <p className="text-center text-rose-500 text-sm font-bold italic py-4">{t('cust_no_eval_period_defined')}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_installment_deadlines')}</label>
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
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_timetable_slots')}</label>
                                    <button
                                        type="button"
                                        onClick={() => setTimetableSlots([...timetableSlots, { label: 'Nouveau', start: '00:00', end: '00:00', isBreak: false }])}
                                        className="text-[10px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-lg hover:bg-amber-500 hover:text-slate-950 transition-all"
                                    >
                                        {t('cust_add_time_slot')}
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
                                                placeholder={t('cust_slot_label_placeholder')}
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
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('cust_is_break_label')}</span>
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
                                        <p className="text-center text-slate-500 text-sm font-bold italic py-4">{t('cust_no_time_slot_defined')}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Échelles et Barèmes de Notation */}
                    <div className="glass-card p-8 bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-[32px] space-y-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <div className="flex items-center space-x-3 text-amber-500">
                                <Palette className="w-5 h-5" />
                                <h2 className="text-lg font-black uppercase text-white tracking-wide">{t('cust_grading_scales_title')}</h2>
                            </div>
                            {!isEditingScale && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingScale({
                                            id: null,
                                            name: '',
                                            is_numerical: 1,
                                            min_value: 0,
                                            max_value: 20,
                                            options: []
                                        });
                                        setIsEditingScale(true);
                                    }}
                                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-955 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    {t('cust_new_scale_btn')}
                                </button>
                            )}
                        </div>

                        {!isEditingScale ? (
                            <div className="space-y-4">
                                <p className="text-xs text-slate-400 leading-relaxed font-bold">
                                    {t('cust_grading_scales_desc')}
                                </p>
                                {gradingScales.length === 0 ? (
                                    <p className="text-center text-slate-500 text-xs font-bold py-6 italic">{t('cust_no_custom_scale')}</p>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {gradingScales.map((scale: any) => (
                                            <div 
                                                key={scale.id} 
                                                onClick={() => {
                                                    setEditingScale(scale);
                                                    setIsEditingScale(true);
                                                }}
                                                className="p-5 bg-white/5 border border-white/5 hover:border-amber-500/30 rounded-2xl cursor-pointer transition-all hover:bg-white/[0.08]"
                                            >
                                                <h4 className="text-sm font-black text-white">{scale.name}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                                    {t('cust_scale_type_label')} {scale.is_numerical ? t('grade_conversion') : t('literal_grade')}
                                                </p>
                                                {scale.is_numerical ? (
                                                    <p className="text-[10px] text-amber-500 font-black mt-1">
                                                        {t('cust_raw_range_label', { min: scale.min_value, max: scale.max_value })}
                                                    </p>
                                                ) : null}
                                                <div className="flex flex-wrap gap-1 mt-3">
                                                    {(scale.options || []).map((o: any, idx: number) => (
                                                        <span key={idx} className="bg-slate-800 border border-white/5 text-slate-300 text-[9px] font-bold px-1.5 py-0.5 rounded" title={o.description}>
                                                            {o.symbol} {scale.is_numerical ? `[${o.min_range}-${o.max_range}]` : `(=${o.numeric_equivalent})`}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in duration-200">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_scale_name_label')}</label>
                                        <input
                                            required
                                            type="text"
                                            value={editingScale.name}
                                            onChange={(e) => setEditingScale({ ...editingScale, name: e.target.value })}
                                            placeholder={t('cust_scale_name_placeholder')}
                                            className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_scale_model_label')}</label>
                                            <select
                                                value={editingScale.is_numerical}
                                                onChange={(e) => setEditingScale({ ...editingScale, is_numerical: parseInt(e.target.value) })}
                                                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                            >
                                                <option value={1}>{t('cust_scale_numerical_opt')}</option>
                                                <option value={0}>{t('cust_scale_literal_opt')}</option>
                                            </select>
                                        </div>

                                        {parseInt(editingScale.is_numerical) === 1 && (
                                            <>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_min_grade_label')}</label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        value={editingScale.min_value}
                                                        onChange={(e) => setEditingScale({ ...editingScale, min_value: e.target.value })}
                                                        className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_max_grade_label')}</label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        value={editingScale.max_value}
                                                        onChange={(e) => setEditingScale({ ...editingScale, max_value: e.target.value })}
                                                        className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4 border-t border-white/5 pt-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black uppercase text-white tracking-widest">{t('cust_scale_options_title')}</h3>
                                        <button
                                            type="button"
                                            onClick={handleAddScaleOption}
                                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border border-white/5"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            {t('cust_add_grade_btn')}
                                        </button>
                                    </div>

                                    {editingScale.options.length === 0 ? (
                                        <p className="text-center text-slate-500 text-xs font-bold py-4 italic">{t('cust_no_mention_added')}</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {editingScale.options.map((opt: any, idx: number) => (
                                                <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-slate-950/50 border border-white/5 rounded-2xl items-center relative">
                                                    <div>
                                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">{t('cust_symbol_label')}</label>
                                                        <input
                                                            required
                                                            type="text"
                                                            value={opt.symbol}
                                                            onChange={(e) => handleOptionChange(idx, 'symbol', e.target.value.toUpperCase())}
                                                            className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                                        />
                                                    </div>

                                                    {parseInt(editingScale.is_numerical) === 1 ? (
                                                        <>
                                                            <div>
                                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">{t('cust_min_range_label')}</label>
                                                                <input
                                                                    required
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={opt.min_range}
                                                                    onChange={(e) => handleOptionChange(idx, 'min_range', e.target.value)}
                                                                    className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">{t('cust_max_range_label')}</label>
                                                                <input
                                                                    required
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={opt.max_range}
                                                                    onChange={(e) => handleOptionChange(idx, 'max_range', e.target.value)}
                                                                    className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                                                />
                                                            </div>
                                                        </>
                                                    ) : null}

                                                    <div className={parseInt(editingScale.is_numerical) === 1 ? 'md:col-span-1' : 'md:col-span-2'}>
                                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                                                            {parseInt(editingScale.is_numerical) === 1 ? t('cust_equivalent_avg_label') : t('cust_numeric_value_label')}
                                                        </label>
                                                        <input
                                                            required
                                                            type="number"
                                                            step="0.1"
                                                            value={opt.numeric_equivalent}
                                                            onChange={(e) => handleOptionChange(idx, 'numeric_equivalent', e.target.value)}
                                                            className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                                        />
                                                    </div>

                                                    <div className="flex items-center space-x-2 pt-4 md:pt-0">
                                                        <div className="flex-1">
                                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">{t('cust_description_optional_label')}</label>
                                                            <input
                                                                type="text"
                                                                value={opt.description}
                                                                onChange={(e) => handleOptionChange(idx, 'description', e.target.value)}
                                                                className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveScaleOption(idx)}
                                                            className="text-rose-500 hover:text-rose-400 bg-rose-500/10 p-2 rounded-xl mt-5"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4 border-t border-white/5 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingScale(false)}
                                        className="flex-1 py-3 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-700 transition-colors"
                                    >
                                        {t('cust_back_cancel_btn')}
                                    </button>

                                    {editingScale.id && (
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteScale(editingScale.id)}
                                            className="px-5 py-3 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-2xl font-bold hover:bg-rose-500/30 transition-colors"
                                        >
                                            {t('cust_delete_btn')}
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={handleSaveScale}
                                        className="flex-1 py-3 bg-amber-500 text-slate-900 rounded-2xl font-bold hover:bg-amber-400 transition-colors flex justify-center items-center gap-2"
                                    >
                                        <Save className="w-5 h-5" />
                                        {t('cust_save_btn')}
                                    </button>
                                </div>
                            </div>
                        )}
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
                                <p>{t('cust_hybrid_template_desc')}</p>
                            </div>

                            {/* Header Image Uploader */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_header_image_label')}</label>
                                <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-amber-500/50 transition-all relative">
                                    {headerImage ? (
                                        <div className="space-y-4">
                                            <img src={headerImage} alt="Header" className="w-full object-contain max-h-32 rounded-lg shadow-lg" />
                                            <button type="button" onClick={() => setHeaderImage('')} className="px-4 py-2 bg-rose-500/20 text-rose-500 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-rose-500 hover:text-white transition-all">{t('cust_remove_header')}</button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-sm font-bold text-slate-400">{t('cust_select_wide_header_image')}</p>
                                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setHeaderImage)} className="opacity-0 absolute inset-0 cursor-pointer w-full h-full" />
                                            <span className="inline-block bg-white/5 border border-white/10 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest mt-2 hover:bg-white/10">{t('cust_browse', 'Parcourir')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Watermark Image Uploader */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_watermark_label')}</label>
                                <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-amber-500/50 transition-all relative">
                                    {watermarkImage ? (
                                        <div className="space-y-4">
                                            <img src={watermarkImage} alt="Watermark" className="max-h-32 mx-auto rounded-lg shadow-lg opacity-50" />
                                            <button type="button" onClick={() => setWatermarkImage('')} className="px-4 py-2 bg-rose-500/20 text-rose-500 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-rose-500 hover:text-white transition-all">{t('cust_remove_watermark')}</button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-sm font-bold text-slate-400">{t('cust_select_watermark_image')}</p>
                                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setWatermarkImage)} className="opacity-0 absolute inset-0 cursor-pointer w-full h-full" />
                                            <span className="inline-block bg-white/5 border border-white/10 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest mt-2 hover:bg-white/10">{t('cust_browse', 'Parcourir')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer Image Uploader */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t('cust_footer_image_label')}</label>
                                <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-amber-500/50 transition-all relative">
                                    {footerImage ? (
                                        <div className="space-y-4">
                                            <img src={footerImage} alt="Footer" className="max-h-32 mx-auto rounded-lg shadow-lg" />
                                            <button type="button" onClick={() => setFooterImage('')} className="px-4 py-2 bg-rose-500/20 text-rose-500 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-rose-500 hover:text-white transition-all">{t('cust_remove_footer')}</button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-sm font-bold text-slate-400">{t('cust_select_footer_image')}</p>
                                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setFooterImage)} className="opacity-0 absolute inset-0 cursor-pointer w-full h-full" />
                                            <span className="inline-block bg-white/5 border border-white/10 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest mt-2 hover:bg-white/10">{t('cust_browse', 'Parcourir')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Custom Bulletin Template */}
                    <div className="glass-card p-6 space-y-6 border-slate-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-blue-400">
                                <FileText className="w-6 h-6" />
                                <h3 className="text-lg font-black uppercase tracking-tight">{t('custom_bulletin_title')}</h3>
                            </div>
                            <div
                                onClick={() => setBulletinUseCustom(bulletinUseCustom === 1 ? 0 : 1)}
                                className={`w-14 h-7 rounded-full p-1 cursor-pointer transition-all ${bulletinUseCustom === 1 ? 'bg-blue-500' : 'bg-slate-700'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${bulletinUseCustom === 1 ? 'translate-x-7' : ''}`} />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500">{t('custom_bulletin_desc')}</p>

                        {bulletinUseCustom === 1 && (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('upload_blank_bulletin')}</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(e, setBulletinTemplate)}
                                        className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-blue-500/20 file:text-blue-400 file:font-bold file:text-xs file:cursor-pointer"
                                    />
                                    {bulletinTemplate && (
                                        <div className="mt-2 border border-slate-800 rounded-xl overflow-hidden max-h-[300px]">
                                            <img src={bulletinTemplate} alt={t('preview_bulletin')} className="w-full object-contain" />
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h4 className="text-sm font-black text-white uppercase tracking-wider mb-4">{t('field_coordinates')}</h4>
                                    <p className="text-[10px] text-slate-500 mb-4">{t('field_coordinates_desc')}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {[
                                            { key: 'studentName', label: t('field_student_name', 'Nom de l\'élève') },
                                            { key: 'matricule', label: t('field_matricule', 'Matricule') },
                                            { key: 'class', label: t('field_class', 'Classe') },
                                            { key: 'year', label: t('field_year', 'Année scolaire') },
                                            { key: 'section', label: t('field_section', 'Section') },
                                            { key: 'absences', label: t('field_absences', 'Absences') },
                                            { key: 'conduct', label: t('field_conduct', 'Conduite') },
                                            { key: 'average', label: t('field_average', 'Moyenne') },
                                            { key: 'rank', label: t('field_rank', 'Rang') },
                                            { key: 'decision', label: t('field_decision', 'Décision') },
                                        ].map(field => (
                                            <div key={field.key} className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 space-y-2">
                                                <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{field.label}</label>
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <span className="text-[9px] text-slate-600 font-bold">X</span>
                                                        <input type="number" value={bulletinMapping[field.key]?.x || 0}
                                                            onChange={(e) => setBulletinMapping({...bulletinMapping, [field.key]: {...(bulletinMapping[field.key] || {}), x: parseInt(e.target.value) || 0}})}
                                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs font-bold outline-none focus:border-amber-500"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <span className="text-[9px] text-slate-600 font-bold">Y</span>
                                                        <input type="number" value={bulletinMapping[field.key]?.y || 0}
                                                            onChange={(e) => setBulletinMapping({...bulletinMapping, [field.key]: {...(bulletinMapping[field.key] || {}), y: parseInt(e.target.value) || 0}})}
                                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs font-bold outline-none focus:border-amber-500"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="bg-slate-900/50 p-3 rounded-xl border border-blue-500/20 space-y-2 md:col-span-2 lg:col-span-3">
                                            <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{t('field_table')}</label>
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <span className="text-[9px] text-slate-600 font-bold">X</span>
                                                    <input type="number" value={bulletinMapping.table?.x || 20}
                                                        onChange={(e) => setBulletinMapping({...bulletinMapping, table: {...(bulletinMapping.table || {}), x: parseInt(e.target.value) || 20}})}
                                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs font-bold outline-none focus:border-amber-500"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <span className="text-[9px] text-slate-600 font-bold">Y</span>
                                                    <input type="number" value={bulletinMapping.table?.y || 115}
                                                        onChange={(e) => setBulletinMapping({...bulletinMapping, table: {...(bulletinMapping.table || {}), y: parseInt(e.target.value) || 115}})}
                                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs font-bold outline-none focus:border-amber-500"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <span className="text-[9px] text-slate-600 font-bold">{t('field_width')}</span>
                                                    <input type="number" value={bulletinMapping.table?.width || 170}
                                                        onChange={(e) => setBulletinMapping({...bulletinMapping, table: {...(bulletinMapping.table || {}), width: parseInt(e.target.value) || 170}})}
                                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs font-bold outline-none focus:border-amber-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Financial Alerts Configuration */}
                    <div className="glass-card p-6 space-y-6 border-slate-800">
                        <div className="flex items-center space-x-3 text-rose-400">
                            <ShieldAlert className="w-6 h-6" />
                            <h3 className="text-lg font-black uppercase tracking-tight">{t('financial_alerts_config')}</h3>
                        </div>
                        <p className="text-xs text-slate-500">{t('financial_alerts_config_desc')}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">{t('unpaid_threshold')}</label>
                                <p className="text-[10px] text-slate-600 italic">{t('unpaid_threshold_desc')}</p>
                                <input
                                    type="number" min="10" max="100" step="5"
                                    value={alertUnpaidThreshold}
                                    onChange={(e) => setAlertUnpaidThreshold(parseInt(e.target.value) || 50)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:ring-2 focus:ring-amber-500"
                                />
                                <p className="text-[10px] text-amber-500 font-bold">{t('cust_current_unpaid_alert', { value: alertUnpaidThreshold })}</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">{t('expense_ratio_threshold')}</label>
                                <p className="text-[10px] text-slate-600 italic">{t('expense_ratio_threshold_desc')}</p>
                                <input
                                    type="number" min="10" max="100" step="5"
                                    value={alertExpenseRatio}
                                    onChange={(e) => setAlertExpenseRatio(parseInt(e.target.value) || 50)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:ring-2 focus:ring-amber-500"
                                />
                                <p className="text-[10px] text-amber-500 font-bold">{t('cust_current_expense_alert', { value: alertExpenseRatio })}</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">{t('deadline_alert_days')}</label>
                                <p className="text-[10px] text-slate-600 italic">{t('cust_deadline_days_desc')}</p>
                                <input type="number" min="1" max="30" value={alertDeadlineDays}
                                    onChange={(e) => setAlertDeadlineDays(parseInt(e.target.value) || 7)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:ring-2 focus:ring-amber-500" />
                                <p className="text-[10px] text-amber-500 font-bold">{t('cust_current_deadline_alert', { value: alertDeadlineDays })}</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">{t('grade_deadline_alert_days')}</label>
                                <p className="text-[10px] text-slate-600 italic">{t('cust_grade_deadline_days_desc')}</p>
                                <input type="number" min="1" max="15" value={alertGradeDeadlineDays}
                                    onChange={(e) => setAlertGradeDeadlineDays(parseInt(e.target.value) || 3)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:ring-2 focus:ring-amber-500" />
                                <p className="text-[10px] text-amber-500 font-bold">{t('cust_current_grade_deadline_alert', { value: alertGradeDeadlineDays })}</p>
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
                                    {schoolName || ''}
                                </h3>
                                <p className="text-[5px] text-slate-400 font-bold italic mt-0.5">{schoolMotto || 'Education for Excellence'}</p>
                            </div>

                            {/* Grade summary row */}
                            <div className="p-3 rounded-lg flex justify-between items-center" style={{ backgroundColor: `${primaryColor}10` }}>
                                <span className="text-[7px] font-black uppercase tracking-wider text-slate-700">{t('general_average_label', 'Moyenne Générale')}</span>
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
