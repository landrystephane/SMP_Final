import React, { useState, useEffect } from 'react';
import { Plus, Copy, ShieldCheck, RefreshCw, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const MobileAccess: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [keys, setKeys] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [enteredMatricule, setEnteredMatricule] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
    if (window.electronAPI && user) {
      const data = await window.electronAPI.getMobileKeys();
      setKeys(data);
      const u = await window.electronAPI.getUsers(user.schoolId);
      setUsers(u || []);
    } else {
      // Fallback
      setKeys([
        { id: 1, access_key: 'ECO-9283-X1', status: 'ACTIVE', assigned_to_name: 'M. Tchana' },
        { id: 2, access_key: 'ECO-1204-Y8', status: 'USED', assigned_to_name: 'Mme. Bekono' },
      ]);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleGenerateKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredMatricule.trim()) return;

    const foundUser = users.find(u => u.matricule === enteredMatricule);
    if (!foundUser) {
      alert(t('matricule_not_found', 'Erreur : Le matricule "{{matricule}}" n\'existe pas parmi le personnel de cet établissement.', { matricule: enteredMatricule }));
      return;
    }

    if (window.electronAPI) {
      setIsLoading(true);
      try {
        await window.electronAPI.generateMobileKey({ 
          name: `[${foundUser.matricule}] ${foundUser.fullName}`, 
          userId: foundUser.id 
        });
        setEnteredMatricule('');
        setIsModalOpen(false);
        await loadData();
      } finally {
        setIsLoading(false);
      }
    } else {
      alert(t('feature_limited_desktop', "Fonctionnalité limitée au mode Desktop (Electron)"));
    }
  };

  const handleRevoke = async (id: number) => {
    if (!confirm(t('confirm_revoke_key', "Voulez-vous révoquer cette clé ?"))) return;
    if (window.electronAPI) {
      await window.electronAPI.revokeMobileKey(id);
      await loadData();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">{t('secure_mobile_access', 'Accès Mobile Sécurisé')}</h1>
          <p className="text-slate-400 mt-1 font-bold uppercase text-xs tracking-widest italic opacity-70">{t('manage_activation_keys', 'Gérez les clés d\'activation uniques pour les terminaux mobiles')}</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={isLoading}
          className="flex items-center px-8 py-4 bg-amber-500 text-slate-950 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-amber-400 active:scale-95 transition-all shadow-xl shadow-amber-500/10"
        >
          {isLoading ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
          {t('generate_key', 'Générer une Clé')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card overflow-hidden border-none shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead className="bg-white/5 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-white/5">
                      <tr>
                          <th className="px-8 py-5">{t('activation_key', 'Clé d\'Activation')}</th>
                          <th className="px-8 py-5">{t('assigned_staff', 'Personnel Assigné')}</th>
                          <th className="px-8 py-5">{t('status', 'Statut')}</th>
                          <th className="px-8 py-5 text-right">{t('actions', 'Actions')}</th>
                      </tr>
                  </thead>
                  <tbody className="text-slate-300 divide-y divide-white/5">
                      {keys.length > 0 ? keys.map(k => (
                          <tr key={k.id} className={`hover:bg-white/5 transition-colors group ${k.status === 'REVOKED' ? 'opacity-40 grayscale' : ''}`}>
                              <td className="px-8 py-5 font-mono text-amber-500 font-black tracking-wider text-sm">{k.access_key}</td>
                              <td className="px-8 py-5 font-bold text-white uppercase text-sm">{k.assigned_to_name}</td>
                              <td className="px-8 py-5">
                                  <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest border ${
                                      k.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                      k.status === 'REVOKED' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                      'bg-slate-700 text-slate-400 border-slate-600'
                                  }`}>
                                      {k.status === 'ACTIVE' ? t('ready_to_use', 'PRÊT À L\'EMPLOI') : k.status}
                                  </span>
                              </td>
                              <td className="px-8 py-5 text-right space-x-4">
                                  <button
                                      onClick={() => { navigator.clipboard.writeText(k.access_key); alert(t('key_copied', 'Clé copiée !')); }}
                                      className="text-slate-500 hover:text-white transition-colors"
                                      title={t('copy_key', "Copier la clé")}
                                  ><Copy className="w-5 h-5" /></button>
                                  {k.status === 'ACTIVE' && (
                                      <button
                                          onClick={() => handleRevoke(k.id)}
                                          className="text-slate-500 hover:text-rose-500 transition-colors"
                                          title={t('revoke_access', "Révoquer l'accès")}
                                      ><Trash2 className="w-5 h-5" /></button>
                                  )}
                              </td>
                          </tr>
                      )) : (
                          <tr>
                              <td colSpan={4} className="px-8 py-20 text-center text-slate-500 italic font-black uppercase tracking-widest text-xs">
                                  {t('no_active_security_tokens', 'Aucun jeton de sécurité actif')}
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
            </div>
        </div>

        <div className="space-y-6">
            <div className="glass-card p-8 border-none shadow-2xl bg-gradient-to-br from-slate-900 to-slate-950 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <ShieldCheck className="w-24 h-24 text-amber-500" />
                </div>

                <div className="flex items-center space-x-4 text-amber-500 mb-6">
                    <div className="p-3 bg-amber-500/10 rounded-2xl">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h3 className="font-black text-xl uppercase tracking-tighter">{t('mobile_security', 'Sécurité Mobile')}</h3>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed font-bold uppercase tracking-wide opacity-80">
                    {t('unique_key_desc_1', 'Chaque clé est')} <span className="text-amber-500">{t('unique_key_desc_2', 'unique')}</span> {t('unique_key_desc_3', 'et ne peut être utilisée qu\'une seule fois pour activer l\'application sur un smartphone.')}
                </p>

                <div className="mt-6 space-y-4">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{t('architecture', 'Architecture')}</p>
                        <p className="text-xs text-white font-bold">{t('rsa_trust_link', 'Liaison de confiance RSA entre le terminal mobile et ce serveur central.')}</p>
                    </div>
                </div>

                <div className="pt-8 mt-4 border-t border-white/5">
                    <p className="text-[10px] text-rose-500/70 font-black uppercase tracking-widest text-center italic">
                        {t('revoke_key_warning', 'La révocation d\'une clé désactive immédiatement l\'accès mobile pour l\'utilisateur concerné.')}
                    </p>
                </div>
            </div>
        </div>
      </div>

      {/* Modern Modal Dialog for Generating Key */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md p-8 glass-card border border-white/10 rounded-3xl shadow-2xl relative animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">{t('generate_mobile_key', 'Générer une Clé Mobile')}</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6 opacity-70">
              {t('generate_mobile_key_desc', 'Saisissez le matricule d\'un membre du personnel pour lui générer et associer sa clé d\'accès mobile.')}
            </p>
            <form onSubmit={handleGenerateKeySubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('staff_matricule', 'Matricule du Personnel')}</label>
                <input
                  type="text"
                  className="input-field w-full bg-slate-900 border-slate-700 text-white"
                  placeholder={t('ex_matricule', 'Ex: 26ENS0001')}
                  value={enteredMatricule}
                  onChange={(e) => setEnteredMatricule(e.target.value.trim().toUpperCase())}
                  required
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setEnteredMatricule(''); }}
                  className="flex-1 px-6 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white/10 active:scale-95 transition-all"
                >
                  {t('cancel', 'Annuler')}
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-6 py-4 bg-amber-500 text-slate-950 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-amber-400 active:scale-95 transition-all shadow-xl shadow-amber-500/10"
                >
                  {isLoading ? t('generating', 'Génération...') : t('confirm', 'Confirmer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileAccess;
