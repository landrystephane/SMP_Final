import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setError('');
    setIsLoading(true);
    try {
      console.log('Tentative de connexion pour:', username);
      await login(username, password);
      console.log('Connexion réussie, redirection...');
    } catch (err: any) {
      setError('Identifiants invalides ou erreur de connexion');
      console.error('Erreur login:', err);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
        {/* Background blobs for visual appeal without white glare */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/5 blur-[120px] rounded-full" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center">
            <div className="inline-flex p-5 bg-amber-500 rounded-3xl shadow-2xl shadow-amber-500/20 mb-8 border-4 border-slate-950">
                <LogIn className="w-12 h-12 text-slate-950" />
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter mb-2">ECO-MANAGE</h1>
            <p className="text-amber-500 font-black uppercase text-xs tracking-[0.3em]">Système de Gestion Scolaire Intégré</p>
        </div>

        <div className="glass-card p-10 border-slate-700/50 shadow-2xl">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-4 bg-red-500/10 text-red-500 text-xs font-black rounded-xl border border-red-500/20 uppercase tracking-widest text-center">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Utilisateur</label>
                <input
                    type="text"
                    required
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-4 text-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 outline-none transition-all font-bold"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Admin"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Mot de passe</label>
                <input
                    type="password"
                    required
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-4 text-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 outline-none transition-all font-bold"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-amber-500 text-slate-950 py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-amber-400 active:scale-[0.98] transition-all shadow-xl shadow-amber-500/10 flex items-center justify-center disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-4 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                'Accéder au Portail'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
