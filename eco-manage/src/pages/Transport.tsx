import React from 'react';
import { MapPin, Navigation, Clock, Users } from 'lucide-react';

const Transport: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestion du Transport</h1>
          <p className="text-slate-400 mt-1">Suivi des bus et des tournées scolaires</p>
        </div>
        <div className="flex space-x-2">
            <span className="flex items-center px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-xs font-bold border border-green-500/20">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                GPS Actif
            </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
            <div className="glass-card p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                    <Navigation className="w-5 h-5 mr-2 text-slate-gold-gold" />
                    Mes Tournées
                </h2>
                <div className="space-y-4">
                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <p className="text-slate-300 font-bold">Ligne 1: Bastos - Omnisport</p>
                        <div className="flex justify-between mt-2 text-xs text-slate-500">
                            <span className="flex items-center"><Users className="w-3 h-3 mr-1" /> 24 Élèves</span>
                            <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> 06:30 - 07:45</span>
                        </div>
                        <button className="w-full mt-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 transition-colors">
                            Démarrer la tournée
                        </button>
                    </div>
                </div>
            </div>

            <div className="glass-card p-6">
                <h2 className="text-xl font-bold text-white mb-4">Infos Véhicule</h2>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                        <span className="text-slate-500">Immatriculation</span>
                        <span className="text-white">CE 123-XY</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                        <span className="text-slate-500">Chauffeur</span>
                        <span className="text-white">M. TCHATCHOUA</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">État</span>
                        <span className="text-green-500">Opérationnel</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="md:col-span-2 glass-card overflow-hidden min-h-[400px] relative bg-slate-800">
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 p-8 text-center">
                <MapPin className="w-16 h-16 text-slate-gold-gold animate-bounce" />
                <div>
                    <h3 className="text-2xl font-bold text-white">Carte Interactive</h3>
                    <p className="text-slate-400 mt-2">La géolocalisation en temps réel sera intégrée ici (API Google Maps / OpenStreetMap).</p>
                    <div className="mt-6 p-4 border border-slate-700 rounded-lg inline-block bg-slate-900/50">
                        <p className="text-xs text-slate-500 font-mono italic">
                            {"// Hook de géolocalisation prêt : window.electronAPI.updateGPS(lat, lng)"}
                        </p>
                    </div>
                </div>
            </div>
            {/* Header overlay for map */}
            <div className="absolute top-4 right-4 space-y-2">
                <div className="bg-slate-900/80 backdrop-blur p-2 rounded border border-slate-700 text-[10px] text-white">
                    Prochain arrêt : <span className="text-slate-gold-gold font-bold italic">Carrefour Bastos</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Transport;
