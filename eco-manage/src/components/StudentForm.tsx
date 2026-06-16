import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

interface StudentFormProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  student?: any;
}

const StudentForm: React.FC<StudentFormProps> = ({ onClose, onSubmit, student }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [phoneCountry, setPhoneCountry] = useState(() => {
    const contact = student?.parent_contact || '';
    if (contact.startsWith('237')) return '237';
    if (contact.startsWith('241')) return '241';
    if (contact.startsWith('225')) return '225';
    if (contact.startsWith('221')) return '221';
    if (contact.startsWith('242')) return '242';
    if (contact.startsWith('236')) return '236';
    if (contact.startsWith('240')) return '240';
    return '237';
  });

  const [formData, setFormData] = useState({
    firstName: student?.first_name || '',
    lastName: student?.last_name || '',
    birthDate: student?.birth_date || '',
    birthPlace: student?.birth_place || '',
    gender: student?.gender || 'M',
    parentName: student?.parent_name || '',
    parentContact: (() => {
      const contact = student?.parent_contact || '';
      const codes = ['237', '241', '225', '221', '242', '236', '240'];
      for (const code of codes) {
        if (contact.startsWith(code)) return contact.slice(code.length);
      }
      return contact;
    })(),
    emergencyContact: student?.emergency_contact || '',
    medicalInfo: student?.medical_info || '',
    address: student?.address || '',
    neighborhood: student?.neighborhood || '',
    section: student?.section || 'FRANCOPHONE',
    cycle: student?.level || 'PRIMAIRE',
    classId: student?.class_id?.toString() || '',
    scholarshipReduction: student?.scholarship_reduction || 0,
    hasMoratoire: student?.has_moratoire === 1 || student?.has_moratoire === true || false,
    busRouteId: student?.bus_route_id?.toString() || '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadClasses = async () => {
        if (window.electronAPI) {
            const data = await window.electronAPI.getClasses(user?.schoolId);
            setClasses(data || []);
            const r = await window.electronAPI.getBusRoutes(user?.schoolId);
            setRoutes(r || []);

            // Auto-detect correct cycle if editing a student
            if (student && student.class_id && data) {
                const studentClass = data.find((c: any) => c.id === student.class_id);
                if (studentClass) {
                    setFormData(prev => ({
                        ...prev,
                        cycle: studentClass.level || 'PRIMAIRE'
                    }));
                }
            }
        }
    };
    loadClasses();
  }, [user, student]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    const errors: Record<string, string> = {};

    if (!formData.classId) {
        errors.classId = t('alert_select_class', 'Veuillez sélectionner une classe');
    }

    // Name validations (Letters, spaces, hyphens, and numbers like "Bastos 2" allowed)
    const nameRegex = /^[A-Za-zÀ-ÿ0-9\s\-]+$/;
    if (!formData.lastName.trim()) {
        errors.lastName = t('field_required', 'Ce champ est requis');
    } else if (!nameRegex.test(formData.lastName.trim())) {
        errors.lastName = t('invalid_name_chars', "Le nom ne doit contenir que des lettres, chiffres, espaces et tirets");
    }

    if (!formData.firstName.trim()) {
        errors.firstName = t('field_required', 'Ce champ est requis');
    } else if (!nameRegex.test(formData.firstName.trim())) {
        errors.firstName = t('invalid_name_chars', "Le prénom ne doit contenir que des lettres, chiffres, espaces et tirets");
    }

    if (formData.parentName && !nameRegex.test(formData.parentName.trim())) {
        errors.parentName = t('invalid_name_chars', "Le nom ne doit contenir que des lettres, chiffres, espaces et tirets");
    }

    // Birth date validation: must be N-2
    const birthYear = new Date(formData.birthDate).getFullYear();
    const currentYear = new Date().getFullYear();
    if (!formData.birthDate) {
        errors.birthDate = t('field_required', 'Ce champ est requis');
    } else if (birthYear > currentYear - 2) {
        errors.birthDate = t('invalid_birth_date_n2', `L'élève doit être né au plus tard le 31 décembre ${currentYear - 2}`);
    }

    // Phone validation based on countryCode selected
    let cleanPhone = formData.parentContact.replace(/[\s\-\(\)\+]/g, '');
    if (phoneCountry !== 'other' && cleanPhone.startsWith(phoneCountry) && cleanPhone.length > phoneCountry.length) {
        cleanPhone = cleanPhone.slice(phoneCountry.length);
    }

    let phoneIsValid = false;
    if (phoneCountry === '237') {
        phoneIsValid = /^(2|3|6)\d{8}$/.test(cleanPhone);
        if (!phoneIsValid) errors.parentContact = t('invalid_phone_cm', 'Numéro camerounais invalide (9 chiffres attendus, ex: 699000000)');
    } else if (phoneCountry === '241') {
        phoneIsValid = /^[1-7]\d{7}$/.test(cleanPhone);
        if (!phoneIsValid) errors.parentContact = t('invalid_phone_ga', 'Numéro gabonais invalide (8 chiffres attendus, ex: 66000000)');
    } else if (phoneCountry === '225') {
        phoneIsValid = /^0\d{9}$/.test(cleanPhone);
        if (!phoneIsValid) errors.parentContact = t('invalid_phone_ci', 'Numéro ivoirien invalide (10 chiffres attendus, ex: 0700000000)');
    } else if (phoneCountry === '221') {
        phoneIsValid = /^7\d{8}$/.test(cleanPhone);
        if (!phoneIsValid) errors.parentContact = t('invalid_phone_sn', 'Numéro sénégalais invalide (9 chiffres attendus, ex: 770000000)');
    } else if (phoneCountry === '242') {
        phoneIsValid = /^(05|06)\d{7}$/.test(cleanPhone) || /^[0-9]\d{6,8}$/.test(cleanPhone);
        if (!phoneIsValid) errors.parentContact = t('invalid_phone_cg', 'Numéro congolais invalide');
    } else if (phoneCountry === '236') {
        phoneIsValid = /^[7]\d{7}$/.test(cleanPhone);
        if (!phoneIsValid) errors.parentContact = t('invalid_phone_cf', 'Numéro centrafricain invalide');
    } else if (phoneCountry === '240') {
        phoneIsValid = /^(2|5)\d{8}$/.test(cleanPhone);
        if (!phoneIsValid) errors.parentContact = t('invalid_phone_gq', 'Numéro équato-guinéen invalide');
    } else {
        phoneIsValid = /^\d{6,15}$/.test(cleanPhone);
        if (!phoneIsValid) errors.parentContact = t('invalid_phone_int', 'Numéro de téléphone invalide');
    }

    // Secondary contact check
    if (formData.emergencyContact && formData.emergencyContact.trim()) {
        const matches = formData.emergencyContact.match(/\d+/g);
        if (matches) {
            const digitStr = matches.join('');
            let cleanUrgence = digitStr;
            if (phoneCountry !== 'other' && cleanUrgence.startsWith(phoneCountry) && cleanUrgence.length > phoneCountry.length) {
                cleanUrgence = cleanUrgence.slice(phoneCountry.length);
            }
            if (!/^\d{6,15}$/.test(cleanUrgence)) {
                errors.emergencyContact = t('alert_invalid_emergency_contact', 'Contact urgence invalide');
            }
        } else {
            errors.emergencyContact = t('alert_invalid_emergency_contact', 'Contact urgence invalide');
        }
    }

    if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setFormError("Veuillez corriger les erreurs de saisie dans le formulaire.");
        return;
    }

    const finalParentContact = phoneCountry === 'other' ? cleanPhone : phoneCountry + cleanPhone;

    onSubmit({
        ...formData,
        parentContact: finalParentContact
    });
  };

  const filteredClasses = classes.filter(c => c.section === formData.section);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="glass-card w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 bg-slate-900 border border-white/10 shadow-2xl">
        <div className="p-6 border-b border-white/5 bg-slate-950/50 flex justify-between items-center">
          <h2 className="text-xl font-black text-white uppercase tracking-tight">
            {student ? t('edit_student_title') : t('register_student_title')}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {formError && (
            <div className="p-4 bg-rose-500/10 border-l-4 border-rose-500 rounded-xl text-rose-500 text-sm font-bold whitespace-pre-line">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('last_name')}</label>
              <input
                required
                className={`input-field w-full mt-1 ${fieldErrors.lastName ? 'border-rose-500 bg-rose-500/10 focus:ring-rose-500' : ''}`}
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value.toUpperCase()})}
                placeholder="Ex: TCHATCHOUANG"
              />
              {fieldErrors.lastName && (
                <p className="text-[10px] text-rose-500 font-bold mt-0.5">{fieldErrors.lastName}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('first_name')}</label>
              <input
                required
                className={`input-field w-full mt-1 ${fieldErrors.firstName ? 'border-rose-500 bg-rose-500/10 focus:ring-rose-500' : ''}`}
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                placeholder="Ex: Landry"
              />
              {fieldErrors.firstName && (
                <p className="text-[10px] text-rose-500 font-bold mt-0.5">{fieldErrors.firstName}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('birth_date_label')}</label>
              <input
                required
                type="date"
                max={`${new Date().getFullYear() - 2}-12-31`}
                className={`input-field w-full mt-1 ${fieldErrors.birthDate ? 'border-rose-500 bg-rose-500/10 focus:ring-rose-500' : ''}`}
                value={formData.birthDate}
                onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
              />
              {fieldErrors.birthDate && (
                <p className="text-[10px] text-rose-500 font-bold mt-0.5">{fieldErrors.birthDate}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('birth_place_label')}</label>
              <input
                className="input-field w-full mt-1"
                value={formData.birthPlace}
                onChange={(e) => setFormData({...formData, birthPlace: e.target.value})}
                placeholder="Ex: Douala"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('neighborhood_label')}</label>
              <input
                className="input-field w-full mt-1"
                value={formData.neighborhood}
                onChange={(e) => setFormData({...formData, neighborhood: e.target.value})}
                placeholder="Ex: Bonapriso"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('gender_label')}</label>
              <select
                className="input-field w-full mt-1"
                value={formData.gender}
                onChange={(e) => setFormData({...formData, gender: e.target.value})}
              >
                <option value="M" className="bg-slate-900 text-white">Masculin</option>
                <option value="F" className="bg-slate-900 text-white">Féminin</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('parent_name_label')}</label>
              <input
                required
                className={`input-field w-full mt-1 ${fieldErrors.parentName ? 'border-rose-500 bg-rose-500/10 focus:ring-rose-500' : ''}`}
                value={formData.parentName}
                onChange={(e) => setFormData({...formData, parentName: e.target.value})}
                placeholder="Ex: M. / Mme TCHATCHOUANG"
              />
              {fieldErrors.parentName && (
                <p className="text-[10px] text-rose-500 font-bold mt-0.5">{fieldErrors.parentName}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('parent_contact_label')}</label>
              <div className="flex gap-2">
                <select
                  className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-white text-xs font-black mt-1"
                  value={phoneCountry}
                  onChange={(e) => setPhoneCountry(e.target.value)}
                >
                  <option value="237">🇨🇲 +237</option>
                  <option value="241">🇬🇦 +241</option>
                  <option value="225">🇨🇮 +225</option>
                  <option value="221">🇸🇳 +221</option>
                  <option value="242">🇨🇬 +242</option>
                  <option value="236">🇨🇫 +236</option>
                  <option value="240">🇬🇶 +240</option>
                  <option value="other">🌐 Int.</option>
                </select>
                <input
                  required
                  className={`input-field flex-1 mt-1 text-amber-500 font-mono ${fieldErrors.parentContact ? 'border-rose-500 bg-rose-500/10 focus:ring-rose-500' : ''}`}
                  value={formData.parentContact}
                  onChange={(e) => setFormData({...formData, parentContact: e.target.value})}
                  placeholder="Ex: 699000000"
                />
              </div>
              {fieldErrors.parentContact && (
                <p className="text-[10px] text-rose-500 font-bold mt-0.5">{fieldErrors.parentContact}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('emergency_contact_secondary_label')}</label>
              <input
                className={`input-field w-full mt-1 ${fieldErrors.emergencyContact ? 'border-rose-500 bg-rose-500/10 focus:ring-rose-500' : ''}`}
                value={formData.emergencyContact}
                onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})}
                placeholder={t('emergency_contact_placeholder')}
              />
              {fieldErrors.emergencyContact && (
                <p className="text-[10px] text-rose-500 font-bold mt-0.5">{fieldErrors.emergencyContact}</p>
              )}
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('section')}</label>
                <select
                    className="input-field w-full mt-1"
                    value={formData.section}
                    onChange={(e) => setFormData({...formData, section: e.target.value, classId: ''})}
                >
                    <option value="FRANCOPHONE" className="bg-slate-900 text-white">Francophone</option>
                    <option value="ANGLOPHONE" className="bg-slate-900 text-white">Anglophone</option>
                </select>
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('cycle')}</label>
                <select
                    className="input-field w-full mt-1"
                    value={formData.cycle || 'PRIMAIRE'}
                    onChange={(e) => setFormData({...formData, cycle: e.target.value, classId: ''})}
                >
                    <option value="PRIMAIRE" className="bg-slate-900 text-white">Primaire</option>
                    <option value="MATERNELLE" className="bg-slate-900 text-white">Maternelle</option>
                </select>
            </div>
            <div className="space-y-1 col-span-1 md:col-span-2">
                <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{t('class_assignment_label')}</label>
                <select
                    required
                    className="input-field w-full mt-1 border-2 border-amber-500/30"
                    value={formData.classId}
                    onChange={(e) => setFormData({...formData, classId: e.target.value})}
                >
                    <option value="" className="bg-slate-900 text-white">Sélectionner la classe...</option>
                    {classes
                        .filter(c => c.section === formData.section && c.level === (formData.cycle || 'PRIMAIRE'))
                        .map(c => (
                            <option key={c.id} value={c.id} className="bg-slate-900 text-white">{c.name} ({c.level})</option>
                        ))}
                </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('scholarship_reduction_label')}</label>
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
                <label htmlFor="moratoire" className="text-xs font-black text-white uppercase tracking-widest">
                  {t('moratoire_eligible_label')}
                </label>
            </div>
            <div className="space-y-1 col-span-1 md:col-span-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('medical_info_title')}</label>
              <textarea
                className="input-field w-full mt-1 h-24 resize-none"
                value={formData.medicalInfo}
                onChange={(e) => setFormData({...formData, medicalInfo: e.target.value})}
                placeholder={t('medical_info_placeholder')}
              />
            </div>
          </div>

          <div className="pt-6 flex justify-end space-x-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="flex items-center px-8 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95"
            >
              <Save className="w-5 h-5 mr-2" />
              {student ? t('save') : t('finalize_registration')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentForm;
