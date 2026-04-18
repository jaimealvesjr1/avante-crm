import React, { useState } from 'react';
import { Save, X, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Função que aceita o Ctrl+V da Shopee e converte para número
export const parseShopeeNumber = (val) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  let clean = String(val).replace(/R\$\s?/g, '').trim();
  if (clean.includes('.') && clean.includes(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  }
  return Number(clean) || 0;
};

export default function BatchEntry({ stores, onClose, onSaveBatch, currentDay }) {
  const [formData, setFormData] = useState(() => {
    const initial = {};
    stores.forEach(s => {
      initial[s.id] = {
        currentRevenue: s.currentRevenue || '',
        adsInvestment: s.adsInvestment || '',
        orders: s.orders || '',
        units: s.units || ''
      };
    });
    return initial;
  });

  const handleChange = (id, field, value) => {
    setFormData(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleSave = () => {
    const updates = stores.map(s => {
      const data = formData[s.id];
      return {
        ...s,
        currentRevenue: parseShopeeNumber(data.currentRevenue),
        adsInvestment: parseShopeeNumber(data.adsInvestment),
        orders: parseInt(data.orders, 10) || 0,
        units: parseInt(data.units, 10) || 0
      };
    });
    onSaveBatch(updates);
    toast.success('Todos os lançamentos do dia foram salvos!');
    onClose();
  };

  const activeStores = stores.sort((a, b) => a.client.localeCompare(b.client));

  return (
    <div className="fixed inset-0 bg-black/95 z-[70] flex flex-col p-4 md:p-8 animate-in fade-in duration-200">
      <div className="max-w-6xl mx-auto w-full flex flex-col h-full bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-gray-950">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Zap className="text-amber-400" /> Lançamento em Massa (Dia {currentDay})
            </h2>
            <p className="text-gray-400 text-sm mt-1">Cole os valores direto da Shopee. O sistema limpará os pontos e vírgulas automaticamente.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-900 text-gray-400 text-xs uppercase z-10 shadow-sm">
              <tr>
                <th className="p-3 border-b border-gray-800">Cliente / Loja</th>
                <th className="p-3 border-b border-gray-800 w-40 text-blue-400">Faturamento (R$)</th>
                <th className="p-3 border-b border-gray-800 w-32 text-amber-400">Ads (R$)</th>
                <th className="p-3 border-b border-gray-800 w-28 text-green-400">Pedidos</th>
                <th className="p-3 border-b border-gray-800 w-28 text-purple-400">Unidades</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {activeStores.map(store => (
                <tr key={store.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="p-3">
                    <div className="font-bold text-gray-200">{store.client}</div>
                    <div className="text-xs text-gray-500">{store.store}</div>
                  </td>
                  <td className="p-3">
                    <input type="text" value={formData[store.id].currentRevenue} onChange={(e) => handleChange(store.id, 'currentRevenue', e.target.value)} className="w-full bg-gray-950 border border-gray-700 text-blue-300 rounded p-2 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-bold" placeholder="0,00" />
                  </td>
                  <td className="p-3">
                    <input type="text" value={formData[store.id].adsInvestment} onChange={(e) => handleChange(store.id, 'adsInvestment', e.target.value)} className="w-full bg-gray-950 border border-gray-700 text-amber-300 rounded p-2 focus:ring-1 focus:ring-amber-500 outline-none text-sm font-bold" placeholder="0,00" />
                  </td>
                  <td className="p-3">
                    <input type="number" value={formData[store.id].orders} onChange={(e) => handleChange(store.id, 'orders', e.target.value)} className="w-full bg-gray-950 border border-gray-700 text-green-300 rounded p-2 focus:ring-1 focus:ring-green-500 outline-none text-sm font-bold" placeholder="0" />
                  </td>
                  <td className="p-3">
                    <input type="number" value={formData[store.id].units} onChange={(e) => handleChange(store.id, 'units', e.target.value)} className="w-full bg-gray-950 border border-gray-700 text-purple-300 rounded p-2 focus:ring-1 focus:ring-purple-500 outline-none text-sm font-bold" placeholder="0" />
                  </td>
                </tr>
              ))}
              {activeStores.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-500">Nenhuma loja cadastrada. Use o botão Importar.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-800 bg-gray-950 flex justify-end">
          <button onClick={handleSave} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg flex items-center gap-2 transition-transform hover:scale-105">
            <Save size={20} /> Salvar Lançamentos
          </button>
        </div>
      </div>
    </div>
  );
}
