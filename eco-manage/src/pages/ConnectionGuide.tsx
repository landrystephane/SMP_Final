import React from 'react';
import { Wifi, Smartphone, Monitor } from 'lucide-react';

const ConnectionGuide: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <Wifi className="w-16 h-16 text-slate-gold-gold mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-white">Guide de Connexion Mobile</h1>
        <p className="text-slate-400 mt-2">Comment utiliser l'appli sans Wi-Fi officiel</p>
      </div>

      <div className="space-y-6">
        <section className="glass-card p-6 border-l-4 border-blue-500">
            <div className="flex items-center space-x-3 mb-4">
                <Monitor className="text-blue-500" />
                <h2 className="text-xl font-bold text-white">Méthode 1 : Point d'accès PC</h2>
            </div>
            <p className="text-slate-300 text-sm">
                Si vous avez un PC avec Windows, vous pouvez créer votre propre réseau pour les enseignants :
            </p>
            <ol className="list-decimal list-inside mt-4 space-y-2 text-xs text-slate-400">
                <li>Allez dans **Paramètres {'>'} Réseau et Internet {'>'} Point d'accès sans fil mobile**.</li>
                <li>Activez-le et donnez le nom et mot de passe aux enseignants.</li>
                <li>Une fois connectés, ils peuvent accéder à l'appli via votre adresse IP locale.</li>
            </ol>
        </section>

        <section className="glass-card p-6 border-l-4 border-purple-500">
            <div className="flex items-center space-x-3 mb-4">
                <Smartphone className="text-purple-500" />
                <h2 className="text-xl font-bold text-white">Méthode 2 : Partage de connexion Mobile</h2>
            </div>
            <p className="text-slate-300 text-sm">
                Un enseignant (ou le fondateur) peut utiliser son téléphone comme routeur :
            </p>
            <ol className="list-decimal list-inside mt-4 space-y-2 text-xs text-slate-400">
                <li>Activez le **Point d'accès mobile** (Hotspot) sur un smartphone.</li>
                <li>Connectez le PC principal et les autres téléphones à ce Hotspot.</li>
                <li>L'appli fonctionnera parfaitement comme sur un réseau Wi-Fi classique.</li>
            </ol>
        </section>

        <div className="p-4 bg-slate-800/50 rounded-lg text-center border border-slate-700">
            <p className="text-xs text-slate-500 italic">
                Note : Aucun crédit internet n'est consommé pour l'échange de données entre le PC et les téléphones.
            </p>
        </div>
      </div>
    </div>
  );
};

export default ConnectionGuide;
