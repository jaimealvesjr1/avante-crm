import React, { useState } from 'react';
import { X, Store, ShoppingCart, UserPlus } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function CreateStoreModal({ isOpen, onClose, onSave, existingMkts, initialClient = '' }) {
  const [clientName, setClientName] = useState(initialClient);
  const [storeName, setStoreName] = useState('');
  const [mktMode, setMktMode] = useState('select'); // 'select' ou 'new'
  const [selectedMkt, setSelectedMkt] = useState(existingMkts[0] || '');
  const [newMkt, setNewMkt] = useState('');

  if (!isOpen) return null;

  const isAddingToExistingClient = initialClient !== '';

  const handleSave = () => {
    if (!clientName.trim()) return toast.error("O nome do cliente é obrigatório.");
    if (!storeName.trim()) return toast.error("O nome da loja é obrigatório.");
    
    const finalMkt = mktMode === 'select' ? selectedMkt : newMkt;
    if (!finalMkt.trim()) return toast.error("Por favor, defina um marketplace.");

    onSave({
      client: clientName.toUpperCase(),
      store: storeName.toUpperCase(),
      marketplace: finalMkt.toUpperCase()
    });

    // Resetar estados
    setClientName('');
    setStoreName('');
    setNewMkt('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 animate-in fade-in">
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-600 w-full max-w-md overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="bg-gray-900 p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {isAddingToExistingClient ? <Store className="text-blue-400" size={20}/> : <UserPlus className="text-green-400" size={20}/>}
            {isAddingToExistingClient ? 'Adicionar Nova Loja' : 'Criar Nova Conta'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Corpo do Formulário */}
        <div className="p-5 space-y-4">
          
          {/* Cliente */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Nome do Cliente</label>
            <input 
              type="text" 
              value={clientName} 
              onChange={e => setClientName(e.target.value)} 
              disabled={isAddingToExistingClient}
              placeholder="Ex: GRUPO AVANTE" 
              className={`w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 font-semibold ${isAddingToExistingClient ? 'opacity-50 cursor-not-allowed' : ''}`}
              autoFocus={!isAddingToExistingClient}
            />
          </div>

          {/* Loja */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Nome da Loja</label>
            <input 
              type="text" 
              value={storeName} 
              onChange={e => setStoreName(e.target.value)} 
              placeholder="Ex: LOJA OFICIAL" 
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 font-semibold"
              autoFocus={isAddingToExistingClient}
            />
          </div>

          {/* Marketplace */}
          <div>
            <div className="flex justify-between items-end mb-1">
              <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1"><ShoppingCart size={14}/> Marketplace</label>
              <button 
                onClick={() => setMktMode(mktMode === 'select' ? 'new' : 'select')} 
                className="text-[10px] text-blue-400 hover:text-blue-300 font-bold underline"
              >
                {mktMode === 'select' ? '+ Criar Novo' : 'Escolher Existente'}
              </button>
            </div>
            
            {mktMode === 'select' ? (
              <select 
                value={selectedMkt} 
                onChange={e => setSelectedMkt(e.target.value)} 
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 cursor-pointer font-semibold"
              >
                {existingMkts.length === 0 && <option value="">Nenhum marketplace cadastrado</option>}
                {existingMkts.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            ) : (
              <input 
                type="text" 
                value={newMkt} 
                onChange={e => setNewMkt(e.target.value)} 
                placeholder="Ex: AMAZON" 
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 font-semibold"
              />
            )}
          </div>

        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-gray-700 bg-gray-900/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors">Cancelar</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-md transition-colors">Salvar Cadastro</button>
        </div>

      </div>
    </div>
  );
}
