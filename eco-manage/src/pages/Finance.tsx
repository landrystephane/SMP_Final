import React, { useState, useEffect } from 'react';
import { CreditCard, Receipt, Download, TrendingUp, Users } from 'lucide-react';

const Finance: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    const loadPayments = async () => {
      if (window.electronAPI) {
        const data = await window.electronAPI.getPayments();
        setPayments(data);
      } else {
        setPayments([
          { id: 1, first_name: 'Jean Paul', last_name: 'MBARGA', amount: 50000, payment_date: '2026-04-22', payment_type: 'Scolarité', receipt_number: 'RCP-001' },
          { id: 2, first_name: 'Marie', last_name: 'ATANGANA', amount: 25000, payment_date: '2026-04-23', payment_type: 'Scolarité', receipt_number: 'RCP-002' },
        ]);
      }
    };
    loadPayments();
  }, []);

  const [activeTab, setActiveTab] = useState<'TRANSACTIONS' | 'ARREARS'>('TRANSACTIONS');
  const totalReceived = payments.reduce((acc, p) => acc + p.amount, 0);

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

      {/* Onglets */}
      <div className="flex border-b border-slate-700 space-x-8 mb-6">
          <button
            onClick={() => setActiveTab('TRANSACTIONS')}
            className={`pb-3 text-sm font-bold transition-all ${activeTab === 'TRANSACTIONS' ? 'text-slate-gold-gold border-b-2 border-slate-gold-gold' : 'text-slate-500 hover:text-white'}`}
          >
            HISTORIQUE DES TRANSACTIONS
          </button>
          <button
            onClick={() => setActiveTab('ARREARS')}
            className={`pb-3 text-sm font-bold transition-all ${activeTab === 'ARREARS' ? 'text-slate-gold-gold border-b-2 border-slate-gold-gold' : 'text-slate-500 hover:text-white'}`}
          >
            ETAT DES IMPAYÉS (ARREARS)
          </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 border-l-4 border-slate-gold-gold">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-400 text-sm font-medium">Recettes Totales</h3>
            <TrendingUp className="text-slate-gold-gold w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{totalReceived.toLocaleString()} FCFA</p>
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

      {activeTab === 'TRANSACTIONS' ? (
        <div className="glass-card overflow-hidden mt-8">
            <div className="p-4 border-b border-slate-700 bg-slate-800/30 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Transactions Récentes</h2>
            <button className="text-xs font-bold bg-slate-700 px-3 py-1 rounded text-slate-300 flex items-center">
                <Download className="w-3 h-3 mr-2" /> EXPORT EXCEL
            </button>
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
                {payments.length > 0 ? payments.map((p) => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm">{p.receipt_number}</td>
                    <td className="px-6 py-4 font-semibold uppercase">{p.last_name} {p.first_name}</td>
                    <td className="px-6 py-4 font-bold text-slate-gold-gold">{p.amount.toLocaleString()} FCFA</td>
                    <td className="px-6 py-4">{p.payment_type}</td>
                    <td className="px-6 py-4 text-slate-400">{new Date(p.payment_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                    <button className="flex items-center text-blue-400 hover:text-blue-300 transition-colors text-sm">
                        <Download className="w-4 h-4 mr-1" /> Reçu
                    </button>
                    </td>
                </tr>
                )) : (
                    <tr><td colSpan={6} className="text-center py-12 text-slate-500">Aucune transaction trouvée</td></tr>
                )}
            </tbody>
            </table>
        </div>
      ) : (
          <div className="space-y-6">
              <div className="glass-card p-6 border-2 border-dashed border-slate-800 text-center text-slate-500 py-20">
                  <Receipt className="w-12 h-12 mx-auto mb-4 text-slate-700" />
                  <p className="text-lg font-bold">Génération de l'état des impayés...</p>
                  <p className="text-sm mt-2">Cette vue compare le total dû (configuré par classe) avec les versements effectués.</p>
                  <button className="mt-6 px-6 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 transition-all">
                      Actualiser la liste
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default Finance;
