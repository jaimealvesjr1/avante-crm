import React, { useState, useMemo } from 'react';
import { X, Search, CopyPlus, CheckSquare, Square, Eraser } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function BulkTaskModal({ isOpen, onClose, stores, onSave, teamMembers }) {
  const [taskText, setTaskText] = useState('');
  const [taskResp, setTaskResp] = useState('');
  
  // Novos Estados
  const [taskDate, setTaskDate] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [taskRecurrence, setTaskRecurrence] = useState('none');

  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [mktFilter, setMktFilter] = useState(''); 
  const [selectedStores, setSelectedStores] = useState([]);

  const teamNames = teamMembers?.map(m => m.nomeCompleto || m.nome || m.email.split('@')[0]).filter(Boolean) || [];
  const clients = [...new Set(stores.map(s => s.client))].filter(Boolean).sort();
  const mkts = [...new Set(stores.map(s => s.marketplace))].filter(Boolean).sort();

  const filteredStores = useMemo(() => {
    return stores.filter(s => {
      if (clientFilter && s.client !== clientFilter) return false;
      if (mktFilter && s.marketplace !== mktFilter) return false; 
      
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchStore = s.store.toLowerCase().includes(search);
        const matchClient = s.client.toLowerCase().includes(search);
        const matchMkt = s.marketplace?.toLowerCase().includes(search);
        if (!matchStore && !matchClient && !matchMkt) return false;
      }
      return true;
    });
  }, [stores, clientFilter, mktFilter, searchTerm]);

  const toggleStore = (id) => {
    setSelectedStores(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    const allIds = filteredStores.map(s => s.id);
    const newSelection = [...new Set([...selectedStores, ...allIds])];
    setSelectedStores(newSelection);
  };

  const deselectAll = () => {
    const filteredIds = filteredStores.map(s => s.id);
    setSelectedStores(prev => prev.filter(id => !filteredIds.includes(id)));
  };

  const handleSave = () => {
    if (!taskText.trim()) return toast.error('A tarefa precisa de uma descrição.');
    if (selectedStores.length === 0) return toast.error('Selecione pelo menos uma loja para receber a tarefa.');

    // Envia agora como objeto
    onSave(selectedStores, {
      text: taskText,
      resp: taskResp,
      data: taskDate,
      hora: taskTime,
      recorrencia: taskRecurrence
    });
    
    // Limpar e fechar
    setTaskText('');
    setTaskResp('');
    setTaskDate('');
    setTaskTime('');
    setTaskRecurrence('none');
    setSelectedStores([]);
    setSearchTerm('');
    setClientFilter('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4 animate-in fade-in">
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-600 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* CABEÇALHO */}
        <div className="bg-gray-900 p-4 border-b border-gray-700 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <CopyPlus className="text-indigo-400" size={20}/> Tarefa em Massa
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          
          {/* CONFIGURAÇÃO DA TAREFA */}
          <div className="mb-6 bg-gray-900/50 p-4 rounded-xl border border-gray-700 space-y-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase">1. O que precisa ser feito?</h4>
            
            <div className="flex flex-col md:flex-row gap-3">
              <input 
                type="text" 
                value={taskText} 
                onChange={e => setTaskText(e.target.value)} 
                placeholder="Ex: Atualizar banners da campanha..." 
                className="flex-[2] bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-sm text-white outline-none focus:border-indigo-500 font-medium" 
              />
              <select 
                value={taskResp} 
                onChange={e => setTaskResp(e.target.value)} 
                className="bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-sm text-white outline-none focus:border-indigo-500 cursor-pointer flex-1"
              >
                <option value="">Sem Resp.</option>
                {teamNames.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>

            {/* NOVOS CAMPOS DE DATA E RECORRÊNCIA */}
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} className="bg-gray-800 border border-gray-600 rounded-lg p-2 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer" title="Data da Tarefa" />
              <input type="time" value={taskTime} onChange={(e) => setTaskTime(e.target.value)} className="bg-gray-800 border border-gray-600 rounded-lg p-2 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer" title="Hora" />
              <select value={taskRecurrence} onChange={(e) => setTaskRecurrence(e.target.value)} className="bg-gray-800 border border-gray-600 rounded-lg p-2 text-xs text-white outline-none cursor-pointer flex-1 min-w-[130px]">
                <option value="none">S/ Repetição</option>
                <option value="daily">🔁 Diário</option>
                <option value="weekly">🔁 Semanal</option>
                <option value="monthly">🔁 Mensal</option>
              </select>
              
              <button 
                onClick={() => { setTaskDate(''); setTaskTime(''); setTaskRecurrence('none'); }} 
                className="bg-gray-800 hover:bg-gray-700 text-gray-400 p-2 rounded-lg transition-colors border border-gray-600" 
                title="Limpar Datas"
              >
                <Eraser size={14}/>
              </button>
            </div>
          </div>

          {/* SELEÇÃO DE LOJAS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase">2. Onde aplicar? ({selectedStores.length} selecionadas)</h4>
              <div className="flex gap-2 text-xs">
                <button onClick={selectAll} className="text-indigo-400 hover:text-indigo-300 font-bold underline">Selecionar Visíveis</button>
                <span className="text-gray-600">|</span>
                <button onClick={deselectAll} className="text-gray-400 hover:text-gray-300 font-bold underline">Limpar Visíveis</button>
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
                <input 
                  type="text" 
                  placeholder="Buscar loja ou cliente..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2 pl-9 outline-none text-xs" 
                />
              </div>
              <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="bg-gray-900 border border-gray-700 text-white rounded-lg p-2 outline-none text-xs w-40 cursor-pointer">
                <option value="">Todos Clientes</option>
                {clients.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={mktFilter} onChange={e => setMktFilter(e.target.value)} className="bg-gray-900 border border-gray-700 text-white rounded-lg p-2 outline-none text-xs w-32 cursor-pointer">
                <option value="">Marketplaces</option>
                {mkts.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-lg p-2 max-h-60 overflow-y-auto custom-scrollbar space-y-1">
              {filteredStores.map(store => {
                const isSelected = selectedStores.includes(store.id);
                return (
                  <div key={store.id} onClick={() => toggleStore(store.id)} className={`flex items-center gap-3 p-2 rounded cursor-pointer border transition-all ${isSelected ? 'bg-indigo-900/30 border-indigo-500/50' : 'bg-gray-800 border-gray-700 hover:bg-gray-750'}`}>
                    {isSelected ? <CheckSquare className="text-indigo-400" size={18}/> : <Square className="text-gray-500" size={18}/>}
                    <div className="flex flex-col">
                      <span className={`text-sm font-bold ${isSelected ? 'text-indigo-100' : 'text-gray-300'}`}>{store.store}</span>
                      <span className="text-[10px] text-gray-500">{store.client} {store.marketplace && `• ${store.marketplace}`}</span>
                    </div>
                  </div>
                );
              })}
              {filteredStores.length === 0 && <div className="text-center p-4 text-gray-500 text-sm">Nenhuma loja encontrada com estes filtros.</div>}
            </div>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="p-4 border-t border-gray-700 bg-gray-900 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors">Cancelar</button>
          <button onClick={handleSave} className="px-5 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-md transition-colors flex items-center gap-2">
            <CopyPlus size={16}/> Aplicar Tarefa
          </button>
        </div>

      </div>
    </div>
  );
}
