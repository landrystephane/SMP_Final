import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
    } catch (err) {
      setError('Identifiants invalides');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="glass-card w-full max-max-w-md p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-gold-gold">Eco-Manage</h1>
          <p className="text-slate-400 mt-2">Gestion d'établissement scolaire</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300">Utilisateur</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-white focus:ring-slate-gold-gold focus:border-slate-gold-gold outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-white focus:ring-slate-gold-gold focus:border-slate-gold-gold outline-none"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-slate-900 bg-slate-gold-gold hover:bg-yellow-500 transition-colors"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Se connecter
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
