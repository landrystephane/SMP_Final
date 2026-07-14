import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Building2, Plus, Edit2, Trash2, Users, Search, Save, X, Copy, BookOpen } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { useDataRefresh } from '../utils/dataSync';

const generateClassCode = (name: string, existingClasses: any[]) => {
    if (!name) return '';
    let clean = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    
    const map: Record<string, string> = {
        'COURS MOYEN 1': 'CM1',
        'COURS MOYEN 2': 'CM2',
        'COURS MOYEN': 'CM',
        'COURS PREPARATOIRE': 'CP',
        'COURS ELEMENTAIRE 1': 'CE1',
        'COURS ELEMENTAIRE 2': 'CE2',
        'COURS ELEMENTAIRE': 'CE',
        "SECTION D'INITIATION AU LANGAGE": 'SIL',
        'SECTION D INITIATION AU LANGAGE': 'SIL',
        'MATERNELLE': 'MAT',
        'PRE-NURSERY': 'PN',
        'NURSERY': 'NUR',
        'SIXIEME': '6EME',
        'CINQUIEME': '5EME',
        'QUATRIEME': '4EME',
        'TROISIEME': '3EME',
        'SECONDE': '2NDE',
        'PREMIERE': '1ERE',
        'TERMINALE': 'TLE'
    };

    for (const key in map) {
        if (clean.includes(key)) {
            clean = clean.replace(key, map[key]);
        }
    }

    let baseCode = '';
    const words = clean.split(/[\s\-]+/);
    if (words.length > 1) {
        const firstWord = words[0];
        if (['SIL', 'CP', 'CE1', 'CE2', 'CM1', 'CM2', 'MAT', 'FORM', 'CLASS', '6EME', '5EME', '4EME', '3EME', '2NDE', '1ERE', 'TLE', 'PN', 'NUR'].includes(firstWord)) {
             baseCode = words.join('');
        } else {
            let code = '';
            words.forEach(w => {
                if (/\d/.test(w)) {
                    const nums = w.match(/\d+/g);
                    if (nums) code += nums.join('');
                    else code += w.charAt(0);
                } else if (w.length > 0) {
                    code += w.charAt(0);
                }
            });
            baseCode = code;
        }
    } else {
        if (clean.length <= 4) baseCode = clean;
        else baseCode = clean.substring(0, 3);
    }

    // Append current year to class codes (e.g. 'SIL26')
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const targetCode = baseCode + currentYear;

    if (!existingClasses || existingClasses.length === 0) return targetCode;

    // Check for duplicates
    let finalCode = targetCode;
    let letterIndex = 0; // 0 = A, 1 = B, etc.
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    while (existingClasses.some(c => c.code === finalCode)) {
        if (letterIndex < alphabet.length) {
            // Append letter BEFORE the year (e.g. SIL + A + 26 = SILA26)
            finalCode = baseCode + alphabet[letterIndex] + currentYear;
            letterIndex++;
        } else {
            finalCode = baseCode + Math.floor(Math.random() * 1000) + currentYear;
            break; // Fallback if too many duplicates
        }
    }

    return finalCode;
};

