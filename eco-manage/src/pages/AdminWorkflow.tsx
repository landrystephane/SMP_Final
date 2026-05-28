import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ShieldCheck, CheckCircle2, UserCheck, Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { generateClassReportCards } from '../utils/reports';

const AdminWorkflow: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isSgActing, setIsSgActing] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [school, setSchool] = useState<any>(null);
  const [printingClassId, setPrintingClassId] = useState<number | null>(null);

  const [period, setPeriod] = useState({
    term: 1,
    start: '2026-04-20',
    end: '2026-05-15',
    active: true,
    editingAllowed: true
  });

  const loadData = async () => {
    if (window.electronAPI && user) {
        const cls = await window.electronAPI.getClasses(user.schoolId);
        setClasses(cls || []);

        const schoolsList = await window.electronAPI.getSchools();
        const curSchool = schoolsList.find((s: any) => s.id === user.schoolId);
        setSchool(curSchool);
    }
  };

  const loadActingStatus = async () => {
    if (window.electronAPI) {
        const status = await window.electronAPI.getSetting('sg_acting_director');
        setIsSgActing(status === 'true');
    }
  };

  const loadPeriodSettings = async () => {
    if (window.electronAPI) {
        const start = await window.electronAPI.getSetting('period_start') || '2026-04-20';
        const end = await window.electronAPI.getSetting('period_end') || '2026-05-15';
        const editingAllowed = await window.electronAPI.getSetting('period_editing_allowed') === 'true';
        setPeriod(prev => ({ ...prev, start, end, editingAllowed }));
    }
  };

  useEffect(() => {
    loadData();
    loadActingStatus();
    loadPeriodSettings();
  }, [user]);

  const handleUpdatePeriod = async () => {
    if (window.electronAPI) {
        await window.electronAPI.setSetting({ key: 'period_start', value: period.start });
        await window.electronAPI.setSetting({ key: 'period_end', value: period.end });
        await window.electronAPI.setSetting({ key: 'period_editing_allowed', value: period.editingAllowed.toString() });
        
        if (period.editingAllowed) {
            await window.electronAPI.createNotification({
                school_id: user?.schoolId,
                role: 'TEACHER',
                message: `La période de saisie des notes est ouverte du ${period.start} au ${period.end}. Veuillez procéder au remplissage.`,
                type: 'SYSTEM'
            });
        }

        const isEn = i18n.language.startsWith('en');
        alert(isEn ? 'Evaluation period updated successfully.' : 'Période d\\'évaluation mise à jour avec succès.');
    }
  };

  const toggleSgActing = async () => {
    if (window.electronAPI) {
        const newValue = !isSgActing;
        await window.electronAPI.setSetting({ key: 'sg_acting_director', value: newValue.toString() });
        setIsSgActing(newValue);
    }
  };

  const handlePrintClassReportCards = async (classId: number) => {
    if (!window.electronAPI || !school) return;
    setPrintingClassId(classId);
    try {
        const classObj = classes.find(c => c.id === classId);
        if (!classObj) return;

        // Fetch all students of this class
        const allStudents = await window.electronAPI.getStudents(user?.schoolId);
        const classStudents = allStudents.filter((s: any) => s.class_id === classId);

        if (classStudents.length === 0) {
            alert("Aucun élève dans cette classe.");
            return;
        }

        // Fetch details (grades & attendance) for each student
        const studentsData: any[] = [];
        for (const student of classStudents) {
            const details = await window.electronAPI.getStudentDetails(student.id);
            studentsData.push({
                student,
                grades: details.grades || [],
                attendance: details.attendance || []
            });
        }

        // Calculate averages for rank calculation
        const studentsWithAverages = studentsData.map(sData => {
            const validatedGrades = sData.grades.filter((g: any) => g.validated === 1);
            if (validatedGrades.length === 0) {
                return { ...sData, average: null };
            }
            const totalPoints = validatedGrades.reduce((acc: number, g: any) => acc + (g.score * g.coefficient), 0);
            const totalCoef = validatedGrades.reduce((acc: number, g: any) => acc + g.coefficient, 0);
            return {
                ...sData,
                average: totalPoints / (totalCoef || 1)
            };
        });

        // Sort students to assign rank
        const sortedStudents = [...studentsWithAverages]
            .filter(s => s.average !== null)
            .sort((a, b) => (b.average || 0) - (a.average || 0));

        const finalStudentsData = studentsWithAverages.map(sData => {
            if (sData.average === null) {
                return {
                    student: sData.student,
                    grades: sData.grades,
                    attendance: sData.attendance,
                    rank: undefined,
                    totalStudents: classStudents.length
                };
            }
            const rankIndex = sortedStudents.findIndex(s => s.student.id === sData.student.id);
            return {
                student: sData.student,
                grades: sData.grades,
                attendance: sData.attendance,
                rank: rankIndex !== -1 ? rankIndex + 1 : undefined,
                totalStudents: classStudents.length
            };
        }).sort((a, b) => {
            if (a.rank === undefined && b.rank === undefined) return 0;
            if (a.rank === undefined) return 1;
            if (b.rank === undefined) return -1;
            return a.rank - b.rank;
        });

        // Call report generator
        generateClassReportCards({
            classObj,
            school,
            term: period.term,
            studentsData: finalStudentsData
        });

        alert("Impression lancée avec succès (le fichier PDF a été généré).");
    } catch (err: any) {
        console.error(err);
        alert("Erreur lors de la génération: " + err.message);
    } finally {
        setPrintingClassId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">{t('admin_control')}</h1>
        <p className="text-slate-400 mt-1">{t('admin_control_desc')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Evaluation Period Control */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center space-x-3 text-slate-gold-gold">
            <Calendar className="w-6 h-6" />
            <h2 className="text-xl font-semibold">{t('evaluation_period')}</h2>
          </div>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase text-slate-500 font-bold">{t('start')}</label>
                <input type="date" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white mt-1" value={period.start} onChange={(e) => setPeriod(prev => ({...prev, start: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs uppercase text-slate-500 font-bold">{t('end')}</label>
                <input type="date" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white mt-1" value={period.end} onChange={(e) => setPeriod(prev => ({...prev, end: e.target.value}))} />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-300">{t('allow_grade_entry')}</span>
              <div 
                  onClick={() => setPeriod(prev => ({...prev, editingAllowed: !prev.editingAllowed}))}
                  className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${period.editingAllowed ? 'bg-green-500' : 'bg-slate-600'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${period.editingAllowed ? 'translate-x-6' : ''}`} />
              </div>
            </div>
            <button onClick={handleUpdatePeriod} className="w-full py-2 bg-slate-gold-gold text-slate-900 rounded font-bold hover:bg-yellow-500 transition-colors">
              {t('update_period')}
            </button>
          </div>
        </div>

        {/* SG Acting Director Toggle */}
        <div className="glass-card p-6 space-y-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-purple-400">
                <UserCheck className="w-6 h-6" />
                <h2 className="text-xl font-semibold">{t('director_acting')}</h2>
            </div>
          </div>
          <p className="text-sm text-slate-400">
            {t('director_acting_desc')}
          </p>
          <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <div>
                <span className="text-white font-bold block text-sm">{t('sg_acting_mode')}</span>
                <span className="text-[10px] text-slate-500 uppercase font-black">{t('currently')}: {isSgActing ? t('enabled') : t('disabled')}</span>
            </div>
            <div
                onClick={toggleSgActing}
                className={`w-14 h-7 rounded-full p-1 cursor-pointer transition-all duration-300 ${isSgActing ? 'bg-purple-500' : 'bg-slate-700'}`}
            >
                <div className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ${isSgActing ? 'translate-x-7' : ''}`} />
            </div>
          </div>
        </div>

        {/* Validation Status */}
        <div className="glass-card p-6 space-y-4 md:col-span-2">
          <div className="flex items-center space-x-3 text-blue-400">
            <ShieldCheck className="w-6 h-6" />
            <h2 className="text-xl font-semibold">{t('report_validation')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {classes.slice(0, 6).map((cls) => (
              <div key={cls.id} className="flex items-center justify-between p-4 border border-slate-800 rounded-xl bg-slate-900/30">
                <div>
                  <span className="text-white font-medium block">{cls.name}</span>
                  <span className="text-[9px] text-slate-500 font-bold uppercase">{cls.section}</span>
                </div>
                <span className="flex items-center text-xs bg-amber-500/10 text-amber-500 px-2 py-1 rounded border border-amber-500/20 font-bold uppercase">
                  <Clock className="w-3 h-3 mr-1" /> EN ATTENTE
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secretary Print Authorization */}
      <div className="glass-card p-6">
        <div className="flex items-center space-x-3 text-purple-400 mb-6">
          <Printer className="w-6 h-6" />
          <h2 className="text-xl font-semibold">{t('print_auth')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-slate-500 text-xs uppercase">
              <tr>
                <th className="pb-4">{t('class')}</th>
                <th className="pb-4">Niveau / Section</th>
                <th className="pb-4">Statut Validation</th>
                <th className="pb-4">Action</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {classes.map((c) => (
                <tr key={c.id} className="border-t border-slate-850 hover:bg-slate-900/20">
                  <td className="py-4 font-bold text-white">{c.name}</td>
                  <td className="py-4 text-xs font-semibold text-slate-400">{c.level} • {c.section}</td>
                  <td className="py-4">
                    <span className="px-2 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[10px] font-bold uppercase tracking-wider">EN ATTENTE</span>
                  </td>
                  <td className="py-4">
                    <button
                      onClick={() => handlePrintClassReportCards(c.id)}
                      disabled={printingClassId === c.id}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-xl font-bold hover:from-amber-400 hover:to-amber-500 transition-all shadow-md text-xs flex items-center gap-2 disabled:opacity-50"
                    >
                      <Printer className="w-4 h-4" />
                      {printingClassId === c.id ? "Impression..." : t('start_printing')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminWorkflow;
