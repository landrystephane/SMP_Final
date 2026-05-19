import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface StudentFormProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const StudentForm: React.FC<StudentFormProps> = ({ onClose, onSubmit }) => {

  const [classes, setClasses] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    birthPlace: '',
    gender: 'M',
    parentName: '',
    parentContact: '',
    emergencyContact: '',
    medicalInfo: '',
    address: '',
    neighborhood: '',
    section: 'FRANCOPHONE',
    cycle: 'PRIMAIRE',
    classId: '',
    scholarshipReduction: 0,
    hasMoratoire: false,
  });

  useEffect(() => {
    const loadClasses = async () => {
        if (window.electronAPI) {
            const data = await window.electronAPI.getClasses();
            setClasses(data);
        }
    };
    loadClasses();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.classId) {
        alert('Veuillez sélectionner une classe');
        return;
    }
    onSubmit(formData);
  };

  const filteredClasses = classes.filter(c => c.section === formData.section);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="glass-card w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 bg-slate-900 border border-white/10 shadow-2xl">
        <div className="p-6 border-b border-white/5 bg-slate-950/50 flex justify-between items-center">
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Inscription d'un Élève</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nom</label>
              <input
                required
                className="input-field w-full mt-1"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value.toUpperCase()})}
                placeholder="Ex: TCHATCHOUANG"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Prénom</label>
              <input
                required
                className="input-field w-full mt-1"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                placeholder="Ex: Landry"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Date de naissance</label>
              <input
                required
                type="date"
                className="input-field w-full mt-1"
                value={formData.birthDate}
                onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lieu de naissance</label>
              <input
                className="input-field w-full mt-1"
                value={formData.birthPlace}
                onChange={(e) => setFormData({...formData, birthPlace: e.target.value})}
                placeholder="Ex: Douala"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Quartier (Suivi Bus)</label>
              <input
                className="input-field w-full mt-1"
                value={formData.neighborhood}
                onChange={(e) => setFormData({...formData, neighborhood: e.target.value})}
                placeholder="Ex: Bonapriso"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Genre</label>
              <select
                className="input-field w-full mt-1"
                value={formData.gender}
                onChange={(e) => setFormData({...formData, gender: e.target.value})}
              >
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nom complet du Parent (Père/Mère)</label>
              <input
                required
                className="input-field w-full mt-1"
                value={formData.parentName}
                onChange={(e) => setFormData({...formData, parentName: e.target.value})}
                placeholder="Ex: M. / Mme TCHATCHOUANG"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contact Téléphone Parent</label>
              <input
                required
                className="input-field w-full mt-1 text-amber-500 font-mono"
                value={formData.parentContact}
                onChange={(e) => setFormData({...formData, parentContact: e.target.value})}
                placeholder="Ex: 699000000"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contact d'Urgence secondaire</label>
              <input
                className="input-field w-full mt-1"
                value={formData.emergencyContact}
                onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})}
                placeholder="Nom et téléphone alternative"
              />
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Section</label>
                <select
                    className="input-field w-full mt-1"
                    value={formData.section}
                    onChange={(e) => setFormData({...formData, section: e.target.value, classId: ''})}
                >
                    <option value="FRANCOPHONE">Francophone</option>
                    <option value="ANGLOPHONE">Anglophone</option>
                </select>
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cycle</label>
                <select
                    className="input-field w-full mt-1"
                    value={formData.cycle || 'PRIMAIRE'}
                    onChange={(e) => setFormData({...formData, cycle: e.target.value, classId: ''})}
                >
                    <option value="PRIMAIRE">Primaire</option>
                    <option value="MATERNELLE">Maternelle</option>
                </select>
            </div>
            <div className="space-y-1 col-span-1 md:col-span-2">
                <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Affectation à une Classe</label>
                <select
                    required
                    className="input-field w-full mt-1 border-2 border-amber-500/30"
                    value={formData.classId}
                    onChange={(e) => setFormData({...formData, classId: e.target.value})}
                >
                    <option value="">Sélectionner la classe...</option>
                    {classes
                        .filter(c => c.section === formData.section && c.level === (formData.cycle || 'PRIMAIRE'))
                        .map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.level})</option>
                        ))}
                </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Réduction Scolarité (Bourse)</label>
              <input
                type="number"
                className="input-field w-full mt-1"
                value={formData.scholarshipReduction}
                onChange={(e) => setFormData({...formData, scholarshipReduction: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="flex items-center space-x-3 pt-6">
                <input
                    type="checkbox"
                    id="moratoire"
                    className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500"
                    checked={formData.hasMoratoire}
                    onChange={(e) => setFormData({...formData, hasMoratoire: e.target.checked})}
                />
                <label htmlFor="moratoire" className="text-xs font-black text-white uppercase tracking-widest">Éligible au Moratoire</label>
            </div>
            <div className="space-y-1 col-span-1 md:col-span-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Antécédents Médicaux / Infos Santé</label>
              <textarea
                className="input-field w-full mt-1 h-24 resize-none"
                value={formData.medicalInfo}
                onChange={(e) => setFormData({...formData, medicalInfo: e.target.value})}
                placeholder="Allergies, groupe sanguin, maladies chroniques..."
              />
            </div>
          </div>

          <div className="pt-6 flex justify-end space-x-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex items-center px-8 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95"
            >
              <Save className="w-5 h-5 mr-2" />
              Finaliser l'Inscription
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentForm;