const Classes: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { showNotification } = useNotification();
    
    const [classes, setClasses] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [gradingScales, setGradingScales] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // For teacher assignment modal
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedClassForAssign, setSelectedClassForAssign] = useState<any>(null);
    const [classSubjects, setClassSubjects] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<Record<number, number>>({}); // subject_id -> teacher_id

    // Form state
    const [formData, setFormData] = useState({
        id: null as number | null,
        name: '',
        code: '',
        section: 'FRANCOPHONE',
        level: 'PRIMAIRE',
        mainTeacherId: '',
        assistantTeacherId: '',
        baseClassId: '',
        gradingScaleId: ''
    });

    const loadData = async () => {
        if (window.electronAPI && user) {
            const cls = await window.electronAPI.getClasses(user.schoolId);
            setClasses(cls || []);
            
            const users = await window.electronAPI.getUsers(user.schoolId);
            const staff = users.filter((u: any) => u.role?.trim().toUpperCase() === 'TEACHER');
            setTeachers(staff || []);

            const scales = await (window.electronAPI as any).getGradingScales(user.schoolId);
            setGradingScales(scales || []);
        }
    };

    useEffect(() => {
        loadData();
    }, [user]);
    useDataRefresh(loadData);

    const handleOpenModal = (cls?: any) => {
        if (cls) {
            setFormData({
                id: cls.id,
                name: cls.name,
                code: cls.code,
                section: cls.section,
                level: cls.level,
                mainTeacherId: cls.main_teacher_id?.toString() || '',
                assistantTeacherId: cls.assistant_teacher_id?.toString() || '',
                baseClassId: '',
                gradingScaleId: cls.grading_scale_id?.toString() || ''
            });
        } else {
            setFormData({
                id: null,
                name: '',
                code: '',
                section: 'FRANCOPHONE',
                level: 'PRIMAIRE',
                mainTeacherId: '',
                assistantTeacherId: '',
                baseClassId: '',
                gradingScaleId: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!window.electronAPI || !user) return;

        try {
            const dataToSave = {
                ...formData,
                schoolId: user.schoolId,
                mainTeacherId: formData.mainTeacherId ? parseInt(formData.mainTeacherId) : null,
                assistantTeacherId: formData.assistantTeacherId ? parseInt(formData.assistantTeacherId) : null,
                baseClassId: formData.baseClassId ? parseInt(formData.baseClassId) : null
            };

            let classId = formData.id;
            if (formData.id) {
                const res = await (window.electronAPI as any).updateClass(dataToSave);
                if (res.error) throw new Error(res.error);
            } else {
                const res = await (window.electronAPI as any).addClass(dataToSave);
                if (res.error) throw new Error(res.error);
                classId = res.id;
            }

            if (classId) {
                await (window.electronAPI as any).setClassGradingScale({
                    classId,
                    scaleId: formData.gradingScaleId ? parseInt(formData.gradingScaleId) : null
                });
            }

            showNotification(formData.id ? t('class_updated_success', "Classe mise à jour avec succès !") : t('class_created_success', "Classe créée avec succès !"), "success");
            await loadData();
            setIsModalOpen(false);
        } catch (err: any) {
            showNotification(t('error_prefix', "Erreur : ") + err.message, "error");
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm(t('confirm_delete_class', "Êtes-vous sûr de vouloir supprimer cette classe ? Toute sa configuration sera perdue."))) return;
        if (!window.electronAPI) return;

        try {
            const res = await (window.electronAPI as any).deleteClass(id);
            if (res.error) throw new Error(res.error);
            showNotification(t('class_deleted_success', "Classe supprimée avec succès !"), "success");
            await loadData();
        } catch (err: any) {
            showNotification(t('error_prefix', "Erreur : ") + err.message, "error");
        }
    };

    const handleOpenAssignModal = async (cls: any) => {
        if (!window.electronAPI) return;
        try {
            setSelectedClassForAssign(cls);
            const subjs = await window.electronAPI.getClassSubjects(cls.id);
            setClassSubjects(subjs || []);
            
            const currentAssignments = await (window.electronAPI as any).getClassTeacherAssignments(cls.id);
            const initialAssignments: Record<number, number> = {};
            if (currentAssignments && Array.isArray(currentAssignments)) {
                currentAssignments.forEach((a: any) => {
                    initialAssignments[a.subject_id] = a.teacher_id;
                });
            }
            setAssignments(initialAssignments);
            setIsAssignModalOpen(true);
        } catch (e: any) {
            showNotification(t('error_loading_assignments', "Erreur lors du chargement des affectations : ") + e.message, "error");
        }
    };

    const handleSaveAssignments = async () => {
        if (!window.electronAPI || !selectedClassForAssign) return;
        try {
            const assignmentArray = Object.entries(assignments).map(([subjId, teachId]) => ({
                subject_id: parseInt(subjId),
                teacher_id: teachId
            })).filter(a => a.teacher_id !== null && a.teacher_id !== '' && !isNaN(Number(a.teacher_id)));

            const res = await (window.electronAPI as any).saveClassTeacherAssignments({
                classId: selectedClassForAssign.id,
                assignments: assignmentArray
            });
            if (res.error) throw new Error(res.error);
            showNotification(t('assignments_saved_success', "Affectations de la classe enregistrées avec succès !"), "success");
            setIsAssignModalOpen(false);
            loadData();
        } catch (e: any) {
            showNotification(t('error_saving', "Erreur lors de la sauvegarde : ") + e.message, "error");
        }
    };

    const filteredClasses = classes.filter(c => 
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (c.code || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getTeacherName = (id: number) => {
        const teacher = teachers.find(teach => teach.id === id);
        return teacher ? teacher.fullName : t('not_assigned', 'Non assigné');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Building2 className="w-8 h-8 text-amber-500" />
                        {t('classrooms', 'Salles de classe')}
                    </h1>
                    <p className="text-slate-400 mt-1">{t('class_management_desc', 'Gestion des classes et de leurs configurations.')}</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 bg-amber-500 text-slate-900 rounded-xl font-bold hover:bg-amber-400 transition-colors flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    {t('new_class', 'Nouvelle Classe')}
                </button>
            </div>

            <div className="glass-card p-6">
                <div className="flex mb-6 relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder={t('search_class', 'Rechercher une classe...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-slate-500 text-xs uppercase bg-slate-900/50">
                            <tr>
                                <th className="p-4 rounded-tl-xl">{t('class', 'Classe')}</th>
                                <th className="p-4">{t('code', 'Code')}</th>
                                <th className="p-4">{t('section_level', 'Section / Niveau')}</th>
                                <th className="p-4">{t('class_teacher', 'Titulaire')}</th>
                                <th className="p-4 rounded-tr-xl">{t('actions', 'Actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-300">
                            {filteredClasses.map((c) => (
                                <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                    <td className="p-4 font-bold text-white">{c.name}</td>
                                    <td className="p-4 text-slate-400">{c.code}</td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 bg-slate-800 rounded-lg text-[10px] font-bold uppercase tracking-wider text-amber-500 mr-2">
                                            {c.section}
                                        </span>
                                        <span className="text-xs text-slate-400">{c.level}</span>
                                    </td>
                                    <td className="p-4 flex items-center gap-2 text-sm">
                                        <Users className="w-4 h-4 text-slate-500" />
                                        {getTeacherName(c.main_teacher_id)}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleOpenAssignModal(c)} 
                                                className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"
                                                title={t('assign_teachers_to_subjects', 'Affecter Enseignants aux Matières')}
                                            >
                                                <Users className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleOpenModal(c)} className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title={t('edit', 'Modifier')}>
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(c.id)} className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title={t('delete', 'Supprimer')}>
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredClasses.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        {t('no_class_found', 'Aucune classe trouvée.')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto custom-scrollbar max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-white/5 bg-slate-800/50">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                {formData.id ? t('edit_class', 'Modifier la classe') : t('new_class', 'Nouvelle classe')}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            {!formData.id && (
                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-4">
                                    <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2 mb-1">
                                        <Copy className="w-3 h-3" />
                                        {t('cls_duplicate_from_label', 'Dupliquer à partir de (Optionnel)')}
                                    </label>
                                    <select
                                        className="input-field w-full mt-1 border-amber-500/30"
                                        value={formData.baseClassId}
                                        onChange={(e) => setFormData({...formData, baseClassId: e.target.value})}
                                    >
                                        <option value="">{t('cls_no_copy_option', '-- Ne rien copier (Classe vide) --')}</option>
                                        {classes.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-amber-500/70 mt-1">{t('cls_duplicate_desc', 'Copiera les matières, les coefficients et les frais de scolarité.')}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('cls_name_label', 'Nom de la classe')}</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder={t('cls_name_placeholder', 'Ex: SIL B')}
                                        className="input-field w-full mt-1"
                                        value={formData.name}
                                        onChange={(e) => {
                                            const name = e.target.value;
                                            const newCode = generateClassCode(name, classes.filter((c: any) => c.id !== formData.id));
                                            setFormData({...formData, name, code: formData.id ? formData.code : newCode});
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('cls_unique_code_label', 'Code Unique')}</label>
                                    <input
                                        required
                                        disabled
                                        type="text"
                                        placeholder={t('cls_code_generated_placeholder', 'Généré de façon intelligente')}
                                        className="input-field w-full mt-1 bg-slate-800 text-slate-400 cursor-not-allowed opacity-60 font-mono"
                                        value={formData.code}
                                    />
                                    <p className="text-[9px] text-slate-500 mt-1 italic">{t('cls_code_desc', 'Ce code court intelligent est utilisé pour générer les matricules.')}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('cls_section_label', 'Section')}</label>
                                    <select
                                        className="input-field w-full mt-1"
                                        value={formData.section}
                                        onChange={(e) => setFormData({...formData, section: e.target.value})}
                                    >
                                        <option value="FRANCOPHONE">{t('cls_francophone_opt', 'Francophone')}</option>
                                        <option value="ANGLOPHONE">{t('cls_anglophone_opt', 'Anglophone')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('cls_level_label', 'Niveau')}</label>
                                    <select
                                        className="input-field w-full mt-1"
                                        value={formData.level}
                                        onChange={(e) => setFormData({...formData, level: e.target.value})}
                                    >
                                        <option value="PRIMAIRE">{t('cls_primaire_opt', 'Primaire')}</option>
                                        <option value="MATERNELLE">{t('cls_maternelle_opt', 'Maternelle')}</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('cls_main_teacher_label', 'Titulaire de la classe')}</label>
                                    <select
                                        className="input-field w-full mt-1"
                                        value={formData.mainTeacherId}
                                        onChange={(e) => setFormData({...formData, mainTeacherId: e.target.value})}
                                    >
                                        <option value="">{t('cls_select_teacher_placeholder', '-- Sélectionner un enseignant --')}</option>
                                        {teachers.map(t => (
                                            <option key={t.id} value={t.id}>{t.fullName || t.full_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('cls_assistant_label', 'Assistant(e)')}</label>
                                    <select
                                        className="input-field w-full mt-1"
                                        value={formData.assistantTeacherId}
                                        onChange={(e) => setFormData({...formData, assistantTeacherId: e.target.value})}
                                    >
                                        <option value="">{t('cls_no_assistant_opt', '-- Aucun assistant --')}</option>
                                        {teachers.filter(t => t.id.toString() !== formData.mainTeacherId).map(t => (
                                            <option key={t.id} value={t.id}>{t.fullName || t.full_name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('cls_grading_scale_label', 'Barème / Échelle de notation')}</label>
                                <select
                                    className="input-field w-full mt-1"
                                    value={formData.gradingScaleId}
                                    onChange={(e) => setFormData({...formData, gradingScaleId: e.target.value})}
                                >
                                    <option value="">{t('cls_standard_grading_opt', '-- Notation standard (Saisie sur 20 brute) --')}</option>
                                    {gradingScales.map(scale => (
                                        <option key={scale.id} value={scale.id}>
                                            {scale.name} ({scale.is_numerical ? t('numerical_conversion', 'Conversion numérique') : t('literal_entry', 'Saisie littérale')})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors"
                                >
                                    {t('cancel', 'Annuler')}
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-amber-500 text-slate-900 rounded-xl font-bold hover:bg-amber-400 transition-colors flex justify-center items-center gap-2"
                                >
                                    <Save className="w-5 h-5" />
                                    {t('save', 'Enregistrer')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Affectations Enseignants */}
            {isAssignModalOpen && selectedClassForAssign && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-y-auto custom-scrollbar max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-white/5 bg-slate-800/50">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Users className="w-6 h-6 text-amber-500" />
                                    {t('cls_assign_teachers_title', 'Affectation des Enseignants aux Matières')}
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">{t('cls_class_label', 'Classe :')} <span className="text-amber-500 font-bold">{selectedClassForAssign.name}</span></p>
                            </div>
                            <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 custom-scrollbar">
                            {classSubjects.length === 0 ? (
                                <p className="text-center text-slate-500 py-8">{t('cls_no_subject_assigned', 'Aucune matière n\'est assignée à cette classe.')}</p>
                            ) : (
                                <div className="space-y-3">
                                    {classSubjects.map((sub: any) => (
                                        <div key={sub.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl gap-3">
                                            <div>
                                                <h4 className="text-sm font-bold text-white">{sub.name}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{sub.domain}</p>
                                            </div>
                                            <div className="w-full md:w-64">
                                                <select
                                                    value={assignments[sub.id] || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value ? parseInt(e.target.value) : '';
                                                        setAssignments({
                                                            ...assignments,
                                                            [sub.id]: val as any
                                                        });
                                                    }}
                                                    className="input-field w-full"
                                                >
                                                    <option value="">{t('cls_unassigned_opt', '-- Non assigné --')}</option>
                                                    {teachers.map(t => (
                                                        <option key={t.id} value={t.id}>{t.fullName}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-white/5 bg-slate-900/50 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setIsAssignModalOpen(false)}
                                className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors"
                            >
                                {t('cancel', 'Annuler')}
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveAssignments}
                                className="flex-1 py-3 bg-amber-500 text-slate-900 rounded-xl font-bold hover:bg-amber-400 transition-colors flex justify-center items-center gap-2"
                            >
                                <Save className="w-5 h-5" />
                                {t('cls_save_assignments', 'Enregistrer les Affectations')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Classes;
