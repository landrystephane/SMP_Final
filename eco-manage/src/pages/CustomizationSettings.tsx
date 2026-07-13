import React, { useState, useEffect } from 'react';
import { Palette, FileText, CheckCircle2, Layout, Sliders, Type, Edit3, ShieldAlert, X, Plus, Trash2, Save, ImageIcon, DollarSign, BookOpen, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../context/NotificationContext';

type Tab = 'identite' | 'documents' | 'pedagogie' | 'finance' | 'baremes' | 'apercu';

const CustomizationSettings: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [schools, setSchools] = useState<any[]>([]);
    const [activeSchool, setActiveSchool] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('identite');

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

    // Logo de l'établissement (affiché dans l'en-tête texte du bulletin)
    const [logoImage, setLogoImage] = useState('');

    // Images du template PDF (en-tête bandeau, filigrane, pied de page)
    const [headerImage, setHeaderImage] = useState('');
    const [watermarkImage, setWatermarkImage] = useState('');
    const [footerImage, setFooterImage] = useState('');
    const [footerImagePosition, setFooterImagePosition] = useState<'footer' | 'stamp'>('footer');

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

                    setReceiptSigTitle(mySchool.receipt_sig_title || "Signature de l'Économe");
                    setBulletinSigLeft(mySchool.bulletin_sig_left || "L'ENSEIGNANT (TEACHER)");
                    setBulletinSigMiddle(mySchool.bulletin_sig_middle || "PARENT / GUARDIAN");
                    setBulletinSigRight(mySchool.bulletin_sig_right || "LE DIRECTEUR (HEADMASTER)");
                    setHeaderFrench(mySchool.header_french || "MINISTÈRE DE L'ÉDUCATION DE BASE");
                    setHeaderEnglish(mySchool.header_english || "MINISTRY OF BASIC EDUCATION");
                    setHonorTitleText(mySchool.honor_title_text || "TABLEAU D'HONNEUR");
                    setLogoImage(mySchool.logo || '');

                    // Couleurs par défaut depuis l'école (priorité : template > école > défaut)
                    setPrimaryColor(mySchool.primary_color || '#1e293b');
                    setSecondaryColor(mySchool.secondary_color || '#f59e0b');

                    try {
                        setTimetableSlots(mySchool.timetable_slots ? JSON.parse(mySchool.timetable_slots) : [
                            { label: '08:00 - 10:00', start: '08:00', end: '10:00', isBreak: false },
                            { label: '10:00 - 10:30', start: '10:00', end: '10:30', isBreak: true },
                            { label: '10:30 - 12:30', start: '10:30', end: '12:30', isBreak: false },
                            { label: '12:30 - 13:00', start: '12:30', end: '13:00', isBreak: true },
                            { label: '13:00 - 15:00', start: '13:00', end: '15:00', isBreak: false },
                            { label: '15:00 - 17:00', start: '15:00', end: '17:00', isBreak: false }
                        ]);
                    } catch(e) { setTimetableSlots([]); }

                    setAllowFounderTermEdit(mySchool.allow_founder_term_edit || 0);
                    try {
                        setEvaluationPeriods(mySchool.evaluation_periods ? JSON.parse(mySchool.evaluation_periods) : [
                            { id: 1, name: '1ER TRIMESTRE' },
                            { id: 2, name: '2E TRIMESTRE' },
                            { id: 3, name: '3E TRIMESTRE' }
                        ]);
                    } catch(e) { setEvaluationPeriods([]); }

                    try {
                        setTermStructure(mySchool.term_structure ? JSON.parse(mySchool.term_structure) : [
                            { term_id: 1, name: '1ER TRIMESTRE', sequences: [{ id: 1, name: 'Séquence 1' }, { id: 2, name: 'Séquence 2' }] },
                            { term_id: 2, name: '2E TRIMESTRE', sequences: [{ id: 3, name: 'Séquence 3' }, { id: 4, name: 'Séquence 4' }] },
                            { term_id: 3, name: '3E TRIMESTRE', sequences: [{ id: 5, name: 'Séquence 5' }, { id: 6, name: 'Séquence 6' }] }
                        ]);
                    } catch(e) { setTermStructure([]); }

                    const template = window.electronAPI.getReportTemplate ? await window.electronAPI.getReportTemplate(mySchool.id) : null;
                    if (template) {
                        setHeaderImage(template.header_image || '');
                        setWatermarkImage(template.watermark_image || '');
                        setFooterImage(template.footer_image || '');
                        setFooterImagePosition((template.footer_image_position as 'footer' | 'stamp') || 'footer');
                        if (template.primary_color) setPrimaryColor(template.primary_color);
                        if (template.secondary_color) setSecondaryColor(template.secondary_color);
                    }

                    const insts = window.electronAPI.getInstallments ? await window.electronAPI.getInstallments() : [];
                    setInstallments(insts || []);
                    const deadls = window.electronAPI.getInstallmentDeadlines ? await window.electronAPI.getInstallmentDeadlines(mySchool.id) : [];
                    setInstallmentDeadlines(deadls || []);

                    try {
                        const scales = await (window.electronAPI as any).getGradingScales(mySchool.id);
                        setGradingScales(scales || []);
                    } catch(e: any) { setGradingScales([]); }

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

    useEffect(() => { loadSettings(); }, [user]);

    const handleAddScaleOption = () => {
        setEditingScale({
            ...editingScale,
            options: [...editingScale.options, { symbol: '', min_range: 0, max_range: 20, numeric_equivalent: 10, description: '' }]
        });
    };

    const handleRemoveScaleOption = (index: number) => {
        setEditingScale({ ...editingScale, options: editingScale.options.filter((_: any, i: number) => i !== index) });
    };

    const handleOptionChange = (index: number, field: string, value: any) => {
        const updatedOptions = [...editingScale.options];
        updatedOptions[index] = { ...updatedOptions[index], [field]: value };
        setEditingScale({ ...editingScale, options: updatedOptions });
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
                logo: logoImage || null,
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
                footerImagePosition,
                primaryColor,
                secondaryColor
            });

            if (res && res.error) throw new Error(res.error);

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
            if (event.target?.result) setter(event.target.result as string);
        };
        reader.readAsDataURL(file);
    };

    if (loading) return (
        <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
            <Palette className="w-12 h-12 text-amber-500 animate-pulse" />
            <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">{t('cust_loading_templates', 'Chargement...')}</p>
        </div>
    );

    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: 'identite', label: 'Identité', icon: <Sliders className="w-3.5 h-3.5" /> },
        { id: 'documents', label: 'Documents', icon: <ImageIcon className="w-3.5 h-3.5" /> },
        { id: 'pedagogie', label: 'Pédagogie', icon: <BookOpen className="w-3.5 h-3.5" /> },
        { id: 'finance', label: 'Finance', icon: <DollarSign className="w-3.5 h-3.5" /> },
        { id: 'baremes', label: 'Barèmes', icon: <Edit3 className="w-3.5 h-3.5" /> },
        { id: 'apercu', label: 'Aperçu', icon: <Eye className="w-3.5 h-3.5" /> },
    ];

    const inputCls = "w-full bg-slate-950 border border-white/5 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all placeholder:text-slate-600";
    const cardCls = "bg-slate-900/60 border border-white/5 rounded-2xl p-5 space-y-5";
    const labelCls = "text-[10px] font-black text-slate-400 uppercase tracking-wider block";
    const sectionTitle = (icon: React.ReactNode, label: string) => (
        <div className="flex items-center gap-2.5 border-b border-white/5 pb-3 mb-5">
            <span className="text-amber-500">{icon}</span>
            <h2 className="text-sm font-black uppercase text-white tracking-wide">{label}</h2>
        </div>
    );

    return (
        <form onSubmit={handleSave} className="space-y-0 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 border border-white/5 rounded-2xl p-5 mb-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg">
                        <Palette className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-lg font-black text-white uppercase tracking-tight truncate">{t('cust_title', 'Personnalisation')}</h1>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest truncate">{activeSchool?.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {success && (
                        <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Enregistré
                        </span>
                    )}
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-amber-500 text-slate-950 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-amber-400 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        <Save className="w-3.5 h-3.5" />
                        {saving ? 'Sauvegarde...' : t('cust_save_config', 'Enregistrer')}
                    </button>
                </div>
            </div>

            {/* Tab navigation */}
            <div className="flex gap-1 overflow-x-auto pb-1 mb-4 scrollbar-hide">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
                            activeTab === tab.id
                                ? 'bg-amber-500 text-slate-950 shadow-lg'
                                : 'text-slate-400 bg-white/5 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── TAB: IDENTITÉ ── */}
            {activeTab === 'identite' && (
                <div className="space-y-4">
                    <div className={cardCls}>
                        {sectionTitle(<Sliders className="w-4 h-4" />, t('cust_school_identity', "Identité de l'Établissement"))}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className={labelCls}>{t('cust_school_name', "Nom de l'École")}</label>
                                <input type="text" value={schoolName} onChange={e => setSchoolName(e.target.value)}
                                    placeholder={t('cust_official_name_placeholder')} className={inputCls} />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>{t('cust_school_motto_label')}</label>
                                <input type="text" value={schoolMotto} onChange={e => setSchoolMotto(e.target.value)}
                                    placeholder={t('cust_school_motto_placeholder')} className={inputCls} />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>{t('cust_physical_address', 'Adresse Physique')}</label>
                                <input type="text" value={schoolAddress} onChange={e => setSchoolAddress(e.target.value)}
                                    placeholder={t('cust_address_placeholder')} className={inputCls} />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>{t('cust_bp', 'Boîte Postale')}</label>
                                <input type="text" value={schoolBp} onChange={e => setSchoolBp(e.target.value)}
                                    placeholder={t('cust_bp_placeholder')} className={inputCls} />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>{t('cust_currency_label')}</label>
                                <input type="text" value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())}
                                    placeholder="Ex: FCFA, USD, EUR" className={inputCls} />
                            </div>
                        </div>
                    </div>

                    <div className={cardCls}>
                        {sectionTitle(<Palette className="w-4 h-4" />, t('cust_color_palette', 'Palette Graphique'))}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className={labelCls}>{t('cust_primary_color', 'Couleur Primaire')}</label>
                                <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-2xl border border-white/5">
                                    <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                                        className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-none shrink-0" />
                                    <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                                        className="bg-transparent text-sm font-bold text-white uppercase tracking-wider outline-none w-full" />
                                    <div className="w-7 h-7 rounded-lg shrink-0 border border-white/10" style={{ backgroundColor: primaryColor }} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>{t('cust_secondary_color', 'Couleur Secondaire')}</label>
                                <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-2xl border border-white/5">
                                    <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)}
                                        className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-none shrink-0" />
                                    <input type="text" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)}
                                        className="bg-transparent text-sm font-bold text-white uppercase tracking-wider outline-none w-full" />
                                    <div className="w-7 h-7 rounded-lg shrink-0 border border-white/10" style={{ backgroundColor: secondaryColor }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={cardCls}>
                        {sectionTitle(<ImageIcon className="w-4 h-4" />, 'Logo de l\'Établissement')}
                        <p className="text-[10px] font-bold text-slate-500 -mt-3 mb-2">
                            Affiché au centre de l'en-tête du bulletin (format carré recommandé, fond transparent PNG).
                        </p>
                        <div className="flex items-start gap-5">
                            <div className="relative w-28 h-28 shrink-0 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center hover:border-amber-500/40 transition-all overflow-hidden">
                                {logoImage ? (
                                    <img src={logoImage} alt="Logo" className="w-full h-full object-contain p-1" />
                                ) : (
                                    <div className="text-center space-y-1">
                                        <ImageIcon className="w-6 h-6 text-slate-600 mx-auto" />
                                        <p className="text-[9px] font-bold text-slate-500">Cliquer</p>
                                    </div>
                                )}
                                <input type="file" accept="image/*" onChange={e => handleImageUpload(e, setLogoImage)}
                                    className="opacity-0 absolute inset-0 cursor-pointer w-full h-full" />
                            </div>
                            <div className="flex-1 space-y-2 pt-1">
                                <p className="text-xs text-slate-300 font-bold">
                                    {logoImage ? 'Logo chargé ✓' : 'Aucun logo importé'}
                                </p>
                                <p className="text-[10px] text-slate-500">Max 3 Mo — PNG, JPG, WebP</p>
                                {logoImage && (
                                    <button type="button" onClick={() => setLogoImage('')}
                                        className="px-3 py-1.5 bg-rose-500/10 text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-rose-500/20 transition-all">
                                        Supprimer le logo
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB: DOCUMENTS ── */}
            {activeTab === 'documents' && (
                <div className="space-y-4">
                    {/* Images PDF */}
                    <div className={cardCls}>
                        {sectionTitle(<ImageIcon className="w-4 h-4" />, t('cust_pdf_template_title', 'Visuels du Bulletin PDF'))}
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 -mt-2 mb-3 space-y-1">
                            <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider">Comment fonctionnent ces images ?</p>
                            <p className="text-[10px] text-slate-400">• <b>Sceau / emblème :</b> Placé au centre de l'en-tête du bulletin (max 25×25mm). Prioritaire sur le logo.</p>
                            <p className="text-[10px] text-slate-400">• <b>Filigrane :</b> Apparaît en fond translucide (6%) centré sur la page.</p>
                            <p className="text-[10px] text-slate-400">• <b>Pied de page :</b> Scan de cachet/signatures. Choisissez son emplacement après import.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { label: 'Sceau / Emblème (centre en-tête)', state: headerImage, setter: setHeaderImage, key: 'header' },
                                { label: t('cust_watermark_label', 'Filigrane (fond translucide)'), state: watermarkImage, setter: setWatermarkImage, key: 'watermark' },
                            ].map(({ label, state, setter, key }) => (
                                <div key={key} className="space-y-2">
                                    <label className={labelCls}>{label}</label>
                                    <div className="border-2 border-dashed border-white/10 rounded-2xl p-3 text-center hover:border-amber-500/40 transition-all relative min-h-[120px] flex flex-col items-center justify-center">
                                        {state ? (
                                            <div className="w-full space-y-2">
                                                <img src={state} alt={label} className="w-full object-contain max-h-20 rounded-lg" />
                                                <div className="flex gap-2">
                                                    <label className="flex-1 px-2 py-1.5 bg-amber-500/10 text-amber-400 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-amber-500/20 transition-all cursor-pointer text-center">
                                                        Changer
                                                        <input type="file" accept="image/*" onChange={e => handleImageUpload(e, setter)} className="hidden" />
                                                    </label>
                                                    <button type="button" onClick={() => setter('')}
                                                        className="flex-1 px-2 py-1.5 bg-rose-500/10 text-rose-400 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-rose-500/20 transition-all">
                                                        Supprimer
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <ImageIcon className="w-6 h-6 text-slate-600 mx-auto" />
                                                <p className="text-[10px] font-bold text-slate-500">Cliquer pour importer</p>
                                                <input type="file" accept="image/*" onChange={e => handleImageUpload(e, setter)}
                                                    className="opacity-0 absolute inset-0 cursor-pointer w-full h-full" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Slot pied de page — avec choix de placement */}
                            <div className="space-y-2">
                                <label className={labelCls}>Image de Pied de Page / Cachet &amp; Signatures</label>
                                <div className="border-2 border-dashed border-white/10 rounded-2xl p-3 text-center hover:border-amber-500/40 transition-all relative min-h-[120px] flex flex-col items-center justify-center">
                                    {footerImage ? (
                                        <div className="w-full space-y-2">
                                            <img src={footerImage} alt="Pied de page" className="w-full object-contain max-h-20 rounded-lg" />
                                            <div className="flex gap-2">
                                                <label className="flex-1 px-2 py-1.5 bg-amber-500/10 text-amber-400 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-amber-500/20 transition-all cursor-pointer text-center">
                                                    Changer
                                                    <input type="file" accept="image/*" onChange={e => handleImageUpload(e, setFooterImage)} className="hidden" />
                                                </label>
                                                <button type="button" onClick={() => setFooterImage('')}
                                                    className="flex-1 px-2 py-1.5 bg-rose-500/10 text-rose-400 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-rose-500/20 transition-all">
                                                    Supprimer
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <ImageIcon className="w-6 h-6 text-slate-600 mx-auto" />
                                            <p className="text-[10px] font-bold text-slate-500">Cliquer pour importer</p>
                                            <input type="file" accept="image/*" onChange={e => handleImageUpload(e, setFooterImage)}
                                                className="opacity-0 absolute inset-0 cursor-pointer w-full h-full" />
                                        </div>
                                    )}
                                </div>
                                {/* Choix de placement — visible seulement si image uploadée */}
                                {footerImage && (
                                    <div className="bg-slate-800/60 rounded-xl p-3 space-y-2 border border-white/5">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Emplacement de l'image</p>
                                        <div className="space-y-1.5">
                                            {([
                                                { value: 'footer', label: 'Pied de page', desc: 'Bandeau sous les blocs de signature' },
                                                { value: 'stamp',  label: 'Cachet sur signature', desc: 'Tampon dans la colonne du Directeur' },
                                            ] as { value: 'footer' | 'stamp'; label: string; desc: string }[]).map(opt => (
                                                <label key={opt.value} className="flex items-start gap-2 cursor-pointer group">
                                                    <input
                                                        type="radio"
                                                        name="footerImagePosition"
                                                        value={opt.value}
                                                        checked={footerImagePosition === opt.value}
                                                        onChange={() => setFooterImagePosition(opt.value)}
                                                        className="mt-0.5 accent-amber-500"
                                                    />
                                                    <span>
                                                        <span className="text-[10px] font-bold text-slate-300 group-hover:text-amber-400 transition-colors">{opt.label}</span>
                                                        <span className="text-[9px] text-slate-500 block">{opt.desc}</span>
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* En-têtes ministériels */}
                    <div className={cardCls}>
                        {sectionTitle(<Type className="w-4 h-4" />, t('cust_ministerial_headers', 'En-têtes Ministériels'))}
                        <p className="text-[10px] font-bold text-slate-500 -mt-3 mb-3">
                            Chaque ligne du champ apparaît sur le bulletin sous "Paix - Travail - Patrie". Appuyez sur <kbd className="bg-slate-800 text-slate-300 px-1 py-0.5 rounded text-[9px]">Entrée</kbd> pour ajouter une ligne (ex : délégation régionale, délégation départementale…).
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className={labelCls}>{t('cust_header_french', 'Sous-titres Français (une ligne = une entrée)')}</label>
                                <textarea rows={3} value={headerFrench} onChange={e => setHeaderFrench(e.target.value)}
                                    placeholder={"MINISTÈRE DE L'ÉDUCATION DE BASE\nDÉLÉGATION RÉGIONALE DU CENTRE"}
                                    className={`${inputCls} resize-none font-mono text-xs leading-relaxed`} />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>{t('cust_header_english', 'Sous-titres Anglais (une ligne = une entrée)')}</label>
                                <textarea rows={3} value={headerEnglish} onChange={e => setHeaderEnglish(e.target.value)}
                                    placeholder={"MINISTRY OF BASIC EDUCATION\nREGIONAL DELEGATION OF THE CENTRE"}
                                    className={`${inputCls} resize-none font-mono text-xs leading-relaxed`} />
                            </div>
                        </div>
                    </div>

                    {/* Signatures */}
                    <div className={cardCls}>
                        {sectionTitle(<Edit3 className="w-4 h-4" />, t('cust_signatories', 'Signataires Officiels'))}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className={labelCls}>{t('cust_sig_left', 'Bloc Gauche (Bulletin)')}</label>
                                <input type="text" value={bulletinSigLeft} onChange={e => setBulletinSigLeft(e.target.value)} className={inputCls} />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>{t('cust_sig_middle', 'Bloc Milieu (Bulletin)')}</label>
                                <input type="text" value={bulletinSigMiddle} onChange={e => setBulletinSigMiddle(e.target.value)} className={inputCls} />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>{t('cust_sig_right', 'Bloc Droit (Bulletin)')}</label>
                                <input type="text" value={bulletinSigRight} onChange={e => setBulletinSigRight(e.target.value)} className={inputCls} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className={labelCls}>{t('cust_sig_receipt', 'Signature sur les Reçus')}</label>
                            <input type="text" value={receiptSigTitle} onChange={e => setReceiptSigTitle(e.target.value)} className={inputCls} />
                        </div>
                    </div>

                    {/* Tableau d'honneur */}
                    <div className={cardCls}>
                        {sectionTitle(<CheckCircle2 className="w-4 h-4" />, "Tableau d'Honneur")}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className={labelCls}>{t('cust_honor_threshold', 'Seuil minimum (/ 20)')}</label>
                                <input type="number" min="10" max="20" step="0.5" value={honorRollThreshold}
                                    onChange={e => setHonorRollThreshold(parseFloat(e.target.value))} className={inputCls} />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>{t('cust_honor_title_text', 'Titre du Certificat')}</label>
                                <input type="text" value={honorTitleText} onChange={e => setHonorTitleText(e.target.value)}
                                    placeholder="TABLEAU D'HONNEUR" className={inputCls} />
                            </div>
                        </div>
                    </div>

                    {/* Gabarit personnalisé complet */}
                    <div className={cardCls}>
                        <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-5">
                            <div className="flex items-center gap-2.5">
                                <FileText className="w-4 h-4 text-blue-400" />
                                <h2 className="text-sm font-black uppercase text-white tracking-wide">{t('custom_bulletin_title', 'Gabarit Bulletin Personnalisé')}</h2>
                            </div>
                            <div onClick={() => setBulletinUseCustom(bulletinUseCustom === 1 ? 0 : 1)}
                                className={`w-12 h-6 rounded-full p-0.5 cursor-pointer transition-all flex items-center ${bulletinUseCustom === 1 ? 'bg-blue-500 justify-end' : 'bg-slate-700 justify-start'}`}>
                                <div className="w-5 h-5 bg-white rounded-full shadow" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 font-bold">{t('custom_bulletin_desc', 'Activez pour utiliser un gabarit d\'image en arrière-plan avec positionnement des données.')}</p>

                        {bulletinUseCustom === 1 && (
                            <div className="space-y-5 mt-4">
                                <div className="space-y-2">
                                    <label className={labelCls}>{t('upload_blank_bulletin', 'Image du gabarit vierge')}</label>
                                    <input type="file" accept="image/*" onChange={e => handleImageUpload(e, setBulletinTemplate)}
                                        className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-blue-500/20 file:text-blue-400 file:font-bold file:text-xs file:cursor-pointer" />
                                    {bulletinTemplate && (
                                        <div className="mt-2 border border-white/5 rounded-xl overflow-hidden max-h-[200px]">
                                            <img src={bulletinTemplate} alt="Preview" className="w-full object-contain" />
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3">{t('field_coordinates', 'Coordonnées des champs (mm)')}</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {[
                                            { key: 'studentName', label: 'Nom élève' },
                                            { key: 'matricule', label: 'Matricule' },
                                            { key: 'class', label: 'Classe' },
                                            { key: 'year', label: 'Année scolaire' },
                                            { key: 'section', label: 'Section' },
                                            { key: 'absences', label: 'Absences' },
                                            { key: 'conduct', label: 'Conduite' },
                                            { key: 'average', label: 'Moyenne' },
                                            { key: 'rank', label: 'Rang' },
                                            { key: 'decision', label: 'Décision' },
                                        ].map(field => (
                                            <div key={field.key} className="bg-slate-950 p-3 rounded-xl border border-white/5 space-y-2">
                                                <label className="text-[9px] font-black text-amber-500 uppercase tracking-widest">{field.label}</label>
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <span className="text-[9px] text-slate-600 font-bold">X</span>
                                                        <input type="number" value={bulletinMapping[field.key]?.x || 0}
                                                            onChange={e => setBulletinMapping({...bulletinMapping, [field.key]: {...(bulletinMapping[field.key] || {}), x: parseInt(e.target.value) || 0}})}
                                                            className="w-full bg-slate-900 border border-white/5 rounded-lg p-1.5 text-white text-xs font-bold outline-none focus:border-amber-500" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <span className="text-[9px] text-slate-600 font-bold">Y</span>
                                                        <input type="number" value={bulletinMapping[field.key]?.y || 0}
                                                            onChange={e => setBulletinMapping({...bulletinMapping, [field.key]: {...(bulletinMapping[field.key] || {}), y: parseInt(e.target.value) || 0}})}
                                                            className="w-full bg-slate-900 border border-white/5 rounded-lg p-1.5 text-white text-xs font-bold outline-none focus:border-amber-500" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="bg-slate-950 p-3 rounded-xl border border-blue-500/20 space-y-2 sm:col-span-2 lg:col-span-1">
                                            <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Tableau des notes</label>
                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <span className="text-[9px] text-slate-600 font-bold">X</span>
                                                    <input type="number" value={bulletinMapping.table?.x || 20}
                                                        onChange={e => setBulletinMapping({...bulletinMapping, table: {...(bulletinMapping.table || {}), x: parseInt(e.target.value) || 20}})}
                                                        className="w-full bg-slate-900 border border-white/5 rounded-lg p-1.5 text-white text-xs font-bold outline-none focus:border-amber-500" />
                                                </div>
                                                <div className="flex-1">
                                                    <span className="text-[9px] text-slate-600 font-bold">Y</span>
                                                    <input type="number" value={bulletinMapping.table?.y || 115}
                                                        onChange={e => setBulletinMapping({...bulletinMapping, table: {...(bulletinMapping.table || {}), y: parseInt(e.target.value) || 115}})}
                                                        className="w-full bg-slate-900 border border-white/5 rounded-lg p-1.5 text-white text-xs font-bold outline-none focus:border-amber-500" />
                                                </div>
                                                <div className="flex-1">
                                                    <span className="text-[9px] text-slate-600 font-bold">Largeur</span>
                                                    <input type="number" value={bulletinMapping.table?.width || 170}
                                                        onChange={e => setBulletinMapping({...bulletinMapping, table: {...(bulletinMapping.table || {}), width: parseInt(e.target.value) || 170}})}
                                                        className="w-full bg-slate-900 border border-white/5 rounded-lg p-1.5 text-white text-xs font-bold outline-none focus:border-amber-500" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── TAB: PÉDAGOGIE ── */}
            {activeTab === 'pedagogie' && (
                <div className="space-y-4">
                    {/* Structure des trimestres */}
                    <div className={cardCls}>
                        <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-5">
                            <div className="flex items-center gap-2.5">
                                <BookOpen className="w-4 h-4 text-amber-500" />
                                <h2 className="text-sm font-black uppercase text-white tracking-wide">{t('cust_eval_periods_structure', 'Structure des Périodes')}</h2>
                            </div>
                            {(allowFounderTermEdit === 1 || user?.role === 'SUPERADMIN') && (
                                <button type="button"
                                    onClick={() => {
                                        const newId = termStructure.length > 0 ? Math.max(...termStructure.map(t => t.term_id)) + 1 : 1;
                                        setTermStructure([...termStructure, { term_id: newId, name: `Période ${newId}`, sequences: [] }]);
                                    }}
                                    className="px-3 py-1.5 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-wider rounded-lg hover:bg-amber-500 hover:text-slate-950 transition-all flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> {t('cust_add_period', 'Ajouter période')}
                                </button>
                            )}
                        </div>

                        {!(allowFounderTermEdit === 1 || user?.role === 'SUPERADMIN') && (
                            <div className="p-4 bg-rose-500/10 border-l-4 border-rose-500 rounded-xl text-rose-400 text-xs font-bold flex items-start gap-2 mb-4">
                                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{t('cust_term_structure_readonly_warning', 'La modification de la structure est réservée au Fondateur.')}</span>
                            </div>
                        )}

                        <div className="space-y-3">
                            {termStructure.map((term, tIdx) => (
                                <div key={term.term_id} className="bg-slate-950 p-4 rounded-2xl border border-white/5 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-slate-500 font-bold text-[10px] bg-white/5 px-2.5 py-1 rounded-lg shrink-0">T{term.term_id}</span>
                                        <input type="text" value={term.name}
                                            disabled={!(allowFounderTermEdit === 1 || user?.role === 'SUPERADMIN')}
                                            onChange={e => { const s = [...termStructure]; s[tIdx].name = e.target.value; setTermStructure(s); }}
                                            className="flex-1 bg-transparent border-b border-white/10 px-2 py-1 text-sm font-black text-white outline-none focus:border-amber-500 uppercase disabled:opacity-50 min-w-0" />
                                        {(allowFounderTermEdit === 1 || user?.role === 'SUPERADMIN') && (
                                            <button type="button" onClick={() => setTermStructure(termStructure.filter((_, i) => i !== tIdx))}
                                                className="text-rose-400 bg-rose-500/10 p-1.5 rounded-lg hover:bg-rose-500/20 transition-all shrink-0">
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="pl-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('cust_associated_sequences', 'Séquences')}</span>
                                            {(allowFounderTermEdit === 1 || user?.role === 'SUPERADMIN') && (
                                                <button type="button" onClick={() => {
                                                    const allSeqIds = termStructure.flatMap(t => t.sequences.map((s: any) => s.id));
                                                    const nextSeqId = allSeqIds.length > 0 ? Math.max(...allSeqIds) + 1 : 1;
                                                    const s = [...termStructure];
                                                    s[tIdx].sequences.push({ id: nextSeqId, name: `Séquence ${nextSeqId}`, weight: 1 });
                                                    setTermStructure(s);
                                                }} className="text-[9px] font-black text-amber-500 hover:underline uppercase tracking-wider">
                                                    + {t('cust_add_sequence', 'Ajouter')}
                                                </button>
                                            )}
                                        </div>
                                        {term.sequences.length === 0 && (
                                            <p className="text-[10px] text-slate-600 italic">{t('cust_no_sequence_in_period', 'Aucune séquence')}</p>
                                        )}
                                        {term.sequences.map((seq: any, sIdx: number) => (
                                            <div key={seq.id} className="flex flex-wrap gap-2 items-center bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                                                <span className="text-slate-600 font-bold text-[10px] shrink-0">#{seq.id}</span>
                                                <input type="text" value={seq.name}
                                                    disabled={!(allowFounderTermEdit === 1 || user?.role === 'SUPERADMIN')}
                                                    onChange={e => { const s = [...termStructure]; s[tIdx].sequences[sIdx].name = e.target.value; setTermStructure(s); }}
                                                    className="flex-1 min-w-[80px] bg-transparent border-b border-white/5 px-1 py-0.5 text-xs font-semibold text-slate-300 outline-none focus:border-amber-500 disabled:opacity-50" />
                                                <div className="flex items-center gap-1.5 border-l border-white/10 pl-2 shrink-0">
                                                    <span className="text-[9px] font-black text-slate-500">Coeff.</span>
                                                    <input type="number" min="0.1" step="0.1"
                                                        disabled={!(allowFounderTermEdit === 1 || user?.role === 'SUPERADMIN')}
                                                        value={seq.weight !== undefined ? seq.weight : 1}
                                                        onChange={e => { const s = [...termStructure]; s[tIdx].sequences[sIdx].weight = parseFloat(e.target.value) || 1; setTermStructure(s); }}
                                                        className="w-12 bg-slate-800 border border-white/10 rounded px-1.5 py-0.5 text-xs font-bold text-center text-white outline-none focus:border-amber-500 disabled:opacity-50" />
                                                </div>
                                                {(allowFounderTermEdit === 1 || user?.role === 'SUPERADMIN') && (
                                                    <button type="button" onClick={() => { const s = [...termStructure]; s[tIdx].sequences = term.sequences.filter((_: any, i: number) => i !== sIdx); setTermStructure(s); }}
                                                        className="text-rose-400 p-0.5 hover:text-rose-300 shrink-0">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {termStructure.length === 0 && (
                                <p className="text-center text-rose-400 text-sm font-bold italic py-4">{t('cust_no_eval_period_defined', 'Aucune période définie')}</p>
                            )}
                        </div>
                    </div>

                    {/* Créneaux emploi du temps */}
                    <div className={cardCls}>
                        <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-5">
                            <div className="flex items-center gap-2.5">
                                <Layout className="w-4 h-4 text-amber-500" />
                                <h2 className="text-sm font-black uppercase text-white tracking-wide">{t('cust_timetable_slots', 'Créneaux Emploi du Temps')}</h2>
                            </div>
                            <button type="button"
                                onClick={() => setTimetableSlots([...timetableSlots, { label: 'Nouveau', start: '00:00', end: '00:00', isBreak: false }])}
                                className="px-3 py-1.5 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-wider rounded-lg hover:bg-amber-500 hover:text-slate-950 transition-all flex items-center gap-1">
                                <Plus className="w-3 h-3" /> {t('cust_add_time_slot', 'Ajouter')}
                            </button>
                        </div>

                        <div className="space-y-2">
                            {timetableSlots.length === 0 && (
                                <p className="text-center text-slate-500 text-sm font-bold italic py-4">{t('cust_no_time_slot_defined', 'Aucun créneau défini')}</p>
                            )}
                            {timetableSlots.map((slot, index) => (
                                <div key={index} className="flex flex-wrap gap-2 items-center bg-slate-950 p-3 rounded-2xl border border-white/5">
                                    <input type="text" value={slot.label}
                                        onChange={e => { const s = [...timetableSlots]; s[index].label = e.target.value; setTimetableSlots(s); }}
                                        placeholder={t('cust_slot_label_placeholder', 'Libellé')}
                                        className="min-w-[100px] flex-1 bg-transparent border-b border-white/10 px-2 py-1 text-sm font-bold text-white outline-none focus:border-amber-500" />
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <input type="time" value={slot.start}
                                            onChange={e => { const s = [...timetableSlots]; s[index].start = e.target.value; setTimetableSlots(s); }}
                                            className="bg-transparent border-b border-white/10 px-1 py-1 text-sm text-slate-300 outline-none focus:border-amber-500 w-[5.5rem]" />
                                        <span className="text-slate-600 shrink-0">–</span>
                                        <input type="time" value={slot.end}
                                            onChange={e => { const s = [...timetableSlots]; s[index].end = e.target.value; setTimetableSlots(s); }}
                                            className="bg-transparent border-b border-white/10 px-1 py-1 text-sm text-slate-300 outline-none focus:border-amber-500 w-[5.5rem]" />
                                    </div>
                                    <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                                        <input type="checkbox" checked={slot.isBreak}
                                            onChange={e => { const s = [...timetableSlots]; s[index].isBreak = e.target.checked; setTimetableSlots(s); }}
                                            className="w-3.5 h-3.5 rounded accent-amber-500" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('cust_is_break_label', 'Récréation')}</span>
                                    </label>
                                    <button type="button" onClick={() => setTimetableSlots(timetableSlots.filter((_, i) => i !== index))}
                                        className="text-rose-400 bg-rose-500/10 p-1.5 rounded-lg hover:bg-rose-500/20 transition-all shrink-0">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB: FINANCE ── */}
            {activeTab === 'finance' && (
                <div className="space-y-4">
                    {/* Échéances des tranches */}
                    <div className={cardCls}>
                        {sectionTitle(<DollarSign className="w-4 h-4" />, t('cust_installment_deadlines', 'Échéances des Tranches de Paiement'))}
                        <p className="text-xs text-slate-500 font-bold -mt-3 mb-3">Les parents seront bloqués si la date est dépassée et la tranche non réglée.</p>
                        {installments.length === 0 && (
                            <p className="text-center text-slate-500 text-sm font-bold italic py-4">Aucune tranche configurée. Allez dans Finances → Tranches.</p>
                        )}
                        <div className="space-y-2">
                            {installments.map(inst => {
                                const deadline = installmentDeadlines.find(d => d.installment_id === inst.id)?.deadline_date || '';
                                return (
                                    <div key={inst.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-950 p-4 rounded-2xl border border-white/5">
                                        <span className="text-slate-300 font-black text-xs sm:w-44 bg-white/5 rounded-xl py-2 px-3 shrink-0">{inst.name}</span>
                                        <div className="flex-1 space-y-1">
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Date limite</label>
                                            <input type="date" value={deadline}
                                                onChange={e => {
                                                    const newDeadlines = [...installmentDeadlines];
                                                    const existing = newDeadlines.find(d => d.installment_id === inst.id);
                                                    if (existing) { existing.deadline_date = e.target.value; }
                                                    else { newDeadlines.push({ installment_id: inst.id, deadline_date: e.target.value }); }
                                                    setInstallmentDeadlines(newDeadlines);
                                                }}
                                                className="w-full bg-transparent border-b border-white/10 px-2 py-1.5 text-sm font-bold text-white outline-none focus:border-amber-500" />
                                        </div>
                                        {deadline && (
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shrink-0 ${new Date(deadline) < new Date() ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                {new Date(deadline) < new Date() ? 'Dépassée' : 'À venir'}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Alertes financières */}
                    <div className={cardCls}>
                        {sectionTitle(<ShieldAlert className="w-4 h-4" />, t('financial_alerts_config', 'Seuils d\'Alertes Financières'))}
                        <p className="text-xs text-slate-500 font-bold -mt-3 mb-3">{t('financial_alerts_config_desc', 'Définissez les seuils qui déclenchent les alertes dans le tableau de bord.')}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { label: t('unpaid_threshold', 'Seuil impayés (%)'), desc: t('unpaid_threshold_desc', 'Alerte si X% des élèves ont des impayés'), val: alertUnpaidThreshold, set: setAlertUnpaidThreshold, min: 10, max: 100 },
                                { label: t('expense_ratio_threshold', 'Ratio dépenses (%)'), desc: t('expense_ratio_threshold_desc', 'Alerte si les dépenses dépassent X% des recettes'), val: alertExpenseRatio, set: setAlertExpenseRatio, min: 10, max: 100 },
                                { label: t('deadline_alert_days', 'Rappel échéance (jours)'), desc: t('cust_deadline_days_desc', 'Prévenir les parents X jours avant la date limite'), val: alertDeadlineDays, set: setAlertDeadlineDays, min: 1, max: 30 },
                                { label: t('grade_deadline_alert_days', 'Rappel notes (jours)'), desc: t('cust_grade_deadline_days_desc', 'Alerter si la saisie n\'est pas terminée X jours avant la deadline'), val: alertGradeDeadlineDays, set: setAlertGradeDeadlineDays, min: 1, max: 15 },
                            ].map(({ label, desc, val, set, min, max }) => (
                                <div key={label} className="bg-slate-950 p-4 rounded-2xl border border-white/5 space-y-2">
                                    <label className={labelCls}>{label}</label>
                                    <p className="text-[10px] text-slate-600 italic">{desc}</p>
                                    <input type="number" min={min} max={max} step="1" value={val}
                                        onChange={e => set(parseInt(e.target.value) || min)}
                                        className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-white font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500" />
                                    <p className="text-[10px] text-amber-500 font-bold">Valeur actuelle : {val}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB: BARÈMES ── */}
            {activeTab === 'baremes' && (
                <div className={cardCls}>
                    <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-5">
                        <div className="flex items-center gap-2.5">
                            <Edit3 className="w-4 h-4 text-amber-500" />
                            <h2 className="text-sm font-black uppercase text-white tracking-wide">{t('cust_grading_scales_title', 'Échelles de Notation')}</h2>
                        </div>
                        {!isEditingScale && (
                            <button type="button"
                                onClick={() => { setEditingScale({ id: null, name: '', is_numerical: 1, min_value: 0, max_value: 20, options: [] }); setIsEditingScale(true); }}
                                className="px-3 py-1.5 bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1 hover:bg-amber-400 transition-all">
                                <Plus className="w-3 h-3" /> {t('cust_new_scale_btn', 'Nouveau barème')}
                            </button>
                        )}
                    </div>

                    {!isEditingScale ? (
                        <div className="space-y-4">
                            <p className="text-xs text-slate-400 font-bold">{t('cust_grading_scales_desc', 'Créez des barèmes personnalisés pour convertir les notes numériques en mentions.')}</p>
                            {gradingScales.length === 0 ? (
                                <p className="text-center text-slate-500 text-xs font-bold py-8 italic">{t('cust_no_custom_scale', 'Aucun barème créé')}</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {gradingScales.map((scale: any) => (
                                        <div key={scale.id} onClick={() => { setEditingScale(scale); setIsEditingScale(true); }}
                                            className="p-4 bg-white/5 border border-white/5 hover:border-amber-500/30 rounded-2xl cursor-pointer transition-all hover:bg-white/[0.08]">
                                            <h4 className="text-sm font-black text-white">{scale.name}</h4>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                                {scale.is_numerical ? t('grade_conversion', 'Conversion numérique') : t('literal_grade', 'Notes littérales')}
                                            </p>
                                            {scale.is_numerical && (
                                                <p className="text-[10px] text-amber-500 font-black mt-1">{scale.min_value} – {scale.max_value} / 20</p>
                                            )}
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {(scale.options || []).map((o: any, idx: number) => (
                                                    <span key={idx} className="bg-slate-800 border border-white/5 text-slate-300 text-[9px] font-bold px-1.5 py-0.5 rounded" title={o.description}>
                                                        {o.symbol}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-5 animate-in fade-in duration-200">
                            <div className="space-y-1.5">
                                <label className={labelCls}>{t('cust_scale_name_label', 'Nom du barème')}</label>
                                <input required type="text" value={editingScale.name}
                                    onChange={e => setEditingScale({ ...editingScale, name: e.target.value })}
                                    placeholder={t('cust_scale_name_placeholder', 'Ex: Mentions Anglophones')} className={inputCls} />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className={labelCls}>{t('cust_scale_model_label', 'Type')}</label>
                                    <select value={editingScale.is_numerical}
                                        onChange={e => setEditingScale({ ...editingScale, is_numerical: parseInt(e.target.value) })}
                                        className={inputCls}>
                                        <option value={1}>{t('cust_scale_numerical_opt', 'Conversion numérique')}</option>
                                        <option value={0}>{t('cust_scale_literal_opt', 'Notes littérales')}</option>
                                    </select>
                                </div>
                                {parseInt(editingScale.is_numerical) === 1 && (
                                    <>
                                        <div className="space-y-1.5">
                                            <label className={labelCls}>{t('cust_min_grade_label', 'Note min')}</label>
                                            <input type="number" step="0.1" value={editingScale.min_value}
                                                onChange={e => setEditingScale({ ...editingScale, min_value: e.target.value })} className={inputCls} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className={labelCls}>{t('cust_max_grade_label', 'Note max')}</label>
                                            <input type="number" step="0.1" value={editingScale.max_value}
                                                onChange={e => setEditingScale({ ...editingScale, max_value: e.target.value })} className={inputCls} />
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="space-y-3 border-t border-white/5 pt-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black uppercase text-white tracking-widest">{t('cust_scale_options_title', 'Mentions / Symboles')}</h3>
                                    <button type="button" onClick={handleAddScaleOption}
                                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border border-white/5">
                                        <Plus className="w-3.5 h-3.5" /> {t('cust_add_grade_btn', 'Ajouter')}
                                    </button>
                                </div>

                                {editingScale.options.length === 0 ? (
                                    <p className="text-center text-slate-500 text-xs font-bold py-4 italic">{t('cust_no_mention_added', 'Aucune mention ajoutée')}</p>
                                ) : (
                                    <div className="space-y-2">
                                        {editingScale.options.map((opt: any, idx: number) => (
                                            <div key={idx} className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-950 border border-white/5 rounded-2xl items-end">
                                                <div>
                                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">{t('cust_symbol_label', 'Symbole')}</label>
                                                    <input required type="text" value={opt.symbol}
                                                        onChange={e => handleOptionChange(idx, 'symbol', e.target.value.toUpperCase())}
                                                        className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500" />
                                                </div>
                                                {parseInt(editingScale.is_numerical) === 1 && (
                                                    <>
                                                        <div>
                                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">{t('cust_min_range_label', 'De')}</label>
                                                            <input required type="number" step="0.01" value={opt.min_range}
                                                                onChange={e => handleOptionChange(idx, 'min_range', e.target.value)}
                                                                className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">{t('cust_max_range_label', 'À')}</label>
                                                            <input required type="number" step="0.01" value={opt.max_range}
                                                                onChange={e => handleOptionChange(idx, 'max_range', e.target.value)}
                                                                className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500" />
                                                        </div>
                                                    </>
                                                )}
                                                <div>
                                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                                                        {parseInt(editingScale.is_numerical) === 1 ? t('cust_equivalent_avg_label', 'Équiv. /20') : t('cust_numeric_value_label', 'Valeur num.')}
                                                    </label>
                                                    <div className="flex gap-1.5">
                                                        <input required type="number" step="0.1" value={opt.numeric_equivalent}
                                                            onChange={e => handleOptionChange(idx, 'numeric_equivalent', e.target.value)}
                                                            className="flex-1 bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500" />
                                                        <button type="button" onClick={() => handleRemoveScaleOption(idx)}
                                                            className="text-rose-400 bg-rose-500/10 p-2 rounded-xl hover:bg-rose-500/20 shrink-0">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 border-t border-white/5 pt-4">
                                <button type="button" onClick={() => setIsEditingScale(false)}
                                    className="flex-1 py-3 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-700 transition-colors text-sm">
                                    {t('cust_back_cancel_btn', 'Annuler')}
                                </button>
                                {editingScale.id && (
                                    <button type="button" onClick={() => handleDeleteScale(editingScale.id)}
                                        className="px-5 py-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-2xl font-bold hover:bg-rose-500/20 transition-colors text-sm">
                                        {t('cust_delete_btn', 'Supprimer')}
                                    </button>
                                )}
                                <button type="button" onClick={handleSaveScale}
                                    className="flex-1 py-3 bg-amber-500 text-slate-950 rounded-2xl font-black hover:bg-amber-400 transition-colors flex justify-center items-center gap-2 text-sm">
                                    <Save className="w-4 h-4" /> {t('cust_save_btn', 'Enregistrer le barème')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── TAB: APERÇU ── */}
            {activeTab === 'apercu' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Bulletin Mockup */}
                    <div className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-200 text-slate-900 space-y-4">
                        <span className="text-[8px] font-black bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase tracking-widest block w-max">
                            {t('cust_official_report', 'Bulletin Scolaire Officiel')}
                        </span>
                        {headerImage ? (
                            <img src={headerImage} alt="En-tête" className="w-full object-contain max-h-16 rounded" />
                        ) : (
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
                        )}
                        <div className="text-center py-1">
                            <h3 className="text-xs font-black uppercase tracking-tight" style={{ color: primaryColor }}>{schoolName || 'NOM DE L\'ÉCOLE'}</h3>
                            <p className="text-[5px] text-slate-400 font-bold italic mt-0.5">{schoolMotto || 'Devise de l\'école'}</p>
                        </div>
                        <div className="p-3 rounded-lg flex justify-between items-center" style={{ backgroundColor: `${primaryColor}15` }}>
                            <span className="text-[7px] font-black uppercase tracking-wider text-slate-700">Moyenne Générale</span>
                            <span className="text-xs font-black" style={{ color: primaryColor }}>15.75 <span className="text-[8px] text-slate-400">/ 20</span></span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center text-[5px] font-black uppercase tracking-wider text-slate-400">
                            {[bulletinSigLeft, bulletinSigMiddle, bulletinSigRight].map((sig, i) => (
                                <div key={i} className={i < 2 ? 'border-r border-slate-100 pr-1' : ''}>
                                    <p className="font-bold text-slate-500 truncate">{sig}</p>
                                    <p className="text-[4px] text-slate-300 italic mt-3">Signature</p>
                                </div>
                            ))}
                        </div>
                        {footerImage && <img src={footerImage} alt="Pied" className="w-full object-contain max-h-10 rounded mt-2" />}
                    </div>

                    {/* Reçu Mockup */}
                    <div className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-200 text-slate-900 space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl pointer-events-none" style={{ backgroundColor: `${secondaryColor}20` }} />
                        <span className="text-[8px] font-black bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase tracking-widest block w-max">
                            {t('cust_receipt_badge', 'Reçu Financier')}
                        </span>
                        <h4 className="text-center text-xs font-black uppercase tracking-widest border-b border-slate-100 pb-3" style={{ color: primaryColor }}>
                            Reçu de Paiement
                        </h4>
                        <div className="space-y-1.5 text-[7px] text-slate-600">
                            <div className="flex justify-between border-b border-slate-100 pb-1">
                                <span className="font-black">Montant versé</span>
                                <span className="font-black text-slate-900">75 000 {currency}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-1">
                                <span className="font-black">Motif</span>
                                <span className="font-black text-slate-900">2e Tranche Pension</span>
                            </div>
                        </div>
                        <div className="text-right text-[5px] font-black uppercase tracking-wider text-slate-400 pt-2">
                            <p className="font-bold text-slate-600 truncate">{receiptSigTitle}</p>
                            <p className="text-[4px] text-slate-300 italic mt-4">Cachet & Signature</p>
                        </div>
                    </div>

                    {/* Info palette */}
                    <div className="md:col-span-2 bg-slate-900/60 border border-white/5 rounded-2xl p-5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Palette de couleurs active</p>
                        <div className="flex flex-wrap gap-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg border border-white/10" style={{ backgroundColor: primaryColor }} />
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase">Primaire</p>
                                    <p className="text-xs font-black text-white">{primaryColor}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg border border-white/10" style={{ backgroundColor: secondaryColor }} />
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase">Secondaire</p>
                                    <p className="text-xs font-black text-white">{secondaryColor}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Save button — visible sur tous les onglets sauf via le header */}
            <div className="flex justify-end mt-6 pb-6">
                <button type="submit" disabled={saving}
                    className="bg-amber-500 text-slate-950 px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-amber-400 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? t('cust_saving', 'Sauvegarde...') : t('cust_save_config', 'Enregistrer la Configuration')}
                </button>
            </div>
        </form>
    );
};

export default CustomizationSettings;
