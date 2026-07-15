import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronRight, ChevronLeft, Check, AlertCircle, Clock, Pencil, Trash2, Save, X, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ADMIN_ROLES = ['FOUNDER', 'DIRECTOR', 'ADVISOR'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FillBar({ filled, expected }: { filled: number; expected: number }) {
    const pct = expected > 0 ? Math.round((filled / expected) * 100) : 100;
    const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500';
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-[9px] font-black ${pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                {filled}/{expected}
            </span>
        </div>
    );
}

function formatDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

// ─── Vue Admin ────────────────────────────────────────────────────────────────

export function DiaryAdminView() {
    const { user } = useAuth();
    const [classes, setClasses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [entries, setEntries] = useState<any>(null);
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [selectedSubject, setSelectedSubject] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadClasses(); }, []);

    const loadClasses = async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.getDiaryClasses(user?.schoolId);
            setClasses(data || []);
        } catch(e) {}
        setLoading(false);
    };

    const selectClass = async (cls: any) => {
        setSelectedClass(cls);
        setSelectedSubject(null);
        setEntries(null);
        setLoading(true);
        try {
            const data = await window.electronAPI.getDiarySubjects({ schoolId: user?.schoolId, classId: cls.id });
            setSubjects(data || []);
        } catch(e) {}
        setLoading(false);
    };

    const selectSubject = async (subj: any) => {
        setSelectedSubject(subj);
        setLoading(true);
        try {
            const data = await window.electronAPI.getDiaryEntries({ schoolId: user?.schoolId, classId: selectedClass.id, subjectId: subj.subject_id, days: 60 });
            setEntries(data);
        } catch(e) {}
        setLoading(false);
    };

    if (loading && !selectedClass) return (
        <div className="flex items-center justify-center h-40">
            <BookOpen className="w-8 h-8 text-amber-500 animate-pulse" />
        </div>
    );

    // Breadcrumb
    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <button onClick={() => { setSelectedClass(null); setSelectedSubject(null); setEntries(null); loadClasses(); }} className="hover:text-amber-400 transition-colors">Toutes les classes</button>
                {selectedClass && (<><ChevronRight className="w-3 h-3" /><button onClick={() => { setSelectedSubject(null); setEntries(null); selectClass(selectedClass); }} className="hover:text-amber-400 transition-colors">{selectedClass.name}</button></>)}
                {selectedSubject && (<><ChevronRight className="w-3 h-3" /><span className="text-white">{selectedSubject.subject_name}</span></>)}
            </div>

            {/* Vue : liste des classes */}
            {!selectedClass && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {classes.map(cls => (
                        <button key={cls.id} onClick={() => selectClass(cls)}
                            className="bg-slate-900/80 border border-white/5 hover:border-amber-500/30 rounded-2xl p-5 text-left space-y-3 transition-all hover:bg-slate-800/80 group">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-white font-black text-sm group-hover:text-amber-400 transition-colors">{cls.name}</p>
                                    <p className="text-slate-500 text-[9px] font-bold uppercase mt-0.5">{cls.level} · {cls.section}</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors mt-0.5" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Remplissage (30j)</p>
                                <FillBar filled={cls.filled} expected={cls.expected} />
                            </div>
                        </button>
                    ))}
                    {classes.length === 0 && <p className="text-slate-500 text-xs col-span-4 py-8 text-center">Aucune classe trouvée.</p>}
                </div>
            )}

            {/* Vue : matières d'une classe */}
            {selectedClass && !selectedSubject && (
                <div className="space-y-3">
                    {loading ? <div className="flex justify-center py-8"><BookOpen className="w-6 h-6 text-amber-500 animate-pulse" /></div> : subjects.map(subj => {
                        const civility = subj.teacher_civility ? subj.teacher_civility + ' ' : '';
                        return (
                            <button key={`${subj.subject_id}_${subj.teacher_id}`} onClick={() => selectSubject(subj)}
                                className="w-full bg-slate-900/80 border border-white/5 hover:border-amber-500/30 rounded-2xl p-4 text-left flex items-center gap-4 transition-all hover:bg-slate-800/80 group">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                                    <BookOpen className="w-4 h-4 text-amber-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-black text-sm group-hover:text-amber-400 transition-colors">{subj.subject_name}</p>
                                    <p className="text-slate-500 text-[9px] font-bold mt-0.5">{civility}{subj.teacher_name}</p>
                                    <div className="mt-2 max-w-[200px]">
                                        <FillBar filled={subj.filled} expected={subj.expected} />
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors flex-shrink-0" />
                            </button>
                        );
                    })}
                    {!loading && subjects.length === 0 && <p className="text-slate-500 text-xs py-8 text-center">Aucune matière assignée à cette classe.</p>}
                </div>
            )}

            {/* Vue : entrées d'une matière */}
            {selectedSubject && entries && (
                <div className="space-y-4">
                    {/* Dates manquantes */}
                    {entries.missingDates.length > 0 && (
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 space-y-2">
                            <div className="flex items-center gap-2 text-rose-400">
                                <AlertCircle className="w-4 h-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest">{entries.missingDates.length} entrée(s) manquante(s) sur les 60 derniers jours</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {entries.missingDates.map((d: string) => (
                                    <span key={d} className="bg-rose-500/20 text-rose-300 text-[9px] font-black px-2 py-0.5 rounded-lg capitalize">
                                        {formatDate(d)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Entrées */}
                    {entries.entries.length === 0 && entries.missingDates.length === 0 && (
                        <div className="text-center py-12 text-slate-500 text-xs">Aucun cours programmé sur les 60 derniers jours.</div>
                    )}
                    {entries.entries.map((entry: any) => (
                        <div key={entry.id} className="bg-slate-900/80 border border-white/5 rounded-2xl p-5 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-white font-black text-sm">{entry.lesson_title}</p>
                                        <p className="text-slate-500 text-[9px] font-bold capitalize mt-0.5">{formatDate(entry.lesson_date)}</p>
                                    </div>
                                </div>
                                <span className="text-[8px] font-black bg-slate-800 text-slate-400 px-2 py-0.5 rounded-lg flex-shrink-0">{entry.teacher_name}</span>
                            </div>
                            {entry.lesson_content && <p className="text-slate-300 text-xs border-t border-white/5 pt-3 leading-relaxed">{entry.lesson_content}</p>}
                            {entry.homework && (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                                    <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1">Devoir</p>
                                    <p className="text-slate-200 text-xs">{entry.homework}</p>
                                    {entry.homework_due_date && <p className="text-amber-500 text-[9px] font-bold mt-1">Pour le : {formatDate(entry.homework_due_date)}</p>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Vue Enseignant ───────────────────────────────────────────────────────────

function TeacherView() {
    const { user } = useAuth();
    const [todaySlots, setTodaySlots] = useState<any[]>([]);
    const [editingSlot, setEditingSlot] = useState<any>(null);
    const [form, setForm] = useState({ lessonTitle: '', lessonContent: '', homework: '', homeworkDueDate: '' });
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
    const [pastEntries, setPastEntries] = useState<any[]>([]);
    const [showPast, setShowPast] = useState(false);

    useEffect(() => { loadTodaySlots(); }, []);

    const loadTodaySlots = async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.getTeacherDiaryStatus(user?.schoolId);
            setTodaySlots(data || []);
        } catch(e) {}
        setLoading(false);
    };

    const openEdit = (slot: any) => {
        setEditingSlot(slot);
        setForm({
            lessonTitle: slot.entry?.lesson_title || '',
            lessonContent: slot.entry?.lesson_content || '',
            homework: slot.entry?.homework || '',
            homeworkDueDate: slot.entry?.homework_due_date || '',
        });
    };

    const handleSave = async () => {
        if (!form.lessonTitle.trim()) return;
        setSaving(true);
        try {
            await window.electronAPI.saveDiaryEntry({
                schoolId: user?.schoolId,
                classId: editingSlot.class_id,
                subjectId: editingSlot.subject_id,
                lessonDate: customDate,
                lessonTitle: form.lessonTitle,
                lessonContent: form.lessonContent,
                homework: form.homework,
                homeworkDueDate: form.homeworkDueDate,
            });
            setEditingSlot(null);
            loadTodaySlots();
        } catch(e: any) {
            alert('Erreur : ' + e.message);
        } finally { setSaving(false); }
    };

    const handleDelete = async (entryId: number) => {
        if (!window.confirm('Supprimer cette entrée ?')) return;
        try {
            await window.electronAPI.deleteDiaryEntry({ id: entryId });
            loadTodaySlots();
        } catch(e: any) { alert(e.message); }
    };

    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Date selector */}
            <div className="flex items-center gap-3 bg-slate-900/80 border border-white/5 rounded-2xl px-4 py-3">
                <Calendar className="w-4 h-4 text-amber-400" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date du cours</p>
                <input type="date" value={customDate} max={today}
                    onChange={e => setCustomDate(e.target.value)}
                    className="ml-auto bg-transparent text-white font-black text-xs outline-none border border-white/10 rounded-xl px-3 py-1.5 focus:border-amber-500 transition-colors" />
            </div>

            {loading ? (
                <div className="flex justify-center py-8"><BookOpen className="w-6 h-6 text-amber-500 animate-pulse" /></div>
            ) : todaySlots.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                    <Clock className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    Aucun cours programmé aujourd'hui.
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Mes cours du jour</p>
                    {todaySlots.map((slot, i) => {
                        const isEditing = editingSlot?.class_id === slot.class_id && editingSlot?.subject_id === slot.subject_id;
                        const isFilled = !!slot.entry;
                        return (
                            <div key={i} className={`bg-slate-900/80 border rounded-2xl overflow-hidden transition-all ${isFilled ? 'border-emerald-500/20' : 'border-amber-500/20'}`}>
                                {/* Slot header */}
                                <div className="p-4 flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isFilled ? 'bg-emerald-500/20' : 'bg-amber-500/10'}`}>
                                        {isFilled ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-amber-400" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-black text-sm truncate">{slot.subject_name}</p>
                                        <p className="text-slate-500 text-[9px] font-bold">{slot.class_name} · {slot.start_time}–{slot.end_time}</p>
                                    </div>
                                    {!isEditing && (
                                        <div className="flex gap-2">
                                            <button onClick={() => openEdit(slot)} className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${isFilled ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'}`}>
                                                {isFilled ? <><Pencil className="w-3 h-3 inline mr-1" />Modifier</> : 'Remplir'}
                                            </button>
                                            {isFilled && <button onClick={() => handleDelete(slot.entry.id)} className="px-2 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all">
                                                <Trash2 className="w-3 h-3" />
                                            </button>}
                                        </div>
                                    )}
                                </div>

                                {/* Filled preview */}
                                {isFilled && !isEditing && (
                                    <div className="border-t border-white/5 px-4 pb-3 pt-2 space-y-1">
                                        <p className="text-white text-xs font-black">{slot.entry.lesson_title}</p>
                                        {slot.entry.lesson_content && <p className="text-slate-400 text-[10px] line-clamp-2">{slot.entry.lesson_content}</p>}
                                        {slot.entry.homework && <p className="text-amber-400 text-[9px] font-bold">Devoir : {slot.entry.homework}</p>}
                                    </div>
                                )}

                                {/* Edit form */}
                                {isEditing && (
                                    <div className="border-t border-white/5 p-4 space-y-3">
                                        <input value={form.lessonTitle} onChange={e => setForm(f => ({ ...f, lessonTitle: e.target.value }))}
                                            placeholder="Titre de la leçon *" required
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-amber-500 transition-colors placeholder-slate-600" />
                                        <textarea value={form.lessonContent} onChange={e => setForm(f => ({ ...f, lessonContent: e.target.value }))}
                                            placeholder="Contenu du cours (objectifs, points abordés...)" rows={3}
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-amber-500 transition-colors placeholder-slate-600 resize-none" />
                                        <div className="grid grid-cols-2 gap-3">
                                            <input value={form.homework} onChange={e => setForm(f => ({ ...f, homework: e.target.value }))}
                                                placeholder="Devoir donné (optionnel)"
                                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-amber-500 transition-colors placeholder-slate-600" />
                                            <div className="space-y-1">
                                                <p className="text-[9px] text-slate-500 font-bold uppercase">Date rendu devoir</p>
                                                <input type="date" value={form.homeworkDueDate} onChange={e => setForm(f => ({ ...f, homeworkDueDate: e.target.value }))}
                                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-amber-500 transition-colors" />
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pt-1">
                                            <button onClick={handleSave} disabled={saving || !form.lessonTitle.trim()}
                                                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                                <Save className="w-3.5 h-3.5" />{saving ? 'Sauvegarde...' : 'Enregistrer'}
                                            </button>
                                            <button onClick={() => setEditingSlot(null)} className="px-4 py-2.5 bg-white/5 text-slate-400 rounded-xl font-black text-xs hover:bg-white/10 transition-all">
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────

const LessonDiary: React.FC = () => {
    const { user } = useAuth();
    const isAdmin = ADMIN_ROLES.includes(user?.role || '');

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center gap-5 bg-slate-900/50 p-8 rounded-[32px] border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="w-16 h-16 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg flex-shrink-0">
                    <BookOpen className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight">Cahier de Texte</h1>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                        {isAdmin ? 'Suivi pédagogique — consultez les entrées par classe et détectez les cours non remplis'
                                 : 'Remplissez le cahier de texte après chaque cours'}
                    </p>
                </div>
            </div>

            {isAdmin ? <DiaryAdminView /> : <TeacherView />}
        </div>
    );
};

export default LessonDiary;
