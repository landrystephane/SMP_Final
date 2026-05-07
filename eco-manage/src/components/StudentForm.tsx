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
    parentContact: '',
    emergencyContact: '',
    medicalInfo: '',
    address: '',
    neighborhood: '',
    section: 'FRANCOPHONE',
    classId: '',
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
      <div className="glass-card w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 bg-white dark:bg-slate-900 shadow-2xl">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Inscription d'un Élève</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nom</label>
              <input
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value.toUpperCase()})}
                placeholder="Ex: TCHATCHOUANG"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Prénom</label>
              <input
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
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
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                value={formData.birthDate}
                onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lieu de naissance</label>
              <input
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                value={formData.birthPlace}
                onChange={(e) => setFormData({...formData, birthPlace: e.target.value})}
                placeholder="Ex: Douala"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Quartier (Suivi Bus)</label>
              <input
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors font-bold"
                value={formData.neighborhood}
                onChange={(e) => setFormData({...formData, neighborhood: e.target.value})}
                placeholder="Ex: Bonapriso"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Genre</label>
              <select
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                value={formData.gender}
                onChange={(e) => setFormData({...formData, gender: e.target.value})}
              >
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contact Parent</label>
              <input
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                value={formData.parentContact}
                onChange={(e) => setFormData({...formData, parentContact: e.target.value})}
                placeholder="Ex: 699000000"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contact d'Urgence</label>
              <input
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                value={formData.emergencyContact}
                onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})}
                placeholder="Nom et téléphone"
              />
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Section</label>
                <select
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                    value={formData.section}
                    onChange={(e) => setFormData({...formData, section: e.target.value, classId: ''})}
                >
                    <option value="FRANCOPHONE">Francophone</option>
                    <option value="ANGLOPHONE">Anglophone</option>
                </select>
            </div>
            <div className="space-y-1 col-span-1 md:col-span-2">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Affectation à une Classe</label>
                <select
                    required
                    className="w-full bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all font-bold"
                    value={formData.classId}
                    onChange={(e) => setFormData({...formData, classId: e.target.value})}
                >
                    <option value="">Sélectionner la classe...</option>
                    {filteredClasses.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.level})</option>
                    ))}
                </select>
            </div>
            <div className="space-y-1 col-span-1 md:col-span-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Antécédents Médicaux / Infos Santé</label>
              <textarea
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors h-24"
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
