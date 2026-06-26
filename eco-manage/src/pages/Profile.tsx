import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Lock, Save, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showNotification(t('passwords_do_not_match', 'Les mots de passe ne correspondent pas'), "error");
      return;
    }

    if (window.electronAPI && user) {
      try {
        await window.electronAPI.changePassword({
          userId: user.id,
          newPassword
        });
        showNotification(t('password_updated', 'Mot de passe mis à jour avec succès !'), "success");
        setNewPassword('');
        setConfirmPassword('');
      } catch (err) {
        console.error(err);
        showNotification("Erreur lors de la mise à jour du mot de passe", "error");
      }
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white">{t('my_profile', 'Mon Profil')}</h1>
        <p className="text-slate-400 mt-1">{t('profile_desc', 'Gérez vos informations personnelles et votre sécurité')}</p>
      </div>

      <div className="glass-card p-8 space-y-8">
        <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-slate-gold-gold flex items-center justify-center text-slate-900 text-2xl font-black">
                {user?.fullName.charAt(0)}
            </div>
            <div>
                <h2 className="text-xl font-bold text-white">{user?.fullName}</h2>
                <span className="text-xs font-bold bg-slate-800 text-slate-gold-gold px-2 py-1 rounded uppercase tracking-widest">{user?.role}</span>
            </div>
        </div>

        <div className="border-t border-slate-800 pt-8">
            <div className="flex items-center space-x-3 text-slate-gold-gold mb-6">
                <ShieldCheck className="w-6 h-6" />
                <h2 className="text-xl font-bold">{t('security', 'Sécurité')}</h2>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('new_password', 'Nouveau mot de passe')}</label>
                    <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            required
                            type="password"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white outline-none focus:border-slate-gold-gold transition-colors"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('confirm_password', 'Confirmer le mot de passe')}</label>
                    <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            required
                            type="password"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white outline-none focus:border-slate-gold-gold transition-colors"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    className="flex items-center justify-center w-full py-3 bg-slate-gold-gold text-slate-900 rounded-lg font-black hover:bg-yellow-500 transition-all shadow-lg"
                >
                    <Save className="w-5 h-5 mr-2" />
                    {t('update_password', 'Mettre à jour le mot de passe')}
                </button>
            </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
