import React, { useState } from 'react';
import { CreditCard, Receipt, Download, TrendingUp, Users } from 'lucide-react';

const Finance: React.FC = () => {
  const [payments] = useState([
    { id: 1, student: 'MBARGA Jean Paul', amount: 50000, date: '2026-04-22', type: 'Scolarité', receipt: 'RCP-001' },
    { id: 2, student: 'ATANGANA Marie', amount: 25000, date: '2026-04-23', type: 'Scolarité', receipt: 'RCP-002' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestion Financière</h1>
          <p className="text-slate-400 mt-1">Suivi des paiements et des impayés</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-slate-gold-gold text-slate-900 rounded-lg font-semibold hover:bg-yellow-500 transition-all">
          <CreditCard className="w-5 h-5 mr-2" />
          Nouveau Paiement
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 border-l-4 border-slate-gold-gold">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-400 text-sm font-medium">Recettes Totales</h3>
            <TrendingUp className="text-slate-gold-gold w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">75,000 FCFA</p>
        </div>
        <div className="glass-card p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-400 text-sm font-medium">Élèves en Règle</h3>
            <Users className="text-blue-500 w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">120 / 150</p>
        </div>
        <div className="glass-card p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-400 text-sm font-medium">Impayés</h3>
            <Receipt className="text-red-500 w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">450,000 FCFA</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden mt-8">
        <div className="p-4 border-b border-slate-700 bg-slate-800/30">
          <h2 className="text-lg font-semibold text-white">Transactions Récentes</h2>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-slate-400 uppercase text-xs tracking-wider">
              <th className="px-6 py-4 font-medium">Reçu</th>
              <th className="px-6 py-4 font-medium">Élève</th>
              <th className="px-6 py-4 font-medium">Montant</th>
              <th className="px-6 py-4 font-medium">Type</th>
              <th className="px-6 py-4 font-medium">Date</th>
              <th className="px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="text-slate-300 divide-y divide-slate-800/50">
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="px-6 py-4 font-mono text-sm">{p.receipt}</td>
                <td className="px-6 py-4 font-semibold">{p.student}</td>
                <td className="px-6 py-4 font-bold text-slate-gold-gold">{p.amount.toLocaleString()} FCFA</td>
                <td className="px-6 py-4">{p.type}</td>
                <td className="px-6 py-4 text-slate-400">{p.date}</td>
                <td className="px-6 py-4">
                  <button className="flex items-center text-blue-400 hover:text-blue-300 transition-colors text-sm">
                    <Download className="w-4 h-4 mr-1" /> Reçu
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Finance;
