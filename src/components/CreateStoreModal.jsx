import React, { useState, useEffect } from 'react';
import { X, Save, Store } from 'lucide-react';

// Chaves padronizadas em Caixa Alta para Gravar no Firestore
const AVAILABLE_MARKETPLACES = [
  { value: 'SHOPEE', label: 'Shopee' },
  { value: 'MERCADO LIVRE', label: 'Mercado Livre' },
  { value: 'TIKTOK SHOP', label: 'TikTok Shop' },
  { value: 'SHEIN', label: 'Shein' },
  { value: 'AMAZON', label: 'Amazon' },
  { value: 'MAGALU', label: 'Magalu' },
  { value: 'NETSHOES', label: 'Netshoes' },
  { value: 'TEMU', label: 'Temu' },
  { value: 'KWAI', label: 'Kwai' },
  { value: 'ALIEXPRESS', label: 'Aliexpress' }
];

export default function CreateStoreModal({ isOpen, onClose, onSave, initialClient }) {
  const [client, setClient] = useState('');
  const [store, setStore] = useState('');
  const [marketplace, setMarketplace] = useState('');

  useEffect(() => {
    if (isOpen) {
      setClient(initialClient || '');
      setStore('');
      setMarketplace(AVAILABLE_MARKETPLACES[0].value);
    }
  }, [isOpen, initialClient]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!client.trim() || !store.trim() || !marketplace) return;

    onSave({
      client: client.toUpperCase().trim(),
      store: store.toUpperCase().trim(),
      marketplace: marketplace
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        
        {/* TOPO */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-950">
          <h3 className="text-md font-bold text-white flex items-center gap-2">
            <Store size={18} className="text-blue-500" /> Cadastrar Nova Loja
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* FORMULÁRIO */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nome do Cliente</label>
            <input 
              type="text" 
              value={client} 
              onChange={e => setClient(e.target.value)} 
              placeholder="EX: GRUPO ALFA" 
              required
              disabled={!!initialClient}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500 font-bold uppercase transition-colors disabled:opacity-60" 
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nome da Loja (Identificador)</label>
            <input 
              type="text" 
              value={store} 
              onChange={e => setStore(e.target.value)} 
              placeholder="EX: TRIUNFO CALÇADOS - OFICIAL" 
              required
              className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500 font-bold uppercase transition-colors" 
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Canal / Marketplace</label>
            <select
              value={marketplace}
              onChange={e => setMarketplace(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-sm text-white font-bold outline-none focus:border-blue-500 transition-colors cursor-pointer"
            >
              {AVAILABLE_MARKETPLACES.map(mkt => (
                <option key={mkt.value} value={mkt.value} className="bg-gray-900 font-medium">
                  {mkt.label}
                </option>
              ))}
            </select>
          </div>

          {/* RODAPÉ */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-700">
            <button 
              type="button" 
              onClick={onClose} 
              className="text-gray-400 hover:text-white px-4 py-2 font-medium text-sm transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg font-bold text-sm shadow-md flex items-center gap-2 transition-transform hover:scale-105"
            >
              <Save size={16} /> Salvar Cadastro
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
