import React, { useState, useEffect } from 'react';
import { Palette, FileText, CheckCircle2, Layout, Sliders, Type, Edit3, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CustomizationSettings: React.FC = () => {
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

    // Custom PDF template fields
    const [bulletinPdfUseCustom, setBulletinPdfUseCustom] = useState(0);
    const [bulletinPdfTemplate, setBulletinPdfTemplate] = useState('');
    const [bulletinPdfMapping, setBulletinPdfMapping] = useState<any>({
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
        table: { x: 20, y: 115, width: 170 },
        signatures: { y: 230, leftX: 25, middleX: 85, rightX: 140 }
    });

    const loadSettings = async () => {
        setLoading(true);
        if (window.electronAPI && user) {
            const schs = await window.electronAPI.getSchools();
            setSchools(schs);
            const mySchool = schs.find(s => s.id === user.schoolId) || schs[0];
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
                setBulletinPdfUseCustom(mySchool.bulletin_pdf_use_custom || 0);
                setBulletinPdfTemplate(mySchool.bulletin_pdf_template || '');
                
                if (mySchool.bulletin_pdf_mapping) {
                    try {
                        const parsed = typeof mySchool.bulletin_pdf_mapping === 'string'
                            ? JSON.parse(mySchool.bulletin_pdf_mapping)
                            : mySchool.bulletin_pdf_mapping;
                        if (parsed && Object.keys(parsed).length > 0) {
                            setBulletinPdfMapping(parsed);
                        }
                    } catch (e) {
                        console.error('Failed to parse mapping:', e);
                    }
                }
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
                bulletin_pdf_use_custom: bulletinPdfUseCustom,
                bulletin_pdf_template: bulletinPdfTemplate,
                bulletin_pdf_mapping: JSON.stringify(bulletinPdfMapping)
            });
            if (res && res.error) {
                throw new Error(res.error);
            }
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            loadSettings();
        } catch (err: any) {
            console.error(err);
            alert("Erreur lors de la sauvegarde des paramètres: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) {
            alert("L'image est trop volumineuse (maximum 3 Mo).");
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setBulletinPdfTemplate(event.target.result as string);
            }
        };
        reader.readAsDataURL(file);
    };

    const updateMapField = (field: string, key: string, val: number) => {
        setBulletinPdfMapping((prev: any) => ({
            ...prev,
            [field]: {
                ...prev[field],
                [key]: val
            }
        }));
    };

    if (loading) return (
        <div className="h-[50vh] flex flex-col items-center justify-center space-y-4">
            <Palette className="w-12 h-12 text-amber-500 animate-pulse" />
            <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">Chargement des templates personnalisables...</p>
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
                        <h1 className="text-2xl font-black text-white uppercase tracking-tight">Personnalisation des Documents</h1>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                            Configurez la charte graphique et les signatures de votre établissement ({activeSchool?.name})
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
                            <h2 className="text-lg font-black uppercase text-white tracking-wide">Identité de l'Établissement</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Nom de l'École</label>
                                <input
                                    type="text"
                                    value={schoolName}
                                    onChange={(e) => setSchoolName(e.target.value)}
                                    placeholder="Nom officiel"
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Devise de l'École</label>
                                <input
                                    type="text"
                                    value={schoolMotto}
                                    onChange={(e) => setSchoolMotto(e.target.value)}
                                    placeholder="Ex: Éducation pour l'excellence"
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Adresse Physique</label>
                                <input
                                    type="text"
                                    value={schoolAddress}
                                    onChange={(e) => setSchoolAddress(e.target.value)}
                                    placeholder="Ex: Quartier Bastos, Yaoundé"
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Boîte Postale (B.P.)</label>
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
                            <h2 className="text-lg font-black uppercase text-white tracking-wide">Palette Graphique de l'École</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Primary color */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Couleur Primaire (Cadres et En-têtes)</label>
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
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Couleur Secondaire (Accents et Textes clés)</label>
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

                    {/* Official Headers */}
                    <div className="glass-card p-8 bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-[32px] space-y-6 shadow-2xl">
                        <div className="flex items-center space-x-3 text-amber-500 border-b border-white/5 pb-4">
                            <Type className="w-5 h-5" />
                            <h2 className="text-lg font-black uppercase text-white tracking-wide">En-têtes Ministériels / Subdivisions</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Sous-titre En-tête (Français)</label>
                                <input
                                    type="text"
                                    value={headerFrench}
                                    onChange={(e) => setHeaderFrench(e.target.value)}
                                    placeholder="Ex: MINISTÈRE DE L'ÉDUCATION DE BASE"
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Sous-titre En-tête (Anglais)</label>
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
                            <h2 className="text-lg font-black uppercase text-white tracking-wide">Intitulés des Signataires Officiels</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Bloc Gauche (Bulletin)</label>
                                <input
                                    type="text"
                                    value={bulletinSigLeft}
                                    onChange={(e) => setBulletinSigLeft(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-4 py-3.5 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Bloc Milieu (Bulletin)</label>
                                <input
                                    type="text"
                                    value={bulletinSigMiddle}
                                    onChange={(e) => setBulletinSigMiddle(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-4 py-3.5 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Bloc Droit (Bulletin)</label>
                                <input
                                    type="text"
                                    value={bulletinSigRight}
                                    onChange={(e) => setBulletinSigRight(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-4 py-3.5 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Signature sur les Reçus de Caisse</label>
                            <input
                                type="text"
                                value={receiptSigTitle}
                                onChange={(e) => setReceiptSigTitle(e.target.value)}
                                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                            />
                        </div>
                    </div>

                    {/* Custom PDF Bulletin Mapping Settings */}
                    <div className="glass-card p-8 bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-[32px] space-y-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <div className="flex items-center space-x-3 text-amber-500">
                                <Sliders className="w-5 h-5" />
                                <h2 className="text-lg font-black uppercase text-white tracking-wide">Bulletin Personnalisé (Gabarit PDF)</h2>
                            </div>
                            <div className="flex items-center space-x-3 bg-slate-950 p-1.5 rounded-xl border border-white/5">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-2">Activer</span>
                                <button
                                    type="button"
                                    onClick={() => setBulletinPdfUseCustom(bulletinPdfUseCustom === 1 ? 0 : 1)}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${bulletinPdfUseCustom === 1 ? 'bg-amber-500' : 'bg-slate-700'}`}
                                >
                                    <span className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${bulletinPdfUseCustom === 1 ? 'right-1' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>

                        {bulletinPdfUseCustom === 1 && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                {/* Template File Uploader */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Image de fond du bulletin (JPG / PNG - Max 3 Mo)</label>
                                    <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-amber-500/50 transition-all relative">
                                        {bulletinPdfTemplate ? (
                                            <div className="space-y-4">
                                                <img src={bulletinPdfTemplate} alt="Gabarit" className="max-h-48 mx-auto rounded-lg shadow-lg" />
                                                <button
                                                    type="button"
                                                    onClick={() => setBulletinPdfTemplate('')}
                                                    className="px-4 py-2 bg-rose-500/20 text-rose-500 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-rose-500 hover:text-white transition-all"
                                                >
                                                    Supprimer
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <p className="text-sm font-bold text-slate-400">Glissez ou sélectionnez le fichier image du bulletin vierge</p>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleTemplateUpload}
                                                    className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                                                />
                                                <span className="inline-block bg-white/5 border border-white/10 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest mt-2 hover:bg-white/10">Parcourir</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Coordinate Mapping Inputs */}
                                <div className="space-y-6">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-amber-500/80">Coordonnées de placement (en millimètres sur page A4 : 210 x 297 mm)</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-950 p-6 rounded-2xl border border-white/5">
                                        {/* Coordinates group 1: Student info */}
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-white uppercase tracking-wider border-b border-white/5 pb-2">Informations Élève</h4>
                                            
                                            {[
                                                { label: "Nom & Prénoms", field: "studentName" },
                                                { label: "Matricule", field: "matricule" },
                                                { label: "Classe", field: "class" },
                                                { label: "Année Académique", field: "year" },
                                                { label: "Section (FR/EN)", field: "section" }
                                            ].map((item) => (
                                                <div key={item.field} className="flex items-center justify-between gap-4 text-xs font-bold text-slate-400">
                                                    <span>{item.label}</span>
                                                    <div className="flex gap-2">
                                                        <div className="flex items-center space-x-1 bg-slate-900 border border-white/5 rounded-xl px-2">
                                                            <span className="text-[9px] font-bold text-slate-500 uppercase">X:</span>
                                                            <input
                                                                type="number"
                                                                value={bulletinPdfMapping[item.field]?.x || 0}
                                                                onChange={(e) => updateMapField(item.field, 'x', parseFloat(e.target.value) || 0)}
                                                                className="w-12 bg-transparent text-white font-black text-center border-none outline-none py-1.5"
                                                            />
                                                        </div>
                                                        <div className="flex items-center space-x-1 bg-slate-900 border border-white/5 rounded-xl px-2">
                                                            <span className="text-[9px] font-bold text-slate-500 uppercase">Y:</span>
                                                            <input
                                                                type="number"
                                                                value={bulletinPdfMapping[item.field]?.y || 0}
                                                                onChange={(e) => updateMapField(item.field, 'y', parseFloat(e.target.value) || 0)}
                                                                className="w-12 bg-transparent text-white font-black text-center border-none outline-none py-1.5"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Coordinates group 2: Performance metrics */}
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-white uppercase tracking-wider border-b border-white/5 pb-2">Performances & Absences</h4>
                                            
                                            {[
                                                { label: "Moyenne Générale", field: "average" },
                                                { label: "Rang de l'Élève", field: "rank" },
                                                { label: "Décision du Conseil", field: "decision" },
                                                { label: "Heures d'Absences", field: "absences" },
                                                { label: "Observation Conduite", field: "conduct" }
                                            ].map((item) => (
                                                <div key={item.field} className="flex items-center justify-between gap-4 text-xs font-bold text-slate-400">
                                                    <span>{item.label}</span>
                                                    <div className="flex gap-2">
                                                        <div className="flex items-center space-x-1 bg-slate-900 border border-white/5 rounded-xl px-2">
                                                            <span className="text-[9px] font-bold text-slate-500 uppercase">X:</span>
                                                            <input
                                                                type="number"
                                                                value={bulletinPdfMapping[item.field]?.x || 0}
                                                                onChange={(e) => updateMapField(item.field, 'x', parseFloat(e.target.value) || 0)}
                                                                className="w-12 bg-transparent text-white font-black text-center border-none outline-none py-1.5"
                                                            />
                                                        </div>
                                                        <div className="flex items-center space-x-1 bg-slate-900 border border-white/5 rounded-xl px-2">
                                                            <span className="text-[9px] font-bold text-slate-500 uppercase">Y:</span>
                                                            <input
                                                                type="number"
                                                                value={bulletinPdfMapping[item.field]?.y || 0}
                                                                onChange={(e) => updateMapField(item.field, 'y', parseFloat(e.target.value) || 0)}
                                                                className="w-12 bg-transparent text-white font-black text-center border-none outline-none py-1.5"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Table and signatures layout configuration */}
                                    <div className="bg-slate-950 p-6 rounded-2xl border border-white/5 space-y-4">
                                        <h4 className="text-[10px] font-black text-white uppercase tracking-wider border-b border-white/5 pb-2">Tableau des notes & Signatures</h4>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="bg-slate-900 p-3.5 rounded-xl border border-white/5">
                                                <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">Tableau - X (mm)</label>
                                                <input
                                                    type="number"
                                                    value={bulletinPdfMapping.table?.x || 20}
                                                    onChange={(e) => updateMapField('table', 'x', parseFloat(e.target.value) || 20)}
                                                    className="w-full bg-slate-950 text-white font-black py-1.5 rounded text-center border border-white/5"
                                                />
                                            </div>
                                            <div className="bg-slate-900 p-3.5 rounded-xl border border-white/5">
                                                <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">Tableau - Y (mm)</label>
                                                <input
                                                    type="number"
                                                    value={bulletinPdfMapping.table?.y || 115}
                                                    onChange={(e) => updateMapField('table', 'y', parseFloat(e.target.value) || 115)}
                                                    className="w-full bg-slate-950 text-white font-black py-1.5 rounded text-center border border-white/5"
                                                />
                                            </div>
                                            <div className="bg-slate-900 p-3.5 rounded-xl border border-white/5">
                                                <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">Tableau - Largeur (mm)</label>
                                                <input
                                                    type="number"
                                                    value={bulletinPdfMapping.table?.width || 170}
                                                    onChange={(e) => updateMapField('table', 'width', parseFloat(e.target.value) || 170)}
                                                    className="w-full bg-slate-950 text-white font-black py-1.5 rounded text-center border border-white/5"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="bg-slate-900 p-3.5 rounded-xl border border-white/5">
                                                <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">Signatures - Y (mm)</label>
                                                <input
                                                    type="number"
                                                    value={bulletinPdfMapping.signatures?.y || 230}
                                                    onChange={(e) => updateMapField('signatures', 'y', parseFloat(e.target.value) || 230)}
                                                    className="w-full bg-slate-950 text-white font-black py-1.5 rounded text-center border border-white/5"
                                                />
                                            </div>
                                            <div className="bg-slate-900 p-3.5 rounded-xl border border-white/5">
                                                <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">X Enseignant (mm)</label>
                                                <input
                                                    type="number"
                                                    value={bulletinPdfMapping.signatures?.leftX || 25}
                                                    onChange={(e) => updateMapField('signatures', 'leftX', parseFloat(e.target.value) || 25)}
                                                    className="w-full bg-slate-950 text-white font-black py-1.5 rounded text-center border border-white/5"
                                                />
                                            </div>
                                            <div className="bg-slate-900 p-3.5 rounded-xl border border-white/5">
                                                <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">X Parent (mm)</label>
                                                <input
                                                    type="number"
                                                    value={bulletinPdfMapping.signatures?.middleX || 85}
                                                    onChange={(e) => updateMapField('signatures', 'middleX', parseFloat(e.target.value) || 85)}
                                                    className="w-full bg-slate-950 text-white font-black py-1.5 rounded text-center border border-white/5"
                                                />
                                            </div>
                                            <div className="bg-slate-900 p-3.5 rounded-xl border border-white/5">
                                                <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">X Directeur (mm)</label>
                                                <input
                                                    type="number"
                                                    value={bulletinPdfMapping.signatures?.rightX || 140}
                                                    onChange={(e) => updateMapField('signatures', 'rightX', parseFloat(e.target.value) || 140)}
                                                    className="w-full bg-slate-950 text-white font-black py-1.5 rounded text-center border border-white/5"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions bar */}
                    <div className="flex justify-end items-center gap-4">
                        {success && (
                            <span className="text-emerald-500 text-xs font-black uppercase tracking-widest flex items-center gap-2 animate-bounce">
                                <CheckCircle2 className="w-4 h-4" /> Changements Appliqués !
                            </span>
                        )}
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-amber-500 text-slate-950 px-10 py-4.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {saving ? 'Sauvegarde...' : 'Enregistrer la Configuration'}
                        </button>
                    </div>
                </form>

                {/* Real-time Dynamic Mockup Preview */}
                <div className="space-y-8">
                    <div className="sticky top-8 space-y-6">
                        <div className="flex items-center space-x-2 text-slate-400 font-black text-xs uppercase tracking-widest">
                            <Layout className="w-4 h-4 text-amber-500" />
                            <span>Aperçu du Rendu Direct</span>
                        </div>

                        {/* Bulletin Mockup Card */}
                        <div className="bg-white p-6 rounded-[24px] shadow-2xl border border-slate-200 text-slate-900 space-y-4">
                            <span className="text-[8px] font-black bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase tracking-widest block w-max">
                                Bulletin Scolaire Officiel
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
                                    <p className="font-bold text-slate-500 truncate">{bulletinSigLeft || "L'ENSEIGNANT"}</p>
                                    <p className="text-[4px] text-slate-300 italic mt-3">Signature</p>
                                </div>
                                <div className="border-r border-slate-100 pr-1">
                                    <p className="font-bold text-slate-500 truncate">{bulletinSigMiddle || "PARENT"}</p>
                                    <p className="text-[4px] text-slate-300 italic mt-3">Signature</p>
                                </div>
                                <div>
                                    <p className="font-bold text-slate-500 truncate">{bulletinSigRight || "LE DIRECTEUR"}</p>
                                    <p className="text-[4px] text-slate-300 italic mt-3">Signature</p>
                                </div>
                            </div>
                        </div>

                        {/* Receipt Mockup Card */}
                        <div className="bg-white p-6 rounded-[24px] shadow-2xl border border-slate-200 text-slate-900 space-y-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl pointer-events-none" style={{ backgroundColor: `${secondaryColor}15` }} />
                            <span className="text-[8px] font-black bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase tracking-widest block w-max">
                                Reçu Financier de Caisse
                            </span>

                            <h4 className="text-center text-xs font-black uppercase tracking-widest border-b border-slate-100 pb-3" style={{ color: primaryColor }}>
                                Reçu de Paiement
                            </h4>

                            <div className="space-y-1.5 text-[7px] text-slate-600">
                                <div className="flex justify-between border-b border-slate-100 pb-1">
                                    <span className="font-black">Montant versé</span>
                                    <span className="font-black text-slate-900">75 000 FCFA</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-100 pb-1">
                                    <span className="font-black">Motif</span>
                                    <span className="font-black text-slate-900">2e Tranche Pension</span>
                                </div>
                            </div>

                            {/* Receipt Signature */}
                            <div className="text-right text-[5px] font-black uppercase tracking-wider text-slate-400 pt-2">
                                <p className="font-bold text-slate-600 truncate">{receiptSigTitle || "L'Économe / Bursar"}</p>
                                <p className="text-[4px] text-slate-300 italic mt-4">Cachet & Signature</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomizationSettings;
